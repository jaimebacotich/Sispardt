package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"sispardt/auditoria-sesiones/internal/auth"
	"sispardt/auditoria-sesiones/internal/keycloak"
	"sispardt/auditoria-sesiones/internal/metrics"
	"sispardt/auditoria-sesiones/internal/poller"
	"sispardt/auditoria-sesiones/internal/repository"
)

func NewRouter(
	jwtValidator *auth.JWTValidator,
	repo *repository.SesionesRepo,
	kcClient *keycloak.AdminClient,
	pollerState *poller.State,
) http.Handler {
	r := chi.NewRouter()

	// Middleware global
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)
	r.Use(metrics.Middleware)

	// Probes y métricas (sin autenticación)
	healthHandler := NewHealthHandler(pollerState)
	r.Get("/health", healthHandler.Health)
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{"status": "ready"})
	})
	r.Get("/metrics", metrics.Handler().ServeHTTP)

	// API v1 — requiere JWT válido + rol admin_general
	r.Group(func(r chi.Router) {
		r.Use(jwtValidator.Middleware)
		r.Use(auth.RequireRole(auth.RoleAdminGeneral))

		sesionesHandler := NewSesionesHandler(repo, kcClient)
		conectadosHandler := NewConectadosHandler(kcClient)

		r.Get("/api/v1/auditoria-sesiones", sesionesHandler.List)
		r.Get("/api/v1/auditoria-sesiones/conectados", conectadosHandler.GetConectados)
	})

	return r
}

// corsMiddleware añade headers CORS permisivos en desarrollo.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
