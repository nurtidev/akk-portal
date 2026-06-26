package auth

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	"akk-railway-backend/internal/egov"
	"akk-railway-backend/internal/store"
)

// Handler обслуживает эндпоинты /api/v1/auth/Account/*.
type Handler struct {
	store    *store.Store
	otp      *OTP
	issuer   *Issuer
	egov     *egov.Client    // nil → реальный eGov-вход не сконфигурирован (только демо)
	legacy   *LegacyVerifier // nil → вход с мобильного по токену старой системы выключен
	logger   *slog.Logger
	demoMode bool // вернуть код в ответе (demoCode) — демо без реальной SMS
}

// NewHandler создаёт auth-хендлер. egovClient может быть nil (тогда /ssoEgovLogin → 404).
// legacy может быть nil (тогда /ssoMobileLogin → 404).
func NewHandler(s *store.Store, otp *OTP, issuer *Issuer, egovClient *egov.Client, legacy *LegacyVerifier, demoMode bool, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{store: s, otp: otp, issuer: issuer, egov: egovClient, legacy: legacy, demoMode: demoMode, logger: logger}
}

// Register вешает маршруты на группу /Account.
func (h *Handler) Register(g *echo.Group) {
	g.POST("/CheckBmgAndSendSmsForRegister", h.sendRegisterSMS)
	g.POST("/RequestSms", h.requestLoginSMS)
	g.POST("/VerifySmsCode", h.verifySMS)
	g.POST("/smsRegister", h.smsRegister)
	g.POST("/login", h.passwordLoginDisabled)
	g.POST("/ssoDemoLogin", h.ssoDemoLogin)
	g.POST("/ssoEgovLogin", h.ssoEgovLogin)
	g.POST("/ssoMobileLogin", h.ssoMobileLogin)
	g.GET("/me", h.me, h.Middleware)
}

// --- DTO -----------------------------------------------------------------

type sendRegisterReq struct {
	IIN   string `json:"iin"`
	Phone string `json:"phone"`
}

type requestSmsReq struct {
	IIN         string `json:"iin"`
	PhoneNumber string `json:"phoneNumber"`
}

type verifyReq struct {
	IIN     string `json:"iin"`
	Code    string `json:"code"`
	Purpose string `json:"purpose"`
}

type registerReq struct {
	IIN         string `json:"iin"`
	LastName    string `json:"lastName"`
	FirstName   string `json:"firstName"`
	MiddleName  string `json:"middleName"`
	PhoneNumber string `json:"phoneNumber"`
}

// --- Handlers ------------------------------------------------------------

// sendRegisterSMS: шаг 1 регистрации. БМГ-проверку в прототипе пропускаем (mock).
func (h *Handler) sendRegisterSMS(c echo.Context) error {
	var req sendRegisterReq
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "некорректный запрос")
	}
	iin := onlyDigits(req.IIN)
	phone := normalizePhone(req.Phone)
	if len(iin) != 12 {
		return badRequest(c, "ИИН должен состоять из 12 цифр")
	}
	if len(onlyDigits(phone)) != 11 {
		return badRequest(c, "некорректный номер телефона")
	}
	return h.sendCode(c, iin, phone, PurposeRegistration)
}

// requestLoginSMS: шаг 1 входа. Шлём код на телефон зарегистрированного клиента.
func (h *Handler) requestLoginSMS(c echo.Context) error {
	var req requestSmsReq
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "некорректный запрос")
	}
	iin := onlyDigits(req.IIN)
	if len(iin) != 12 {
		return badRequest(c, "ИИН должен состоять из 12 цифр")
	}
	client, err := h.store.GetClientByIINHash(c.Request().Context(), hashIIN(iin))
	if errors.Is(err, store.ErrNotFound) {
		return c.JSON(http.StatusNotFound, errBody("Пользователь с таким ИИН не зарегистрирован"))
	}
	if err != nil {
		return h.serverError(c, err)
	}
	// Телефон берём из профиля (а не из запроса) — нельзя слать код на чужой номер.
	phone := client.Phone
	if phone == "" {
		phone = normalizePhone(req.PhoneNumber)
	}
	return h.sendCode(c, iin, phone, PurposeLogin)
}

