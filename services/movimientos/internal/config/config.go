package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port              string
	DBDSN             string // app_recepcionista — RLS habilitado
	DBDSNStats        string // app_resp_estadistica — sin RLS, solo lectura
	KeycloakJWKSURL   string
	KeycloakIssuer    string
	LogLevel          string
	Env               string
	SistemaInicioDate string // primer día que requiere cierre (YYYY-MM-DD)
	// Keycloak Admin API (para enriquecimiento de auditoría)
	KeycloakAdminURL     string
	KeycloakRealm        string
	KeycloakClientID     string
	KeycloakClientSecret string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:              getEnv("PORT", "8082"),
		DBDSN:             os.Getenv("DB_DSN"),
		DBDSNStats:        os.Getenv("DB_DSN_STATS"),
		KeycloakJWKSURL:   os.Getenv("KEYCLOAK_JWKS_URL"),
		KeycloakIssuer:    os.Getenv("KEYCLOAK_ISSUER"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		Env:               getEnv("ENV", "development"),
		SistemaInicioDate:    getEnv("SISTEMA_INICIO_DATE", "2026-03-10"),
		KeycloakAdminURL:     getEnv("KEYCLOAK_ADMIN_URL", "http://keycloak:8080"),
		KeycloakRealm:        getEnv("KEYCLOAK_REALM", "sispardt"),
		KeycloakClientID:     getEnv("KEYCLOAK_CLIENT_ID", "sispardt-movimientos-svc"),
		KeycloakClientSecret: os.Getenv("KEYCLOAK_CLIENT_SECRET"),
	}
	if cfg.DBDSN == "" {
		return nil, fmt.Errorf("variable DB_DSN requerida")
	}
	if cfg.DBDSNStats == "" {
		return nil, fmt.Errorf("variable DB_DSN_STATS requerida")
	}
	if cfg.KeycloakJWKSURL == "" {
		return nil, fmt.Errorf("variable KEYCLOAK_JWKS_URL requerida")
	}
	if cfg.KeycloakIssuer == "" {
		return nil, fmt.Errorf("variable KEYCLOAK_ISSUER requerida")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
