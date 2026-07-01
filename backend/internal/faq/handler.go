// Package faq — публичные (без авторизации) эндпоинты для FAQ:
//   - голосование «Полезен ли ответ?» с агрегатом «N% нашли полезным» (как Kaspi);
//   - обращение «Не нашли ответ? Задать вопрос» → уходит в поддержку (видно в админке).
package faq

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"akk-railway-backend/internal/store"
)

// logger — минимальный интерфейс (как в других пакетах), чтобы не тащить slog.
type logger interface {
	Info(msg string, args ...any)
	Error(msg string, args ...any)
}

// Handler обслуживает /api/v1/faq/*.
type Handler struct {
	store  *store.Store
	logger logger
}

// NewHandler создаёт публичный faq-хендлер.
func NewHandler(s *store.Store, lg logger) *Handler {
	return &Handler{store: s, logger: lg}
}

// Пределы длины полей (защита от мусора; таблицы демо-БД без ограничений).
const (
	maxKeyLen      = 256
	maxScopeLen    = 128
	maxVoterLen    = 128
	maxQuestionLen = 2000
	maxContactLen  = 200
	maxStatsKeys   = 100
)

// Register вешает публичные маршруты (все без авторизации).
func (h *Handler) Register(g *echo.Group) {
	g.POST("/vote", h.vote)
	g.GET("/stats", h.stats)
	g.POST("/question", h.question)
}

func trunc(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) > n {
		return s[:n]
	}
	return s
}

// statDTO — сериализуемый агрегат по одному вопросу.
func statDTO(st store.FaqStat) map[string]any {
	return map[string]any{
		"helpful": st.Helpful,
		"total":   st.Total,
		"percent": st.Percent(),
	}
}

// vote фиксирует голос устройства за один вопрос и возвращает свежий агрегат.
func (h *Handler) vote(c echo.Context) error {
	var req struct {
		ItemKey string `json:"item_key"`
		Voter   string `json:"voter"`
		Helpful bool   `json:"helpful"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный запрос"))
	}
	itemKey := trunc(req.ItemKey, maxKeyLen)
	voter := trunc(req.Voter, maxVoterLen)
	if itemKey == "" || voter == "" {
		return c.JSON(http.StatusBadRequest, errBody("не указан вопрос или идентификатор"))
	}
	st, err := h.store.RecordFaqVote(c.Request().Context(), itemKey, voter, req.Helpful)
	if err != nil {
		h.logger.Error("faq: голос не сохранён", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось сохранить голос"))
	}
	out := statDTO(st)
	out["item_key"] = itemKey
	return c.JSON(http.StatusOK, out)
}

// stats отдаёт агрегаты по набору ключей: GET /stats?keys=a,b,c.
func (h *Handler) stats(c echo.Context) error {
	raw := c.QueryParam("keys")
	keys := make([]string, 0)
	seen := map[string]bool{}
	for _, k := range strings.Split(raw, ",") {
		k = trunc(k, maxKeyLen)
		if k == "" || seen[k] {
			continue
		}
		seen[k] = true
		keys = append(keys, k)
		if len(keys) >= maxStatsKeys {
			break
		}
	}
	statsMap, err := h.store.FaqStats(c.Request().Context(), keys)
	if err != nil {
		h.logger.Error("faq: статистика не получена", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось получить статистику"))
	}
	out := make(map[string]any, len(statsMap))
	for k, st := range statsMap {
		out[k] = statDTO(st)
	}
	return c.JSON(http.StatusOK, map[string]any{"stats": out})
}

// question сохраняет обращение «Не нашли ответ?» (уходит в поддержку/админку).
func (h *Handler) question(c echo.Context) error {
	var req struct {
		ItemKey  string `json:"item_key"`
		Scope    string `json:"scope"`
		Question string `json:"question"`
		Contact  string `json:"contact"`
		Locale   string `json:"locale"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errBody("некорректный запрос"))
	}
	question := trunc(req.Question, maxQuestionLen)
	if question == "" {
		return c.JSON(http.StatusBadRequest, errBody("введите вопрос"))
	}
	sq, err := h.store.CreateSupportQuestion(c.Request().Context(), store.SupportQuestion{
		ItemKey:  trunc(req.ItemKey, maxKeyLen),
		Scope:    trunc(req.Scope, maxScopeLen),
		Question: question,
		Contact:  trunc(req.Contact, maxContactLen),
		Locale:   trunc(req.Locale, 8),
	})
	if err != nil {
		h.logger.Error("faq: обращение не сохранено", "err", err)
		return c.JSON(http.StatusInternalServerError, errBody("не удалось отправить вопрос"))
	}
	h.logger.Info("faq: новое обращение в поддержку", "uid", sq.UID, "scope", sq.Scope)
	return c.JSON(http.StatusCreated, map[string]any{"ok": true})
}

func errBody(msg string) map[string]any { return map[string]any{"message": msg} }
