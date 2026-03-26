package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/rs/zerolog/log"
)

// JWTValidator valida tokens JWT usando JWKS de Keycloak con cache local.
type JWTValidator struct {
	mu      sync.RWMutex
	keySet  jwk.Set
	jwksURL string
	issuer  string
}

func NewJWTValidator(ctx context.Context, jwksURL, issuer string) (*JWTValidator, error) {
	v := &JWTValidator{jwksURL: jwksURL, issuer: issuer}
	if err := v.refresh(ctx); err != nil {
		return nil, fmt.Errorf("obtener JWKS inicial desde %s: %w", jwksURL, err)
	}
	// Refresca las claves cada 15 minutos en background
	go v.startRefreshLoop(ctx, 15*time.Minute)
	return v, nil
}

func (v *JWTValidator) refresh(ctx context.Context) error {
	keySet, err := jwk.Fetch(ctx, v.jwksURL)
	if err != nil {
		return err
	}
	v.mu.Lock()
	v.keySet = keySet
	v.mu.Unlock()
	return nil
}

func (v *JWTValidator) startRefreshLoop(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := v.refresh(ctx); err != nil {
				log.Warn().Err(err).Msg("no se pudo refrescar JWKS, usando clave anterior")
			}
		}
	}
}

// parseAndValidate valida la firma y extrae los claims del token.
func (v *JWTValidator) parseAndValidate(tokenStr string) (*Claims, error) {
	v.mu.RLock()
	keySet := v.keySet
	v.mu.RUnlock()

	token, err := jwt.Parse([]byte(tokenStr),
		jwt.WithKeySet(keySet),
		jwt.WithIssuer(v.issuer),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("token inválido: %w", err)
	}

	claims := &Claims{
		Sub: token.Subject(),
	}

	if u, ok := token.Get("preferred_username"); ok {
		claims.Username, _ = u.(string)
	}
	if v, ok := token.Get("given_name"); ok {
		claims.FirstName, _ = v.(string)
	}
	if v, ok := token.Get("family_name"); ok {
		claims.LastName, _ = v.(string)
	}

	if raw, ok := token.Get("roles"); ok {
		if slice, ok := raw.([]interface{}); ok {
			for _, r := range slice {
				if s, ok := r.(string); ok {
					claims.Roles = append(claims.Roles, s)
				}
			}
		}
	}

	if raw, ok := token.Get("establecimiento_id"); ok {
		claims.EstablecimientoID, _ = raw.(string)
	}

	return claims, nil
}

// Middleware HTTP: valida el Bearer token e inyecta claims en el contexto.
func (v *JWTValidator) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error":"token requerido"}`, http.StatusUnauthorized)
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			http.Error(w, `{"error":"formato de autorización inválido"}`, http.StatusUnauthorized)
			return
		}

		claims, err := v.parseAndValidate(parts[1])
		if err != nil {
			log.Debug().Err(err).Msg("token rechazado")
			http.Error(w, `{"error":"token inválido o expirado"}`, http.StatusUnauthorized)
			return
		}

		ctx := WithClaims(r.Context(), claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole devuelve un middleware que exige al menos uno de los roles indicados.
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := FromContext(r.Context())
			if claims == nil || !claims.HasAnyRole(roles...) {
				http.Error(w, `{"error":"permisos insuficientes"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
