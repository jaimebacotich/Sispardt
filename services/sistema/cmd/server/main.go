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

	"sispardt/sistema/internal/auth"
	"sispardt/sistema/internal/config"
	"sispardt/sistema/internal/handler"
	"sispardt/sistema/internal/keycloak"
	"sispardt/sistema/internal/poller"
	"sispardt/sistema/internal/repository"
	"sispardt/sistema/internal/service"
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
	log.Info().Str("service", "svc-sistema").Str("port", cfg.Port).Msg("iniciando servicio")

	// Conectar a la base de datos
	pool, err := repository.NewPool(ctx, cfg.DBDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("no se pudo conectar a la base de datos")
	}
	defer pool.Close()
	log.Info().Msg("conexión a PostgreSQL establecida")

	// Inicializar validador JWT con JWKS de Keycloak
	jwtValidator, err := newJWTValidatorWithRetry(ctx, cfg.KeycloakJWKSURL, cfg.KeycloakIssuer)
	if err != nil {
		log.Fatal().Err(err).Str("jwks_url", cfg.KeycloakJWKSURL).Msg("no se pudo inicializar el validador JWT tras reintentos")
	}
	log.Info().Str("issuer", cfg.KeycloakIssuer).Msg("validador JWT listo")

	// Inicializar cliente Keycloak Admin (único, compartido entre auditoría y gestión de usuarios)
	kcClient := keycloak.NewAdminClient(
		cfg.KeycloakAdminURL,
		cfg.KeycloakRealm,
		cfg.KCClientID,
		cfg.KCClientSecret,
	)
	kcClient.SetTrackedClients(clientesMonitoreados)

	// Resolver UUIDs de clientes al arrancar (se usan en /conectados)
	if err := kcClient.InitClientUUIDs(ctx, clientesMonitoreados); err != nil {
		log.Warn().Err(err).Strs("clients", clientesMonitoreados).
			Msg("no se pudieron resolver UUIDs de clientes al arrancar; se reintentará en la primera petición a /conectados")
	} else {
		log.Info().Strs("clients", clientesMonitoreados).Msg("UUIDs de clientes Keycloak resueltos")
	}

	// Inicializar repositorios
	sesionesRepo := repository.NewSesionesRepo(pool)
	usuariosRepo := repository.NewUsuarioSistemaRepo(pool)

	// Inicializar poller (eventos KC + sync inicial de usuarios)
	p := poller.New(sesionesRepo, kcClient, cfg.KeycloakRealm, cfg.PollIntervalSeconds)
	p.SetUsuariosRepo(usuariosRepo)
	go p.Run(ctx)
	log.Info().Int("interval_s", cfg.PollIntervalSeconds).Msg("poller de eventos Keycloak iniciado")

	// Inicializar servicio de usuarios del sistema
	userSvc := service.NewUsuarioSistemaService(pool, kcClient)

	// Construir router
	router := handler.NewRouter(jwtValidator, sesionesRepo, kcClient, p.State, userSvc, pool)

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

func newJWTValidatorWithRetry(ctx context.Context, jwksURL, issuer string) (*auth.JWTValidator, error) {
	delays := []time.Duration{5, 10, 20, 40, 60}
	var err error
	for i, d := range delays {
		var v *auth.JWTValidator
		v, err = auth.NewJWTValidator(ctx, jwksURL, issuer)
		if err == nil {
			return v, nil
		}
		log.Warn().Err(err).Int("intento", i+1).Dur("espera_s", d*time.Second).
			Msg("validador JWT no disponible — reintentando")
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(d * time.Second):
		}
	}
	return nil, err
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
