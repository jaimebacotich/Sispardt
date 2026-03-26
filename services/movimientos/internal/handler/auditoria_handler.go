package handler

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/movimientos/internal/domain"
	"sispardt/movimientos/internal/keycloak"
	"sispardt/movimientos/internal/service"
)

var appRolesAuditSet = map[string]bool{
	"admin_general":           true,
	"responsable_registro":    true,
	"tecnico_registro":        true,
	"responsable_estadistica": true,
	"recepcionista":           true,
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
	svc           *service.ParteDiarioService
	kcClient      *keycloak.AdminClient
	rolesCache    sync.Map
	userInfoCache sync.Map
	roleTTL       time.Duration
	userInfoTTL   time.Duration
}

func NewAuditoriaHandler(svc *service.ParteDiarioService, kcClient *keycloak.AdminClient) *AuditoriaHandler {
	return &AuditoriaHandler{
		svc:         svc,
		kcClient:    kcClient,
		roleTTL:     60 * time.Second,
		userInfoTTL: 5 * time.Minute,
	}
}

func (h *AuditoriaHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()

	page, _ := strconv.Atoi(q.Get("page"))
	pageSize, _ := strconv.Atoi(q.Get("page_size"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 200 {
		pageSize = 50
	}

	p := domain.AuditoriaListParams{
		Page:       page,
		PageSize:   pageSize,
		Search:     q.Get("search"),
		Accion:     q.Get("accion"),
		Tabla:      q.Get("tabla"),
		Rol:        q.Get("rol"),
		FechaDesde: q.Get("fecha_desde"),
		FechaHasta: q.Get("fecha_hasta"),
	}

	rows, total, err := h.svc.ListAuditoria(r.Context(), p)
	if err != nil {
		jsonError(w, http.StatusInternalServerError, "error al listar auditoría")
		return
	}

	if rows == nil {
		rows = []domain.AuditoriaTransaccion{}
	}

	// Enriquecer con datos de KC
	if h.kcClient != nil {
		h.enrichRecords(r, rows)
	}

	// Filtrar por rol post-enriquecimiento
	if p.Rol != "" {
		filtered := rows[:0]
		for i := range rows {
			if rows[i].Rol == p.Rol {
				filtered = append(filtered, rows[i])
			}
		}
		rows = filtered
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	jsonOK(w, map[string]any{
		"data":       rows,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
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
		data[i].Rol = firstAppRoleAuditMov(roles)

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

func firstAppRoleAuditMov(roles []string) string {
	for _, r := range roles {
		if appRolesAuditSet[r] {
			return r
		}
	}
	return ""
}

func (h *AuditoriaHandler) cachedRoles(r *http.Request, userID string) []string {
	if v, ok := h.rolesCache.Load(userID); ok {
		entry := v.(auditRoleCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.roles
		}
	}
	roles, err := h.kcClient.FetchUserRoles(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("auditoria mov: no se pudieron obtener roles")
		return []string{}
	}
	h.rolesCache.Store(userID, auditRoleCacheEntry{roles: roles, expiresAt: time.Now().Add(h.roleTTL)})
	return roles
}

func (h *AuditoriaHandler) cachedUserInfo(r *http.Request, userID string) keycloak.UserInfo {
	if v, ok := h.userInfoCache.Load(userID); ok {
		entry := v.(auditUserInfoCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.info
		}
	}
	info, err := h.kcClient.FetchUserInfo(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("auditoria mov: no se pudo obtener info de usuario")
		return keycloak.UserInfo{}
	}
	h.userInfoCache.Store(userID, auditUserInfoCacheEntry{info: info, expiresAt: time.Now().Add(h.userInfoTTL)})
	return info
}
