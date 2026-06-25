// Package programs — каталог кредитных программ и расчёт графика (калькулятор).
// Порт 1-в-1 из web/src/data/programs.ts и web/src/lib/schedule.ts.
// Значения rate/maxAmount/maxTerm/scheduleType НЕ менять — расчёт должен
// совпадать с веб-калькулятором до тенге (инвариант проекта).
package programs

// ScheduleType — тип графика погашения.
type ScheduleType string

const (
	ScheduleBiannualWinter ScheduleType = "biannual_winter"
	ScheduleAnnual         ScheduleType = "annual"
)

// Program — программа для калькулятора (поля, нужные для расчёта и витрины).
// Hard/soft-правила квиза сюда не портируются — они нужны только подбору.
type Program struct {
	ID            string
	Title         string
	Category      string
	Rate          float64 // числовая ставка для калькулятора
	RateRange     string  // опц. текстовый диапазон ставки (не схлопывать с Rate)
	MaxAmount     float64
	MaxTerm       int
	TermByPurpose map[string]int // опц. потолки срока по цели
	ScheduleType  ScheduleType
	IndirectOnly  bool // только через КТ/МФО/БВУ — не в результатах квиза
	Hidden        bool // скрыта из превью-сетки
	Featured      bool
}

// Programs — каталог (порядок = web/src/data/programs.ts).
var Programs = []Program{
	{
		ID: "ken_dala", Title: "Кең дала", Category: "Посевная · через КТ",
		Rate: 1.5, MaxAmount: 10000000000, MaxTerm: 18,
		ScheduleType: ScheduleBiannualWinter, IndirectOnly: true, Hidden: true,
	},
	{
		ID: "ken_dala_2", Title: "Кең дала 2", Category: "Посевная и уборка",
		Rate: 5, MaxAmount: 1500000000, MaxTerm: 18,
		ScheduleType: ScheduleBiannualWinter, Featured: true,
	},
	{
		ID: "agrobusiness", Title: "Агробизнес", Category: "Инвестиции",
		Rate: 21.5, RateRange: "НБРК+7,5%", MaxAmount: 15000000000, MaxTerm: 144,
		TermByPurpose: map[string]int{"investments": 144, "working": 48},
		ScheduleType:  ScheduleAnnual,
	},
	{
		ID: "igilik_bereke", Title: "Игілік и Береке", Category: "Племенной скот КРС",
		Rate: 6, MaxAmount: 5000000000, MaxTerm: 84,
		ScheduleType: ScheduleAnnual,
	},
	{
		ID: "isker", Title: "Іскер", Category: "Микрокредит",
		Rate: 6, MaxAmount: 34600000, MaxTerm: 84,
		TermByPurpose: map[string]int{"vprir": 60, "feedlot": 60, "investments": 60, "working": 60, "micro": 60},
		ScheduleType:  ScheduleAnnual,
	},
	{
		ID: "feedlot_poultry", Title: "Откормплощадки и птицефабрики", Category: "Откорм и птицефабрики",
		Rate: 5, MaxAmount: 15000000000, MaxTerm: 36,
		ScheduleType: ScheduleAnnual,
	},
	{
		ID: "agrobusiness_2", Title: "Агробизнес 2.0", Category: "Льготные инвестиции",
		Rate: 12.6, MaxAmount: 15000000000, MaxTerm: 180,
		TermByPurpose: map[string]int{"investments": 180, "working": 12},
		ScheduleType:  ScheduleAnnual,
	},
}

// ByID возвращает программу по id (и флаг существования).
func ByID(id string) (Program, bool) {
	for _, p := range Programs {
		if p.ID == id {
			return p, true
		}
	}
	return Program{}, false
}
