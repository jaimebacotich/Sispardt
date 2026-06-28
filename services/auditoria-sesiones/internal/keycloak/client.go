package keycloak

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// AdminClient gestiona la integración con Keycloak Admin REST API.
// Usa client_credentials para obtener tokens y los renueva proactivamente
// cuando el TTL restante es menor a 60 segundos.
type AdminClient struct {
	baseURL      string
	realm        string
	clientID     string
	clientSecret string
	httpClient   *http.Client

	// Cache de token con renovación proactiva (< 60 s de vida restante → renovar)
	tokenMu     sync.Mutex
	cachedToken string
	tokenExpiry time.Time

	// UUIDs de clientes Keycloak — se resuelven al arrancar o on-demand (R-12)
	clientUUIDs    map[string]string // clientId → UUID
	clientUUIDsMu  sync.RWMutex
	trackedClients []string // lista de clientIDs a monitorear
}

func NewAdminClient(baseURL, realm, clientID, clientSecret string) *AdminClient {
	return &AdminClient{
		baseURL:      strings.TrimRight(baseURL, "/"),
		realm:        realm,
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
		clientUUIDs:  make(map[string]string),
	}
}

// SetTrackedClients guarda la lista de clientIDs que deben monitorearse.
// Se usa para reintentar la resolución de UUIDs en llamadas posteriores.
func (c *AdminClient) SetTrackedClients(clientIDs []string) {
	c.trackedClients = clientIDs
}

// ─── Token ─────────────────────────────────────────────────────────────────

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// invalidateToken descarta el token en cache forzando renovación en el próximo getToken.
// Se usa cuando una llamada Admin API devuelve 403 (token sin roles suficientes).
func (c *AdminClient) invalidateToken() {
	c.tokenMu.Lock()
	c.cachedToken = ""
	c.tokenMu.Unlock()
}

// getToken retorna el token en cache o lo renueva si TTL < 60 s (P-02).
// NUNCA loguea el valor del token ni del secret.
func (c *AdminClient) getToken(ctx context.Context) (string, error) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

	// Renovar proactivamente si faltan menos de 60 s para expirar
	if c.cachedToken != "" && time.Until(c.tokenExpiry) > 60*time.Second {
		return c.cachedToken, nil
	}

	tokenURL := fmt.Sprintf("%s/realms/%s/protocol/openid-connect/token", c.baseURL, c.realm)
	data := url.Values{
		"grant_type":    {"client_credentials"},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("obtener token KC: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token KC: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var tr tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return "", fmt.Errorf("decodificar token KC: %w", err)
	}

	c.cachedToken = tr.AccessToken
	c.tokenExpiry = time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second)
	return c.cachedToken, nil
}

// ─── Eventos ───────────────────────────────────────────────────────────────

// KCEvent representa un evento del Admin REST API de Keycloak.
type KCEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	RealmID   string                 `json:"realmId"`
	ClientID  string                 `json:"clientId"`
	UserID    string                 `json:"userId"`
	SessionID string                 `json:"sessionId"`
	IPAddress string                 `json:"ipAddress"`
	Error     string                 `json:"error,omitempty"`
	Details   map[string]interface{} `json:"details"`
	Time      int64                  `json:"time"` // milisegundos Unix
}

