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
