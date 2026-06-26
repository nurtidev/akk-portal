package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testLegacySecret = "test-fond-secret-key-32bytes-min!!"

// signLegacy выпускает токен в формате старой системы (.NET Agro.Identity): HS256, iss=fond.
func signLegacy(t *testing.T, secret, iss, aud, iin string, exp time.Time, method jwt.SigningMethod, key any) string {
	t.Helper()
	claims := jwt.MapClaims{
		"iss":       iss,
		"aud":       aud,
		"exp":       exp.Unix(),
		"iin":       iin,
		"lastName":  "Сапаров",
		"firstName": "Бауыржан",
	}
	tok := jwt.NewWithClaims(method, claims)
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	return s
}

func newTestVerifier() *LegacyVerifier {
	return NewLegacyVerifier(testLegacySecret, "fond", []string{"Int", "Ext"})
}

func TestLegacyVerify_Valid(t *testing.T) {
	v := newTestVerifier()
	tok := signLegacy(t, testLegacySecret, "fond", "Ext", "010640000111",
		time.Now().Add(time.Hour), jwt.SigningMethodHS256, []byte(testLegacySecret))

	id, err := v.Verify(tok)
	if err != nil {
		t.Fatalf("ожидали успех, получили: %v", err)
	}
	if id.IIN != "010640000111" {
		t.Errorf("IIN = %q, ожидали 010640000111", id.IIN)
	}
	if id.LastName != "Сапаров" || id.FirstName != "Бауыржан" {
		t.Errorf("ФИО прочитано неверно: %+v", id)
	}
}

func TestLegacyVerify_Rejects(t *testing.T) {
	v := newTestVerifier()
	now := time.Now()
	valid := func(secret, iss, aud, iin string, exp time.Time) string {
		return signLegacy(t, secret, iss, aud, iin, exp, jwt.SigningMethodHS256, []byte(secret))
	}

	cases := map[string]string{
		"чужой секрет":   valid("wrong-secret-wrong-secret-wrong!", "fond", "Ext", "010640000111", now.Add(time.Hour)),
		"чужой issuer":   valid(testLegacySecret, "evil", "Ext", "010640000111", now.Add(time.Hour)),
		"чужой audience": valid(testLegacySecret, "fond", "Bogus", "010640000111", now.Add(time.Hour)),
		"истёкший":       valid(testLegacySecret, "fond", "Ext", "010640000111", now.Add(-time.Hour)),
		"короткий ИИН":   valid(testLegacySecret, "fond", "Ext", "12345", now.Add(time.Hour)),
	}
	for name, tok := range cases {
		if _, err := v.Verify(tok); err == nil {
			t.Errorf("%s: ожидали ошибку, токен принят", name)
		}
	}
}

// TestLegacyVerify_RejectsNoneAlg — защита от подмены алгоритма (alg:none).
func TestLegacyVerify_RejectsNoneAlg(t *testing.T) {
	v := newTestVerifier()
	tok := signLegacy(t, testLegacySecret, "fond", "Ext", "010640000111",
		time.Now().Add(time.Hour), jwt.SigningMethodNone, jwt.UnsafeAllowNoneSignatureType)
	if _, err := v.Verify(tok); err == nil {
		t.Error("ожидали отказ для alg=none, токен принят")
	}
}
