package apidocs

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRegister_ServesSpecAndUI(t *testing.T) {
	e := echo.New()
	Register(e)

	cases := []struct {
		path, wantCT, wantSub string
	}{
		{"/openapi.yaml", "application/yaml", "openapi: 3.0.3"},
		{"/swagger", "text/html", "swagger-ui"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("%s: статус %d, ожидали 200", tc.path, rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, tc.wantCT) {
			t.Fatalf("%s: Content-Type %q, ожидали подстроку %q", tc.path, ct, tc.wantCT)
		}
		if !strings.Contains(rec.Body.String(), tc.wantSub) {
			t.Fatalf("%s: тело не содержит %q", tc.path, tc.wantSub)
		}
	}
}
