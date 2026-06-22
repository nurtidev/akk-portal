package auth

import (
	"context"
	"log/slog"

	"akk-railway-backend/internal/store"
)

// DemoCitizen — запись фейковой «базы мобильных граждан» для демо-входа по ИИН.
// Вход по ИИН находит запись, «подтягивает» из неё телефон и шлёт на него SMS-код
// (как будто номер пришёл из государственной базы). Это МОК, не реальная интеграция.
//
// ВАЖНО для демо с реальным SMS: телефон должен быть РЕАЛЬНЫМ и доступным тому, кто
// будет логиниться на сцене (иначе код не придёт). Редактируй список перед показом.
type DemoCitizen struct {
	IIN        string // 12 цифр
	LastName   string
	FirstName  string
	MiddleName string
	Phone      string // формат +7XXXXXXXXXX
}

// DemoCitizens — засеиваемые демо-граждане. ДОБАВЛЯЙ СЮДА ИИН + РЕАЛЬНЫЙ НОМЕР
// перед демонстрацией председателю. Пустой список = ничего не сеётся.
var DemoCitizens = []DemoCitizen{
	// Пример (замени на реальные ИИН/номер перед демо):
	// {IIN: "830512300123", LastName: "Серіков", FirstName: "Асхат", Phone: "+77001234567"},
}

// SeedDemoCitizens идемпотентно заносит демо-граждан в таблицу clients
// (upsert по хэшу ИИН). Вызывается на старте; безопасно при нескольких запусках
// и нескольких репликах. Невалидные записи пропускаются с предупреждением.
func SeedDemoCitizens(ctx context.Context, s *store.Store, logger *slog.Logger) {
	if logger == nil {
		logger = slog.Default()
	}
	seeded := 0
	for _, dc := range DemoCitizens {
		iin := onlyDigits(dc.IIN)
		if len(iin) != 12 {
			logger.Warn("seed: пропущен демо-гражданин с некорректным ИИН", "iin", maskIIN(iin))
			continue
		}
		if _, err := s.UpsertClient(ctx, hashIIN(iin), store.Client{
			IIN:        iin,
			LastName:   dc.LastName,
			FirstName:  dc.FirstName,
			MiddleName: dc.MiddleName,
			Phone:      normalizePhone(dc.Phone),
		}); err != nil {
			logger.Error("seed: не удалось засеять демо-гражданина", "iin", maskIIN(iin), "err", err)
			continue
		}
		seeded++
	}
	if seeded > 0 {
		logger.Info("seed: демо-граждане готовы (вход по ИИН)", "count", seeded)
	}
}
