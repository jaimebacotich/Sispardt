package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"sispardt/establecimientos/internal/auth"
	"sispardt/establecimientos/internal/domain"
	"sispardt/establecimientos/internal/service"
)

type EstablecimientoHandler struct {
	svc *service.EstablecimientoService
}

func NewEstablecimientoHandler(svc *service.EstablecimientoService) *EstablecimientoHandler {
	return &EstablecimientoHandler{svc: svc}
}

// List GET /api/v1/establecimientos
func (h *EstablecimientoHandler) List(w http.ResponseWriter, r *http.Request) {
	p := domain.ListParams{
		Page:     parseIntQuery(r, "page", 1),
		PageSize: parseIntQuery(r, "page_size", 20),
		Search:   r.URL.Query().Get("search"),
	}
	if v := r.URL.Query().Get("estado_admin"); v != "" {
		p.EstadoAdmin = v
	}
	if v := r.URL.Query().Get("localidad_id"); v != "" {
		id, _ := strconv.Atoi(v)
		p.LocalidadID = &id
	}
	if v := r.URL.Query().Get("categoria_id"); v != "" {
		id, _ := strconv.Atoi(v)
		p.CategoriaID = &id
	}

	result, err := h.svc.List(r.Context(), p)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al listar establecimientos")
		return
	}
	jsonOK(w, result)
}

// GetByID GET /api/v1/establecimientos/{id}
func (h *EstablecimientoHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	e, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al obtener establecimiento")
		return
	}
	if e == nil {
		jsonError(w, http.StatusNotFound, "establecimiento no encontrado")
		return
	}
	jsonOK(w, e)
}

// Create POST /api/v1/establecimientos
func (h *EstablecimientoHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil {
		jsonError(w, http.StatusUnauthorized, "sin autenticación")
		return
	}

	var req domain.CreateEstablecimientoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	result, err := h.svc.Create(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonCreated(w, result)
}

// Delete DELETE /api/v1/establecimientos/{id}
func (h *EstablecimientoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	id := chi.URLParam(r, "id")

	if err := h.svc.Delete(r.Context(), id, claims.Sub, r.RemoteAddr); err != nil {
		if err.Error() == "establecimiento no encontrado" {
			jsonError(w, http.StatusNotFound, err.Error())
			return
		}
		jsonError(w, http.StatusInternalServerError, "error al eliminar establecimiento")
		return
	}
	jsonNoContent(w)
}

// ListHabitaciones GET /api/v1/establecimientos/{id}/habitaciones
func (h *EstablecimientoHandler) ListHabitaciones(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	habs, err := h.svc.ListHabitaciones(r.Context(), id)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al listar habitaciones")
		return
	}
	jsonOK(w, habs)
}

// CreateHabitacion POST /api/v1/establecimientos/{id}/habitaciones
func (h *EstablecimientoHandler) CreateHabitacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	id := chi.URLParam(r, "id")

	var req domain.CreateHabitacionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	result, err := h.svc.CreateHabitacion(r.Context(), id, claims.Sub, r.RemoteAddr, req)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonCreated(w, result)
}

// UpdateHabitacionEstado PATCH /api/v1/establecimientos/{id}/habitaciones/{habId}/estado
func (h *EstablecimientoHandler) UpdateHabitacionEstado(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	establecimientoID := chi.URLParam(r, "id")
	habitacionID := chi.URLParam(r, "habId")

	var req domain.UpdateHabitacionEstadoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	if err := h.svc.UpdateHabitacionEstado(r.Context(), establecimientoID, habitacionID, claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

// UpdateHabitacion PUT /api/v1/establecimientos/{id}/habitaciones/{habId}
func (h *EstablecimientoHandler) UpdateHabitacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	establecimientoID := chi.URLParam(r, "id")
	habitacionID := chi.URLParam(r, "habId")

	var req domain.UpdateHabitacionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	result, err := h.svc.UpdateHabitacion(r.Context(), establecimientoID, habitacionID, claims.Sub, r.RemoteAddr, req)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

// ─── Personal ────────────────────────────────────────────────────────────────

// ListPersonal GET /api/v1/establecimientos/{id}/personal
func (h *EstablecimientoHandler) ListPersonal(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	ls, err := h.svc.ListPersonal(r.Context(), id)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al listar personal")
		return
	}
	jsonOK(w, ls)
}

// CreatePersonal POST /api/v1/establecimientos/{id}/personal
func (h *EstablecimientoHandler) CreatePersonal(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	id := chi.URLParam(r, "id")

	var req domain.CreatePersonalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	result, err := h.svc.CreatePersonal(r.Context(), claims.Sub, r.RemoteAddr, id, req)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonCreated(w, result)
}

// UpdatePersonal PUT /api/v1/establecimientos/{id}/personal/{personalId}
func (h *EstablecimientoHandler) UpdatePersonal(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	establecimientoID := chi.URLParam(r, "id")
	personalID := chi.URLParam(r, "personalId")

	var req domain.UpdatePersonalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	result, err := h.svc.UpdatePersonal(r.Context(), claims.Sub, r.RemoteAddr, establecimientoID, personalID, req)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

// TogglePersonalActivo PATCH /api/v1/establecimientos/{id}/personal/{personalId}/activo
func (h *EstablecimientoHandler) TogglePersonalActivo(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	establecimientoID := chi.URLParam(r, "id")
	personalID := chi.URLParam(r, "personalId")

	var req domain.TogglePersonalActivoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}

	err := h.svc.TogglePersonalActivo(r.Context(), claims.Sub, r.RemoteAddr, establecimientoID, personalID, req.Activo)
	if err != nil {
		jsonError(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, map[string]string{"status": "ok"})
}

func parseIntQuery(r *http.Request, key string, fallback int) int {
	v := r.URL.Query().Get(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil || n <= 0 {
		return fallback
	}
	return n
}
