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

type CatalogoHandler struct {
	svc    *service.CatalogoService
	estSvc *service.EstablecimientoService
}

func NewCatalogoHandler(svc *service.CatalogoService, estSvc *service.EstablecimientoService) *CatalogoHandler {
	return &CatalogoHandler{svc: svc, estSvc: estSvc}
}

// ─── Clasificaciones ─────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListClasificaciones(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListClasificaciones(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.Clasificacion{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateClasificacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.Clasificacion
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateClasificacion(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateClasificacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.Clasificacion
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateClasificacion(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteClasificacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteClasificacion(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

// ─── Categorias ──────────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListCategorias(w http.ResponseWriter, r *http.Request) {
	data, err := h.estSvc.ListCategorias(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.Categoria{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateCategoria(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.Categoria
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateCategoria(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateCategoria(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.Categoria
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateCategoria(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteCategoria(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteCategoria(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

// ─── Servicios ───────────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListServicios(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListServicios(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.Servicio{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateServicio(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.Servicio
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateServicio(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateServicio(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.Servicio
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateServicio(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteServicio(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteServicio(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

// ─── Tipos Habitacion ────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListTiposHabitacion(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListTiposHabitacion(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.TipoHabitacion{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateTipoHabitacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.TipoHabitacion
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateTipoHabitacion(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateTipoHabitacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.TipoHabitacion
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateTipoHabitacion(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteTipoHabitacion(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteTipoHabitacion(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

// ─── Tipos Cama ──────────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListTiposCama(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListTiposCama(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.TipoCama{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateTipoCama(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.TipoCama
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateTipoCama(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateTipoCama(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.TipoCama
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateTipoCama(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteTipoCama(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteTipoCama(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

// ─── Tipos Personal ──────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListTiposPersonal(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListTiposPersonal(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.TipoPersonal{} }
	jsonOK(w, data)
}

// ─── Geograficos ─────────────────────────────────────────────────────────────

func (h *CatalogoHandler) ListPaises(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListPaises(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.Pais{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreatePais(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.Pais
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreatePais(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdatePais(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.Pais
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdatePais(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeletePais(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeletePais(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

func (h *CatalogoHandler) ListDivisionesPrincipales(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListDivisionesPrincipales(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.DivisionPrincipal{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateDivisionPrincipal(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.DivisionPrincipal
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateDivisionPrincipal(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateDivisionPrincipal(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.DivisionPrincipal
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateDivisionPrincipal(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteDivisionPrincipal(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteDivisionPrincipal(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

func (h *CatalogoHandler) ListDivisionesSecundarias(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.ListDivisionesSecundarias(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.DivisionSecundaria{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateDivisionSecundaria(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.DivisionSecundaria
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateDivisionSecundaria(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateDivisionSecundaria(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.DivisionSecundaria
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateDivisionSecundaria(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteDivisionSecundaria(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteDivisionSecundaria(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}

func (h *CatalogoHandler) ListLocalidades(w http.ResponseWriter, r *http.Request) {
	data, err := h.estSvc.ListLocalidades(r.Context())
	if err != nil { jsonError(w, http.StatusInternalServerError, err.Error()); return }
	if data == nil { data = []domain.Localidad{} }
	jsonOK(w, data)
}

func (h *CatalogoHandler) CreateLocalidad(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	var req domain.Localidad
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	res, err := h.svc.CreateLocalidad(r.Context(), claims.Sub, r.RemoteAddr, req)
	if err != nil { jsonError(w, http.StatusBadRequest, err.Error()); return }
	jsonCreated(w, res)
}

func (h *CatalogoHandler) UpdateLocalidad(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	var req domain.Localidad
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { jsonError(w, http.StatusBadRequest, "body inválido"); return }
	req.ID = id
	if err := h.svc.UpdateLocalidad(r.Context(), claims.Sub, r.RemoteAddr, req); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonOK(w, map[string]string{"status": "updated"})
}

func (h *CatalogoHandler) DeleteLocalidad(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())
	if claims == nil { jsonError(w, http.StatusUnauthorized, "sin autenticación"); return }
	id, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil { jsonError(w, http.StatusBadRequest, "id inválido"); return }
	if err := h.svc.DeleteLocalidad(r.Context(), claims.Sub, r.RemoteAddr, id); err != nil {
		jsonError(w, http.StatusBadRequest, err.Error()); return
	}
	jsonNoContent(w)
}
