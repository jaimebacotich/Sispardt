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
	"time"
)

// AdminClient gestiona usuarios en Keycloak mediante la Admin REST API.
// Usa client_credentials (service account) para autenticarse.
type AdminClient struct {
	baseURL         string // ej: http://keycloak:8080
	realm           string
	clientID        string
	clientSecret    string
	defaultPassword string
	httpClient      *http.Client
}

func NewAdminClient(baseURL, realm, clientID, clientSecret, defaultPassword string) *AdminClient {
	return &AdminClient{
		baseURL:         strings.TrimRight(baseURL, "/"),
		realm:           realm,
		clientID:        clientID,
		clientSecret:    clientSecret,
		defaultPassword: defaultPassword,
		httpClient:      &http.Client{Timeout: 15 * time.Second},
	}
}

// ─── Token ────────────────────────────────────────────────────────────────────

type tokenResponse struct {
	AccessToken string `json:"access_token"`
}

func (c *AdminClient) getAdminToken(ctx context.Context) (string, error) {
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
		return "", fmt.Errorf("obtener token admin KC: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token admin KC: HTTP %d: %s", resp.StatusCode, string(body))
	}
	var tr tokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return "", fmt.Errorf("decodificar token admin KC: %w", err)
	}
	return tr.AccessToken, nil
}

// ─── Crear usuario ────────────────────────────────────────────────────────────

// CreateUserRequest parámetros para crear un usuario en Keycloak.
// Password: contraseña temporal a asignar; si está vacío se usa defaultPassword.
// RoleName: nombre del rol KC a asignar (sin prefijo "rol_"); si está vacío no se asigna rol.
// EstablecimientoID: opcional, solo para recepcionistas.
type CreateUserRequest struct {
	Username          string
	FirstName         string
	LastName          string
	Password          string // si vacío, usa c.defaultPassword
	RoleName          string // si vacío, no asigna rol
	EstablecimientoID string // si vacío, no se añade el atributo
}

type createUserPayload struct {
	Username        string              `json:"username"`
	FirstName       string              `json:"firstName"`
	LastName        string              `json:"lastName"`
	Enabled         bool                `json:"enabled"`
	RequiredActions []string            `json:"requiredActions"`
	Attributes      map[string][]string `json:"attributes,omitempty"`
}

// CreateUser crea el usuario, le asigna contraseña temporal y opcionalmente un rol.
// Retorna el UUID del usuario creado en Keycloak.
func (c *AdminClient) CreateUser(ctx context.Context, req CreateUserRequest) (string, error) {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return "", err
	}

	usersURL := fmt.Sprintf("%s/admin/realms/%s/users", c.baseURL, c.realm)
	payload := createUserPayload{
		Username:        req.Username,
		FirstName:       req.FirstName,
		LastName:        req.LastName,
		Enabled:         true,
		RequiredActions: []string{"UPDATE_PASSWORD"},
	}
	if req.EstablecimientoID != "" {
		payload.Attributes = map[string][]string{
			"establecimiento_id": {req.EstablecimientoID},
		}
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

	// El ID del usuario nuevo está en el header Location: .../users/{uuid}
	location := resp.Header.Get("Location")
	if location == "" {
		return "", fmt.Errorf("crear usuario KC: Location header vacío en la respuesta")
	}
	parts := strings.Split(location, "/")
	userID := parts[len(parts)-1]
	if userID == "" {
		return "", fmt.Errorf("crear usuario KC: no se pudo extraer el ID del usuario desde Location")
	}

	// Determinar contraseña a usar
	pass := req.Password
	if pass == "" {
		pass = c.defaultPassword
	}

	// Establecer contraseña temporal
	if err := c.setPasswordValue(ctx, token, userID, pass); err != nil {
		_ = c.deleteUser(ctx, userID)
		return "", fmt.Errorf("establecer contraseña KC: %w", err)
	}

	// Asignar rol si se especificó
	if req.RoleName != "" {
		if err := c.addRealmRole(ctx, token, userID, req.RoleName); err != nil {
			_ = c.deleteUser(ctx, userID)
			return "", fmt.Errorf("asignar rol KC: %w", err)
		}
	}

	return userID, nil
}

// ─── Eliminar usuario (rollback) ──────────────────────────────────────────────

func (c *AdminClient) DeleteUser(ctx context.Context, userID string) error {
	return c.deleteUser(ctx, userID)
}

func (c *AdminClient) deleteUser(ctx context.Context, userID string) error {
	token, err := c.getAdminToken(ctx)
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

// ─── Actualizar usuario ───────────────────────────────────────────────────────

// UpdateUserEnabled activa o desactiva un usuario en Keycloak.
func (c *AdminClient) UpdateUserEnabled(ctx context.Context, userID string, enabled bool) error {
	token, err := c.getAdminToken(ctx)
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
	token, err := c.getAdminToken(ctx)
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
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}
	return c.addRealmRole(ctx, token, userID, roleName)
}

// RemoveRealmRole quita un rol del realm a un usuario.
func (c *AdminClient) RemoveRealmRole(ctx context.Context, userID, roleName string) error {
	token, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}
	// Obtener el ID del rol
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

	// Quitar el rol
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

// ─── Consulta de usuarios (para enriquecimiento de auditoría) ─────────────────

// UserInfo datos básicos de un usuario de Keycloak.
type UserInfo struct {
	FirstName         string
	LastName          string
	EstablecimientoID string
}

// FetchUserInfo obtiene firstName, lastName y establecimiento_id de un usuario.
func (c *AdminClient) FetchUserInfo(ctx context.Context, userID string) (UserInfo, error) {
	token, err := c.getAdminToken(ctx)
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

type kcRoleRepresentation struct {
	Name string `json:"name"`
}

// FetchUserRoles obtiene los roles del realm para un usuario dado.
func (c *AdminClient) FetchUserRoles(ctx context.Context, userID string) ([]string, error) {
	token, err := c.getAdminToken(ctx)
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

// ─── Helpers internos ─────────────────────────────────────────────────────────

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
	// 1. Obtener el ID del rol
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

	// 2. Asignar el rol al usuario
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
