// Package credit — лёгкая подача заявки (без Temporal/ЭЦП/залогов).
package credit

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"akk-railway-backend/internal/ai"
	"akk-railway-backend/internal/auth"
	"akk-railway-backend/internal/programs"
	"akk-railway-backend/internal/store"
)

// Handler обслуживает /api/v1/credit/*.
type Handler struct {
	store     *store.Store
	logger    *slog.Logger
	extractor *ai.Extractor // nil → ИИ-распознавание полей выключено (нет ключа)
}

// NewHandler создаёт credit-хендлер. extractor может быть nil (фича выключена).
func NewHandler(s *store.Store, logger *slog.Logger, extractor *ai.Extractor) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{store: s, logger: logger, extractor: extractor}
}

// Register вешает маршруты. mw — auth-middleware (Bearer).
func (h *Handler) Register(g *echo.Group, mw echo.MiddlewareFunc) {
	// Публичные (без авторизации): калькулятор pre-screen и каталог программ.
	g.GET("/programs", h.listPrograms)
	g.POST("/calculator", h.calculate)

	g.POST("/applications", h.create, mw)
	g.GET("/applications", h.list, mw)
	g.GET("/applications/:uid/status", h.status, mw)
	g.POST("/applications/:uid/advance", h.advance, mw)
	g.POST("/applications/:uid/cancel", h.cancel, mw)
	g.GET("/applications/:uid/documents", h.listDocuments, mw)
	g.POST("/applications/:uid/documents", h.uploadDocument, mw)
	g.GET("/notifications", h.notifications, mw)
	g.POST("/notifications/read", h.markNotificationsRead, mw)

	// Личное хранилище «Мои документы» (переиспользование между заявками + сроки).
	g.GET("/my-documents", h.listMyDocuments, mw)
	g.POST("/my-documents", h.upsertMyDocument, mw)
	g.POST("/my-documents/:key/file", h.uploadMyDocumentFile, mw)
	g.GET("/my-documents/:key/file", h.getMyDocumentFile, mw)
	g.POST("/my-documents/:key/extract", h.extractMyDocumentFields, mw)
}

type createReq struct {
	RequestedAmount json.Number     `json:"requested_amount"`
	LoanPurpose     string          `json:"loan_purpose"`
	ProgramID       string          `json:"program_id"`
	Onboarding      json.RawMessage `json:"onboarding"`
}

func (h *Handler) create(c echo.Context) error {
	client := auth.ClientFromContext(c)
	var req createReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный запрос"})
	}
	amount, _ := req.RequestedAmount.Float64()

	app, err := h.store.CreateApplication(c.Request().Context(), store.Application{
		ClientUID:   client.UID,
		ProgramID:   req.ProgramID,
		LoanPurpose: req.LoanPurpose,
		Amount:      amount,
		Onboarding:  req.Onboarding,
	})
	if err != nil {
		h.logger.Error("credit: создание заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось создать заявку"})
	}
	h.logger.Info("credit: заявка создана", "number", app.Number, "client", client.UID)
	return c.JSON(http.StatusOK, toDTO(app))
}

type advanceReq struct {
	Status string `json:"status"`
}

// advance двигает заявку по клиентским этапам (демо-управление вручную для показа).
// Без тела — переход на следующий этап; с {"status":"new"} — установка конкретного
// (например, сброс на начало для повторного прогона демо). В прод этим управляет workflow.
func (h *Handler) advance(c echo.Context) error {
	client := auth.ClientFromContext(c)
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный идентификатор заявки"})
	}
	var req advanceReq
	_ = c.Bind(&req) // тело необязательно

	app, err := h.store.GetApplication(c.Request().Context(), uid, client.UID)
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "заявка не найдена"})
	}
	if err != nil {
		h.logger.Error("credit: чтение заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить заявку"})
	}

	next := store.NextStatus(app.Status)
	if req.Status != "" {
		if !store.ValidStatus(req.Status) {
			return c.JSON(http.StatusBadRequest, map[string]any{"message": "недопустимый статус"})
		}
		next = req.Status
	}

	updated, err := h.store.SetApplicationStatus(c.Request().Context(), uid, client.UID, next)
	if err != nil {
		h.logger.Error("credit: смена статуса заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось обновить статус"})
	}
	h.logger.Info("credit: статус заявки изменён", "number", updated.Number, "status", updated.Status, "client", client.UID)
	return c.JSON(http.StatusOK, toDTO(updated))
}

