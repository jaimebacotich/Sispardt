package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	KafkaBrokers []string
	KafkaGroupID string
	DBDSN        string
	LogLevel     string
	Env          string
}

func Load() (*Config, error) {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		return nil, fmt.Errorf("variable KAFKA_BROKERS requerida")
	}
	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		return nil, fmt.Errorf("variable DB_DSN requerida")
	}
	return &Config{
		KafkaBrokers: strings.Split(brokers, ","),
		KafkaGroupID: getEnv("KAFKA_GROUP_ID", "sispardt-replica-consumer"),
		DBDSN:        dsn,
		LogLevel:     getEnv("LOG_LEVEL", "info"),
		Env:          getEnv("ENV", "development"),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
