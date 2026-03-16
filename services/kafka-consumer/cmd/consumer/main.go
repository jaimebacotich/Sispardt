package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"sispardt/kafka-consumer/internal/config"
	"sispardt/kafka-consumer/internal/consumer"
	"sispardt/kafka-consumer/internal/repository"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error de configuración: %v\n", err)
		os.Exit(1)
	}

	setupLogger(cfg.LogLevel, cfg.Env)
	log.Info().
		Strs("brokers", cfg.KafkaBrokers).
		Str("group", cfg.KafkaGroupID).
		Msg("kafka-consumer iniciando")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Conectar con reintentos — la BD puede tardar más que Kafka en estar lista
	pool := mustConnectDB(ctx, cfg.DBDSN)
	defer pool.Close()
	log.Info().Msg("conexión a PostgreSQL (movimientos) establecida")

	repo := repository.NewReplicaRepo(pool)
	c := consumer.New(cfg.KafkaBrokers, cfg.KafkaGroupID, repo)
	defer func() {
		if err := c.Close(); err != nil {
			log.Warn().Err(err).Msg("error cerrando consumer Kafka")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	errCh := make(chan error, 1)
	go func() { errCh <- c.Run(ctx) }()

	select {
	case <-quit:
		log.Info().Msg("señal de shutdown — deteniendo consumer")
		cancel()
		<-errCh
	case runErr := <-errCh:
		if runErr != nil {
			log.Fatal().Err(runErr).Msg("consumer terminó con error")
		}
	}
	log.Info().Msg("kafka-consumer detenido correctamente")
}

func mustConnectDB(ctx context.Context, dsn string) *pgxpool.Pool {
	for i := 1; i <= 10; i++ {
		pool, err := repository.NewPool(ctx, dsn)
		if err == nil {
			return pool
		}
		log.Warn().Err(err).Int("intento", i).Msg("BD no disponible — reintentando en 5s")
		time.Sleep(5 * time.Second)
	}
	log.Fatal().Msg("no se pudo conectar a la base de datos tras 10 intentos")
	return nil // nunca alcanzado
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
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}
}