// status отдаёт текущий статус заявки + флаги для трекера и кнопки отмены.
// Контракт зеркалит то, что ждёт кабинет (web/src/lib/api/credit.ts: ApplicationStatus).
func (h *Handler) status(c echo.Context) error {
	client := auth.ClientFromContext(c)
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный идентификатор заявки"})
	}
	app, err := h.store.GetApplication(c.Request().Context(), uid, client.UID)
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "заявка не найдена"})
	}
	if err != nil {
		h.logger.Error("credit: чтение заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить заявку"})
	}
	actions := []string{}
	if store.CanCancel(app.Status) {
		actions = append(actions, "cancel")
	}
	return c.JSON(http.StatusOK, map[string]any{
		"uid":               app.UID.String(),
		"workflow_status":   app.Status,
		"is_terminal":       store.IsTerminal(app.Status),
		"can_cancel":        store.CanCancel(app.Status),
		"available_actions": actions,
	})
}

// cancel — самостоятельная отмена заявки заёмщиком (до решения КК).
// 200 — отменена (статус → cancelled); 409 — на текущем этапе отмена недоступна.
func (h *Handler) cancel(c echo.Context) error {
	client := auth.ClientFromContext(c)
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный идентификатор заявки"})
	}
	var req struct {
		Reason string `json:"reason"`
	}
	_ = c.Bind(&req) // причина необязательна

	app, err := h.store.GetApplication(c.Request().Context(), uid, client.UID)
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "заявка не найдена"})
	}
	if err != nil {
		h.logger.Error("credit: чтение заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить заявку"})
	}
	if !store.CanCancel(app.Status) {
		return c.JSON(http.StatusConflict, map[string]any{"message": "на текущем этапе отмена недоступна"})
	}

	updated, err := h.store.SetApplicationStatus(c.Request().Context(), uid, client.UID, store.StatusCancelled)
	if err != nil {
		h.logger.Error("credit: отмена заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось отменить заявку"})
	}
	h.logger.Info("credit: заявка отменена заёмщиком", "number", updated.Number, "client", client.UID, "reason", req.Reason)
	return c.JSON(http.StatusOK, toDTO(updated))
}

func (h *Handler) list(c echo.Context) error {
	client := auth.ClientFromContext(c)
	apps, err := h.store.ListApplications(c.Request().Context(), client.UID)
	if err != nil {
		h.logger.Error("credit: список заявок", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить заявки"})
	}
	out := make([]map[string]any, 0, len(apps))
	for _, a := range apps {
		out = append(out, toDTO(a))
	}
	return c.JSON(http.StatusOK, out)
}

// listDocuments отдаёт чек-лист документов по заявке, сгруппированный по этапам.
func (h *Handler) listDocuments(c echo.Context) error {
	client := auth.ClientFromContext(c)
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный идентификатор заявки"})
	}
	app, err := h.store.GetApplication(c.Request().Context(), uid, client.UID)
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "заявка не найдена"})
	}
	if err != nil {
		h.logger.Error("credit: чтение заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить заявку"})
	}
	stored, err := h.store.ListAppDocuments(c.Request().Context(), uid, client.UID)
	if err != nil {
		h.logger.Error("credit: список документов", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить документы"})
	}
	// Личное хранилище клиента — для переиспользования валидных документов.
	vault, err := h.store.ListClientDocuments(c.Request().Context(), client.UID)
	if err != nil {
		h.logger.Error("credit: хранилище документов", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить документы"})
	}
	return c.JSON(http.StatusOK, buildDocumentsDTO(app, stored, vault, time.Now()))
}

type uploadDocReq struct {
	RequirementKey string `json:"requirement_key"`
	FileName       string `json:"file_name"`
}

// uploadDocument помечает требование как загруженное/подписанное (метаданные, без файла).
func (h *Handler) uploadDocument(c echo.Context) error {
	client := auth.ClientFromContext(c)
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный идентификатор заявки"})
	}
	var req uploadDocReq
	if err := c.Bind(&req); err != nil || req.RequirementKey == "" {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "не указан документ"})
	}
	app, err := h.store.GetApplication(c.Request().Context(), uid, client.UID)
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "заявка не найдена"})
	}
	if err != nil {
		h.logger.Error("credit: чтение заявки", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить заявку"})
	}
	if !hasRequirement(app.ProgramID, req.RequirementKey) {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "неизвестный документ для этой программы"})
	}
	doc, err := h.store.UpsertAppDocument(c.Request().Context(), uid, client.UID, req.RequirementKey, req.FileName)
	if err != nil {
		h.logger.Error("credit: загрузка документа", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось сохранить документ"})
	}
	h.logger.Info("credit: документ загружен", "number", app.Number, "req", doc.RequirementKey, "client", client.UID)
	return c.JSON(http.StatusOK, map[string]any{
		"requirement_key": doc.RequirementKey,
		"status":          doc.Status,
		"file_name":       doc.FileName,
	})
}

