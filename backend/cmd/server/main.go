// Command server — прототип-бэкенд для akk-railway: SMS-авторизация + лёгкая заявка.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	"akk-railway-backend/internal/admin"
	"akk-railway-backend/internal/ai"
	"akk-railway-backend/internal/apidocs"
	"akk-railway-backend/internal/auth"
	"akk-railway-backend/internal/config"
	"akk-railway-backend/internal/credit"
	"akk-railway-backend/internal/egov"
	"akk-railway-backend/internal/sms"
	"akk-railway-backend/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	db, err := store.New(ctx, cfg.DatabaseURL)
	cancel()
	if err != nil {
		logger.Error("startup: не удалось подключиться к БД", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	// Разовая очистка заявок (для демо): включается env CLEAR_APPLICATIONS=true,
	// после прогона флаг нужно снять. Клиентов/аккаунты не трогает.
	if os.Getenv("CLEAR_APPLICATIONS") == "true" {
		cctx, ccancel := context.WithTimeout(context.Background(), 15*time.Second)
		n, cerr := db.ClearApplications(cctx)
		ccancel()
		if cerr != nil {
			logger.Error("startup: очистка заявок не удалась", "err", cerr)
		} else {
			logger.Info("startup: заявки очищены (CLEAR_APPLICATIONS)", "deleted", n)
		}
	}

	// Сидинг фейковой «базы мобильных граждан» для демо-входа по ИИН
	// (список — auth.DemoCitizens). Идемпотентно; безопасно при рестартах.
	sctx, scancel := context.WithTimeout(context.Background(), 15*time.Second)
	auth.SeedDemoCitizens(sctx, db, logger)
	scancel()

	sender := sms.New(cfg.SMSProvider, cfg.SMSURL, cfg.SMSLogin, cfg.SMSPassword, cfg.SMSOriginator, logger)
	otp := auth.NewOTP(db, sender, cfg.OTPTTL, cfg.OTPRateLimit, cfg.OTPMaxPerHr)
	issuer := auth.NewIssuer(cfg.JWTSecret, cfg.JWTIssuer, cfg.AccessTTL)

	// eGov SSO включается только при заданном EGOV_TOKEN_URL; иначе клиент nil → /ssoEgovLogin отдаёт 404.
	var egovClient *egov.Client
	if cfg.EGovTokenURL != "" {
		egovClient = egov.New(cfg.EGovClientID, cfg.EGovClientSecret, cfg.EGovTokenURL,
			cfg.EGovBaseURL, cfg.EGovRedirectURI, cfg.EGovResolve, logger)
		logger.Info("eGov SSO: реальный клиент", "token_url", cfg.EGovTokenURL, "redirect_uri", cfg.EGovRedirectURI)
	} else {
		logger.Info("eGov SSO: не сконфигурирован (только демо-вход)")
	}

	// Вход с мобильного по токену старой системы (.NET Agro.Identity) включается
	// только при заданном LEGACY_JWT_SECRET; иначе legacy nil → /ssoMobileLogin → 404.
	var legacy *auth.LegacyVerifier
	if cfg.LegacyJWTSecret != "" {
		legacy = auth.NewLegacyVerifier(cfg.LegacyJWTSecret, cfg.LegacyJWTIssuer, cfg.LegacyJWTAudiences)
		logger.Info("mobile SSO: проверка legacy-токенов включена", "issuer", cfg.LegacyJWTIssuer, "audiences", cfg.LegacyJWTAudiences)
	} else {
		logger.Info("mobile SSO: не сконфигурирован (LEGACY_JWT_SECRET пуст)")
	}

	authH := auth.NewHandler(db, otp, issuer, egovClient, legacy, cfg.DemoMode, logger)
	// ИИ-распознавание полей документов: включается при заданном ANTHROPIC_API_KEY,
	// иначе extractor == nil и эндпоинт /my-documents/:key/extract отдаёт 503.
	extractor := ai.NewExtractor()
	if extractor != nil {
		logger.Info("credit: ИИ-распознавание полей включено")
	} else {
		logger.Info("credit: ИИ-распознавание полей выключено (нет ANTHROPIC_API_KEY)")
	}
	creditH := credit.NewHandler(db, logger, extractor)
	adminH := admin.NewHandler(db, issuer, cfg.AdminUsername, cfg.AdminPassword, logger)

	e := echo.New()
	e.HideBanner = true
	e.Use(middleware.Recover())
	e.Use(middleware.RequestLoggerWithConfig(middleware.RequestLoggerConfig{
		LogStatus: true, LogMethod: true, LogURI: true,
		LogValuesFunc: func(_ echo.Context, v middleware.RequestLoggerValues) error {
			logger.Info("http", "method", v.Method, "uri", v.URI, "status", v.Status)
			return nil
		},
	}))
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: cfg.AllowedOrigins,
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
	}))

	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	// Документация API: /openapi.yaml + /swagger (для мобильного приложения).
	apidocs.Register(e)

	authH.Register(e.Group("/api/v1/auth/Account"))
	creditH.Register(e.Group("/api/v1/credit"), authH.Middleware)
	adminH.Register(e.Group("/api/v1/admin"))

	go func() {
		addr := ":" + cfg.Port
		logger.Info("server: запуск", "addr", addr, "origins", cfg.AllowedOrigins)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			logger.Error("server: остановлен с ошибкой", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("server: graceful shutdown")
	shCtx, shCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shCancel()
	_ = e.Shutdown(shCtx)
}
