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
	g.POST("/applications", h.create, mw)
	g.GET("/applications", h.list, mw)
	g.POST("/applications/:uid/advance", h.advance, mw)
	g.GET("/applications/:uid/documents", h.listDocuments, mw)
	g.POST("/applications/:uid/documents", h.uploadDocument, mw)
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