// --- Калькулятор и каталог программ (публичные) --------------------------

// programDTO — программа для витрины калькулятора (поля расчёта + флаги).
func programDTO(p programs.Program) map[string]any {
	m := map[string]any{
		"id":            p.ID,
		"title":         p.Title,
		"category":      p.Category,
		"rate":          p.Rate,
		"max_amount":    p.MaxAmount,
		"max_term":      p.MaxTerm,
		"schedule_type": string(p.ScheduleType),
		"indirect_only": p.IndirectOnly,
		"hidden":        p.Hidden,
		"featured":      p.Featured,
	}
	if p.RateRange != "" {
		m["rate_range"] = p.RateRange
	}
	if len(p.TermByPurpose) > 0 {
		m["term_by_purpose"] = p.TermByPurpose
	}
	return m
}

// listPrograms отдаёт каталог программ (для калькулятора и пикера). Публично.
func (h *Handler) listPrograms(c echo.Context) error {
	out := make([]map[string]any, 0, len(programs.Programs))
	for _, p := range programs.Programs {
		out = append(out, programDTO(p))
	}
	return c.JSON(http.StatusOK, out)
}

type calcReq struct {
	ProgramID string      `json:"program_id"`
	Amount    json.Number `json:"amount"`
	Term      int         `json:"term"`
	Purpose   string      `json:"purpose"`
}

// calculate — публичный pre-screen калькулятор платежа. Логика 1-в-1 с веб
// (schedule.ts): сумма клампится в [100000, maxAmount]; срок для biannual =
// effectiveMaxTerm, для annual — заданный (или pickInitialTerm), не выше потолка.
func (h *Handler) calculate(c echo.Context) error {
	var req calcReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный запрос"})
	}
	p, ok := programs.ByID(req.ProgramID)
	if !ok {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "программа не найдена"})
	}
	amount, _ := req.Amount.Float64()
	if amount > p.MaxAmount {
		amount = p.MaxAmount
	}
	if amount < 100000 {
		amount = 100000
	}
	effMax := programs.EffectiveMaxTerm(p, req.Purpose)
	term := effMax
	if p.ScheduleType != programs.ScheduleBiannualWinter {
		term = req.Term
		if term <= 0 {
			term = programs.PickInitialTerm(effMax)
		}
		if term > effMax {
			term = effMax
		}
		if term < 1 {
			term = 1
		}
	}
	sch := programs.CalculateSchedule(p, amount, term)
	return c.JSON(http.StatusOK, map[string]any{
		"program_id": p.ID,
		"rate":       p.Rate,
		"amount":     amount,
		"term":       term,
		"schedule":   sch,
	})
}

// --- Уведомления (личный кабинет) ----------------------------------------

// appStages — клиентские этапы (зеркало web APP_STAGES / status.ts).
var appStages = []string{
	"Регистрация заявки", "Новая заявка", "На рассмотрении", "Одобрена",
	"Оценка залога", "Договор", "Средства выданы", "Мониторинг", "Завершена",
}

// rejectLabels — подписи терминальных статусов (зеркало web REJECTED_STATUS).
var rejectLabels = map[string]string{
	"rejected":         "Отказано",
	"rejected_scoring": "Отказано (скоринг)",
	"rejected_cc":      "Отказано (КК)",
	"cc_rejected":      "Отказано (КК)",
	"scoring_negative": "Отказано (скоринг)",
	"cancelled":        "Отменена",
}