// fetchEventsOnce ejecuta una sola petición a la Admin API de eventos KC.
func (c *AdminClient) fetchEventsOnce(ctx context.Context, token string, dateFrom int64, eventTypes []string, max int) ([]KCEvent, int, error) {
	q := url.Values{}
	for _, t := range eventTypes {
		q.Add("type", t)
	}
	q.Set("dateFrom", fmt.Sprintf("%d", dateFrom))
	q.Set("max", fmt.Sprintf("%d", max))

	apiURL := fmt.Sprintf("%s/admin/realms/%s/events?%s", c.baseURL, c.realm, q.Encode())
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("GET events KC: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, resp.StatusCode, fmt.Errorf("GET events KC: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var events []KCEvent
	if err := json.NewDecoder(resp.Body).Decode(&events); err != nil {
		return nil, resp.StatusCode, fmt.Errorf("decodificar events KC: %w", err)
	}
	return events, resp.StatusCode, nil
}

// FetchEvents obtiene eventos del Admin API con los filtros indicados.
// dateFrom en milisegundos Unix. eventTypes: LOGIN, LOGOUT, LOGIN_ERROR.
// Si recibe 403, invalida el token cacheado y reintenta una vez.
func (c *AdminClient) FetchEvents(ctx context.Context, dateFrom int64, eventTypes []string, max int) ([]KCEvent, error) {
	for attempt := 0; attempt < 2; attempt++ {
		token, err := c.getToken(ctx)
		if err != nil {
			return nil, err
		}
		events, status, err := c.fetchEventsOnce(ctx, token, dateFrom, eventTypes, max)
		if status == http.StatusForbidden {
			c.invalidateToken()
			continue
		}
		return events, err
	}
	return nil, fmt.Errorf("GET events KC: acceso denegado tras renovar token (403)")
}

// ─── Admin Events ─────────────────────────────────────────────────────────

// KCAdminEvent representa un admin event del Admin REST API de Keycloak.
type KCAdminEvent struct {
	Time            int64  `json:"time"`
	OperationType   string `json:"operationType"`
	ResourceType    string `json:"resourceType"`
	ResourcePath    string `json:"resourcePath"`
	AuthDetails     struct {
		RealmID  string `json:"realmId"`
		ClientID string `json:"clientId"`
		UserID   string `json:"userId"`
		IPAddress string `json:"ipAddress"`
	} `json:"authDetails"`
	Representation string `json:"representation,omitempty"`
}

// FetchAdminEvents obtiene admin events desde Keycloak Admin API.
func (c *AdminClient) FetchAdminEvents(ctx context.Context, dateFrom int64, operationTypes, resourceTypes []string, max int) ([]KCAdminEvent, error) {
	for attempt := 0; attempt < 2; attempt++ {
		token, err := c.getToken(ctx)
		if err != nil {
			return nil, err
		}

		q := url.Values{}
		for _, op := range operationTypes {
			q.Add("operationTypes", op)
		}
		for _, rt := range resourceTypes {
			q.Add("resourceTypes", rt)
		}
		q.Set("dateFrom", fmt.Sprintf("%d", dateFrom))
		q.Set("max", fmt.Sprintf("%d", max))

		apiURL := fmt.Sprintf("%s/admin/realms/%s/admin-events?%s", c.baseURL, c.realm, q.Encode())
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("GET admin-events KC: %w", err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusForbidden {
			c.invalidateToken()
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("GET admin-events KC: HTTP %d: %s", resp.StatusCode, string(body))
		}

		var events []KCAdminEvent
		if err := json.Unmarshal(body, &events); err != nil {
			return nil, fmt.Errorf("decodificar admin-events KC: %w", err)
		}
		return events, nil
	}
	return nil, fmt.Errorf("GET admin-events KC: acceso denegado tras renovar token (403)")
}

// ─── Sesiones activas ──────────────────────────────────────────────────────

// KCUserSession representa una sesión activa del Admin REST API.
type KCUserSession struct {
	ID        string            `json:"id"`
	UserID    string            `json:"userId"`
	Username  string            `json:"username"`
	IPAddress string            `json:"ipAddress"`
	Start     int64             `json:"start"` // milisegundos Unix
	Clients   map[string]string `json:"clients"`
}

// FetchUserSessions obtiene las sesiones activas para un cliente dado por UUID.
// Si recibe 403, invalida el token cacheado y reintenta una vez.
func (c *AdminClient) FetchUserSessions(ctx context.Context, clientUUID string) ([]KCUserSession, error) {
	for attempt := 0; attempt < 2; attempt++ {
		token, err := c.getToken(ctx)
		if err != nil {
			return nil, err
		}

		apiURL := fmt.Sprintf("%s/admin/realms/%s/clients/%s/user-sessions", c.baseURL, c.realm, clientUUID)
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("GET user-sessions KC (client %s): %w", clientUUID, err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusForbidden {
			c.invalidateToken()
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("GET user-sessions KC (client %s): HTTP %d: %s", clientUUID, resp.StatusCode, string(body))
		}

		var sessions []KCUserSession
		if err := json.Unmarshal(body, &sessions); err != nil {
			return nil, fmt.Errorf("decodificar user-sessions KC: %w", err)
		}
		return sessions, nil
	}
	return nil, fmt.Errorf("GET user-sessions KC (client %s): acceso denegado tras renovar token (403)", clientUUID)
}

// ─── Info de usuario ───────────────────────────────────────────────────────

// UserInfo contiene datos básicos de un usuario de Keycloak.
type UserInfo struct {
	FirstName         string
	LastName          string
	EstablecimientoID string
}

// FetchUserInfo obtiene firstName, lastName y establecimiento_id de un usuario por su UUID.
func (c *AdminClient) FetchUserInfo(ctx context.Context, userID string) (UserInfo, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return UserInfo{}, err
	}

	apiURL := fmt.Sprintf("%s/admin/realms/%s/users/%s", c.baseURL, c.realm, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return UserInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return UserInfo{}, fmt.Errorf("GET user KC (%s): %w", userID, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return UserInfo{}, fmt.Errorf("GET user KC (%s): HTTP %d: %s", userID, resp.StatusCode, string(body))
	}

	var u struct {
		FirstName  string              `json:"firstName"`
		LastName   string              `json:"lastName"`
		Attributes map[string][]string `json:"attributes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		return UserInfo{}, fmt.Errorf("decodificar user KC: %w", err)
	}

	estID := ""
	if vals, ok := u.Attributes["establecimiento_id"]; ok && len(vals) > 0 {
		estID = vals[0]
	}
	return UserInfo{FirstName: u.FirstName, LastName: u.LastName, EstablecimientoID: estID}, nil
}

// ─── Roles de usuario ──────────────────────────────────────────────────────

type kcRoleRepresentation struct {
	Name string `json:"name"`
}

// FetchUserRoles obtiene los roles del realm para un usuario dado.
func (c *AdminClient) FetchUserRoles(ctx context.Context, userID string) ([]string, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm", c.baseURL, c.realm, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET user roles KC (%s): %w", userID, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GET user roles KC (%s): HTTP %d: %s", userID, resp.StatusCode, string(body))
	}

	var roles []kcRoleRepresentation
	if err := json.NewDecoder(resp.Body).Decode(&roles); err != nil {
		return nil, fmt.Errorf("decodificar roles KC: %w", err)
	}

	result := make([]string, 0, len(roles))
	for _, r := range roles {
		result = append(result, r.Name)
	}
	return result, nil
}

// ─── UUIDs de clientes ─────────────────────────────────────────────────────

// ResolveClientUUID obtiene el UUID interno de Keycloak para un clientId.
// Si recibe 403, invalida el token cacheado y reintenta una vez.
func (c *AdminClient) ResolveClientUUID(ctx context.Context, clientID string) (string, error) {
	// Verificar cache primero
	c.clientUUIDsMu.RLock()
	if uuid, ok := c.clientUUIDs[clientID]; ok {
		c.clientUUIDsMu.RUnlock()
		return uuid, nil
	}
	c.clientUUIDsMu.RUnlock()

	for attempt := 0; attempt < 2; attempt++ {
		token, err := c.getToken(ctx)
		if err != nil {
			return "", err
		}

		q := url.Values{}
		q.Set("clientId", clientID)
		apiURL := fmt.Sprintf("%s/admin/realms/%s/clients?%s", c.baseURL, c.realm, q.Encode())
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
		if err != nil {
			return "", err
		}
		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := c.httpClient.Do(req)
		if err != nil {
			return "", fmt.Errorf("GET clients KC (%s): %w", clientID, err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusForbidden {
			c.invalidateToken()
			continue
		}
		if resp.StatusCode != http.StatusOK {
			return "", fmt.Errorf("GET clients KC (%s): HTTP %d: %s", clientID, resp.StatusCode, string(body))
		}

		var clients []struct {
			ID string `json:"id"`
		}
		if err := json.Unmarshal(body, &clients); err != nil {
			return "", fmt.Errorf("decodificar clients KC: %w", err)
		}
		if len(clients) == 0 {
			return "", fmt.Errorf("cliente '%s' no encontrado en Keycloak", clientID)
		}

		uuid := clients[0].ID
		c.clientUUIDsMu.Lock()
		c.clientUUIDs[clientID] = uuid
		c.clientUUIDsMu.Unlock()
		return uuid, nil
	}
	return "", fmt.Errorf("GET clients KC (%s): acceso denegado tras renovar token (403)", clientID)
}

// InitClientUUIDs resuelve y cachea los UUIDs de los clientes indicados al arrancar.
// Deben llamarse una vez en main antes de exponer los endpoints (P-05).
func (c *AdminClient) InitClientUUIDs(ctx context.Context, clientIDs []string) error {
	for _, id := range clientIDs {
		uuid, err := c.ResolveClientUUID(ctx, id)
		if err != nil {
			return fmt.Errorf("resolver UUID de cliente '%s': %w", id, err)
		}
		c.clientUUIDsMu.Lock()
		c.clientUUIDs[id] = uuid
		c.clientUUIDsMu.Unlock()
	}
	return nil
}

// EnsureClientUUIDs resuelve los UUIDs si el mapa está vacío (p.ej. fallo en startup).
// Llama a InitClientUUIDs con los trackedClients configurados.
func (c *AdminClient) EnsureClientUUIDs(ctx context.Context) error {
	c.clientUUIDsMu.RLock()
	empty := len(c.clientUUIDs) == 0
	c.clientUUIDsMu.RUnlock()
	if !empty {
		return nil
	}
	if len(c.trackedClients) == 0 {
		return fmt.Errorf("no hay clientes configurados para monitorear")
	}
	return c.InitClientUUIDs(ctx, c.trackedClients)
}

// GetClientUUIDs retorna una copia del mapa clientId → UUID.
func (c *AdminClient) GetClientUUIDs() map[string]string {
	c.clientUUIDsMu.RLock()
	defer c.clientUUIDsMu.RUnlock()
	result := make(map[string]string, len(c.clientUUIDs))
	for k, v := range c.clientUUIDs {
		result[k] = v
	}
	return result
}
