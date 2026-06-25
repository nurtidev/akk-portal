package programs

import "math"

// BiannualPayment — один из двух зимних платежей.
type BiannualPayment struct {
	Label    string  `json:"label"`
	Amount   float64 `json:"amount"`
	Interest float64 `json:"interest"`
	Note     string  `json:"note"`
}

// AnnualYear — годовой платёж (линейное тело + проценты на остаток).
type AnnualYear struct {
	Year      int     `json:"year"`
	Principal float64 `json:"principal"`
	Interest  float64 `json:"interest"`
	Payment   float64 `json:"payment"`
}

// Schedule — график погашения (дискриминатор Type: biannual | annual).
// Поля своей схемы заполнены, чужой — опущены (omitempty), как в TS-union.
type Schedule struct {
	Type string `json:"type"`
	// biannual
	Payments []BiannualPayment `json:"payments,omitempty"`
	// annual
	Years            int          `json:"years,omitempty"`
	Yearly           []AnnualYear `json:"yearly,omitempty"`
	FirstYearPayment float64      `json:"first_year_payment,omitempty"`
	LastYearPayment  float64      `json:"last_year_payment,omitempty"`
	AvgPayment       float64      `json:"avg_payment,omitempty"`
	// общее
	Total   float64 `json:"total"`
	Overpay float64 `json:"overpay"`
}

// PickInitialTerm — стартовый срок: наибольший из [12,24,36,48,60,84], не больше maxT.
// Если maxT < 12 — возвращается сам maxT. Порт pickInitialTerm.
func PickInitialTerm(maxT int) int {
	opts := []int{12, 24, 36, 48, 60, 84}
	for i := len(opts) - 1; i >= 0; i-- {
		if opts[i] <= maxT {
			return opts[i]
		}
	}
	return maxT
}

// EffectiveMaxTerm — потолок срока с учётом цели: min(maxTerm, termByPurpose[purpose])
// при наличии, иначе maxTerm. Порт effectiveMaxTerm (purpose вместо answers).
func EffectiveMaxTerm(p Program, purpose string) int {
	if purpose != "" && p.TermByPurpose != nil {
		if v, ok := p.TermByPurpose[purpose]; ok {
			if v < p.MaxTerm {
				return v
			}
		}
	}
	return p.MaxTerm
}

// CalculateSchedule — график погашения. Порт calculateSchedule (schedule.ts).
//   - biannual_winter: 50% до 05.12 + 50% до 05.03; проценты 8 мес на полную сумму
//     (до декабря) + 3 мес на остаток (декабрь→март).
//   - annual: линейное тело (amount/years) + проценты на остаток (remaining*rate/100).
func CalculateSchedule(p Program, amount float64, termMonths int) Schedule {
	rate := p.Rate
	if p.ScheduleType == ScheduleBiannualWinter {
		r := rate / 100 / 12
		half := amount / 2
		const monthsToDec = 8.0
		const monthsDecToMar = 3.0
		intDec := amount * r * monthsToDec
		intMar := half * r * monthsDecToMar
		return Schedule{
			Type: "biannual",
			Payments: []BiannualPayment{
				{Label: "05 декабря", Amount: half + intDec, Interest: intDec, Note: "после уборки урожая"},
				{Label: "05 марта", Amount: half + intMar, Interest: intMar, Note: "окончательный расчёт"},
			},
			Total:   amount + intDec + intMar,
			Overpay: intDec + intMar,
		}
	}

	years := int(math.Round(float64(termMonths) / 12))
	if years < 1 {
		years = 1
	}
	annualPrincipal := amount / float64(years)
	totalInterest := 0.0
	remaining := amount
	yearly := make([]AnnualYear, 0, years)
	for y := 1; y <= years; y++ {
		yearInterest := remaining * rate / 100
		totalInterest += yearInterest
		yearly = append(yearly, AnnualYear{
			Year:      y,
			Principal: annualPrincipal,
			Interest:  yearInterest,
			Payment:   annualPrincipal + yearInterest,
		})
		remaining -= annualPrincipal
	}
	return Schedule{
		Type:             "annual",
		Years:            years,
		Yearly:           yearly,
		FirstYearPayment: yearly[0].Payment,
		LastYearPayment:  yearly[len(yearly)-1].Payment,
		AvgPayment:       (amount + totalInterest) / float64(years),
		Total:            amount + totalInterest,
		Overpay:          totalInterest,
	}
}
