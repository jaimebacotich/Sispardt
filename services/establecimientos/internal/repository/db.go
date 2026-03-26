package repository

import (
	"context"
	"fmt"
	"net"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/establecimientos/internal/auth"
)

// NewPool crea el pool de conexiones con pgx.
func NewPool(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parsear DSN: %w", err)
	}
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("crear pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping a la base de datos: %w", err)
	}
	return pool, nil
}

// WithAuditTx ejecuta fn dentro de una transacción con las variables de sesión
// para el trigger de auditoría (app.current_user_id, app.client_ip, snapshot del usuario).
func WithAuditTx(ctx context.Context, pool *pgxpool.Pool, userID, clientIP string, fn func(pgx.Tx) error) error {
	return pgx.BeginTxFunc(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		ip := extractIP(clientIP)
		if _, err := tx.Exec(ctx, "SELECT set_config('app.current_user_id', $1, true)", userID); err != nil {
			return fmt.Errorf("set audit user_id: %w", err)
		}
		if ip != "" {
			if _, err := tx.Exec(ctx, "SELECT set_config('app.client_ip', $1, true)", ip); err != nil {
				return fmt.Errorf("set audit client_ip: %w", err)
			}
		}
		// Snapshot del usuario para los campos de auditoría
		if claims := auth.FromContext(ctx); claims != nil {
			if _, err := tx.Exec(ctx, "SELECT set_config('app.current_username', $1, true)", claims.Username); err != nil {
				return fmt.Errorf("set audit username: %w", err)
			}
			if _, err := tx.Exec(ctx, "SELECT set_config('app.current_first_name', $1, true)", claims.FirstName); err != nil {
				return fmt.Errorf("set audit first_name: %w", err)
			}
			if _, err := tx.Exec(ctx, "SELECT set_config('app.current_last_name', $1, true)", claims.LastName); err != nil {
				return fmt.Errorf("set audit last_name: %w", err)
			}
		}
		return fn(tx)
	})
}

// extractIP extrae la IP sin el puerto del RemoteAddr de la request.
func extractIP(remoteAddr string) string {
	if remoteAddr == "" {
		return ""
	}
	if strings.Contains(remoteAddr, ":") {
		host, _, err := net.SplitHostPort(remoteAddr)
		if err != nil {
			return remoteAddr
		}
		return host
	}
	return remoteAddr
}
