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

// AdminClient accede a la Keycloak Admin REST API usando client_credentials.
// Usa caché de token con renovación proactiva (< 60 s de vida restante).
type AdminClient struct {
	baseURL      string
	realm        string
	clientID     string
	clientSecret string
	httpClient   *http.Client

	tokenMu     sync.Mutex
	cachedToken string
	tokenExpiry time.Time
}

func NewAdminClient(baseURL, realm, clientID, clientSecret string) *AdminClient {
	return &AdminClient{
		baseURL:      strings.TrimRight(baseURL, "/"),
		realm:        realm,
		clientID:     clientID,
		clientSecret: clientSecret,
		httpClient:   &http.Client{Timeout: 15 * time.Second},
	}
}

// ─── Token ────────────────────────────────────────────────────────────────────

type tokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
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

// ─── Info de usuario ──────────────────────────────────────────────────────────

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

// ─── Roles de usuario ─────────────────────────────────────────────────────────

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
