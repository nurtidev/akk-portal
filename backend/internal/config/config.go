// Package config читает настройки сервиса из переменных окружения.
// На Railway всё приходит через env; секреты (SMS, JWT, DSN) в код не пишем.
package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

// Config — все настройки прототип-бэкенда.
type Config struct {
	Port           string
	DatabaseURL    string
	AllowedOrigins []string

	JWTSecret string
	JWTIssuer string
	AccessTTL time.Duration

	// SMS (KazInfoTeh). Пустой SMSURL → mock-режим (код пишется в лог).
	// SMSProvider: "kazinfoteh_get" (старый GET/XML, боевой) | "kazinfoteh_json" (новый JSON).
	SMSProvider   string
	SMSURL        string
	SMSLogin      string
	SMSPassword   string
	SMSOriginator string

	// OTP-политика.
	OTPTTL       time.Duration
	OTPRateLimit time.Duration // минимальный интервал между отправками
	OTPMaxPerHr  int

	// DemoMode=true → код возвращается в теле ответа (demoCode), фронт подставляет его
	// автоматически. Для демо без реальной SMS. Когда заработает боевая SMS — выставить false.
	DemoMode bool
}

// Load собирает конфиг из окружения с разумными дефолтами для локального запуска.
func Load() Config {
	return Config{
		Port:           env("PORT", "8080"),
		DatabaseURL:    env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/akk?sslmode=disable"),
		AllowedOrigins: splitCSV(env("ALLOWED_ORIGINS", "*")),

		JWTSecret: env("JWT_SECRET", "dev-secret-change-me-min-32-bytes-long!!"),
		JWTIssuer: env("JWT_ISSUER", "akk-railway"),
		AccessTTL: time.Duration(envInt("ACCESS_TTL_SECONDS", 86400)) * time.Second,

		SMSProvider:   env("SMS_PROVIDER", "kazinfoteh_get"),
		SMSURL:        env("SMS_URL", ""),
		SMSLogin:      env("SMS_LOGIN", ""),
		SMSPassword:   env("SMS_PASSWORD", ""),
		SMSOriginator: env("SMS_ORIGINATOR", "AKK"),

		OTPTTL:       time.Duration(envInt("OTP_TTL_SECONDS", 300)) * time.Second,
		OTPRateLimit: time.Duration(envInt("OTP_RATE_LIMIT_SECONDS", 60)) * time.Second,
		OTPMaxPerHr:  envInt("OTP_MAX_PER_HOUR", 5),

		DemoMode: envBool("DEMO_MODE", true),
	}
}

func env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func envBool(key string, def bool) bool {
	if v := os.Getenv(key); v != "" {
		b, err := strconv.ParseBool(v)
		if err == nil {
			return b
		}
	}
	return def
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
