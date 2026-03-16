package auth

import "context"

type Claims struct {
	Sub               string
	Username          string
	FirstName         string
	LastName          string
	Roles             []string
	EstablecimientoID string
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

const (
	RoleAdminGeneral           = "admin_general"
	RoleResponsableRegistro    = "responsable_registro"
	RoleTecnicoRegistro        = "tecnico_registro"
	RoleResponsableEstadistica = "responsable_estadistica"
	RoleRecepcionista          = "recepcionista"
)

type contextKey string

const claimsCtxKey contextKey = "jwt_claims"

func WithClaims(ctx context.Context, c *Claims) context.Context {
	return context.WithValue(ctx, claimsCtxKey, c)
}

func FromContext(ctx context.Context) *Claims {
	c, _ := ctx.Value(claimsCtxKey).(*Claims)
	return c
}
