// Package credit — лёгкая подача заявки (без Temporal/ЭЦП/залогов).
package credit

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"akk-railway-backend/internal/auth"
	"akk-railway-backend/internal/programs"
	"akk-railway-backend/internal/store"
)

// Handler обслуживает /api/v1/credit/*.
type Handler struct {
	store  *store.Store
	logger *slog.Logger
}

// NewHandler создаёт credit-хендлер.
func NewHandler(s *store.Store, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{store: s, logger: logger}
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
	return c.JSON(http.StatusOK, buildDocumentsDTO(app, stored))
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

	items := make([]map[string]any, 0)
	unread := 0
	for _, a := range apps {
		c := 1 // событие «принята»
		if lbl, isRej := rejectLabels[a.Status]; isRej {
			items = append(items, map[string]any{
				"kind": "danger", "code": "application_rejected",
				"application_number": a.Number,
				"title":              "Заявка № " + a.Number + " отклонена",
				"text":               lbl,
			})
			c++
		} else if idx := store.StatusIndex(a.Status); idx > 0 && idx < len(appStages) {
			items = append(items, map[string]any{
				"kind": "info", "code": "application_stage",
				"application_number": a.Number,
				"stage_index":        idx,
				"title":              "Заявка № " + a.Number,
				"text":               "Текущий этап: " + appStages[idx],
			})
			c++
		}
		items = append(items, map[string]any{
			"kind": "ok", "code": "application_accepted",
			"application_number": a.Number,
			"title":              "Заявка № " + a.Number + " принята",
			"text":               "Данные подтянуты из госбаз (ГБД ФЛ, КГД, ПКБ)",
		})
		unread += c
	}
	if len(items) == 0 {
		items = append(items, map[string]any{
			"kind": "ok", "code": "profile_ok",
			"title": "Профиль подтверждён",
			"text":  "Вход выполнен. Подайте заявку — статус будет виден здесь.",
		})
	}
	return c.JSON(http.StatusOK, map[string]any{"items": items, "unread": unread})
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
