// Package sms отправляет SMS через KazInfoTeh iSMS — боевой провайдер AgroCredit.
// Логика и формат запроса перенесены из credit-backend/pkg/smsclient/kazinfoteh.go.
// При пустом URL работает mock-режим: код только пишется в лог (для локальной отладки).
package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// Sender — интерфейс отправки SMS.
type Sender interface {
	Send(ctx context.Context, phone, message string) error
}

// New возвращает боевой клиент KazInfoTeh либо mock, если url пустой.
func New(url, login, password, originator string, logger *slog.Logger) Sender {
	if logger == nil {
		logger = slog.Default()
	}
	if strings.TrimSpace(url) == "" {
		logger.Warn("sms: URL пуст — включён MOCK-режим (код пишется в лог, реальная отправка отключена)")
		return &mockSender{logger: logger}
	}
	logger.Info("sms: KazInfoTeh (iSMS) сконфигурирован", "url", url, "from", originator)
	return &kazInfoTeh{
		url:        url,
		login:      login,
		password:   password,
		from:       originator,
		httpClient: &http.Client{Timeout: 15 * time.Second},
		logger:     logger,
	}
}

// --- Mock ----------------------------------------------------------------

type mockSender struct{ logger *slog.Logger }

func (m *mockSender) Send(_ context.Context, phone, message string) error {
	m.logger.Info("sms[MOCK]: отправка пропущена", "phone", maskPhone(phone), "text", message)
	return nil
}

// --- KazInfoTeh iSMS -----------------------------------------------------

type kazInfoTeh struct {
	url        string
	login      string
	password   string
	from       string
	httpClient *http.Client
	logger     *slog.Logger
}

type kazRequest struct {
	To   string `json:"to"`
	From string `json:"from"`
	Text string `json:"text"`
}

type kazResponse struct {
	MessageID    string `json:"message_id"`
	Status       string `json:"status"`
	Err          any    `json:"err"`
	ErrorMessage string `json:"error_message"`
}

// Send доставляет SMS через KazInfoTeh iSMS.
// iSMS ждёт получателя без "+" (подтверждено живой отправкой в credit-backend).
func (c *kazInfoTeh) Send(ctx context.Context, phone, message string) error {
	const op = "sms.KazInfoTeh.Send"
	phone = strings.TrimPrefix(normalizePhone(phone), "+")
	if phone == "" {
		return fmt.Errorf("%s: пустой номер", op)
	}

	payload, err := json.Marshal(kazRequest{To: phone, From: c.from, Text: message})
	if err != nil {
		return fmt.Errorf("%s: marshal: %w", op, err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("%s: create request: %w", op, err)
	}
	req.SetBasicAuth(c.login, c.password)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("%s: send: %w", op, err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var parsed kazResponse
	_ = json.Unmarshal(body, &parsed)

	if resp.StatusCode != http.StatusOK {
		msg := parsed.ErrorMessage
		if msg == "" {
			msg = string(body)
		}
		return fmt.Errorf("%s: HTTP %d: %s", op, resp.StatusCode, msg)
	}
	if parsed.Err != nil {
		return fmt.Errorf("%s: provider error: %v", op, parsed.Err)
	}

	c.logger.InfoContext(ctx, "sms: KazInfoTeh отправлен",
		"phone", maskPhone(phone), "message_id", parsed.MessageID, "status", parsed.Status)
	return nil
}

// normalizePhone оставляет только цифры и ведущий "+", приводя к виду +7XXXXXXXXXX.
func normalizePhone(phone string) string {
	var b strings.Builder
	for i, r := range phone {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		} else if r == '+' && i == 0 {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// maskPhone скрывает середину номера в логах (PII).
func maskPhone(phone string) string {
	d := strings.TrimPrefix(normalizePhone(phone), "+")
	if len(d) <= 3 {
		return "***"
	}
	return d[:1] + strings.Repeat("*", len(d)-3) + d[len(d)-2:]
}
