package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"sispardt/sistema/internal/domain"
)

// SesionesRepo gestiona la persistencia de sesiones de auditoría.
type SesionesRepo struct {
	pool *pgxpool.Pool
}

func NewSesionesRepo(pool *pgxpool.Pool) *SesionesRepo {
	return &SesionesRepo{pool: pool}
}

// GetMaxTimestamp retorna el MAX(evento_timestamp) de la tabla.
// Retorna time.Time{} (zero) si la tabla está vacía, con ok=false.
func (r *SesionesRepo) GetMaxTimestamp(ctx context.Context) (time.Time, bool, error) {
	var ts *time.Time
	err := r.pool.QueryRow(ctx,
		`SELECT MAX(evento_timestamp) FROM sesiones_auditoria`,
	).Scan(&ts)
	if err != nil {
		return time.Time{}, false, fmt.Errorf("GET MAX timestamp: %w", err)
	}
	if ts == nil {
		return time.Time{}, false, nil
	}
	return *ts, true, nil
}

// InsertBatch inserta múltiples eventos con ON CONFLICT DO NOTHING (idempotente).
// Retorna el número de filas efectivamente insertadas.
func (r *SesionesRepo) InsertBatch(ctx context.Context, events []domain.SesionAuditoria) (int64, error) {
	if len(events) == 0 {
		return 0, nil
	}

	var inserted int64
	for _, ev := range events {
		tag, err := r.pool.Exec(ctx, `
			INSERT INTO sesiones_auditoria
				(keycloak_event_id, tipo_evento, usuario_id, username, realm,
				 client_id, sesion_id, ip_address, detalle, evento_timestamp)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (keycloak_event_id, evento_timestamp) DO NOTHING`,
			ev.KeycloakEventID,
			ev.TipoEvento,
			nullableStr(ev.UsuarioID),
			nullableStr(ev.Username),
			ev.Realm,
			nullableStr(ev.ClientID),
			nullableStr(ev.SesionID),
			nullableStr(ev.IPAddress),
			ev.Detalle,
			ev.EventoTimestamp,
		)
		if err != nil {
			log.Warn().Err(err).Str("event_id", ev.KeycloakEventID).Msg("error insertando evento de sesión")
			continue
		}
		inserted += tag.RowsAffected()
	}
	return inserted, nil
}

// List retorna registros paginados con filtros opcionales.
func (r *SesionesRepo) List(ctx context.Context, p domain.ListParams) ([]domain.SesionAuditoria, int, error) {
	if p.PageSize <= 0 || p.PageSize > 50 {
		p.PageSize = 20
	}
	if p.Page <= 0 {
		p.Page = 1
	}
	offset := (p.Page - 1) * p.PageSize

	// Construir WHERE dinámico
	conditions := []string{}
	args := []interface{}{}
	argIdx := 1

	if p.Tipo != "" {
		// Puede venir separado por comas: "LOGIN,LOGOUT"
		tipos := strings.Split(p.Tipo, ",")
		placeholders := make([]string, 0, len(tipos))
		for _, t := range tipos {
			t = strings.TrimSpace(t)
			if t != "" {
				args = append(args, t)
				placeholders = append(placeholders, fmt.Sprintf("$%d", argIdx))
				argIdx++
			}
		}
		if len(placeholders) > 0 {
			conditions = append(conditions, fmt.Sprintf("tipo_evento IN (%s)", strings.Join(placeholders, ",")))
		}
	}
	if p.Username != "" {
		args = append(args, "%"+p.Username+"%")
		conditions = append(conditions, fmt.Sprintf("username ILIKE $%d", argIdx))
		argIdx++
	}
	if p.ClientID != "" {
		args = append(args, p.ClientID)
		conditions = append(conditions, fmt.Sprintf("client_id = $%d", argIdx))
		argIdx++
	}
	if p.IP != "" {
		args = append(args, "%"+p.IP+"%")
		conditions = append(conditions, fmt.Sprintf("ip_address ILIKE $%d", argIdx))
		argIdx++
	}
	if p.FechaDesde != nil {
		args = append(args, *p.FechaDesde)
		conditions = append(conditions, fmt.Sprintf("evento_timestamp >= $%d", argIdx))
		argIdx++
	}
	if p.FechaHasta != nil {
		hasta := p.FechaHasta.Add(24 * time.Hour)
		args = append(args, hasta)
		conditions = append(conditions, fmt.Sprintf("evento_timestamp < $%d", argIdx))
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Contar total
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM sesiones_auditoria %s`, where)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("contar sesiones: %w", err)
	}

	// Obtener registros.
	// COALESCE(s.username, u.username): para eventos LOGOUT KC no envía username en
	// details, pero sí tenemos el mismo usuario_id en logins anteriores.
	dataArgs := append(args, p.PageSize, offset)
	dataQuery := fmt.Sprintf(`
		SELECT s.id, s.keycloak_event_id, s.tipo_evento,
		       COALESCE(s.usuario_id, ''),
		       COALESCE(s.username, u.username, ''),
		       s.realm,
		       COALESCE(s.client_id, ''), COALESCE(s.sesion_id, ''), COALESCE(s.ip_address, ''),
		       s.detalle, s.evento_timestamp, s.creado_at
		FROM sesiones_auditoria s
		LEFT JOIN LATERAL (
		    SELECT username
		    FROM sesiones_auditoria
		    WHERE usuario_id = s.usuario_id
		      AND username IS NOT NULL AND username <> ''
		    ORDER BY evento_timestamp DESC
		    LIMIT 1
		) u ON s.username IS NULL OR s.username = ''
		%s
		ORDER BY s.evento_timestamp DESC
		LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1)

	rows, err := r.pool.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("query sesiones: %w", err)
	}
	defer rows.Close()

	var results []domain.SesionAuditoria
	for rows.Next() {
		var s domain.SesionAuditoria
		var detalle []byte
		if err := rows.Scan(
			&s.ID, &s.KeycloakEventID, &s.TipoEvento,
			&s.UsuarioID, &s.Username,
			&s.Realm,
			&s.ClientID, &s.SesionID, &s.IPAddress,
			&detalle, &s.EventoTimestamp, &s.CreadoAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scan sesión: %w", err)
		}
		if detalle != nil {
			s.Detalle = json.RawMessage(detalle)
		}
		results = append(results, s)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("rows sesiones: %w", err)
	}

	return results, total, nil
}

// GetUsernamesByUserIDs busca el username más reciente para cada usuario_id dado.
// Útil para resolver el username de eventos LOGOUT (KC no lo incluye en details).
func (r *SesionesRepo) GetUsernamesByUserIDs(ctx context.Context, userIDs []string) (map[string]string, error) {
	if len(userIDs) == 0 {
		return map[string]string{}, nil
	}
	placeholders := make([]string, len(userIDs))
	args := make([]interface{}, len(userIDs))
	for i, id := range userIDs {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
		args[i] = id
	}
	query := fmt.Sprintf(`
		SELECT DISTINCT ON (usuario_id) usuario_id, username
		FROM sesiones_auditoria
		WHERE usuario_id IN (%s) AND username IS NOT NULL AND username <> ''
		ORDER BY usuario_id, evento_timestamp DESC`,
		strings.Join(placeholders, ","))

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("GetUsernamesByUserIDs: %w", err)
	}
	defer rows.Close()

	result := make(map[string]string, len(userIDs))
	for rows.Next() {
		var uid, uname string
		if err := rows.Scan(&uid, &uname); err != nil {
			return nil, err
		}
		result[uid] = uname
	}
	return result, rows.Err()
}

// nullableStr convierte cadena vacía en nil para campos opcionales.
func nullableStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