func (h *Handler) sendCode(c echo.Context, iin, phone, purpose string) error {
	code, err := h.otp.Send(c.Request().Context(), iin, phone, purpose)
	switch {
	case errors.Is(err, ErrRateLimit), errors.Is(err, ErrTooSoon):
		return c.JSON(http.StatusTooManyRequests, errBody(err.Error()))
	case err != nil && h.demoMode && code != "":
		// Демо: отправка SMS не удалась (нет баланса/сендер/креды), но код сгенерён —
		// продолжаем, фронт подставит demoCode. Демо не должно падать из-за провайдера.
		h.logger.Warn("auth: SMS не отправлен, демо-фолбэк", "err", err)
	case err != nil:
		return h.serverError(c, err)
	}
	resp := map[string]any{"sent": true}
	// Маскированный телефон, на который ушёл код («подтянули номер из базы») —
	// фронт показывает его на шаге ввода кода.
	if masked := maskPhoneForResp(phone); masked != "" {
		resp["phone"] = masked
	}
	if h.demoMode {
		// Демо-режим: фронт сам подставит код в ячейки (без реальной SMS).
		resp["demoCode"] = code
		resp["debugCode"] = code // алиас для совместимости с локальными тестами
	}
	return c.JSON(http.StatusOK, resp)
}

// maskPhoneForResp маскирует телефон для ответа API: +7 700 ***67.
func maskPhoneForResp(phone string) string {
	d := onlyDigits(phone)
	if len(d) < 6 {
		return ""
	}
	return "+" + d[:1] + " " + d[1:4] + " ***" + d[len(d)-2:]
}

// verifySMS проверяет код. Для purpose=login дополнительно возвращает токены.
func (h *Handler) verifySMS(c echo.Context) error {
	var req verifyReq
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "некорректный запрос")
	}
	iin := onlyDigits(req.IIN)
	purpose := req.Purpose
	if purpose == "" {
		purpose = PurposeRegistration
	}

	verified, attemptsLeft, err := h.otp.Verify(c.Request().Context(), iin, onlyDigits(req.Code), purpose)
	if err != nil && !errors.Is(err, ErrInvalidCode) {
		// Истёк / нет кода / исчерпаны попытки — отдаём 200 с verified=false и сообщением,
		// чтобы фронт показал текст (он читает r.data.verified / attemptsLeft).
		return c.JSON(http.StatusOK, map[string]any{
			"verified": false, "attemptsLeft": attemptsLeft, "message": err.Error(),
		})
	}

	resp := map[string]any{"verified": verified, "attemptsLeft": attemptsLeft}
	if !verified {
		resp["message"] = "Неверный код"
		return c.JSON(http.StatusOK, resp)
	}

	// Успешный вход по SMS — сразу выдаём токены.
	if purpose == PurposeLogin {
		client, err := h.store.GetClientByIINHash(c.Request().Context(), hashIIN(iin))
		if err != nil {
			return h.serverError(c, err)
		}
		tokens, err := h.issuer.Issue(client)
		if err != nil {
			return h.serverError(c, err)
		}
		resp["accessToken"] = tokens.AccessToken
		resp["refreshToken"] = tokens.RefreshToken
	}
	return c.JSON(http.StatusOK, resp)
}

// smsRegister завершает регистрацию: создаёт клиента (после подтверждённого SMS) и выдаёт токены.
func (h *Handler) smsRegister(c echo.Context) error {
	var req registerReq
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "некорректный запрос")
	}
	iin := onlyDigits(req.IIN)
	phone := normalizePhone(req.PhoneNumber)
	if len(iin) != 12 {
		return badRequest(c, "ИИН должен состоять из 12 цифр")
	}
	if strings.TrimSpace(req.LastName) == "" || strings.TrimSpace(req.FirstName) == "" {
		return badRequest(c, "укажите фамилию и имя")
	}

	// Регистрация возможна только после подтверждённого кода.
	ok, err := h.otp.HasVerified(c.Request().Context(), iin, PurposeRegistration)
	if err != nil {
		return h.serverError(c, err)
	}
	if !ok {
		return c.JSON(http.StatusBadRequest, errBody(ErrNotVerified.Error()))
	}

	client, err := h.store.UpsertClient(c.Request().Context(), hashIIN(iin), store.Client{
		IIN:        iin,
		LastName:   strings.TrimSpace(req.LastName),
		FirstName:  strings.TrimSpace(req.FirstName),
		MiddleName: strings.TrimSpace(req.MiddleName),
		Phone:      phone,
	})
	if err != nil {
		return h.serverError(c, err)
	}
	tokens, err := h.issuer.Issue(client)
	if err != nil {
		return h.serverError(c, err)
	}
	h.logger.Info("auth: клиент зарегистрирован", "uid", client.UID, "iin", maskIIN(iin))
	return c.JSON(http.StatusOK, map[string]any{
		"uid":          client.UID.String(),
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
	})
}

