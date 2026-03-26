package handler

import (
	"net/http"
	"sync"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/auditoria-sesiones/internal/domain"
	"sispardt/auditoria-sesiones/internal/keycloak"
)

// roleCacheEntry entrada del caché de roles con TTL (R-12).
type roleCacheEntry struct {
	roles     []string
	expiresAt time.Time
}

// userInfoCacheEntry entrada del caché de info de usuario con TTL.
type userInfoCacheEntry struct {
	info      keycloak.UserInfo
	expiresAt time.Time
}

// ConectadosHandler gestiona el endpoint de sesiones activas en tiempo real.
type ConectadosHandler struct {
	kcClient      *keycloak.AdminClient
	rolesCache    sync.Map // map[usuarioID string] → roleCacheEntry
	userInfoCache sync.Map // map[usuarioID string] → userInfoCacheEntry
	roleTTL       time.Duration
	userInfoTTL   time.Duration
}

func NewConectadosHandler(kcClient *keycloak.AdminClient) *ConectadosHandler {
	return &ConectadosHandler{
		kcClient:    kcClient,
		roleTTL:     60 * time.Second,
		userInfoTTL: 5 * time.Minute,
	}
}

// GetConectados responde a GET /api/v1/auditoria-sesiones/conectados
// Consulta Keycloak directamente (sin usar la BD propia).
// Tolerancia a fallos parciales: si un cliente falla, se incluye advertencia (R-13).
func (h *ConectadosHandler) GetConectados(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filterUsername := q.Get("username")
	filterRol := q.Get("rol")
	filterClientID := q.Get("client_id")

	// Si el mapa está vacío (fallo en startup), intentar resolver ahora
	if err := h.kcClient.EnsureClientUUIDs(r.Context()); err != nil {
		log.Warn().Err(err).Msg("conectados: no se pudieron resolver UUIDs de clientes")
		jsonErr(w, http.StatusServiceUnavailable, "Keycloak no disponible temporalmente, reintente en unos segundos")
		return
	}
	clientUUIDs := h.kcClient.GetClientUUIDs()

	type sessionWithClient struct {
		session  keycloak.KCUserSession
		clientID string
	}

	var (
		allSessions  []sessionWithClient
		advertencias []string
	)

	// Consultar sesiones por cada cliente registrado
	for clientID, uuid := range clientUUIDs {
		sessions, err := h.kcClient.FetchUserSessions(r.Context(), uuid)
		if err != nil {
			log.Warn().Err(err).Str("client_id", clientID).Msg("conectados: error obteniendo sesiones")
			advertencias = append(advertencias, clientID+" no disponible temporalmente")
			continue
		}
		for _, s := range sessions {
			allSessions = append(allSessions, sessionWithClient{session: s, clientID: clientID})
		}
	}

	now := time.Now().UTC()
	conectados := make([]domain.ConectadoInfo, 0, len(allSessions))

	for _, sc := range allSessions {
		s := sc.session

		// Filtro previo a la llamada de roles (evita lookups innecesarios)
		if filterUsername != "" && s.Username != filterUsername {
			continue
		}
		if filterClientID != "" && sc.clientID != filterClientID {
			continue
		}

		roles := h.cachedRoles(r, s.UserID)

		if filterRol != "" && !hasRole(roles, filterRol) {
			continue
		}

		userInfo := h.cachedUserInfo(r, s.UserID)
		nombreCompleto := ""
		if userInfo.FirstName != "" || userInfo.LastName != "" {
			nombreCompleto = userInfo.FirstName + " " + userInfo.LastName
		}

		inicio := time.UnixMilli(s.Start).UTC()
		info := domain.ConectadoInfo{
			UsuarioID:         s.UserID,
			Username:          s.Username,
			NombreCompleto:    nombreCompleto,
			EstablecimientoID: userInfo.EstablecimientoID,
			ClientID:          sc.clientID,
			ClientNombre:    sc.clientID,
			SesionID:        s.ID,
			IPAddress:       s.IPAddress,
			InicioSesion:    inicio,
			TiempoConectado: domain.FormatDuration(now.Sub(inicio)),
			Roles:           roles,
		}
		conectados = append(conectados, info)
	}

	jsonOK(w, domain.ConectadosResponse{
		Conectados:   conectados,
		Total:        len(conectados),
		ConsultadoAt: now,
		Advertencias: advertencias,
	})
}

// cachedUserInfo retorna firstName/lastName desde caché (TTL 5m) o desde Keycloak.
func (h *ConectadosHandler) cachedUserInfo(r *http.Request, userID string) keycloak.UserInfo {
	if v, ok := h.userInfoCache.Load(userID); ok {
		entry := v.(userInfoCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.info
		}
	}

	info, err := h.kcClient.FetchUserInfo(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("conectados: no se pudo obtener info de usuario")
		return keycloak.UserInfo{}
	}

	h.userInfoCache.Store(userID, userInfoCacheEntry{
		info:      info,
		expiresAt: time.Now().Add(h.userInfoTTL),
	})
	return info
}

// cachedRoles retorna los roles del usuario desde caché (TTL 60s) o desde Keycloak.
func (h *ConectadosHandler) cachedRoles(r *http.Request, userID string) []string {
	if v, ok := h.rolesCache.Load(userID); ok {
		entry := v.(roleCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.roles
		}
	}

	roles, err := h.kcClient.FetchUserRoles(r.Context(), userID)
	if err != nil {
		log.Warn().Err(err).Str("user_id", userID).Msg("conectados: no se pudieron obtener roles")
		return []string{}
	}

	h.rolesCache.Store(userID, roleCacheEntry{
		roles:     roles,
		expiresAt: time.Now().Add(h.roleTTL),
	})
	return roles
}

func hasRole(roles []string, role string) bool {
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}
