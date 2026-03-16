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

	"sispardt/auditoria-sesiones/internal/auth"
	"sispardt/auditoria-sesiones/internal/config"
	"sispardt/auditoria-sesiones/internal/handler"
	"sispardt/auditoria-sesiones/internal/keycloak"
	"sispardt/auditoria-sesiones/internal/poller"
	"sispardt/auditoria-sesiones/internal/repository"
)

// clientesMonitoreados son los clientIDs de Keycloak cuyos usuarios
// se muestran en /conectados (se resuelven a UUIDs al arrancar).
var clientesMonitoreados = []string{
	"sispardt-web",
	"security-admin-console",
}

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
	log.Info().Str("service", "auditoria-sesiones").Str("port", cfg.Port).Msg("iniciando servicio")

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

	// Inicializar cliente Keycloak Admin
	kcClient := keycloak.NewAdminClient(
		cfg.KeycloakAdminURL,
		cfg.KeycloakRealm,
		cfg.KCClientID,
		cfg.KCClientSecret,
	)

	// Registrar los clientes a monitorear (para resolución on-demand si KC no está listo)
	kcClient.SetTrackedClients(clientesMonitoreados)

	// Resolver UUIDs de clientes al arrancar (se usan en /conectados)
	if err := kcClient.InitClientUUIDs(ctx, clientesMonitoreados); err != nil {
		log.Warn().Err(err).Strs("clients", clientesMonitoreados).
			Msg("no se pudieron resolver UUIDs de clientes al arrancar; se reintentará en la primera petición a /conectados")
	} else {
		log.Info().Strs("clients", clientesMonitoreados).Msg("UUIDs de clientes Keycloak resueltos")
	}

	// Inicializar repositorio y poller
	repo := repository.NewSesionesRepo(pool)
	p := poller.New(repo, kcClient, cfg.KeycloakRealm, cfg.PollIntervalSeconds)

	// Iniciar poller en background
	go p.Run(ctx)
	log.Info().Int("interval_s", cfg.PollIntervalSeconds).Msg("poller de eventos Keycloak iniciado")

	// Construir router
	router := handler.NewRouter(jwtValidator, repo, kcClient, p.State)

	// Servidor HTTP
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

	// Esperar señal de shutdown
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
