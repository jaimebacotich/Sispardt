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
				log.Warn().Err(err).Msg("no se pudo refrescar JWKS")
			}
		}
	}
}

func (v *JWTValidator) ParseClaims(tokenStr string) (*Claims, error) {
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

	claims := &Claims{}
	
	// El campo 'sub' en jwx/v2 es un registered claim
	claims.Sub = token.Subject()

	if u, ok := token.Get("preferred_username"); ok {
		claims.Username = fmt.Sprintf("%v", u)
	}
	if v, ok := token.Get("given_name"); ok {
		claims.FirstName = fmt.Sprintf("%v", v)
	}
	if v, ok := token.Get("family_name"); ok {
		claims.LastName = fmt.Sprintf("%v", v)
	}

	// Fallback si sub no está pero tenemos username
	if claims.Sub == "" && claims.Username != "" {
		claims.Sub = claims.Username
	}

	if raw, ok := token.Get("roles"); ok {
		if slice, ok := raw.([]interface{}); ok {
			for _, r := range slice {
				claims.Roles = append(claims.Roles, fmt.Sprintf("%v", r))
			}
		}
	}
	
	if raw, ok := token.Get("establecimiento_id"); ok {
		claims.EstablecimientoID = fmt.Sprintf("%v", raw)
	}
	
	return claims, nil
}

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
		claims, err := v.ParseClaims(parts[1])
		if err != nil {
			log.Debug().Err(err).Msg("token rechazado")
			http.Error(w, `{"error":"token inválido o expirado"}`, http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r.WithContext(WithClaims(r.Context(), claims)))
	})
}

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
