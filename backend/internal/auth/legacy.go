package auth

import (
	"fmt"
	"slices"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// LegacyIdentity — данные пользователя, извлечённые из проверенного токена
// старой системы (.NET Agro.Identity). Источник истины для входа с мобильного.
type LegacyIdentity struct {
	IIN        string
	LastName   string
	FirstName  string
	MiddleName string
}

// legacyClaims — подмножество claims токена Agro.Identity, которое нам нужно.
// Идентификатор (ИИН/БИН) лежит в claim "iin" (.NET: user.Identifier).
type legacyClaims struct {
	jwt.RegisteredClaims
	IIN        string `json:"iin"`
	LastName   string `json:"lastName"`
	FirstName  string `json:"firstName"`
	MiddleName string `json:"middleName"`
}

// LegacyVerifier проверяет JWT, выпущенные старой системой Agro.Identity (HS256).
// Тот же общий секрет, что AppSettings:AuthOptions:Key в .NET-бэке.
type LegacyVerifier struct {
	secret    []byte
	issuer    string   // ожидаемый iss, в .NET = "fond"
	audiences []string // допустимые aud, в .NET = {"Int","Ext"}
}

// NewLegacyVerifier создаёт верификатор. secret — общий ключ Agro.Identity
// (приходит из env, в коде не хранится). audiences — список допустимых aud.
func NewLegacyVerifier(secret, issuer string, audiences []string) *LegacyVerifier {
	return &LegacyVerifier{secret: []byte(secret), issuer: issuer, audiences: audiences}
}

// Verify проверяет подпись и стандартные claims токена старой системы и
// возвращает личность пользователя. Любая ошибка → токену доверять нельзя.
func (v *LegacyVerifier) Verify(token string) (LegacyIdentity, error) {
	var claims legacyClaims
	// WithValidMethods жёстко фиксирует HS256 — защита от подмены алгоритма (alg:none / RS256).
	// WithIssuer и WithExpirationRequired проверяют iss и обязательность exp.
	_, err := jwt.ParseWithClaims(strings.TrimSpace(token), &claims,
		func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return v.secret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(v.issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return LegacyIdentity{}, fmt.Errorf("auth: проверка legacy-токена: %w", err)
	}

	// aud в токене = "Int" (сотрудники) или "Ext" (клиенты портала). Принимаем только разрешённые.
	if len(v.audiences) > 0 && !audienceAllowed(claims.Audience, v.audiences) {
		return LegacyIdentity{}, fmt.Errorf("auth: недопустимый audience токена: %v", claims.Audience)
	}

	iin := onlyDigits(claims.IIN)
	if len(iin) != 12 {
		return LegacyIdentity{}, fmt.Errorf("auth: в токене нет корректного ИИН (len=%d)", len(iin))
	}

	return LegacyIdentity{
		IIN:        iin,
		LastName:   strings.TrimSpace(claims.LastName),
		FirstName:  strings.TrimSpace(claims.FirstName),
		MiddleName: strings.TrimSpace(claims.MiddleName),
	}, nil
}

// audienceAllowed возвращает true, если хотя бы один aud токена входит в список допустимых.
func audienceAllowed(tokenAud jwt.ClaimStrings, allowed []string) bool {
	for _, a := range tokenAud {
		if slices.Contains(allowed, a) {
			return true
		}
	}
	return false
}
