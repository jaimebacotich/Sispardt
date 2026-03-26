package handler

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/establecimientos/internal/domain"
	"sispardt/establecimientos/internal/keycloak"
	"sispardt/establecimientos/internal/service"
)

var appRolesAuditSet = map[string]bool{
	"admin_general":           true,
	"responsable_registro":    true,
	"tecnico_registro":        true,
	"responsable_estadistica": true,
	"recepcionista":           true,
}

type roleCacheEntry struct {
	roles     []string
	expiresAt time.Time
}

type userInfoCacheEntry struct {
	info      keycloak.UserInfo
	expiresAt time.Time
}

type AuditoriaHandler struct {
	svc           *service.EstablecimientoService
	kcClient      *keycloak.AdminClient
	rolesCache    sync.Map
	userInfoCache sync.Map
	roleTTL       time.Duration
	userInfoTTL   time.Duration
}

func NewAuditoriaHandler(svc *service.EstablecimientoService, kcClient *keycloak.AdminClient) *AuditoriaHandler {
	return &AuditoriaHandler{
		svc:         svc,
		kcClient:    kcClient,
		roleTTL:     60 * time.Second,
		userInfoTTL: 5 * time.Minute,
	}
}

// List GET /api/v1/auditoria
func (h *AuditoriaHandler) List(w http.ResponseWriter, r *http.Request) {
	p := domain.AuditoriaListParams{
		Page:       parseIntQuery(r, "page", 1),
		PageSize:   parseIntQuery(r, "page_size", 50),
		Search:     r.URL.Query().Get("search"),
		Accion:     r.URL.Query().Get("accion"),
		Tabla:      r.URL.Query().Get("tabla"),
		Rol:        r.URL.Query().Get("rol"),
		FechaDesde: r.URL.Query().Get("fecha_desde"),
		FechaHasta: r.URL.Query().Get("fecha_hasta"),
	}

	data, total, err := h.svc.ListAuditoria(r.Context(), p)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al listar auditoría")
		return
	}

	if data == nil {
		data = []domain.AuditoriaTransaccion{}
	}

	// Enriquecer con datos de KC
	if h.kcClient != nil {
		h.enrichRecords(r, data)
	}

	// Filtrar por rol post-enriquecimiento
	if p.Rol != "" {
		filtered := data[:0]
		for i := range data {
			if data[i].Rol == p.Rol {
				filtered = append(filtered, data[i])
			}
		}
		data = filtered
	}

	totalPages := total / p.PageSize
	if total%p.PageSize != 0 {
		totalPages++
	}

	jsonOK(w, map[string]any{
		"data":       data,
		"total":      total,
		"page":       p.Page,
		"pageSize":   p.PageSize,
		"totalPages": totalPages,
	})
}

func (h *AuditoriaHandler) enrichRecords(r *http.Request, data []domain.AuditoriaTransaccion) {
	for i := range data {
		uid := data[i].KeycloakUserID
		if uid == "" {
			continue
		}

		roles := h.cachedRoles(r, uid)
		data[i].Rol = firstAppRoleAudit(roles)

		// Solo enriquecer nombre si el snapshot no lo tiene
		if data[i].NombreCompleto == "" {
			info := h.cachedUserInfo(r, uid)
			if info.FirstName != "" || info.LastName != "" {
				data[i].NombreCompleto = strings.TrimSpace(info.FirstName + " " + info.LastName)
			}
			if data[i].EstablecimientoID == "" {
				data[i].EstablecimientoID = info.EstablecimientoID
			}
		}
	}
}

func firstAppRoleAudit(roles []string) string {
	for _, r := range roles {
		if appRolesAuditSet[r] {
			return r
		}
	}
	return ""
}

func (h *AuditoriaHandler) cachedRoles(r *http.Request, userID string) []string {
	if v, ok := h.rolesCache.Load(userID); ok {
		entry := v.(roleCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.roles
		}
	}
	roles, err := h.kcClient.FetchUserRoles(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("auditoria: no se pudieron obtener roles")
		return []string{}
	}
	h.rolesCache.Store(userID, roleCacheEntry{roles: roles, expiresAt: time.Now().Add(h.roleTTL)})
	return roles
}

func (h *AuditoriaHandler) cachedUserInfo(r *http.Request, userID string) keycloak.UserInfo {
	if v, ok := h.userInfoCache.Load(userID); ok {
		entry := v.(userInfoCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.info
		}
	}
	info, err := h.kcClient.FetchUserInfo(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("auditoria: no se pudo obtener info de usuario")
		return keycloak.UserInfo{}
	}
	h.userInfoCache.Store(userID, userInfoCacheEntry{info: info, expiresAt: time.Now().Add(h.userInfoTTL)})
	return info
}
