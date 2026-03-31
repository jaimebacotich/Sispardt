package keycloak

import (
	"bytes"
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
// Incluye funciones de polling de eventos, sesiones activas y gestión de usuarios.
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

	// UUIDs de clientes Keycloak — se resuelven al arrancar o on-demand
	clientUUIDs    map[string]string // clientId → UUID
	clientUUIDsMu  sync.RWMutex
	trackedClients []string
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
func (c *AdminClient) SetTrackedClients(clientIDs []string) {
	c.trackedClients = clientIDs
}

// ─── Token ─────────────────────────────────────────────────────────────────

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

func (c *AdminClient) invalidateToken() {
	c.tokenMu.Lock()
	c.cachedToken = ""
	c.tokenMu.Unlock()
}

func (c *AdminClient) getToken(ctx context.Context) (string, error) {
	c.tokenMu.Lock()
	defer c.tokenMu.Unlock()

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

// ─── Eventos de sesión ─────────────────────────────────────────────────────

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

// UserInfo datos básicos de un usuario de Keycloak.
type UserInfo struct {
	FirstName         string
	LastName          string
	EstablecimientoID string
}

// FetchUserInfo obtiene firstName, lastName y establecimiento_id de un usuario.
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
func (c *AdminClient) ResolveClientUUID(ctx context.Context, clientID string) (string, error) {
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

// EnsureClientUUIDs resuelve los UUIDs si el mapa está vacío.
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

// ─── Listado de usuarios ───────────────────────────────────────────────────

// KCUserEntry representa un usuario del Admin REST API de Keycloak.
type KCUserEntry struct {
	ID         string              `json:"id"`
	Username   string              `json:"username"`
	FirstName  string              `json:"firstName"`
	LastName   string              `json:"lastName"`
	Enabled    bool                `json:"enabled"`
	Attributes map[string][]string `json:"attributes"`
}

// ListUsers retorna todos los usuarios del realm (máx. 500).
func (c *AdminClient) ListUsers(ctx context.Context) ([]KCUserEntry, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return nil, err
	}

	apiURL := fmt.Sprintf("%s/admin/realms/%s/users?max=500", c.baseURL, c.realm)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("GET users KC: %w", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET users KC: HTTP %d: %s", resp.StatusCode, string(body))
	}

	var users []KCUserEntry
	if err := json.Unmarshal(body, &users); err != nil {
		return nil, fmt.Errorf("decodificar users KC: %w", err)
	}
	return users, nil
}

// ─── Gestión de usuarios ───────────────────────────────────────────────────

// CreateUserRequest parámetros para crear un usuario en Keycloak.
type CreateUserRequest struct {
	Username  string
	FirstName string
	LastName  string
	Password  string // contraseña temporal
	RoleName  string // rol KC a asignar (sin prefijo "rol_"); si vacío no se asigna
}

type createUserPayload struct {
	Username        string              `json:"username"`
	FirstName       string              `json:"firstName"`
	LastName        string              `json:"lastName"`
	Enabled         bool                `json:"enabled"`
	RequiredActions []string            `json:"requiredActions"`
	Attributes      map[string][]string `json:"attributes"`
}

// CreateUser crea el usuario, le asigna contraseña temporal y opcionalmente un rol.
// Retorna el UUID del usuario creado en Keycloak.
func (c *AdminClient) CreateUser(ctx context.Context, req CreateUserRequest) (string, error) {
	token, err := c.getToken(ctx)
	if err != nil {
		return "", err
	}

	usersURL := fmt.Sprintf("%s/admin/realms/%s/users", c.baseURL, c.realm)
	// Los usuarios del sistema son de ámbito institucional; se usa el UUID
	// institucional como establecimiento_id (requerido por el User Profile de KC).
	const instUUID = "11111111-1111-1111-1111-111111111111"
	payload := createUserPayload{
		Username:        req.Username,
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		Enabled:         true,
		RequiredActions: []string{"UPDATE_PASSWORD"},
		Attributes:      map[string][]string{"establecimiento_id": {instUUID}},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, usersURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("crear usuario KC: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("crear usuario KC: HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	location := resp.Header.Get("Location")
	if location == "" {
		return "", fmt.Errorf("crear usuario KC: Location header vacío en la respuesta")
	}
	parts := strings.Split(location, "/")
	userID := parts[len(parts)-1]
	if userID == "" {
		return "", fmt.Errorf("crear usuario KC: no se pudo extraer el ID del usuario desde Location")
	}

	if err := c.setPasswordValue(ctx, token, userID, req.Password); err != nil {
		_ = c.deleteUser(ctx, userID)
		return "", fmt.Errorf("establecer contraseña KC: %w", err)
	}

	if req.RoleName != "" {
		if err := c.addRealmRole(ctx, token, userID, req.RoleName); err != nil {
			_ = c.deleteUser(ctx, userID)
			return "", fmt.Errorf("asignar rol KC: %w", err)
		}
	}

	return userID, nil
}

// DeleteUser elimina un usuario de Keycloak (usado para rollback).
func (c *AdminClient) DeleteUser(ctx context.Context, userID string) error {
	return c.deleteUser(ctx, userID)
}

func (c *AdminClient) deleteUser(ctx context.Context, userID string) error {
	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}
	delURL := fmt.Sprintf("%s/admin/realms/%s/users/%s", c.baseURL, c.realm, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, delURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	return nil
}

// UpdateUserEnabled activa o desactiva un usuario en Keycloak.
func (c *AdminClient) UpdateUserEnabled(ctx context.Context, userID string, enabled bool) error {
	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}
	apiURL := fmt.Sprintf("%s/admin/realms/%s/users/%s", c.baseURL, c.realm, userID)
	payload := map[string]bool{"enabled": enabled}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, apiURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("UpdateUserEnabled KC (%s): %w", userID, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("UpdateUserEnabled KC (%s): HTTP %d: %s", userID, resp.StatusCode, string(b))
	}
	return nil
}

// UpdateUserDetails actualiza firstName y lastName de un usuario en Keycloak.
func (c *AdminClient) UpdateUserDetails(ctx context.Context, userID, firstName, lastName string) error {
	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}
	apiURL := fmt.Sprintf("%s/admin/realms/%s/users/%s", c.baseURL, c.realm, userID)
	payload := map[string]string{"firstName": firstName, "lastName": lastName}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, apiURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("UpdateUserDetails KC (%s): %w", userID, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("UpdateUserDetails KC (%s): HTTP %d: %s", userID, resp.StatusCode, string(b))
	}
	return nil
}

// AddRealmRole asigna un rol del realm a un usuario ya existente.
func (c *AdminClient) AddRealmRole(ctx context.Context, userID, roleName string) error {
	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}
	return c.addRealmRole(ctx, token, userID, roleName)
}

// RemoveRealmRole quita un rol del realm a un usuario.
func (c *AdminClient) RemoveRealmRole(ctx context.Context, userID, roleName string) error {
	token, err := c.getToken(ctx)
	if err != nil {
		return err
	}
	roleURL := fmt.Sprintf("%s/admin/realms/%s/roles/%s", c.baseURL, c.realm, roleName)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, roleURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("obtener rol %s: HTTP %d", roleName, resp.StatusCode)
	}
	var role roleRepresentation
	if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
		return err
	}

	mappingURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm", c.baseURL, c.realm, userID)
	roles := []roleRepresentation{role}
	body, _ := json.Marshal(roles)
	req2, err := http.NewRequestWithContext(ctx, http.MethodDelete, mappingURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)
	resp2, err := c.httpClient.Do(req2)
	if err != nil {
		return fmt.Errorf("RemoveRealmRole KC (%s): %w", userID, err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp2.Body)
		return fmt.Errorf("RemoveRealmRole KC (%s): HTTP %d: %s", userID, resp2.StatusCode, string(b))
	}
	return nil
}

