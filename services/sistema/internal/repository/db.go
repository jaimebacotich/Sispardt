package repository

import (
	"context"
	"fmt"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"
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

// ─── Contexto de auditoría ────────────────────────────────────────────────────

// AuditInfo contiene los datos del usuario autenticado para los triggers de auditoría.
type AuditInfo struct {
	UserID    string // keycloak UUID
	Username  string
	FirstName string
	LastName  string
	ClientIP  string
}

type auditInfoKey struct{}

// WithAuditInfo inyecta AuditInfo en el contexto de la request.
func WithAuditInfo(ctx context.Context, ai AuditInfo) context.Context {
	return context.WithValue(ctx, auditInfoKey{}, ai)
}

func getAuditInfo(ctx context.Context) (AuditInfo, bool) {
	ai, ok := ctx.Value(auditInfoKey{}).(AuditInfo)
	return ai, ok
}

// setAuditVars establece las variables de sesión PostgreSQL que usan los triggers.
// Usa set_config con is_local=true para que sean válidas solo dentro de la transacción.
func setAuditVars(ctx context.Context, tx pgx.Tx, ai AuditInfo) error {
	_, err := tx.Exec(ctx, `
		SELECT
			set_config('app.current_user_id',   $1, true),
			set_config('app.current_username',   $2, true),
			set_config('app.current_first_name', $3, true),
			set_config('app.current_last_name',  $4, true),
			set_config('app.client_ip',          $5, true)
	`, ai.UserID, ai.Username, ai.FirstName, ai.LastName, ai.ClientIP)
	return err
}

// ─── Transacciones ────────────────────────────────────────────────────────────

// WithTx ejecuta fn dentro de una transacción. Si el contexto contiene AuditInfo,
// establece las variables de sesión para los triggers de auditoría antes de ejecutar fn.
func WithTx(ctx context.Context, pool *pgxpool.Pool, fn func(pgx.Tx) error) error {
	return pgx.BeginTxFunc(ctx, pool, pgx.TxOptions{}, func(tx pgx.Tx) error {
		if ai, ok := getAuditInfo(ctx); ok {
			if err := setAuditVars(ctx, tx, ai); err != nil {
				log.Warn().Err(err).Msg("no se pudieron establecer variables de auditoría en la transacción")
			}
		}
		return fn(tx)
	})
}
