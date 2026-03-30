package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port                string
	DBDSN               string
	KeycloakJWKSURL     string
	KeycloakIssuer      string
	LogLevel            string
	Env                 string
	KeycloakAdminURL    string
	KeycloakRealm       string
	KCClientID          string
	KCClientSecret      string
	PollIntervalSeconds int
}

func Load() (*Config, error) {
	pollInterval := 30
	if v := os.Getenv("POLL_INTERVAL_SECONDS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			pollInterval = n
		}
	}

	cfg := &Config{
		Port:                getEnv("PORT", "8085"),
		DBDSN:               os.Getenv("DB_DSN"),
		KeycloakJWKSURL:     os.Getenv("KEYCLOAK_JWKS_URL"),
		KeycloakIssuer:      os.Getenv("KEYCLOAK_ISSUER"),
		LogLevel:            getEnv("LOG_LEVEL", "info"),
		Env:                 getEnv("ENV", "development"),
		KeycloakAdminURL:    getEnv("KEYCLOAK_ADMIN_URL", "http://keycloak:8080"),
		KeycloakRealm:       getEnv("KEYCLOAK_REALM", "sispardt"),
		KCClientID:          getEnv("KC_CLIENT_ID", "sispardt-sistema-svc"),
		KCClientSecret:      os.Getenv("KC_CLIENT_SECRET"),
		PollIntervalSeconds: pollInterval,
	}

	if cfg.DBDSN == "" {
		return nil, fmt.Errorf("variable de entorno DB_DSN requerida")
	}
	if cfg.KeycloakJWKSURL == "" {
		return nil, fmt.Errorf("variable de entorno KEYCLOAK_JWKS_URL requerida")
	}
	if cfg.KeycloakIssuer == "" {
		return nil, fmt.Errorf("variable de entorno KEYCLOAK_ISSUER requerida")
	}
	if cfg.KCClientSecret == "" {
		return nil, fmt.Errorf("variable de entorno KC_CLIENT_SECRET requerida")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
