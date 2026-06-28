package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"sispardt/establecimientos/internal/auth"
	"sispardt/establecimientos/internal/keycloak"
	"sispardt/establecimientos/internal/metrics"
	"sispardt/establecimientos/internal/service"
)

func NewRouter(
	jwtValidator *auth.JWTValidator,
	estSvc *service.EstablecimientoService,
	catSvc *service.CatalogoService,
	kcClient *keycloak.AdminClient,
) http.Handler {
	r := chi.NewRouter()

	// Middleware global
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)
	r.Use(metrics.Middleware)

	// Probes y métricas (sin autenticación)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{"status": "ok", "service": "establecimientos"})
	})
	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		jsonOK(w, map[string]string{"status": "ready"})
	})
	r.Get("/metrics", metrics.Handler().ServeHTTP)

	// API v1 — requiere JWT válido
	r.Group(func(r chi.Router) {
		r.Use(jwtValidator.Middleware)

		estHandler := NewEstablecimientoHandler(estSvc)
		catHandler := NewCatalogoHandler(catSvc, estSvc)
		auditHandler := NewAuditoriaHandler(estSvc, kcClient)

		// Auditoría
		r.With(auth.RequireRole(auth.RoleAdminGeneral, auth.RoleResponsableRegistro)).
			Get("/api/v1/auditoria", auditHandler.List)

		// Catálogos
		r.Route("/api/v1/catalogos", func(r chi.Router) {
			r.Get("/clasificaciones", catHandler.ListClasificaciones)
			r.Get("/categorias", catHandler.ListCategorias) // DEPRECATED: mejor usar get por clasificacion, pero lo dejamos por compatibilidad
			r.Get("/servicios", catHandler.ListServicios)
			r.Get("/tipos-habitacion", catHandler.ListTiposHabitacion)
			r.Get("/tipos-cama", catHandler.ListTiposCama)
			r.Get("/tipos-personal", catHandler.ListTiposPersonal)

			r.With(auth.RequireRole(auth.RoleAdminGeneral, auth.RoleResponsableRegistro)).Group(func(r chi.Router) {
				r.Post("/clasificaciones", catHandler.CreateClasificacion)
				r.Put("/clasificaciones/{id}", catHandler.UpdateClasificacion)
				r.Delete("/clasificaciones/{id}", catHandler.DeleteClasificacion)

				r.Post("/categorias", catHandler.CreateCategoria)
				r.Put("/categorias/{id}", catHandler.UpdateCategoria)
				r.Delete("/categorias/{id}", catHandler.DeleteCategoria)

				r.Post("/servicios", catHandler.CreateServicio)
				r.Put("/servicios/{id}", catHandler.UpdateServicio)
				r.Delete("/servicios/{id}", catHandler.DeleteServicio)

				r.Post("/tipos-habitacion", catHandler.CreateTipoHabitacion)
				r.Put("/tipos-habitacion/{id}", catHandler.UpdateTipoHabitacion)
				r.Delete("/tipos-habitacion/{id}", catHandler.DeleteTipoHabitacion)

				r.Post("/tipos-cama", catHandler.CreateTipoCama)
				r.Put("/tipos-cama/{id}", catHandler.UpdateTipoCama)
				r.Delete("/tipos-cama/{id}", catHandler.DeleteTipoCama)
			})
		})

		// Geográficos
		r.Route("/api/v1/geo", func(r chi.Router) {
			r.Get("/paises", catHandler.ListPaises)
			r.Get("/divisiones-principales", catHandler.ListDivisionesPrincipales)
			r.Get("/divisiones-secundarias", catHandler.ListDivisionesSecundarias)
			r.Get("/localidades", catHandler.ListLocalidades)

			r.With(auth.RequireRole(auth.RoleAdminGeneral, auth.RoleResponsableRegistro)).Group(func(r chi.Router) {
				r.Post("/paises", catHandler.CreatePais)
				r.Put("/paises/{id}", catHandler.UpdatePais)
				r.Delete("/paises/{id}", catHandler.DeletePais)

				r.Post("/divisiones-principales", catHandler.CreateDivisionPrincipal)
				r.Put("/divisiones-principales/{id}", catHandler.UpdateDivisionPrincipal)
				r.Delete("/divisiones-principales/{id}", catHandler.DeleteDivisionPrincipal)

				r.Post("/divisiones-secundarias", catHandler.CreateDivisionSecundaria)
				r.Put("/divisiones-secundarias/{id}", catHandler.UpdateDivisionSecundaria)
				r.Delete("/divisiones-secundarias/{id}", catHandler.DeleteDivisionSecundaria)

				r.Post("/localidades", catHandler.CreateLocalidad)
				r.Put("/localidades/{id}", catHandler.UpdateLocalidad)
				r.Delete("/localidades/{id}", catHandler.DeleteLocalidad)
			})
		})

		// Establecimientos
		r.Route("/api/v1/establecimientos", func(r chi.Router) {
			// Lectura: todos los roles
			r.Get("/", estHandler.List)
			r.Get("/{id}", estHandler.GetByID)
			r.Get("/{id}/habitaciones", estHandler.ListHabitaciones)

			// Escritura: responsable_registro y tecnico_registro
			r.With(auth.RequireRole(
				auth.RoleAdminGeneral,
				auth.RoleResponsableRegistro,
				auth.RoleTecnicoRegistro,
			)).Post("/", estHandler.Create)

			r.With(auth.RequireRole(
				auth.RoleAdminGeneral,
				auth.RoleResponsableRegistro,
				auth.RoleTecnicoRegistro,
			)).Put("/{id}", estHandler.Update)

			r.With(auth.RequireRole(
				auth.RoleResponsableRegistro,
				auth.RoleTecnicoRegistro,
			)).Group(func(r chi.Router) {
				r.Post("/{id}/habitaciones", estHandler.CreateHabitacion)
				r.Put("/{id}/habitaciones/{habId}", estHandler.UpdateHabitacion)
			})

			r.With(auth.RequireRole(
				auth.RoleRecepcionista,
				auth.RoleResponsableRegistro,
				auth.RoleTecnicoRegistro,
			)).Patch("/{id}/habitaciones/{habId}/estado", estHandler.UpdateHabitacionEstado)

			// -- Personal --
			r.Get("/{id}/personal", estHandler.ListPersonal)

			r.With(auth.RequireRole(
				auth.RoleAdminGeneral,
				auth.RoleResponsableRegistro,
				auth.RoleTecnicoRegistro,
			)).Group(func(r chi.Router) {
				r.Post("/{id}/personal", estHandler.CreatePersonal)
				r.Put("/{id}/personal/{personalId}", estHandler.UpdatePersonal)
				r.Patch("/{id}/personal/{personalId}/activo", estHandler.TogglePersonalActivo)
			})

			// Borrado: solo admin y responsable
			r.With(auth.RequireRole(
				auth.RoleAdminGeneral,
				auth.RoleResponsableRegistro,
			)).Delete("/{id}", estHandler.Delete)
		})

	})

	return r
}

// corsMiddleware añade headers CORS permisivos en desarrollo.
// En producción se debe restringir a los dominios reales.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
