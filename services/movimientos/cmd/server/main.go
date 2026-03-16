package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"sispardt/movimientos/internal/auth"
	"sispardt/movimientos/internal/config"
	"sispardt/movimientos/internal/handler"
	"sispardt/movimientos/internal/keycloak"
	"sispardt/movimientos/internal/repository"
	"sispardt/movimientos/internal/service"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error de configuración: %v\n", err)
		os.Exit(1)
	}

	setupLogger(cfg.LogLevel, cfg.Env)
	log.Info().Str("service", "movimientos").Str("port", cfg.Port).Msg("iniciando servicio")

	// Pool principal: app_recepcionista (RLS activo)
	pool, err := repository.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("no se pudo conectar a la BD principal")
	}
	defer pool.Close()

	// Pool de estadísticas: app_resp_estadistica (sin RLS, read-only)
	statsPool, err := repository.NewPool(ctx, cfg.DBDSNStats)
	if err != nil {
		log.Fatal().Err(err).Msg("no se pudo conectar a la BD de estadísticas")
	}
	defer statsPool.Close()

	log.Info().Msg("pools de PostgreSQL establecidos")

	jwtValidator, err := auth.NewJWTValidator(ctx, cfg.KeycloakJWKSURL, cfg.KeycloakIssuer)
	if err != nil {
		log.Fatal().Err(err).Str("jwks_url", cfg.KeycloakJWKSURL).Msg("no se pudo inicializar el validador JWT")
	}
	log.Info().Str("issuer", cfg.KeycloakIssuer).Msg("validador JWT listo")

	// Inicializar cliente Keycloak Admin (para enriquecimiento de auditoría)
	var kcClient *keycloak.AdminClient
	if cfg.KeycloakClientSecret != "" {
		kcClient = keycloak.NewAdminClient(
			cfg.KeycloakAdminURL,
			cfg.KeycloakRealm,
			cfg.KeycloakClientID,
			cfg.KeycloakClientSecret,
		)
		log.Info().Str("admin_url", cfg.KeycloakAdminURL).Msg("cliente Keycloak Admin listo")
	} else {
		log.Warn().Msg("KEYCLOAK_CLIENT_SECRET no definido: enriquecimiento de auditoría deshabilitado")
	}

	parteSvc := service.NewParteDiarioService(pool, statsPool, cfg.SistemaInicioDate)
	router := handler.NewRouter(jwtValidator, parteSvc, kcClient)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Str("addr", srv.Addr).Msg("servidor HTTP escuchando")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("error del servidor HTTP")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit

	log.Info().Msg("apagando servidor (graceful shutdown)...")
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error().Err(err).Msg("error durante el shutdown")
	}
	log.Info().Msg("servidor apagado correctamente")
}

func setupLogger(level, env string) {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if env == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}
	switch level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}
