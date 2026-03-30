package handler

import (
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/sistema/internal/auth"
	"sispardt/sistema/internal/domain"
	"sispardt/sistema/internal/keycloak"
	"sispardt/sistema/internal/repository"
)

// appRolesSet roles de aplicación conocidos (se descartan roles internos de Keycloak).
var appRolesSet = map[string]bool{
	"admin_general":             true,
	"responsable_registro":      true,
	"tecnico_registro":          true,
	"responsable_estadistica":   true,
	"recepcionista":             true,
}

// SesionesHandler gestiona el historial de eventos de sesión.
type SesionesHandler struct {
	repo          *repository.SesionesRepo
	kcClient      *keycloak.AdminClient
	rolesCache    sync.Map // map[usuarioID] → roleCacheEntry
	userInfoCache sync.Map // map[usuarioID] → userInfoCacheEntry
	roleTTL       time.Duration
	userInfoTTL   time.Duration
}

func NewSesionesHandler(repo *repository.SesionesRepo, kcClient *keycloak.AdminClient) *SesionesHandler {
	return &SesionesHandler{
		repo:        repo,
		kcClient:    kcClient,
		roleTTL:     60 * time.Second,
		userInfoTTL: 5 * time.Minute,
	}
}

// List responde a GET /api/v1/auditoria-sesiones
// Query params: page, page_size, tipo, username, rol, ip, fecha_desde, fecha_hasta
func (h *SesionesHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := auth.FromContext(r.Context())

	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(q.Get("page_size"))
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 50 {
		pageSize = 50
	}

	params := domain.ListParams{
		Page:     page,
		PageSize: pageSize,
		Tipo:     q.Get("tipo"),
		Username: q.Get("username"),
		Rol:      q.Get("rol"),
		IP:       q.Get("ip"),
	}

	// Parsear rango de fechas
	if fd := q.Get("fecha_desde"); fd != "" {
		t, err := time.Parse("2006-01-02", fd)
		if err != nil {
			jsonErr(w, http.StatusBadRequest, "fecha_desde inválida: usar formato YYYY-MM-DD")
			return
		}
		params.FechaDesde = &t
	}
	if fh := q.Get("fecha_hasta"); fh != "" {
		t, err := time.Parse("2006-01-02", fh)
		if err != nil {
			jsonErr(w, http.StatusBadRequest, "fecha_hasta inválida: usar formato YYYY-MM-DD")
			return
		}
		params.FechaHasta = &t
	}

	// Validar rango máximo de 366 días (R-07)
	if params.FechaDesde != nil && params.FechaHasta != nil {
		diff := params.FechaHasta.Sub(*params.FechaDesde)
		if diff < 0 {
			jsonErr(w, http.StatusBadRequest, "fecha_hasta debe ser posterior a fecha_desde")
			return
		}
		if diff > 366*24*time.Hour {
			jsonErr(w, http.StatusBadRequest, "el rango de fechas no puede superar 366 días")
			return
		}
	}

	// Meta-auditoría: loguear quién consulta y con qué clasificadores (R-08)
	log.Info().
		Str("sub", claims.Sub).
		Str("username", claims.Username).
		Str("path", r.URL.Path).
		Str("tipo", q.Get("tipo")).
		Str("rol", q.Get("rol")).
		Str("fecha_desde", q.Get("fecha_desde")).
		Str("fecha_hasta", q.Get("fecha_hasta")).
		Int("page", page).
		Msg("auditoria-sesiones consultada")

	data, total, err := h.repo.List(r.Context(), params)
	if err != nil {
		log.Error().Err(err).Msg("error listando sesiones de auditoría")
		jsonErr(w, http.StatusInternalServerError, "error interno al obtener registros")
		return
	}

	if data == nil {
		data = []domain.SesionAuditoria{}
	}

	// Enriquecer con datos de KC si hay usuario_id
	h.enrichRecords(r, data)

	// Filtrar por rol (post-enriquecimiento)
	if params.Rol != "" {
		filtered := data[:0]
		for i := range data {
			if data[i].Rol == params.Rol {
				filtered = append(filtered, data[i])
			}
		}
		data = filtered
	}

	totalPages := (total + pageSize - 1) / pageSize
	if totalPages == 0 && total > 0 {
		totalPages = 1
	}

	jsonOK(w, domain.PagedResult[domain.SesionAuditoria]{
		Data:       data,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

// enrichRecords añade nombreCompleto, rol y establecimientoId a cada registro.
func (h *SesionesHandler) enrichRecords(r *http.Request, data []domain.SesionAuditoria) {
	for i := range data {
		uid := data[i].UsuarioID
		if uid == "" {
			continue
		}

		roles := h.cachedSesionesRoles(r, uid)
		data[i].Rol = firstAppRole(roles)

		info := h.cachedSesionesUserInfo(r, uid)
		if info.FirstName != "" || info.LastName != "" {
			data[i].NombreCompleto = strings.TrimSpace(info.FirstName + " " + info.LastName)
		}
		data[i].EstablecimientoID = info.EstablecimientoID
	}
}

func firstAppRole(roles []string) string {
	for _, r := range roles {
		if appRolesSet[r] {
			return r
		}
	}
	return ""
}

func (h *SesionesHandler) cachedSesionesRoles(r *http.Request, userID string) []string {
	if v, ok := h.rolesCache.Load(userID); ok {
		entry := v.(roleCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.roles
		}
	}
	roles, err := h.kcClient.FetchUserRoles(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("sesiones: no se pudieron obtener roles")
		return []string{}
	}
	h.rolesCache.Store(userID, roleCacheEntry{roles: roles, expiresAt: time.Now().Add(h.roleTTL)})
	return roles
}

func (h *SesionesHandler) cachedSesionesUserInfo(r *http.Request, userID string) keycloak.UserInfo {
	if v, ok := h.userInfoCache.Load(userID); ok {
		entry := v.(userInfoCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.info
		}
	}
	info, err := h.kcClient.FetchUserInfo(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("sesiones: no se pudo obtener info de usuario")
		return keycloak.UserInfo{}
	}
	h.userInfoCache.Store(userID, userInfoCacheEntry{info: info, expiresAt: time.Now().Add(h.userInfoTTL)})
	return info
}

// Verificar que 'tipo' solo contenga valores válidos
func validTipos(tipos string) bool {
	valid := map[string]bool{"LOGIN": true, "LOGOUT": true, "LOGIN_ERROR": true}
	for _, t := range strings.Split(tipos, ",") {
		t = strings.TrimSpace(t)
		if t != "" && !valid[t] {
			return false
		}
	}
	return true
}