// passwordLoginDisabled: в прототипе вход только по SMS.
func (h *Handler) passwordLoginDisabled(c echo.Context) error {
	return c.JSON(http.StatusBadRequest, errBody("Вход по паролю отключён — используйте вход по SMS"))
}

// demoUser — фиксированная демо-личность для SSO-входа (eGov/Bayterek).
type demoUser struct{ iin, last, first, middle, phone string }

func demoUserFor(provider string) demoUser {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "baiterek", "bayterek", "bgov":
		return demoUser{iin: "020950000222", last: "Нурланова", first: "Айгуль", middle: "Сериковна", phone: "+77019876543"}
	default: // egov
		return demoUser{iin: "010640000111", last: "Сапаров", first: "Бауыржан", middle: "Канатович", phone: "+77011234567"}
	}
}

// ssoDemoLogin — демо-вход через eGov/Bayterek (без реального SSO): создаёт демо-клиента
// и выдаёт токены, чтобы кабинет и подача заявки работали как при обычном входе.
// Доступен только в DEMO_MODE.
func (h *Handler) ssoDemoLogin(c echo.Context) error {
	if !h.demoMode {
		return c.JSON(http.StatusNotFound, errBody("демо-вход недоступен"))
	}
	var req struct {
		Provider string `json:"provider"`
	}
	_ = c.Bind(&req)
	du := demoUserFor(req.Provider)

	client, err := h.store.UpsertClient(c.Request().Context(), hashIIN(du.iin), store.Client{
		IIN: du.iin, LastName: du.last, FirstName: du.first, MiddleName: du.middle, Phone: du.phone,
	})
	if err != nil {
		return h.serverError(c, err)
	}
	tokens, err := h.issuer.Issue(client)
	if err != nil {
		return h.serverError(c, err)
	}
	h.logger.Info("auth: демо-SSO вход", "provider", req.Provider, "uid", client.UID)
	return c.JSON(http.StatusOK, map[string]any{
		"uid":          client.UID.String(),
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
		"name":         client.FullName(),
		"iin":          client.IIN,
		"phone":        client.Phone,
		"via":          req.Provider,
	})
}

// ssoEgovLogin — РЕАЛЬНЫЙ вход через eGov SSO (OAuth2 authorization code).
// Фронт после авторизации на idp.egov.kz (в т.ч. по ЭЦП) присылает code + redirectUri.
// Бэкенд меняет code → данные пользователя, находит/создаёт клиента, выдаёт токены.
// Доступен только когда сконфигурирован eGov-клиент (EGOV_TOKEN_URL).
func (h *Handler) ssoEgovLogin(c echo.Context) error {
	if h.egov == nil {
		return c.JSON(http.StatusNotFound, errBody("вход через eGov не сконфигурирован"))
	}
	var req struct {
		Code        string `json:"code"`
		RedirectURI string `json:"redirectUri"`
	}
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "некорректный запрос")
	}
	if strings.TrimSpace(req.Code) == "" {
		return badRequest(c, "отсутствует код авторизации")
	}

	info, err := h.egov.ExchangeCodeAndGetUser(c.Request().Context(), strings.TrimSpace(req.Code), strings.TrimSpace(req.RedirectURI))
	if err != nil {
		h.logger.Error("auth: eGov обмен code не удался", "err", err)
		return c.JSON(http.StatusBadGateway, errBody("не удалось получить данные из eGov"))
	}

	iin := onlyDigits(info.IIN)
	if len(iin) != 12 {
		h.logger.Error("auth: eGov вернул некорректный ИИН", "len", len(iin))
		return c.JSON(http.StatusBadGateway, errBody("eGov вернул некорректные данные пользователя"))
	}

	// Пустой телефон не нормализуем — иначе normalizePhone("") вернёт "+" и положит мусор в БД.
	phone := ""
	if strings.TrimSpace(info.Phone) != "" {
		phone = normalizePhone(info.Phone)
	}
	client, err := h.store.UpsertClient(c.Request().Context(), hashIIN(iin), store.Client{
		IIN:        iin,
		LastName:   strings.TrimSpace(info.LastName),
		FirstName:  strings.TrimSpace(info.FirstName),
		MiddleName: strings.TrimSpace(info.MiddleName),
		Phone:      phone,
	})
	if err != nil {
		return h.serverError(c, err)
	}
	tokens, err := h.issuer.Issue(client)
	if err != nil {
		return h.serverError(c, err)
	}
	h.logger.Info("auth: eGov SSO вход", "uid", client.UID, "iin", maskIIN(iin))
	return c.JSON(http.StatusOK, map[string]any{
		"uid":          client.UID.String(),
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
		"name":         client.FullName(),
		"iin":          client.IIN,
		"phone":        client.Phone,
		"via":          "egov",
	})
}

