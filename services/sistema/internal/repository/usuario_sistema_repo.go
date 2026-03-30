package repository

import (
	"context"
	"fmt"
	"strings"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/sistema/internal/domain"
)

type UsuarioSistemaRepo struct {
	pool *pgxpool.Pool
}

func NewUsuarioSistemaRepo(pool *pgxpool.Pool) *UsuarioSistemaRepo {
	return &UsuarioSistemaRepo{pool: pool}
}

// ─── Escritura ────────────────────────────────────────────────────────────────

func (r *UsuarioSistemaRepo) Create(ctx context.Context, tx pgx.Tx, id, username, nombres, apellidos string) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO public.usuarios_sistema (id, username, nombres, apellidos, estado)
		VALUES ($1, $2, $3, $4, 'ACTIVO')
	`, id, username, nombres, apellidos)
	return err
}

func (r *UsuarioSistemaRepo) UpdateDatos(ctx context.Context, tx pgx.Tx, id string, req domain.UpdateUsuarioSistemaRequest) error {
	sets := []string{"actualizado_at = NOW()"}
	args := []any{}
	idx := 1

	if req.Nombres != nil {
		sets = append(sets, fmt.Sprintf("nombres = $%d", idx))
		args = append(args, *req.Nombres)
		idx++
	}
	if req.Apellidos != nil {
		sets = append(sets, fmt.Sprintf("apellidos = $%d", idx))
		args = append(args, *req.Apellidos)
		idx++
	}
	if req.Estado != nil {
		sets = append(sets, fmt.Sprintf("estado = $%d", idx))
		args = append(args, *req.Estado)
		idx++
	}

	args = append(args, id)
	query := fmt.Sprintf(
		"UPDATE public.usuarios_sistema SET %s WHERE id = $%d AND eliminado_at IS NULL",
		strings.Join(sets, ", "), idx,
	)
	_, err := tx.Exec(ctx, query, args...)
	return err
}

func (r *UsuarioSistemaRepo) SoftDelete(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `
		UPDATE public.usuarios_sistema SET eliminado_at = NOW(), estado = 'ELIMINADO', actualizado_at = NOW()
		WHERE id = $1 AND eliminado_at IS NULL
	`, id)
	return err
}

func (r *UsuarioSistemaRepo) AsignarRol(ctx context.Context, tx pgx.Tx, usuarioID string, rolID int) error {
	_, err := tx.Exec(ctx, `
		INSERT INTO public.usuarios_roles (usuario_id, rol_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, usuarioID, rolID)
	return err
}

func (r *UsuarioSistemaRepo) RevocarRol(ctx context.Context, tx pgx.Tx, usuarioID string, rolID int) error {
	_, err := tx.Exec(ctx, `
		UPDATE public.usuarios_roles SET eliminado_at = NOW()
		WHERE usuario_id = $1 AND rol_id = $2 AND eliminado_at IS NULL
	`, usuarioID, rolID)
	return err
}

// ─── Lectura ──────────────────────────────────────────────────────────────────

func (r *UsuarioSistemaRepo) GetByID(ctx context.Context, id string) (*domain.UsuarioSistemaResponse, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT u.id, u.username, u.nombres, u.apellidos, u.estado,
		       to_char(u.creado_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS creado_at
		FROM public.usuarios_sistema u
		WHERE u.id = $1 AND u.eliminado_at IS NULL
	`, id)

	var u domain.UsuarioSistemaResponse
	if err := row.Scan(&u.ID, &u.Username, &u.Nombres, &u.Apellidos, &u.Estado, &u.CreadoAt); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	roles, err := r.listRolesByUsuario(ctx, id)
	if err != nil {
		return nil, err
	}
	u.Roles = roles
	return &u, nil
}

func (r *UsuarioSistemaRepo) List(ctx context.Context, p domain.UsuarioSistemaListParams) ([]domain.UsuarioSistemaResponse, int, error) {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 20
	}

	conditions := []string{"u.eliminado_at IS NULL"}
	args := []any{}
	idx := 1

	if p.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(u.username ILIKE $%d OR u.nombres ILIKE $%d OR u.apellidos ILIKE $%d)",
			idx, idx, idx,
		))
		args = append(args, "%"+p.Search+"%")
		idx++
	}
	if p.Estado != "" {
		conditions = append(conditions, fmt.Sprintf("u.estado = $%d", idx))
		args = append(args, p.Estado)
		idx++
	}

	where := strings.Join(conditions, " AND ")

	var total int
	if err := r.pool.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM public.usuarios_sistema u WHERE %s", where),
		args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (p.Page - 1) * p.PageSize
	args = append(args, p.PageSize, offset)
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT u.id, u.username, u.nombres, u.apellidos, u.estado,
		       to_char(u.creado_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS creado_at
		FROM public.usuarios_sistema u
		WHERE %s
		ORDER BY u.creado_at DESC
		LIMIT $%d OFFSET $%d
	`, where, idx, idx+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var result []domain.UsuarioSistemaResponse
	for rows.Next() {
		var u domain.UsuarioSistemaResponse
		if err := rows.Scan(&u.ID, &u.Username, &u.Nombres, &u.Apellidos, &u.Estado, &u.CreadoAt); err != nil {
			return nil, 0, err
		}
		result = append(result, u)
	}
	if rows.Err() != nil {
		return nil, 0, rows.Err()
	}

	for i := range result {
		roles, err := r.listRolesByUsuario(ctx, result[i].ID)
		if err != nil {
			return nil, 0, err
		}
		result[i].Roles = roles
	}

	return result, total, nil
}

func (r *UsuarioSistemaRepo) ListRoles(ctx context.Context) ([]domain.Rol, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, nombre, descripcion FROM public.roles ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []domain.Rol
	for rows.Next() {
		var rol domain.Rol
		if err := rows.Scan(&rol.ID, &rol.Nombre, &rol.Descripcion); err != nil {
			return nil, err
		}
		result = append(result, rol)
	}
	return result, rows.Err()
}

func (r *UsuarioSistemaRepo) GetRolByNombre(ctx context.Context, nombre string) (*domain.Rol, error) {
	var rol domain.Rol
	err := r.pool.QueryRow(ctx,
		"SELECT id, nombre, descripcion FROM public.roles WHERE nombre = $1",
		nombre,
	).Scan(&rol.ID, &rol.Nombre, &rol.Descripcion)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &rol, nil
}

// ─── Helper privado ───────────────────────────────────────────────────────────

func (r *UsuarioSistemaRepo) listRolesByUsuario(ctx context.Context, usuarioID string) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT ro.nombre
		FROM public.usuarios_roles ur
		JOIN public.roles ro ON ro.id = ur.rol_id
		WHERE ur.usuario_id = $1 AND ur.eliminado_at IS NULL
		ORDER BY ro.nombre
	`, usuarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []string
	for rows.Next() {
		var nombre string
		if err := rows.Scan(&nombre); err != nil {
			return nil, err
		}
		roles = append(roles, nombre)
	}
	if roles == nil {
		roles = []string{}
	}
	return roles, rows.Err()
}
