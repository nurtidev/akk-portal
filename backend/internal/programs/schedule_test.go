package programs

import (
	"math"
	"testing"
)

func approx(t *testing.T, name string, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.01 {
		t.Fatalf("%s: got %.4f, want %.4f", name, got, want)
	}
}

// Парити с web/src/lib/schedule.ts на эталонных входах (значения посчитаны
// по тем же формулам — расхождение = баг порта).
func TestCalculateSchedule_Annual(t *testing.T) {
	p, ok := ByID("agrobusiness") // rate 21.5, annual
	if !ok {
		t.Fatal("agrobusiness не найдена")
	}
	s := CalculateSchedule(p, 10000000, 24) // years = 2
	if s.Type != "annual" {
		t.Fatalf("type=%s, want annual", s.Type)
	}
	if s.Years != 2 {
		t.Fatalf("years=%d, want 2", s.Years)
	}
	approx(t, "firstYear", s.FirstYearPayment, 7150000)   // 5_000_000 + 10_000_000*0.215
	approx(t, "lastYear", s.LastYearPayment, 6075000)     // 5_000_000 + 5_000_000*0.215
	approx(t, "avg", s.AvgPayment, 6612500)               // 13_225_000 / 2
	approx(t, "total", s.Total, 13225000)
	approx(t, "overpay", s.Overpay, 3225000)
}

func TestCalculateSchedule_Biannual(t *testing.T) {
	p, ok := ByID("ken_dala_2") // rate 5, biannual_winter
	if !ok {
		t.Fatal("ken_dala_2 не найдена")
	}
	s := CalculateSchedule(p, 1000000, p.MaxTerm)
	if s.Type != "biannual" || len(s.Payments) != 2 {
		t.Fatalf("type=%s payments=%d", s.Type, len(s.Payments))
	}
	// r = 5/1200; intDec = 1_000_000*r*8; intMar = 500_000*r*3
	approx(t, "intDec", s.Payments[0].Interest, 33333.3333)
	approx(t, "intMar", s.Payments[1].Interest, 6250)
	approx(t, "dec.amount", s.Payments[0].Amount, 533333.3333)
	approx(t, "mar.amount", s.Payments[1].Amount, 506250)
	approx(t, "total", s.Total, 1039583.3333)
	approx(t, "overpay", s.Overpay, 39583.3333)
}

func TestEffectiveMaxTerm(t *testing.T) {
	p, _ := ByID("agrobusiness") // maxTerm 144, termByPurpose{investments:144, working:48}
	if got := EffectiveMaxTerm(p, "working"); got != 48 {
		t.Fatalf("working: got %d, want 48", got)
	}
	if got := EffectiveMaxTerm(p, "investments"); got != 144 {
		t.Fatalf("investments: got %d, want 144", got)
	}
	if got := EffectiveMaxTerm(p, ""); got != 144 {
		t.Fatalf("no purpose: got %d, want 144", got)
	}
}

func TestPickInitialTerm(t *testing.T) {
	cases := map[int]int{144: 84, 84: 84, 36: 36, 18: 12, 6: 6}
	for in, want := range cases {
		if got := PickInitialTerm(in); got != want {
			t.Fatalf("PickInitialTerm(%d)=%d, want %d", in, got, want)
		}
	}
}
