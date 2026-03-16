package auth

import "context"

// Claims representa los claims extraídos del JWT de Keycloak
type Claims struct {
	Sub               string   // keycloak user UUID
	Username          string   // preferred_username
	Roles             []string // roles del realm (flatlist)
	EstablecimientoID string   // atributo personalizado (solo recepcionistas)
}

func (c *Claims) HasRole(role string) bool {
	for _, r := range c.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func (c *Claims) HasAnyRole(roles ...string) bool {
	for _, role := range roles {
		if c.HasRole(role) {
			return true
		}
	}
	return false
}

// Roles del sistema
const (
	RoleAdminGeneral = "admin_general"
)

// contextKey tipo privado para evitar colisiones en context
type contextKey string

const claimsCtxKey contextKey = "jwt_claims"

// WithClaims inyecta los claims en el contexto de la request
func WithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, claimsCtxKey, c)
}

// FromContext extrae los claims del contexto; retorna nil si no existen
func FromContext(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsCtxKey).(*Claims)
	return c
}