// notifications строит ленту уведомлений из статусов заявок клиента.
// Логика 1-в-1 с web buildNotifEvents (simple-tabs.tsx). Возвращает items + unread
// (счётчик по эвристике сайдбара cabinet-view.tsx). Тексты — RU; code — для i18n мобайла.
func (h *Handler) notifications(c echo.Context) error {
	client := auth.ClientFromContext(c)
	apps, err := h.store.ListApplications(c.Request().Context(), client.UID)
	if err != nil {
		h.logger.Error("credit: уведомления", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить уведомления"})
	}

	// Отметка «просмотрено до»: непрочитано = событие новее метки (nil = всё новое).
	seen, serr := h.store.NotificationsSeenAt(c.Request().Context(), client.UID)
	if serr != nil {
		h.logger.Warn("credit: отметка просмотра уведомлений", "err", serr)
		seen = nil
	}

	items := make([]map[string]any, 0)
	unread := 0
	add := func(it map[string]any, at time.Time) {
		u := seen == nil || at.After(*seen)
		it["created_at"] = at.Format(time.RFC3339)
		it["unread"] = u
		if u {
			unread++
		}
		items = append(items, it)
	}

	for _, a := range apps {
		// Событие смены статуса (отказ/этап) датируется updated_at, «принята» — created_at.
		if lbl, isRej := rejectLabels[a.Status]; isRej {
			add(map[string]any{
				"kind": "danger", "code": "application_rejected",
				"application_number": a.Number,
				"title":              "Заявка № " + a.Number + " отклонена",
				"text":               lbl,
			}, a.UpdatedAt)
		} else if idx := store.StatusIndex(a.Status); idx > 0 && idx < len(appStages) {
			add(map[string]any{
				"kind": "info", "code": "application_stage",
				"application_number": a.Number,
				"stage_index":        idx,
				"title":              "Заявка № " + a.Number,
				"text":               "Текущий этап: " + appStages[idx],
			}, a.UpdatedAt)
		}
		add(map[string]any{
			"kind": "ok", "code": "application_accepted",
			"application_number": a.Number,
			"title":              "Заявка № " + a.Number + " принята",
			"text":               "Данные подтянуты из госбаз (ГБД ФЛ, КГД, ПКБ)",
		}, a.CreatedAt)
	}
	if len(items) == 0 {
		// Нет заявок — информационное уведомление, непрочитано только до первого открытия.
		u := seen == nil
		if u {
			unread++
		}
		items = append(items, map[string]any{
			"kind": "ok", "code": "profile_ok",
			"title":      "Профиль подтверждён",
			"text":       "Вход выполнен. Подайте заявку — статус будет виден здесь.",
			"created_at": time.Now().Format(time.RFC3339),
			"unread":     u,
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items, "unread": unread})
}

// markNotificationsRead ставит отметку «уведомления просмотрены» (счётчик непрочитанных → 0).
func (h *Handler) markNotificationsRead(c echo.Context) error {
	client := auth.ClientFromContext(c)
	if err := h.store.MarkNotificationsSeen(c.Request().Context(), client.UID); err != nil {
		h.logger.Error("credit: отметить уведомления прочитанными", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось сохранить"})
	}
	return c.JSON(http.StatusOK, map[string]any{"ok": true})
}

// --- Мои документы (личное хранилище) ------------------------------------

const dateLayout = "2006-01-02"

// listMyDocuments отдаёт каталог переиспользуемых типов + статус по сроку для клиента.
func (h *Handler) listMyDocuments(c echo.Context) error {
	client := auth.ClientFromContext(c)
	stored, err := h.store.ListClientDocuments(c.Request().Context(), client.UID)
	if err != nil {
		h.logger.Error("credit: список моих документов", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить документы"})
	}
	byType := make(map[string]store.ClientDocument, len(stored))
	for _, d := range stored {
		byType[d.DocType] = d
	}
	now := time.Now()
	items := make([]map[string]any, 0, len(VaultDocTypes))
	for _, meta := range VaultDocTypes {
		item := map[string]any{
			"key":           meta.Key,
			"title":         meta.Title,
			"source":        meta.Source,
			"provenance":    meta.Provenance,
			"validity_days": meta.ValidityDays,
			"reusable":      meta.Reusable,
			"status":        VaultMissing,
		}
		if d, ok := byType[meta.Key]; ok {
			item["status"] = vaultStatus(d.ValidUntil, now)
			if d.FileName != nil {
				item["file_name"] = *d.FileName
			}
			if d.IssuedAt != nil {
				item["issued_at"] = d.IssuedAt.Format(dateLayout)
			}
			if d.ValidUntil != nil {
				item["valid_until"] = d.ValidUntil.Format(dateLayout)
			}
			item["has_file"] = d.HasFile
			if d.ContentType != nil {
				item["content_type"] = *d.ContentType
			}
			if d.FileSize != nil {
				item["file_size"] = *d.FileSize
			}
		}
		items = append(items, item)
	}
	return c.JSON(http.StatusOK, items)
}

type upsertMyDocReq struct {
	DocType  string `json:"doc_type"`
	FileName string `json:"file_name"`
	IssuedAt string `json:"issued_at"` // YYYY-MM-DD; пусто = сегодня
}

// upsertMyDocument сохраняет/обновляет документ в хранилище; valid_until считается
// по сроку годности типа от даты выдачи. Возвращает актуальный статус.
func (h *Handler) upsertMyDocument(c echo.Context) error {
	client := auth.ClientFromContext(c)
	var req upsertMyDocReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "некорректный запрос"})
	}
	meta, ok := vaultDocType(req.DocType)
	if !ok {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "неизвестный тип документа"})
	}
	issued := time.Now()
	if req.IssuedAt != "" {
		if parsed, err := time.Parse(dateLayout, req.IssuedAt); err == nil {
			issued = parsed
		}
	}
	validUntil := computeValidUntil(meta, issued)
	d, err := h.store.UpsertClientDocument(c.Request().Context(), client.UID, meta.Key, req.FileName, &issued, validUntil)
	if err != nil {
		h.logger.Error("credit: сохранение моего документа", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось сохранить документ"})
	}
	resp := map[string]any{
		"key":       meta.Key,
		"status":    vaultStatus(d.ValidUntil, time.Now()),
		"issued_at": issued.Format(dateLayout),
	}
	if d.FileName != nil {
		resp["file_name"] = *d.FileName
	}
	if d.ValidUntil != nil {
		resp["valid_until"] = d.ValidUntil.Format(dateLayout)
	}
	h.logger.Info("credit: документ хранилища сохранён", "type", meta.Key, "client", client.UID)
	return c.JSON(http.StatusOK, resp)
}

