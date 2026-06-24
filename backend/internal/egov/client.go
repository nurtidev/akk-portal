// Package egov — клиент eGov SSO (OAuth2 authorization code grant) для akk-portal.
//
// Поток: фронт уводит пользователя на idp.egov.kz/idp/oauth/authorize (там вход по
// логину/паролю/ЭЦП/МЭЦП), eGov возвращает code на redirect_uri фронта, фронт шлёт code
// на бэкенд, бэкенд меняет code → access_token и читает /idp/resource/user/basic|phone.
// Сама ЭЦП-аутентификация целиком на стороне IDP — на нашей стороне обычный OAuth2.
package egov

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const defaultHTTPTimeout = 15 * time.Second

// UserInfo — нормализованные данные физлица из eGov (akk-portal работает с ФЛ).
type UserInfo struct {
	IIN        string
	LastName   string
	FirstName  string
	MiddleName string
	Phone      string
}

// Client — HTTP-клиент eGov OAuth2 SSO.
type Client struct {
	clientID     string
	clientSecret string
	tokenURL     string // https://idp.egov.kz/idp/oauth/token
	baseURL      string // https://idp.egov.kz (только схема+хост; ресурсы — base + /idp/resource/...)
	redirectURI  string // дефолтный redirect_uri (если не пришёл в запросе)
	httpClient   *http.Client
	logger       *slog.Logger
}

// New создаёт клиент. resolve — необязательный host-pinning для тестового IDP,
// которого нет в публичном DNS: формат "test.idp.egov.kz=195.12.114.235[,host2=ip2]".
// TLS-имя (SNI/проверка сертификата) остаётся по хосту из URL — мапится только TCP-адрес.
func New(clientID, clientSecret, tokenURL, baseURL, redirectURI, resolve string, logger *slog.Logger) *Client {
	if logger == nil {
		logger = slog.Default()
	}
	httpClient := &http.Client{Timeout: defaultHTTPTimeout}
	if t := pinnedTransport(resolve, logger); t != nil {
		httpClient.Transport = t
	}
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		// Защита от опечатки в конфиге: ресурсы (base+/idp/resource/...) должны идти
		// на схему+хост IDP. Если EGOV_BASE_URL не задан — выводим из token_url.
		baseURL = deriveBaseURL(tokenURL)
		logger.Warn("egov: EGOV_BASE_URL не задан, выведен из token_url", "base_url", baseURL)
	}
	return &Client{
		clientID:     clientID,
		clientSecret: clientSecret,
		tokenURL:     tokenURL,
		baseURL:      baseURL,
		redirectURI:  redirectURI,
		httpClient:   httpClient,
		logger:       logger,
	}
}

// DefaultRedirectURI — redirect_uri из конфига (fallback, если запрос не прислал свой).
func (c *Client) DefaultRedirectURI() string { return c.redirectURI }

// ExchangeCodeAndGetUser меняет authorization code на данные пользователя.
// redirectURI ОБЯЗАН совпадать с тем, что фронт отправил в /authorize (eGov сверяет точно).
func (c *Client) ExchangeCodeAndGetUser(ctx context.Context, code, redirectURI string) (UserInfo, error) {
	if strings.TrimSpace(redirectURI) == "" {
		redirectURI = c.redirectURI
	}

	accessToken, err := c.exchangeCode(ctx, code, redirectURI)
	if err != nil {
		return UserInfo{}, fmt.Errorf("egov: exchange code: %w", err)
	}

	basic, err := c.getResource(ctx, accessToken, "/idp/resource/user/basic")
	if err != nil {
		return UserInfo{}, fmt.Errorf("egov: get basic info: %w", err)
	}
	// Телефон — необязателен: сбой/отсутствие доступа не должен ронять логин, но и не
	// должен глотаться молча (иначе непонятно, почему профиль без номера).
	phoneResp, phoneErr := c.getResource(ctx, accessToken, "/idp/resource/user/phone")
	if phoneErr != nil {
		c.logger.Warn("egov: не удалось получить телефон пользователя", "err", phoneErr)
	}

	// /idp/resource/user/basic — вложенный объект person{} (+ organization{}, type).
	// Fallback на плоскую форму, если eGov вернёт поля в корне (чтобы ИИН не распарсился
	// пустым и логин не упал «вслепую»).
	person := getMap(basic, "person")
	if person == nil {
		person = basic
		c.logger.Warn("egov: /user/basic вернул плоскую форму (нет person), читаем поля из корня")
	}

	info := UserInfo{
		IIN:        getString(person, "iin"),
		LastName:   getString(person, "surname"),
		FirstName:  getString(person, "name"),
		MiddleName: getString(person, "patronymic"),
	}
	if phoneResp != nil {
		info.Phone = getString(phoneResp, "phone")
	}
	return info, nil
}

