// Package admin — панель кредитного администратора (демо).
// Корп-вход по логину/паролю (из env), просмотр ВСЕХ заявок всех заёмщиков,
// перевод заявки по этапам, отказ и возврат на доработку с комментарием.
// Авторизация — отдельный admin-JWT (Role=admin), тот же секрет, что у клиентских токенов.
package admin

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"akk-railway-backend/internal/auth"
	"akk-railway-backend/internal/credit"
	"akk-railway-backend/internal/programs"
	"akk-railway-backend/internal/store"
)

// Handler обслуживает /api/v1/admin/*.
type Handler struct {
	store    *store.Store
	issuer   *auth.Issuer
	username string
	password string
	logger   logger
}

// logger — минимальный интерфейс, чтобы не тащить зависимость на конкретный тип slog.
type logger interface {
	Info(msg string, args ...any)
	Error(msg string, args ...any)
}

// NewHandler создаёт админ-хендлер. username/password — демо-учётка из конфигурации.
func NewHandler(s *store.Store, issuer *auth.Issuer, username, password string, lg logger) *Handler {
	return &Handler{store: s, issuer: issuer, username: username, password: password, logger: lg}
}

// Register вешает маршруты: /login публичный, остальное за admin-middleware.
func (h *Handler) Register(g *echo.Group) {
	g.POST("/login", h.login)
	g.GET("/applications", h.list, h.Middleware)
	g.GET("/applications/:uid", h.get, h.Middleware)
	g.POST("/applications/:uid/decision", h.decision, h.Middleware)
	g.GET("/stats", h.stats, h.Middleware)
	g.GET("/questions", h.listQuestions, h.Middleware)
	g.POST("/questions/:uid/resolve", h.resolveQuestion, h.Middleware)
}

// --- Auth ----------------------------------------------------------------

// login проверяет корп-логин/пароль (constant-time) и выдаёт admin-токен.
func (h *Handler) login(c echo.Context) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный запрос"))
	}
	userOK := subtle.ConstantTimeCompare([]byte(strings.TrimSpace(req.Username)), []byte(h.username)) == 1
	passOK := subtle.ConstantTimeCompare([]byte(req.Password), []byte(h.password)) == 1
	if !userOK || !passOK {
		return c.JSON(http.StatusUnauthorized, errBody("неверный логин или пароль"))
	}
	tokens, err := h.issuer.IssueAdmin(h.username)
	if err != nil {
		h.logger.Error("admin: не удалось выпустить токен", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("внутренняя ошибка"))
	}
	h.logger.Info("admin: вход", "user", h.username)
	return c.JSON(http.StatusOK, map[string]any{
		"accessToken": tokens.AccessToken,
		"name":        h.username,
		"role":        auth.RoleAdmin,
	})
}

// Middleware пускает только токены с Role=admin.
func (h *Handler) Middleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		raw := c.Request().Header.Get("Authorization")
		if !strings.HasPrefix(raw, "Bearer ") {
			return c.JSON(http.StatusUnauthorized, errBody("требуется авторизация"))
		}
		claims, err := h.issuer.Parse(strings.TrimPrefix(raw, "Bearer "))
		if err != nil {
			return c.JSON(http.StatusUnauthorized, errBody("недействительный токен"))
		}
		if claims.Role != auth.RoleAdmin {
			return c.JSON(http.StatusForbidden, errBody("доступ только для администратора"))
		}
		return next(c)
	}
}

// --- Applications --------------------------------------------------------