// maxDocBytes — предел размера загружаемого файла документа (10 МБ).
const maxDocBytes = 10 << 20

// allowedDocTypes — разрешённые MIME-типы файлов документов (pre-screen, не строгая валидация).
var allowedDocTypes = map[string]bool{
	"application/pdf": true,
	"image/jpeg":      true,
	"image/png":       true,
	"image/heic":      true,
}

// uploadMyDocumentFile принимает реальный файл (multipart: поле "file", опц. "issued_at")
// и сохраняет его байты в хранилище клиента. valid_until считается по сроку годности типа.
func (h *Handler) uploadMyDocumentFile(c echo.Context) error {
	client := auth.ClientFromContext(c)
	meta, ok := vaultDocType(c.Param("key"))
	if !ok {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "неизвестный тип документа"})
	}
	if meta.Source == "gov" {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "этот документ подтягивается из госисточников — загрузка не требуется"})
	}

	fh, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "файл не передан"})
	}
	if fh.Size > maxDocBytes {
		return c.JSON(http.StatusRequestEntityTooLarge, map[string]any{"message": "файл больше 10 МБ"})
	}
	src, err := fh.Open()
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "не удалось прочитать файл"})
	}
	defer src.Close()
	data, err := io.ReadAll(io.LimitReader(src, maxDocBytes+1))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "не удалось прочитать файл"})
	}
	if len(data) > maxDocBytes {
		return c.JSON(http.StatusRequestEntityTooLarge, map[string]any{"message": "файл больше 10 МБ"})
	}
	if len(data) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "пустой файл"})
	}

	// Content-type: доверяем заголовку формы, но проверяем по сигнатуре содержимого.
	contentType := fh.Header.Get("Content-Type")
	if detected := http.DetectContentType(data); detected != "application/octet-stream" {
		contentType = detected
	}
	if !allowedDocTypes[contentType] {
		return c.JSON(http.StatusUnsupportedMediaType, map[string]any{"message": "поддерживаются PDF, JPG, PNG"})
	}

	issued := time.Now()
	if v := c.FormValue("issued_at"); v != "" {
		if parsed, perr := time.Parse(dateLayout, v); perr == nil {
			issued = parsed
		}
	}
	validUntil := computeValidUntil(meta, issued)

	d, err := h.store.UpsertClientDocumentFile(c.Request().Context(), client.UID, meta.Key, fh.Filename, contentType, data, &issued, validUntil)
	if err != nil {
		h.logger.Error("credit: загрузка файла документа", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось сохранить файл"})
	}

	resp := map[string]any{
		"key":          meta.Key,
		"status":       vaultStatus(d.ValidUntil, time.Now()),
		"issued_at":    issued.Format(dateLayout),
		"has_file":     true,
		"content_type": contentType,
		"file_size":    len(data),
	}
	if d.FileName != nil {
		resp["file_name"] = *d.FileName
	}
	if d.ValidUntil != nil {
		resp["valid_until"] = d.ValidUntil.Format(dateLayout)
	}
	h.logger.Info("credit: файл документа загружен", "type", meta.Key, "client", client.UID, "size", len(data))
	return c.JSON(http.StatusOK, resp)
}