// ssoMobileLogin — вход с мобильного приложения по токену СТАРОЙ системы (.NET Agro.Identity).
// Мобайл присылает свой JWT; бэкенд ПРОВЕРЯЕТ его подпись (HS256, общий секрет), берёт
// ИИН/ФИО ИЗ ПРОВЕРЕННЫХ claims (не из тела запроса!), находит/создаёт клиента и выдаёт
// НАШИ токены. Дальше мобайл ходит с нашим токеном — старый больше не нужен.
// Телефона в legacy-токене нет — принимаем его отдельным полем как подсказку
// (привязанную к уже подтверждённому из токена ИИН). Доступен только при LEGACY_JWT_SECRET.
func (h *Handler) ssoMobileLogin(c echo.Context) error {
	if h.legacy == nil {
		return c.JSON(http.StatusNotFound, errBody("вход с мобильного не сконфигурирован"))
	}
	var req struct {
		Token       string `json:"token"`
		PhoneNumber string `json:"phoneNumber"` // опционально: телефона нет в legacy-токене
	}
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "некорректный запрос")
	}
	if strings.TrimSpace(req.Token) == "" {
		return badRequest(c, "отсутствует токен")
	}

	// Личность берём ТОЛЬКО из подписи токена — поля рядом не доверяем.
	id, err := h.legacy.Verify(req.Token)
	if err != nil {
		h.logger.Warn("auth: невалидный legacy-токен", "err", err)
		return c.JSON(http.StatusUnauthorized, errBody("недействительный токен"))
	}

	iinHash := hashIIN(id.IIN)

	// Телефон в токене не приходит. Берём из запроса, а если пуст — сохраняем уже
	// записанный в профиле (иначе UpsertClient затёр бы его пустым значением).
	phone := ""
	if strings.TrimSpace(req.PhoneNumber) != "" {
		phone = normalizePhone(req.PhoneNumber)
	} else if existing, gerr := h.store.GetClientByIINHash(c.Request().Context(), iinHash); gerr == nil {
		phone = existing.Phone
	}

	client, err := h.store.UpsertClient(c.Request().Context(), iinHash, store.Client{
		IIN:        id.IIN,
		LastName:   id.LastName,
		FirstName:  id.FirstName,
		MiddleName: id.MiddleName,
		Phone:      phone,
	})
	if err != nil {
		return h.serverError(c, err)
	}
	tokens, err := h.issuer.Issue(client)
	if err != nil {
		return h.serverError(c, err)
	}
	h.logger.Info("auth: вход с мобильного (legacy-токен)", "uid", client.UID, "iin", maskIIN(id.IIN))
	return c.JSON(http.StatusOK, map[string]any{
		"uid":          client.UID.String(),
		"accessToken":  tokens.AccessToken,
		"refreshToken": tokens.RefreshToken,
		"name":         client.FullName(),
		"iin":          client.IIN,
		"phone":        client.Phone,
		"via":          "mobile",
	})
}