// list отдаёт все заявки (опц. фильтр ?status=) в порядке «новые сверху».
func (h *Handler) list(c echo.Context) error {
	status := strings.TrimSpace(c.QueryParam("status"))
	if status != "" && !store.ValidStatus(status) {
		return c.JSON(http.StatusBadRequest, errBody("недопустимый статус фильтра"))
	}
	apps, err := h.store.ListAllApplications(c.Request().Context(), status)
	if err != nil {
		h.logger.Error("admin: список заявок не получен", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить заявки"))
	}
	out := make([]map[string]any, 0, len(apps))
	for _, a := range apps {
		out = append(out, listDTO(a))
	}
	return c.JSON(http.StatusOK, map[string]any{"applications": out, "total": len(out)})
}

// get отдаёт карточку заявки: данные заёмщика, onboarding, документы, доступные действия.
func (h *Handler) get(c echo.Context) error {
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный идентификатор заявки"))
	}
	app, err := h.store.GetApplicationAdmin(c.Request().Context(), uid)
	if err == store.ErrNotFound {
		return c.JSON(http.StatusNotFound, errBody("заявка не найдена"))
	}
	if err != nil {
		h.logger.Error("admin: заявка не получена", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить заявку"))
	}
	docs, err := h.store.ListAppDocumentsAdmin(c.Request().Context(), uid)
	if err != nil {
		h.logger.Error("admin: документы не получены", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить документы"))
	}
	return c.JSON(http.StatusOK, detailDTO(app, docs))
}

// decisionReq — тело решения администратора.
// action: advance (следующий этап) | reject (отказ) | rework (на доработку) | set (явный статус).
type decisionReq struct {
	Action  string `json:"action"`
	Status  string `json:"status"`  // для action=set
	Comment string `json:"comment"` // обязателен для reject/rework
}

// decision двигает заявку по этапам / отклоняет / возвращает на доработку.
func (h *Handler) decision(c echo.Context) error {
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный идентификатор заявки"))
	}
	var req decisionReq
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный запрос"))
	}
	app, err := h.store.GetApplicationAdmin(c.Request().Context(), uid)
	if err == store.ErrNotFound {
		return c.JSON(http.StatusNotFound, errBody("заявка не найдена"))
	}
	if err != nil {
		h.logger.Error("admin: заявка не получена", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить заявку"))
	}

	comment := strings.TrimSpace(req.Comment)
	var next string
	switch strings.ToLower(strings.TrimSpace(req.Action)) {
	case "advance":
		if store.IsTerminal(app.Status) {
			return c.JSON(http.StatusConflict, errBody("заявка в конечном состоянии — движение недоступно"))
		}
		next = store.NextStatus(app.Status)
	case "reject":
		if comment == "" {
			return c.JSON(http.StatusBadRequest, errBody("укажите причину отказа"))
		}
		next = store.StatusRejected
	case "rework":
		if comment == "" {
			return c.JSON(http.StatusBadRequest, errBody("укажите, что доработать"))
		}
		next = store.StatusRework
	case "set":
		if !store.ValidStatus(req.Status) {
			return c.JSON(http.StatusBadRequest, errBody("недопустимый статус"))
		}
		next = req.Status
	default:
		return c.JSON(http.StatusBadRequest, errBody("неизвестное действие"))
	}

	updated, err := h.store.SetApplicationStatusAdmin(c.Request().Context(), uid, next, comment)
	if err != nil {
		h.logger.Error("admin: статус не обновлён", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось обновить статус"))
	}
	h.logger.Info("admin: решение по заявке", "number", updated.Number, "action", req.Action, "status", updated.Status)

	docs, _ := h.store.ListAppDocumentsAdmin(c.Request().Context(), uid)
	return c.JSON(http.StatusOK, detailDTO(updated, docs))
}

// stats — счётчики заявок по статусам (для шапки списка).
func (h *Handler) stats(c echo.Context) error {
	counts, err := h.store.CountApplicationsByStatus(c.Request().Context())
	if err != nil {
		h.logger.Error("admin: счётчики не получены", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить статистику"))
	}
	total := 0
	for _, n := range counts {
		total += n
	}
	return c.JSON(http.StatusOK, map[string]any{"by_status": counts, "total": total})
}

// --- Обращения в поддержку («Не нашли ответ?») ---------------------------

// listQuestions отдаёт обращения из блока FAQ (опц. фильтр ?status=new|resolved),
// плюс счётчики по статусам для шапки.
func (h *Handler) listQuestions(c echo.Context) error {
	status := strings.TrimSpace(c.QueryParam("status"))
	if status != "" && status != store.SupportStatusNew && status != store.SupportStatusResolved {
		return c.JSON(http.StatusBadRequest, errBody("недопустимый статус фильтра"))
	}
	items, err := h.store.ListSupportQuestions(c.Request().Context(), status)
	if err != nil {
		h.logger.Error("admin: обращения не получены", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить обращения"))
	}
	counts, err := h.store.CountSupportQuestionsByStatus(c.Request().Context())
	if err != nil {
		h.logger.Error("admin: счётчики обращений не получены", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить обращения"))
	}
	out := make([]map[string]any, 0, len(items))
	for _, q := range items {
		out = append(out, questionDTO(q))
	}
	total := 0
	for _, n := range counts {
		total += n
	}
	return c.JSON(http.StatusOK, map[string]any{
		"questions": out,
		"by_status": counts,
		"total":     total,
	})
}

// resolveQuestion помечает обращение решённым (или возвращает в new через ?status=new).
func (h *Handler) resolveQuestion(c echo.Context) error {
	uid, err := uuid.Parse(c.Param("uid"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный идентификатор обращения"))
	}
	status := strings.TrimSpace(c.QueryParam("status"))
	if status == "" {
		status = store.SupportStatusResolved
	}
	if status != store.SupportStatusNew && status != store.SupportStatusResolved {
		return c.JSON(http.StatusBadRequest, errBody("недопустимый статус"))
	}
	if err := h.store.SetSupportQuestionStatus(c.Request().Context(), uid, status); err == store.ErrNotFound {
		return c.JSON(http.StatusNotFound, errBody("обращение не найдено"))
	} else if err != nil {
		h.logger.Error("admin: статус обращения не обновлён", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось обновить обращение"))
	}
	return c.JSON(http.StatusOK, map[string]any{"uid": uid.String(), "status": status})
}

func questionDTO(q store.SupportQuestion) map[string]any {
	return map[string]any{
		"uid":        q.UID.String(),
		"item_key":   q.ItemKey,
		"scope":      q.Scope,
		"question":   q.Question,
		"contact":    q.Contact,
		"locale":     q.Locale,
		"status":     q.Status,
		"created_at": q.CreatedAt,
	}
}

// --- DTO -----------------------------------------------------------------

// branchLabels — русские ярлыки статусов вне лестницы (credit.StageLabel их не знает).
var branchLabels = map[string]string{
	store.StatusRework:    "На доработке",
	store.StatusRejected:  "Отказано",
	store.StatusCancelled: "Отменено заёмщиком",
}

// statusLabel — человекочитаемый ярлык для любого статуса (этап лестницы или ветка).
func statusLabel(s string) string {
	if l, ok := branchLabels[s]; ok {
		return l
	}
	return credit.StageLabel(s)
}

func listDTO(a store.AdminApplication) map[string]any {
	return map[string]any{
		"uid":           a.UID.String(),
		"number":        a.Number,
		"status":        a.Status,
		"status_label":  statusLabel(a.Status),
		"program_id":    a.ProgramID,
		"program_title": programTitle(a.ProgramID),
		"purpose":       a.LoanPurpose,
		"amount":        a.Amount,
		"client_name":   a.ClientName,
		"client_phone":  a.ClientPhone,
		"client_iin":    maskIIN(a.ClientIIN),
		"admin_comment": a.AdminComment,
		"created_at":    a.CreatedAt,
	}
}

func detailDTO(a store.AdminApplication, docs []store.AppDocument) map[string]any {
	d := listDTO(a)
	d["onboarding"] = a.Onboarding
	d["is_terminal"] = store.IsTerminal(a.Status)
	if !store.IsTerminal(a.Status) {
		next := store.NextStatus(a.Status)
		d["next_status"] = next
		d["next_label"] = statusLabel(next)
	}
	dd := make([]map[string]any, 0, len(docs))
	for _, doc := range docs {
		var file any
		if doc.FileName != nil {
			file = *doc.FileName
		}
		dd = append(dd, map[string]any{
			"requirement_key": doc.RequirementKey,
			"title":           credit.RequirementTitle(doc.RequirementKey),
			"status":          doc.Status,
			"file_name":       file,
			"uploaded_at":     doc.UploadedAt,
		})
	}
	d["documents"] = dd
	return d
}

func programTitle(id string) string {
	if p, ok := programs.ByID(id); ok {
		return p.Title
	}
	return id
}

// maskIIN оставляет первые 2 и последние 2 цифры: 12******89.
func maskIIN(iin string) string {
	if len(iin) < 5 {
		return "****"
	}
	return iin[:2] + "******" + iin[len(iin)-2:]
}

func errBody(msg string) map[string]any { return map[string]any{"message": msg} }
