// Package credit — лёгкая подача заявки (без Temporal/ЭЦП/залогов).
package credit

import (
	"encoding/json"
	"log/slog"
	"net/http"

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