func (c *Client) exchangeCode(ctx context.Context, code, redirectURI string) (string, error) {
	data := url.Values{
		"grant_type":   {"authorization_code"},
		"code":         {code},
		"redirect_uri": {redirectURI},
		"client_id":    {c.clientID},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	// eGov требует Basic-аутентификацию клиента: Authorization: Basic base64(client_id:client_secret).
	// (IDP_описание: «Метод требует Basic аутентификацию клиента».) client_secret — только в
	// заголовке, не в теле; в теле остаётся client_id (как в примере eGov).
	if c.clientSecret != "" {
		req.SetBasicAuth(c.clientID, c.clientSecret)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		// На ошибке IDP возвращает {error,error_description} (без токена). Логируем усечённо,
		// чтобы не утащить в лог потенциально чувствительный payload целиком.
		c.logger.Error("egov: обмен code на token не удался", "status", resp.StatusCode, "body", truncate(string(body), 300))
		return "", fmt.Errorf("token exchange returned %d", resp.StatusCode)
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	token, _ := result["access_token"].(string)
	if token == "" {
		return "", fmt.Errorf("empty access_token in response")
	}
	return token, nil
}

func (c *Client) getResource(ctx context.Context, accessToken, path string) (map[string]any, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read resource %s: %w", path, err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("resource %s returned %d", path, resp.StatusCode)
	}

	var result map[string]any
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, err
	}
	return result, nil
}

// pinnedTransport строит http.Transport с подменой TCP-адреса для перечисленных хостов.
// Нужен на Railway: тестовый IDP (test.idp.egov.kz) нет в публичном DNS, резолвится
// только через прописанный IP. TLS ServerName остаётся по имени из URL — сертификат
// проверяется против test.idp.egov.kz, а не против IP.
func pinnedTransport(resolve string, logger *slog.Logger) http.RoundTripper {
	hostToIP := parseResolve(resolve)
	if len(hostToIP) == 0 {
		return nil
	}
	logger.Info("egov: включён host-pinning для тестового IDP", "mappings", resolve)
	dialer := &net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}
	dt, ok := http.DefaultTransport.(*http.Transport)
	if !ok {
		dt = &http.Transport{}
	}
	base := dt.Clone()
	base.DialContext = func(ctx context.Context, network, addr string) (net.Conn, error) {
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return dialer.DialContext(ctx, network, addr)
		}
		if ip, ok := hostToIP[strings.ToLower(host)]; ok {
			addr = net.JoinHostPort(ip, port)
		}
		return dialer.DialContext(ctx, network, addr)
	}
	// На всякий случай фиксируем минимальную версию TLS (gov-стенды иногда строгие).
	if base.TLSClientConfig == nil {
		base.TLSClientConfig = &tls.Config{MinVersion: tls.VersionTLS12}
	}
	return base
}

func parseResolve(resolve string) map[string]string {
	out := map[string]string{}
	for _, pair := range strings.Split(resolve, ",") {
		pair = strings.TrimSpace(pair)
		if pair == "" {
			continue
		}
		host, ip, ok := strings.Cut(pair, "=")
		host, ip = strings.TrimSpace(strings.ToLower(host)), strings.TrimSpace(ip)
		if !ok || host == "" || ip == "" {
			continue
		}
		out[host] = ip
	}
	return out
}

// deriveBaseURL возвращает схему+хост из token_url (fallback, если EGOV_BASE_URL пуст).
func deriveBaseURL(tokenURL string) string {
	u, err := url.Parse(tokenURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

// truncate ограничивает строку n рунами (для безопасного логирования тел ответов).
func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}

func getString(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	v, _ := m[key].(string)
	return v
}

func getMap(m map[string]any, key string) map[string]any {
	if m == nil {
		return nil
	}
	v, _ := m[key].(map[string]any)
	return v
}
