package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"

	"akk-railway-backend/internal/sms"
	"akk-railway-backend/internal/store"
)

// Назначения SMS-кодов.
const (
	PurposeRegistration = "registration"
	PurposeLogin        = "login"
)

// Ошибки OTP-флоу.
var (
	ErrRateLimit    = errors.New("слишком много запросов SMS, попробуйте позже")
	ErrTooSoon      = errors.New("код уже отправлен, подождите перед повторной отправкой")
	ErrNoCode       = errors.New("код не запрашивался")
	ErrCodeExpired  = errors.New("срок действия кода истёк")
	ErrMaxAttempts  = errors.New("исчерпаны попытки ввода кода")
	ErrAlreadyUsed  = errors.New("код уже использован")
	ErrInvalidCode  = errors.New("неверный код")
	ErrNotVerified  = errors.New("номер не подтверждён по SMS")
)

// OTP — сервис одноразовых SMS-кодов.
type OTP struct {
	store     *store.Store
	sender    sms.Sender
	ttl       time.Duration
	rateLimit time.Duration
	maxPerHr  int
}

// NewOTP создаёт OTP-сервис.
func NewOTP(s *store.Store, sender sms.Sender, ttl, rateLimit time.Duration, maxPerHr int) *OTP {
	return &OTP{store: s, sender: sender, ttl: ttl, rateLimit: rateLimit, maxPerHr: maxPerHr}
}

// Send генерирует и отправляет 6-значный код, возвращает его (для debug-режима).
func (o *OTP) Send(ctx context.Context, iin, phone, purpose string) (string, error) {
	// Лимит количества за час.
	count, err := o.store.CountRecentSMS(ctx, iin, time.Now().Add(-time.Hour))
	if err != nil {
		return "", err
	}
	if count >= o.maxPerHr {
		return "", ErrRateLimit
	}
	// Минимальный интервал между отправками.
	if last, err := o.store.LatestSMSCode(ctx, iin, purpose); err == nil {
		if time.Since(last.CreatedAt) < o.rateLimit {
			return "", ErrTooSoon
		}
	} else if !errors.Is(err, store.ErrNotFound) {
		return "", err
	}

	code, err := generateCode()
	if err != nil {
		return "", err
	}
	rec := store.SMSCode{
		UID:         uuid.New(),
		IIN:         iin,
		Phone:       phone,
		Code:        code,
		Purpose:     purpose,
		Attempts:    0,
		MaxAttempts: 5,
		Verified:    false,
		ExpiresAt:   time.Now().Add(o.ttl),
	}
	if err := o.store.SaveSMSCode(ctx, rec); err != nil {
		return "", err
	}
	text := fmt.Sprintf("Код подтверждения АКК: %s. Никому не сообщайте его.", code)
	if err := o.sender.Send(ctx, phone, text); err != nil {
		// Код уже сохранён в БД — возвращаем его даже при ошибке отправки
		// (нужно для DEMO_MODE: демо не должно падать из-за SMS-провайдера).
		return code, fmt.Errorf("auth: send sms: %w", err)
	}
	return code, nil
}

// Verify проверяет код для (iin, purpose).
// Возвращает (verified, attemptsLeft, err). При неверном коде err=ErrInvalidCode, но attemptsLeft валиден.
func (o *OTP) Verify(ctx context.Context, iin, input, purpose string) (bool, int, error) {
	rec, err := o.store.LatestSMSCode(ctx, iin, purpose)
	if errors.Is(err, store.ErrNotFound) {
		return false, 0, ErrNoCode
	}
	if err != nil {
		return false, 0, err
	}

	if rec.Verified {
		return false, 0, ErrAlreadyUsed
	}
	if time.Now().After(rec.ExpiresAt) {
		return false, 0, ErrCodeExpired
	}
	if rec.Attempts >= rec.MaxAttempts {
		return false, 0, ErrMaxAttempts
	}

	rec.Attempts++
	if rec.Code != input {
		_ = o.store.UpdateSMSCode(ctx, rec)
		return false, rec.MaxAttempts - rec.Attempts, ErrInvalidCode
	}
	rec.Verified = true
	if err := o.store.UpdateSMSCode(ctx, rec); err != nil {
		return false, 0, err
	}
	return true, rec.MaxAttempts - rec.Attempts, nil
}

// HasVerified проверяет, есть ли свежий подтверждённый код для (iin, purpose).
// Используется при завершении регистрации: smsRegister без verify не пройдёт.
func (o *OTP) HasVerified(ctx context.Context, iin, purpose string) (bool, error) {
	rec, err := o.store.LatestSMSCode(ctx, iin, purpose)
	if errors.Is(err, store.ErrNotFound) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return rec.Verified && time.Now().Before(rec.ExpiresAt), nil
}

// generateCode возвращает криптослучайный 6-значный код "000000".."999999".
func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", fmt.Errorf("auth: gen code: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