// me возвращает профиль текущего пользователя (для кабинета).
func (h *Handler) me(c echo.Context) error {
	client := ClientFromContext(c)
	return c.JSON(http.StatusOK, map[string]any{
		"uid":   client.UID.String(),
		"iin":   client.IIN,
		"name":  client.FullName(),
		"phone": client.Phone,
	})
}

// --- Middleware ----------------------------------------------------------

const contextClientKey = "akkClient"

// Middleware проверяет Bearer-токен и кладёт клиента в контекст.
// Принимает два вида токенов:
//  1. наш токен (issuer akk-railway) — основной путь;
//  2. токен старой системы (.NET Agro.Identity, HS256) — для входа с мобильного,
//     если включён LEGACY_JWT_SECRET. Клиент заводится из claims при первом запросе.
func (h *Handler) Middleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		raw := c.Request().Header.Get("Authorization")
		if !strings.HasPrefix(raw, "Bearer ") {
			return c.JSON(http.StatusUnauthorized, errBody("требуется авторизация"))
		}
		token := strings.TrimPrefix(raw, "Bearer ")

		// 1. Наш токен.
		if claims, err := h.issuer.Parse(token); err == nil {
			uid, perr := uuid.Parse(claims.Subject)
			if perr != nil {
				return c.JSON(http.StatusUnauthorized, errBody("недействительный токен"))
			}
			client, gerr := h.store.GetClientByUID(c.Request().Context(), uid)
			if gerr != nil {
				return c.JSON(http.StatusUnauthorized, errBody("пользователь не найден"))
			}
			c.Set(contextClientKey, client)
			return next(c)
		}

		// 2. Токен старой системы (мобильное приложение), если вход включён.
		if h.legacy != nil {
			client, err := h.clientFromLegacyToken(c.Request().Context(), token)
			if err == nil {
				c.Set(contextClientKey, client)
				return next(c)
			}
			h.logger.Warn("auth: legacy-токен отклонён", "err", err)
		}

		return c.JSON(http.StatusUnauthorized, errBody("недействительный токен"))
	}
}

// clientFromLegacyToken проверяет токен старой системы и возвращает нашего клиента.
// В стационаре это чтение по ИИН; клиента создаём только при первом обращении
// (auto-provision из claims). Телефона в legacy-токене нет — у нового клиента пуст.
func (h *Handler) clientFromLegacyToken(ctx context.Context, token string) (store.Client, error) {
	id, err := h.legacy.Verify(token)
	if err != nil {
		return store.Client{}, err
	}
	iinHash := hashIIN(id.IIN)
	client, gerr := h.store.GetClientByIINHash(ctx, iinHash)
	if gerr == nil {
		return client, nil
	}
	if !errors.Is(gerr, store.ErrNotFound) {
		return store.Client{}, gerr
	}
	return h.store.UpsertClient(ctx, iinHash, store.Client{
		IIN:        id.IIN,
		LastName:   id.LastName,
		FirstName:  id.FirstName,
		MiddleName: id.MiddleName,
	})
}

// ClientFromContext достаёт клиента, положенного Middleware.
func ClientFromContext(c echo.Context) store.Client {
	if v, ok := c.Get(contextClientKey).(store.Client); ok {
		return v
	}
	return store.Client{}
}

// --- Helpers -------------------------------------------------------------

func (h *Handler) serverError(c echo.Context, err error) error {
	h.logger.Error("auth: внутренняя ошибка", "err", err)
	return c.JSON(http.StatusInternalServerError, errBody("внутренняя ошибка сервера"))
}

func badRequest(c echo.Context, msg string) error {
	return c.JSON(http.StatusBadRequest, errBody(msg))
}

func errBody(msg string) map[string]any { return map[string]any{"message": msg} }

func onlyDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// normalizePhone приводит номер к виду +7XXXXXXXXXX (11 цифр).
func normalizePhone(s string) string {
	d := onlyDigits(s)
	if len(d) == 11 {
		return "+" + d
	}
	if len(d) == 10 {
		return "+7" + d
	}
	return "+" + d
}

// hashIIN — sha256-хэш ИИН для безопасного поиска (без хранения сырого ИИН в индексе).
func hashIIN(iin string) string {
	sum := sha256.Sum256([]byte(iin))
	return hex.EncodeToString(sum[:])
}