// ─── Helpers internos ─────────────────────────────────────────────────────

type passwordPayload struct {
	Type      string `json:"type"`
	Value     string `json:"value"`
	Temporary bool   `json:"temporary"`
}

func (c *AdminClient) setPasswordValue(ctx context.Context, token, userID, value string) error {
	pwURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/reset-password", c.baseURL, c.realm, userID)
	payload := passwordPayload{Type: "password", Value: value, Temporary: true}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, pwURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

type roleRepresentation struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func (c *AdminClient) addRealmRole(ctx context.Context, token, userID, roleName string) error {
	roleURL := fmt.Sprintf("%s/admin/realms/%s/roles/%s", c.baseURL, c.realm, roleName)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, roleURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("obtener rol %s: HTTP %d", roleName, resp.StatusCode)
	}
	var role roleRepresentation
	if err := json.NewDecoder(resp.Body).Decode(&role); err != nil {
		return err
	}

	mappingURL := fmt.Sprintf("%s/admin/realms/%s/users/%s/role-mappings/realm", c.baseURL, c.realm, userID)
	roles := []roleRepresentation{role}
	body, _ := json.Marshal(roles)
	req2, err := http.NewRequestWithContext(ctx, http.MethodPost, mappingURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("Authorization", "Bearer "+token)
	resp2, err := c.httpClient.Do(req2)
	if err != nil {
		return err
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != http.StatusNoContent {
		b, _ := io.ReadAll(resp2.Body)
		return fmt.Errorf("asignar rol: HTTP %d: %s", resp2.StatusCode, string(b))
	}
	return nil
}
