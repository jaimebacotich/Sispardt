package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"sispardt/sistema/internal/auth"
	"sispardt/sistema/internal/domain"
	"sispardt/sistema/internal/service"
)

type UsuarioSistemaHandler struct {
	svc *service.UsuarioSistemaService
}

func NewUsuarioSistemaHandler(svc *service.UsuarioSistemaService) *UsuarioSistemaHandler {
	return &UsuarioSistemaHandler{svc: svc}
}

// List GET /api/v1/usuarios-sistema
func (h *UsuarioSistemaHandler) List(w http.ResponseWriter, r *http.Request) {
	p := domain.UsuarioSistemaListParams{
		Page:     parseIntQuery(r, "page", 1),
		PageSize: parseIntQuery(r, "page_size", 20),
		Search:   r.URL.Query().Get("search"),
		Estado:   r.URL.Query().Get("estado"),
	}
	result, err := h.svc.List(r.Context(), p)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error al listar usuarios")
		return
	}
	jsonOK(w, result)
}

// GetByID GET /api/v1/usuarios-sistema/{id}
func (h *UsuarioSistemaHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error al obtener usuario")
		return
	}
	if u == nil {
		jsonErr(w, http.StatusNotFound, "usuario no encontrado")
		return
	}
	jsonOK(w, u)
}

// Create POST /api/v1/usuarios-sistema
func (h *UsuarioSistemaHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateUsuarioSistemaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}
	result, err := h.svc.Create(r.Context(), req)
	if err != nil {
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonCreated(w, result)
}

// Update PUT /api/v1/usuarios-sistema/{id}
func (h *UsuarioSistemaHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req domain.UpdateUsuarioSistemaRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonErr(w, http.StatusBadRequest, "cuerpo de solicitud inválido")
		return
	}
	result, err := h.svc.Update(r.Context(), id, req)
	if err != nil {
		if err.Error() == "usuario no encontrado" {
			jsonErr(w, http.StatusNotFound, err.Error())
			return
		}
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

// CambiarRol PATCH /api/v1/usuarios-sistema/{id}/rol
func (h *UsuarioSistemaHandler) CambiarRol(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		RolNombre string `json:"rol_nombre"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.RolNombre == "" {
		jsonErr(w, http.StatusBadRequest, "rol_nombre es requerido")
		return
	}
	result, err := h.svc.CambiarRol(r.Context(), id, body.RolNombre)
	if err != nil {
		if err.Error() == "usuario no encontrado" {
			jsonErr(w, http.StatusNotFound, err.Error())
			return
		}
		jsonErr(w, http.StatusBadRequest, err.Error())
		return
	}
	jsonOK(w, result)
}

// Delete DELETE /api/v1/usuarios-sistema/{id}
func (h *UsuarioSistemaHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil {
		jsonErr(w, http.StatusUnauthorized, "sin autenticación")
		return
	}
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), claims.Sub, id); err != nil {
		if err.Error() == "usuario no encontrado" {
			jsonErr(w, http.StatusNotFound, err.Error())
			return
		}
		if err.Error() == "no puedes eliminar tu propio usuario" {
			jsonErr(w, http.StatusForbidden, err.Error())
			return
		}
		jsonErr(w, http.StatusInternalServerError, "error al eliminar usuario")
		return
	}
	jsonNoContent(w)
}

// ListRoles GET /api/v1/usuarios-sistema/roles
func (h *UsuarioSistemaHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.svc.ListRoles(r.Context())
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error al obtener roles")
		return
	}
	jsonOK(w, roles)
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
