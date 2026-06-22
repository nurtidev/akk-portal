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

	"akk-railway-backend/internal/auth"
	"akk-railway-backend/internal/config"
	"akk-railway-backend/internal/credit"
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

	authH := auth.NewHandler(db, otp, issuer, cfg.DemoMode, logger)
	creditH := credit.NewHandler(db, logger)

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

	authH.Register(e.Group("/api/v1/auth/Account"))
	creditH.Register(e.Group("/api/v1/credit"), authH.Middleware)

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
