// Package sms отправляет SMS. Поддерживает два провайдера KazInfoTeh:
//   - "kazinfoteh_get"  — старый GET/XML API (http://kazinfoteh.org:9507/api), которым
//                          реально слались боевые SMS AgroCredit (см. .NET backend
//                          Agro.Integration.Logic/OutService/KazInfoTeh/KazInfoTehLogic.cs).
//   - "kazinfoteh_json" — новый JSON API (so.kazinfoteh.org/api/sms/send), Basic Auth.
// Пустой SMS_URL → mock (код пишется в лог).
package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// Sender — интерфейс отправки SMS.
type Sender interface {
	Send(ctx context.Context, phone, message string) error
}

// New возвращает клиент по провайдеру. Пустой url → mock.
func New(provider, smsURL, login, password, originator string, logger *slog.Logger) Sender {
	if logger == nil {
		logger = slog.Default()
	}
	if strings.TrimSpace(smsURL) == "" {
		logger.Warn("sms: URL пуст — включён MOCK-режим (код пишется в лог, реальная отправка отключена)")
		return &mockSender{logger: logger}
	}
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "kazinfoteh_json", "json":
		logger.Info("sms: KazInfoTeh JSON API", "url", smsURL, "from", originator)
		return &kazJSON{url: smsURL, login: login, password: password, from: originator,
			httpClient: &http.Client{Timeout: 15 * time.Second}, logger: logger}
	default: // kazinfoteh_get и всё прочее → старый проверенный GET/XML API
		logger.Info("sms: KazInfoTeh GET/XML API", "url", smsURL, "from", originator)
		return &kazGet{url: smsURL, login: login, password: password, from: originator,
			httpClient: &http.Client{Timeout: 20 * time.Second}, logger: logger}
	}
}

// --- Mock ----------------------------------------------------------------

type mockSender struct{ logger *slog.Logger }

func (m *mockSender) Send(_ context.Context, phone, message string) error {
	m.logger.Info("sms[MOCK]: отправка пропущена", "phone", maskPhone(phone), "text", message)
	return nil
}

// --- KazInfoTeh GET/XML (старый боевой API) -------------------------------
//
// Повторяет .NET Agro.Integration.Logic KazInfoTehLogic.CallServiceSendSMS:
//   GET {url}?action=sendmessage&username=..&password=..&recipient=<phone>
//       &messagetype=SMS:TEXT&originator=<from>&messagedata=<text>&continueurl=https://online.fagri.kz
//   Ответ — XML <acceptreport><statuscode>..</statuscode><statusmessage>..</statusmessage></acceptreport>

type kazGet struct {
	url        string
	login      string
	password   string
	from       string
	httpClient *http.Client
	logger     *slog.Logger
}

var (
	reStatusCode = regexp.MustCompile(`(?is)<statuscode>\s*(.*?)\s*</statuscode>`)
	reStatusMsg  = regexp.MustCompile(`(?is)<statusmessage>\s*(.*?)\s*</statusmessage>`)
	// Ошибочный ответ: <response><action>error</action>...<errorcode>X</errorcode><errormessage>..</errormessage>
	reActionErr = regexp.MustCompile(`(?is)<action>\s*error\s*</action>`)
	reErrCode   = regexp.MustCompile(`(?is)<errorcode>\s*(.*?)\s*</errorcode>`)
	reErrMsg    = regexp.MustCompile(`(?is)<errormessage>\s*(.*?)\s*</errormessage>`)
)

func (c *kazGet) Send(ctx context.Context, phone, message string) error {
	const op = "sms.KazInfoTeh.GET.Send"
	// recipient — 11 цифр без "+" (как 77073763125 в .NET).
	recipient := strings.TrimPrefix(normalizePhone(phone), "+")
	if recipient == "" {
		return fmt.Errorf("%s: пустой номер", op)
	}

	q := url.Values{}
	q.Set("action", "sendmessage")
	q.Set("username", c.login)
	q.Set("password", c.password)
	q.Set("recipient", recipient)
	q.Set("messagetype", "SMS:TEXT")
	q.Set("originator", c.from)
	q.Set("messagedata", message)
	q.Set("continueurl", "https://online.fagri.kz")
	full := c.url + "?" + q.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, full, nil)
	if err != nil {
		return fmt.Errorf("%s: create request: %w", op, err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("%s: send: %w", op, err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%s: HTTP %d: %s", op, resp.StatusCode, strings.TrimSpace(string(body)))
	}

	// Провайдер при HTTP 200 может вернуть ошибку (напр. <errorcode>1163</errorcode> No Balans).
	if reActionErr.Match(body) || reErrCode.Match(body) {
		ec, em := submatch(reErrCode, body), submatch(reErrMsg, body)
		return fmt.Errorf("%s: provider error %s: %s", op, ec, em)
	}

	// Успех: <acceptreport><statuscode>..</statuscode><statusmessage>..</statusmessage>
	c.logger.InfoContext(ctx, "sms: KazInfoTeh GET принят", "phone", maskPhone(recipient),
		"statuscode", submatch(reStatusCode, body), "statusmessage", submatch(reStatusMsg, body))
	return nil
}

func submatch(re *regexp.Regexp, body []byte) string {
	if m := re.FindSubmatch(body); len(m) == 2 {
		return string(m[1])
	}
	return ""
}

// --- KazInfoTeh JSON (новый API) -----------------------------------------

type kazJSON struct {
	url        string
	login      string
	password   string
	from       string
	httpClient *http.Client
	logger     *slog.Logger
}

type kazJSONReq struct {
	To   string `json:"to"`
	From string `json:"from"`
	Text string `json:"text"`
}

type kazJSONResp struct {
	MessageID    string `json:"message_id"`
	Status       string `json:"status"`
	Err          any    `json:"err"`
	ErrorMessage string `json:"error_message"`
}

func (c *kazJSON) Send(ctx context.Context, phone, message string) error {
	const op = "sms.KazInfoTeh.JSON.Send"
	to := strings.TrimPrefix(normalizePhone(phone), "+")
	if to == "" {
		return fmt.Errorf("%s: пустой номер", op)
	}
	payload, err := json.Marshal(kazJSONReq{To: to, From: c.from, Text: message})
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
	var parsed kazJSONResp
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
	c.logger.InfoContext(ctx, "sms: KazInfoTeh JSON отправлен",
		"phone", maskPhone(to), "message_id", parsed.MessageID, "status", parsed.Status)
	return nil
}

// --- helpers -------------------------------------------------------------

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

func maskPhone(phone string) string {
	d := strings.TrimPrefix(normalizePhone(phone), "+")
	if len(d) <= 3 {
		return "***"
	}
	return d[:1] + strings.Repeat("*", len(d)-3) + d[len(d)-2:]
}