// getMyDocumentFile отдаёт байты файла документа клиента (inline — для превью/скачивания).
func (h *Handler) getMyDocumentFile(c echo.Context) error {
	client := auth.ClientFromContext(c)
	if _, ok := vaultDocType(c.Param("key")); !ok {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "неизвестный тип документа"})
	}
	name, contentType, data, err := h.store.GetClientDocumentFile(c.Request().Context(), client.UID, c.Param("key"))
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "файл не найден"})
	}
	if err != nil {
		h.logger.Error("credit: отдача файла документа", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить файл"})
	}
	if name != "" {
		c.Response().Header().Set("Content-Disposition", "inline; filename=\""+name+"\"")
	}
	return c.Blob(http.StatusOK, contentType, data)
}

// extractMyDocumentFields распознаёт ключевые поля загруженного документа через Claude
// (ассистивно) и сверяет ИИН/ФИО с профилем клиента. Без ключа → 503 «не настроено».
func (h *Handler) extractMyDocumentFields(c echo.Context) error {
	client := auth.ClientFromContext(c)
	if h.extractor == nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]any{"message": "ИИ-распознавание не настроено"})
	}
	if _, ok := vaultDocType(c.Param("key")); !ok {
		return c.JSON(http.StatusBadRequest, map[string]any{"message": "неизвестный тип документа"})
	}
	_, contentType, data, err := h.store.GetClientDocumentFile(c.Request().Context(), client.UID, c.Param("key"))
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, map[string]any{"message": "файл не найден — сначала загрузите документ"})
	}
	if err != nil {
		h.logger.Error("credit: файл для распознавания", "err", err)
		return c.JSON(http.StatusInternalServerError, map[string]any{"message": "не удалось получить файл"})
	}

	fields, err := h.extractor.Extract(c.Request().Context(), contentType, data)
	if err != nil {
		h.logger.Error("credit: распознавание полей", "err", err)
		return c.JSON(http.StatusBadGateway, map[string]any{"message": "не удалось распознать документ, попробуйте позже"})
	}

	// Сверка с профилем: расхождение — красный флаг для заёмщика (ассистивно, не блок).
	mismatches := make([]map[string]any, 0, 2)
	if iin := onlyDigits(fields.IIN); iin != "" && client.IIN != "" && iin != client.IIN {
		mismatches = append(mismatches, map[string]any{
			"field": "iin", "extracted": fields.IIN, "profile": client.IIN,
		})
	}
	if profileName := client.FullName(); fields.FullName != "" && profileName != "" && !namesLooselyMatch(fields.FullName, profileName) {
		mismatches = append(mismatches, map[string]any{
			"field": "full_name", "extracted": fields.FullName, "profile": profileName,
		})
	}

	h.logger.Info("credit: поля распознаны", "type", c.Param("key"), "client", client.UID, "mismatches", len(mismatches))
	return c.JSON(http.StatusOK, map[string]any{
		"fields":     fields,
		"mismatches": mismatches,
	})
}

// onlyDigits оставляет в строке только цифры (для нормализации ИИН).
func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// namesLooselyMatch — мягкое сравнение ФИО (регистр/порядок слов не важны):
// совпадают, если каждое слово более короткого имени встречается в более длинном.
func namesLooselyMatch(a, b string) bool {
	fa := strings.Fields(strings.ToLower(a))
	fb := strings.Fields(strings.ToLower(b))
	if len(fa) == 0 || len(fb) == 0 {
		return false
	}
	short, long := fa, fb
	if len(short) > len(long) {
		short, long = long, short
	}
	inLong := make(map[string]bool, len(long))
	for _, w := range long {
		inLong[w] = true
	}
	for _, w := range short {
		if !inLong[w] {
			return false
		}
	}
	return true
}

func toDTO(a store.Application) map[string]any {
	return map[string]any{
		"uid":        a.UID.String(),
		"number":     a.Number,
		"program_id": a.ProgramID,
		"program":    a.ProgramID,
		"purpose":    a.LoanPurpose,
		"amount":     a.Amount,
		"status":     a.Status,
		"onboarding": a.Onboarding,
		"created_at": a.CreatedAt,
	}
}
