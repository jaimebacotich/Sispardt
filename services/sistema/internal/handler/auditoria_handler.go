package handler

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/sistema/internal/domain"
	"sispardt/sistema/internal/keycloak"
	"sispardt/sistema/internal/repository"

	"github.com/jackc/pgx/v5/pgxpool"
)

// rolesAuditSistema son los roles KC reconocidos en la auditoría de sistema.
var rolesAuditSistema = map[string]bool{
	"admin_general":        true,
	"responsable_registro": true,
	"tecnico_registro":     true,
}

type auditRoleCacheEntry struct {
	roles     []string
	expiresAt time.Time
}

type auditUserInfoCacheEntry struct {
	info      keycloak.UserInfo
	expiresAt time.Time
}

type AuditoriaHandler struct {
	repo          *repository.AuditoriaRepo
	kcClient      *keycloak.AdminClient
	rolesCache    sync.Map
	userInfoCache sync.Map
	roleTTL       time.Duration
	userInfoTTL   time.Duration
}

func NewAuditoriaHandler(pool *pgxpool.Pool, kcClient *keycloak.AdminClient) *AuditoriaHandler {
	return &AuditoriaHandler{
		repo:        repository.NewAuditoriaRepo(pool),
		kcClient:    kcClient,
		roleTTL:     60 * time.Second,
		userInfoTTL: 5 * time.Minute,
	}
}

// List GET /api/v1/sistema/auditoria
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

	data, total, err := h.repo.List(r.Context(), p)
	if err != nil {
		jsonErr(w, http.StatusInternalServerError, "error al listar auditoría")
		return
	}
	if data == nil {
		data = []domain.AuditoriaTransaccion{}
	}

	h.enrichRecords(r, data)

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
		data[i].Rol = firstSistemaRole(roles)

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

func firstSistemaRole(roles []string) string {
	for _, r := range roles {
		if rolesAuditSistema[r] {
			return r
		}
	}
	return ""
}

func (h *AuditoriaHandler) cachedRoles(r *http.Request, userID string) []string {
	if v, ok := h.rolesCache.Load(userID); ok {
		e := v.(auditRoleCacheEntry)
		if time.Now().Before(e.expiresAt) {
			return e.roles
		}
	}
	roles, err := h.kcClient.FetchUserRoles(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("auditoria sistema: no se pudieron obtener roles")
		return []string{}
	}
	h.rolesCache.Store(userID, auditRoleCacheEntry{roles: roles, expiresAt: time.Now().Add(h.roleTTL)})
	return roles
}

func (h *AuditoriaHandler) cachedUserInfo(r *http.Request, userID string) keycloak.UserInfo {
	if v, ok := h.userInfoCache.Load(userID); ok {
		e := v.(auditUserInfoCacheEntry)
		if time.Now().Before(e.expiresAt) {
			return e.info
		}
	}
	info, err := h.kcClient.FetchUserInfo(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("auditoria sistema: no se pudo obtener info de usuario")
		return keycloak.UserInfo{}
	}
	h.userInfoCache.Store(userID, auditUserInfoCacheEntry{info: info, expiresAt: time.Now().Add(h.userInfoTTL)})
	return info
}
