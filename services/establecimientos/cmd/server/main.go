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

	"sispardt/establecimientos/internal/auth"
	"sispardt/establecimientos/internal/config"
	"sispardt/establecimientos/internal/handler"
	"sispardt/establecimientos/internal/keycloak"
	"sispardt/establecimientos/internal/repository"
	"sispardt/establecimientos/internal/service"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Cargar configuración
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error de configuración: %v\n", err)
		os.Exit(1)
	}

	// Configurar logger
	setupLogger(cfg.LogLevel, cfg.Env)
	log.Info().Str("service", "establecimientos").Str("port", cfg.Port).Msg("iniciando servicio")

	// Conectar a la base de datos
	pool, err := repository.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("no se pudo conectar a la base de datos")
	}
	defer pool.Close()
	log.Info().Msg("conexión a PostgreSQL establecida")

	// Inicializar validador JWT con JWKS de Keycloak
	jwtValidator, err := auth.NewJWTValidator(ctx, cfg.KeycloakJWKSURL, cfg.KeycloakIssuer)
	if err != nil {
		log.Fatal().Err(err).Str("jwks_url", cfg.KeycloakJWKSURL).Msg("no se pudo inicializar el validador JWT")
	}
	log.Info().Str("issuer", cfg.KeycloakIssuer).Msg("validador JWT listo")

	// Inicializar cliente Keycloak Admin (opcional: solo si KC_CLIENT_SECRET está configurado)
	var kcClient *keycloak.AdminClient
	if cfg.KeycloakClientSecret != "" {
		kcClient = keycloak.NewAdminClient(
			cfg.KeycloakAdminURL,
			cfg.KeycloakRealm,
			cfg.KeycloakClientID,
			cfg.KeycloakClientSecret,
			cfg.DefaultUserPassword,
		)
		log.Info().Str("admin_url", cfg.KeycloakAdminURL).Msg("cliente Keycloak Admin listo")
	} else {
		log.Warn().Msg("KEYCLOAK_CLIENT_SECRET no definido: creación de usuarios de sistema deshabilitada")
	}

	// Inicializar capas de la aplicación
	estSvc := service.NewEstablecimientoService(pool, kcClient)
	catSvc := service.NewCatalogoService(pool)
	router := handler.NewRouter(jwtValidator, estSvc, catSvc, kcClient)

	// Servidor HTTP
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Iniciar servidor en goroutine
	go func() {
		log.Info().Str("addr", srv.Addr).Msg("servidor HTTP escuchando")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("error del servidor HTTP")
		}
	}()

	// Esperar señal de shutdown (SIGTERM para Docker/K8s, SIGINT para Ctrl+C)
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
