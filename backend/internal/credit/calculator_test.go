package credit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

// h без стора — calculate/listPrograms стор не трогают.
func newCalcHandler() *Handler { return NewHandler(nil, nil, nil) }

func TestCalculate_AnnualClampAndSchedule(t *testing.T) {
	e := echo.New()
	body := `{"program_id":"agrobusiness","amount":10000000,"term":24}`
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if err := newCalcHandler().calculate(c); err != nil {
		t.Fatalf("calculate: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("статус %d", rec.Code)
	}
	var out struct {
		Rate     float64 `json:"rate"`
		Amount   float64 `json:"amount"`
		Term     int     `json:"term"`
		Schedule struct {
			Type    string  `json:"type"`
			Total   float64 `json:"total"`
			Overpay float64 `json:"overpay"`
		} `json:"schedule"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("json: %v", err)
	}
	if out.Rate != 21.5 || out.Term != 24 || out.Schedule.Type != "annual" {
		t.Fatalf("неожиданный ответ: %+v", out)
	}
	if out.Schedule.Total != 13225000 || out.Schedule.Overpay != 3225000 {
		t.Fatalf("график: total=%.2f overpay=%.2f", out.Schedule.Total, out.Schedule.Overpay)
	}
}

func TestCalculate_AmountClampedToMin(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"program_id":"agrobusiness","amount":1000,"term":12}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	_ = newCalcHandler().calculate(c)

	var out struct {
		Amount float64 `json:"amount"`
	}
	_ = json.Unmarshal(rec.Body.Bytes(), &out)
	if out.Amount != 100000 {
		t.Fatalf("amount=%.0f, want clamp to 100000", out.Amount)
	}
}

func TestCalculate_UnknownProgram404(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"program_id":"nope","amount":100000}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	_ = newCalcHandler().calculate(c)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("статус %d, want 404", rec.Code)
	}
}

func TestListPrograms(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	if err := newCalcHandler().listPrograms(c); err != nil {
		t.Fatalf("listPrograms: %v", err)
	}
	var out []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("json: %v", err)
	}
	if len(out) != 7 {
		t.Fatalf("программ %d, want 7", len(out))
	}
}
