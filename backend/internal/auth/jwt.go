package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"akk-railway-backend/internal/store"
)

// Claims — полезная нагрузка access-токена.
// Поля name/lastName/firstName/phone читает фронтовый __auth-integration.js (profileFromTokens).
type Claims struct {
	jwt.RegisteredClaims
	IIN       string `json:"iin"`
	IINMasked string `json:"iin_masked"`
	Name      string `json:"name"`
	LastName  string `json:"lastName"`
	FirstName string `json:"firstName"`
	Phone     string `json:"phone"`
}

// TokenPair — пара токенов для клиента.
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// Issuer выпускает JWT access-токены (HS256).
type Issuer struct {
	secret    []byte
	issuer    string
	accessTTL time.Duration
}

// NewIssuer создаёт выпускающего токены.
func NewIssuer(secret, issuer string, accessTTL time.Duration) *Issuer {
	return &Issuer{secret: []byte(secret), issuer: issuer, accessTTL: accessTTL}
}

// Issue выпускает пару токенов для клиента.
// Refresh — случайная строка (в прототипе не персистится и не проверяется).
func (i *Issuer) Issue(c store.Client) (TokenPair, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   c.UID.String(),
			Issuer:    i.issuer,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(i.accessTTL)),
			ID:        randomHex(16),
		},
		IIN:       c.IIN,
		IINMasked: maskIIN(c.IIN),
		Name:      c.FullName(),
		LastName:  c.LastName,
		FirstName: c.FirstName,
		Phone:     c.Phone,
	}
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(i.secret)
	if err != nil {
		return TokenPair{}, fmt.Errorf("auth: sign token: %w", err)
	}
	return TokenPair{AccessToken: access, RefreshToken: randomHex(32)}, nil
}

// Parse проверяет подпись и возвращает claims.
func (i *Issuer) Parse(token string) (*Claims, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return i.secret, nil
	})
	if err != nil {
		return nil, err
	}
	return &claims, nil
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// maskIIN оставляет первые 2 и последние 2 цифры: 12******89.
func maskIIN(iin string) string {
	if len(iin) < 5 {
		return "****"
	}
	return iin[:2] + "******" + iin[len(iin)-2:]
}
