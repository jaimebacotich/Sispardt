package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/rs/zerolog/log"
	"sispardt/movimientos/internal/auth"
	"sispardt/movimientos/internal/keycloak"
	"sispardt/movimientos/internal/metrics"
	"sispardt/movimientos/internal/service"
)

func NewRouter(
	jwtValidator *auth.JWTValidator,
	parteSvc *service.ParteDiarioService,
	kcClient *keycloak.AdminClient,
) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)
	r.Use(metrics.Middleware)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{"status": "ok", "service": "movimientos"})
	})
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{"status": "ready"})
	})
	r.Get("/metrics", metrics.Handler().ServeHTTP)

	r.Group(func(r chi.Router) {
		r.Use(jwtValidator.Middleware)

		parteHandler := NewParteDiarioHandler(parteSvc)
		cierreHandler := NewCierreDiarioHandler(parteSvc)
		statsHandler := NewEstadisticasHandler(parteSvc)
		catHandler := NewCatalogosHandler(parteSvc)
		auditHandler := NewAuditoriaHandler(parteSvc, kcClient)

		// Catálogos de movimientos
		r.With(auth.RequireRole(
			auth.RoleRecepcionista,
			auth.RoleResponsableRegistro,
			auth.RoleAdminGeneral,
			auth.RoleResponsableEstadistica,
		)).Get("/api/v1/catalogos/movimientos", catHandler.List)

		// Partes diarios
		r.Route("/api/v1/partes", func(r chi.Router) {
			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
				auth.RoleResponsableEstadistica,
			)).Get("/", parteHandler.List)

			// rutas literales ANTES de /{id} para que Chi no las capture como ID
			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Get("/estado-habitaciones", parteHandler.EstadoHabitaciones)

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
			)).Get("/reporte", parteHandler.Reporte)

			r.With(auth.RequireRole(
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Get("/reporte-nacional", parteHandler.ReporteNacional)

			r.With(auth.RequireRole(
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Get("/reporte-internacional", parteHandler.ReporteInternacional)

			r.With(auth.RequireRole(
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Post("/reporte-municipio-nacional", parteHandler.ReporteMunicipioNacional)

			r.With(auth.RequireRole(
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Post("/reporte-municipio-internacional", parteHandler.ReporteMunicipioInternacional)

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
			)).Post("/", parteHandler.Create)

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Get("/{id}", parteHandler.GetByID)

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
			)).Post("/{id}/checkout", parteHandler.Checkout)

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
			)).Delete("/{id}", parteHandler.Anular)
		})

		// Cierres diarios
		r.Route("/api/v1/cierres", func(r chi.Router) {
			multiRol := auth.RequireRole(
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
				auth.RoleRecepcionista,
			)

			r.With(multiRol).Get("/", cierreHandler.List)
			// pendientes ANTES de /{fecha}
			r.With(multiRol).Get("/pendientes", cierreHandler.Pendientes)
			r.With(multiRol).Get("/{fecha}", cierreHandler.GetByFecha)

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
				auth.RoleAdminGeneral,
			)).Post("/", cierreHandler.Create)
		})

		// Estadísticas
		r.Route("/api/v1/estadisticas", func(r chi.Router) {
			statsRol := auth.RequireRole(
				auth.RoleAdminGeneral,
				auth.RoleResponsableRegistro,
				auth.RoleTecnicoRegistro,
				auth.RoleRecepcionista,
			)
			r.With(statsRol).Get("/ocupacion",        statsHandler.OcupacionDiaria)
			r.With(statsRol).Get("/resumen",          statsHandler.Resumen)
			r.With(statsRol).Get("/nacionalidades",   statsHandler.Nacionalidades)
			r.With(statsRol).Get("/motivos",          statsHandler.MotivosViaje)
			r.With(statsRol).Get("/tipos-habitacion", statsHandler.TiposHabitacion)
		})

		// Auditoría de movimientos
		r.With(auth.RequireRole(
			auth.RoleAdminGeneral,
			auth.RoleResponsableRegistro,
		)).Get("/api/v1/movimientos/auditoria", auditHandler.List)
	})

	return r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Debug().Str("method", r.Method).Str("path", r.URL.Path).Str("origin", r.Header.Get("Origin")).Msg("CORS Middleware")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
