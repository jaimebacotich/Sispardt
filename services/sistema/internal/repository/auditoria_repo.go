package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/sistema/internal/domain"
)

type AuditoriaRepo struct {
	pool *pgxpool.Pool
}

func NewAuditoriaRepo(pool *pgxpool.Pool) *AuditoriaRepo {
	return &AuditoriaRepo{pool: pool}
}

func (r *AuditoriaRepo) List(ctx context.Context, p domain.AuditoriaListParams) ([]domain.AuditoriaTransaccion, int, error) {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 || p.PageSize > 200 {
		p.PageSize = 50
	}

	where := []string{}
	args := []any{}
	idx := 1

	if p.Search != "" {
		where = append(where,
			fmt.Sprintf("(COALESCE(usuario_username,'') ILIKE $%d OR COALESCE(keycloak_usuario_id::text,'') ILIKE $%d OR tabla_afectada ILIKE $%d OR COALESCE(registro_id,'') ILIKE $%d)",
				idx, idx, idx, idx))
		args = append(args, "%"+p.Search+"%")
		idx++
	}
	if p.Accion != "" {
		where = append(where, fmt.Sprintf("accion = $%d", idx))
		args = append(args, p.Accion)
		idx++
	}
	if p.Tabla != "" {
		where = append(where, fmt.Sprintf("tabla_afectada = $%d", idx))
		args = append(args, p.Tabla)
		idx++
	}
	if p.FechaDesde != "" {
		where = append(where, fmt.Sprintf("creado_at >= $%d::date", idx))
		args = append(args, p.FechaDesde)
		idx++
	}
	if p.FechaHasta != "" {
		where = append(where, fmt.Sprintf("creado_at < ($%d::date + INTERVAL '1 day')", idx))
		args = append(args, p.FechaHasta)
		idx++
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = "WHERE " + strings.Join(where, " AND ")
	}

	var total int
	if err := r.pool.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM public.auditoria_transacciones %s", whereSQL),
		args...,
	).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("auditoria count: %w", err)
	}

	offset := (p.Page - 1) * p.PageSize
	dataSQL := fmt.Sprintf(`
		SELECT
			id::text,
			creado_at,
			COALESCE(usuario_username, '')      AS usuario_username,
			COALESCE(usuario_nombre, '')        AS usuario_nombre,
			COALESCE(usuario_apellido, '')      AS usuario_apellido,
			COALESCE(keycloak_usuario_id::text, '') AS keycloak_usuario_id,
			accion,
			tabla_afectada,
			COALESCE(registro_id, '')           AS registro_id,
			COALESCE(ip_origen::text, '')       AS ip_origen,
			COALESCE(valor_anterior::text, 'null') AS valor_anterior,
			COALESCE(valor_nuevo::text, 'null') AS valor_nuevo
		FROM public.auditoria_transacciones
		%s
		ORDER BY creado_at DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, idx, idx+1)

	args = append(args, p.PageSize, offset)

	rows, err := r.pool.Query(ctx, dataSQL, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("auditoria query: %w", err)
	}
	defer rows.Close()

	var results []domain.AuditoriaTransaccion
	for rows.Next() {
		var a domain.AuditoriaTransaccion
		var vAnterior, vNuevo string
		var nombre, apellido string
		if err := rows.Scan(
			&a.ID, &a.Timestamp, &a.Usuario, &nombre, &apellido,
			&a.KeycloakUserID, &a.Accion, &a.Tabla,
			&a.RecordID, &a.IPAddress, &vAnterior, &vNuevo,
		); err != nil {
			return nil, 0, fmt.Errorf("auditoria scan: %w", err)
		}
		if nombre != "" || apellido != "" {
			a.NombreCompleto = strings.TrimSpace(nombre + " " + apellido)
		}
		a.ValorAnterior = []byte(vAnterior)
		a.ValorNuevo = []byte(vNuevo)
		results = append(results, a)
	}
	return results, total, rows.Err()
}
