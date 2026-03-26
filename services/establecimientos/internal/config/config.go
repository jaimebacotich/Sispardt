package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port            string
	DBDSN           string
	KeycloakJWKSURL string
	KeycloakIssuer  string
	LogLevel        string
	Env             string
	// Keycloak Admin API (para crear usuarios recepcionista)
	KeycloakAdminURL     string // ej: http://keycloak:8080
	KeycloakRealm        string // ej: sispardt
	KeycloakClientID     string // ej: sispardt-establecimientos-svc
	KeycloakClientSecret string
	DefaultUserPassword  string // contraseña inicial para nuevos usuarios
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:                 getEnv("PORT", "8081"),
		DBDSN:                os.Getenv("DB_DSN"),
		KeycloakJWKSURL:      os.Getenv("KEYCLOAK_JWKS_URL"),
		KeycloakIssuer:       os.Getenv("KEYCLOAK_ISSUER"),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		Env:                  getEnv("ENV", "development"),
		KeycloakAdminURL:     getEnv("KEYCLOAK_ADMIN_URL", "http://keycloak:8080"),
		KeycloakRealm:        getEnv("KEYCLOAK_REALM", "sispardt"),
		KeycloakClientID:     getEnv("KEYCLOAK_CLIENT_ID", "sispardt-establecimientos-svc"),
		KeycloakClientSecret: os.Getenv("KEYCLOAK_CLIENT_SECRET"),
		DefaultUserPassword:  getEnv("DEFAULT_USER_PASSWORD", "CambiarMe123!"),
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
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
