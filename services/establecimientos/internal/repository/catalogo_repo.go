package repository

import (
	"context"
	"fmt"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/establecimientos/internal/domain"
)

type CatalogoRepo struct {
	pool *pgxpool.Pool
}

func NewCatalogoRepo(pool *pgxpool.Pool) *CatalogoRepo {
	return &CatalogoRepo{pool: pool}
}

// ─── Clasificaciones ─────────────────────────────────────────────────────────

func (r *CatalogoRepo) ListClasificaciones(ctx context.Context) ([]domain.Clasificacion, error) {
	const sql = `SELECT id, nombre FROM public.clasificaciones WHERE eliminado_at IS NULL ORDER BY nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("listar clasificaciones: %w", err)
	}
	var res []domain.Clasificacion
	for rows.Next() {
		var c domain.Clasificacion
		if err := rows.Scan(&c.ID, &c.Nombre); err != nil {
			return nil, err
		}
		res = append(res, c)
	}
	return res, nil
}

func (r *CatalogoRepo) CreateClasificacion(ctx context.Context, tx pgx.Tx, c domain.Clasificacion) (domain.Clasificacion, error) {
	const sql = `INSERT INTO public.clasificaciones (nombre) VALUES ($1) RETURNING id`
	err := tx.QueryRow(ctx, sql, c.Nombre).Scan(&c.ID)
	return c, err
}

func (r *CatalogoRepo) UpdateClasificacion(ctx context.Context, tx pgx.Tx, c domain.Clasificacion) error {
	const sql = `UPDATE public.clasificaciones SET nombre = $1 WHERE id = $2 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, c.Nombre, c.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

func (r *CatalogoRepo) DeleteClasificacion(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.clasificaciones SET eliminado_at = NOW() WHERE id = $1 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

// ─── Categorias ──────────────────────────────────────────────────────────────

func (r *CatalogoRepo) CreateCategoria(ctx context.Context, tx pgx.Tx, c domain.Categoria) (domain.Categoria, error) {
	const sql = `INSERT INTO public.categorias (clasificacion_id, nombre) VALUES ($1, $2) RETURNING id`
	err := tx.QueryRow(ctx, sql, c.ClasificacionID, c.Nombre).Scan(&c.ID)
	return c, err
}

func (r *CatalogoRepo) UpdateCategoria(ctx context.Context, tx pgx.Tx, c domain.Categoria) error {
	const sql = `UPDATE public.categorias SET clasificacion_id = $1, nombre = $2 WHERE id = $3 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, c.ClasificacionID, c.Nombre, c.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

func (r *CatalogoRepo) DeleteCategoria(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.categorias SET eliminado_at = NOW() WHERE id = $1 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

// ─── Servicios ───────────────────────────────────────────────────────────────

func (r *CatalogoRepo) ListServicios(ctx context.Context) ([]domain.Servicio, error) {
	const sql = `SELECT id, nombre FROM public.servicios WHERE eliminado_at IS NULL ORDER BY nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.Servicio
	for rows.Next() {
		var o domain.Servicio
		if err := rows.Scan(&o.ID, &o.Nombre); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

func (r *CatalogoRepo) CreateServicio(ctx context.Context, tx pgx.Tx, o domain.Servicio) (domain.Servicio, error) {
	const sql = `INSERT INTO public.servicios (nombre) VALUES ($1) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.Nombre).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdateServicio(ctx context.Context, tx pgx.Tx, o domain.Servicio) error {
	const sql = `UPDATE public.servicios SET nombre = $1 WHERE id = $2 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.Nombre, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

func (r *CatalogoRepo) DeleteServicio(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.servicios SET eliminado_at = NOW() WHERE id = $1 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

// ─── Tipos Habitacion ────────────────────────────────────────────────────────

func (r *CatalogoRepo) ListTiposHabitacion(ctx context.Context) ([]domain.TipoHabitacion, error) {
	const sql = `SELECT id, nombre FROM public.tipo_habitaciones WHERE eliminado_at IS NULL ORDER BY nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.TipoHabitacion
	for rows.Next() {
		var o domain.TipoHabitacion
		if err := rows.Scan(&o.ID, &o.Nombre); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

func (r *CatalogoRepo) CreateTipoHabitacion(ctx context.Context, tx pgx.Tx, o domain.TipoHabitacion) (domain.TipoHabitacion, error) {
	const sql = `INSERT INTO public.tipo_habitaciones (nombre) VALUES ($1) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.Nombre).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdateTipoHabitacion(ctx context.Context, tx pgx.Tx, o domain.TipoHabitacion) error {
	const sql = `UPDATE public.tipo_habitaciones SET nombre = $1 WHERE id = $2 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.Nombre, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

func (r *CatalogoRepo) DeleteTipoHabitacion(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.tipo_habitaciones SET eliminado_at = NOW() WHERE id = $1 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

// ─── Tipos Cama ──────────────────────────────────────────────────────────────

func (r *CatalogoRepo) ListTiposCama(ctx context.Context) ([]domain.TipoCama, error) {
	const sql = `SELECT id, nombre, capacidad_personas FROM public.tipo_camas WHERE eliminado_at IS NULL ORDER BY nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.TipoCama
	for rows.Next() {
		var o domain.TipoCama
		if err := rows.Scan(&o.ID, &o.Nombre, &o.CapacidadPersonas); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

func (r *CatalogoRepo) CreateTipoCama(ctx context.Context, tx pgx.Tx, o domain.TipoCama) (domain.TipoCama, error) {
	const sql = `INSERT INTO public.tipo_camas (nombre, capacidad_personas) VALUES ($1, $2) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.Nombre, o.CapacidadPersonas).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdateTipoCama(ctx context.Context, tx pgx.Tx, o domain.TipoCama) error {
	const sql = `UPDATE public.tipo_camas SET nombre = $1, capacidad_personas = $2 WHERE id = $3 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.Nombre, o.CapacidadPersonas, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

func (r *CatalogoRepo) DeleteTipoCama(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.tipo_camas SET eliminado_at = NOW() WHERE id = $1 AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found") }
	return nil
}

// ─── Tipos Personal ──────────────────────────────────────────────────────────

func (r *CatalogoRepo) ListTiposPersonal(ctx context.Context) ([]domain.TipoPersonal, error) {
	const sql = `SELECT id, nombre FROM public.tipo_personal ORDER BY nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.TipoPersonal
	for rows.Next() {
		var o domain.TipoPersonal
		if err := rows.Scan(&o.ID, &o.Nombre); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

// ─── Geograficos ─────────────────────────────────────────────────────────────

func (r *CatalogoRepo) ListPaises(ctx context.Context) ([]domain.Pais, error) {
	const sql = `SELECT id, nombre, codigo_iso, es_sistema FROM public.paises WHERE eliminado_at IS NULL ORDER BY nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.Pais
	for rows.Next() {
		var o domain.Pais
		if err := rows.Scan(&o.ID, &o.Nombre, &o.CodigoIso, &o.EsSistema); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

func (r *CatalogoRepo) CreatePais(ctx context.Context, tx pgx.Tx, o domain.Pais) (domain.Pais, error) {
	const sql = `INSERT INTO public.paises (nombre, codigo_iso) VALUES ($1, $2) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.Nombre, o.CodigoIso).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdatePais(ctx context.Context, tx pgx.Tx, o domain.Pais) error {
	const sql = `UPDATE public.paises SET nombre = $1, codigo_iso = $2 WHERE id = $3 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.Nombre, o.CodigoIso, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) DeletePais(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.paises SET eliminado_at = NOW() WHERE id = $1 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) ListDivisionesPrincipales(ctx context.Context) ([]domain.DivisionPrincipal, error) {
	const sql = `
		SELECT dp.id, dp.pais_id, dp.nombre, p.nombre, dp.es_sistema
		FROM public.divisiones_principales dp
		JOIN public.paises p ON p.id = dp.pais_id
		WHERE dp.eliminado_at IS NULL ORDER BY dp.nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.DivisionPrincipal
	for rows.Next() {
		var o domain.DivisionPrincipal
		if err := rows.Scan(&o.ID, &o.PaisID, &o.Nombre, &o.PaisNombre, &o.EsSistema); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

func (r *CatalogoRepo) CreateDivisionPrincipal(ctx context.Context, tx pgx.Tx, o domain.DivisionPrincipal) (domain.DivisionPrincipal, error) {
	const sql = `INSERT INTO public.divisiones_principales (pais_id, nombre) VALUES ($1, $2) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.PaisID, o.Nombre).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdateDivisionPrincipal(ctx context.Context, tx pgx.Tx, o domain.DivisionPrincipal) error {
	const sql = `UPDATE public.divisiones_principales SET pais_id = $1, nombre = $2 WHERE id = $3 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.PaisID, o.Nombre, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) DeleteDivisionPrincipal(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.divisiones_principales SET eliminado_at = NOW() WHERE id = $1 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) ListDivisionesSecundarias(ctx context.Context) ([]domain.DivisionSecundaria, error) {
	const sql = `
		SELECT ds.id, ds.division_principal_id, ds.nombre, dp.nombre, ds.es_sistema
		FROM public.divisiones_secundarias ds
		JOIN public.divisiones_principales dp ON dp.id = ds.division_principal_id
		WHERE ds.eliminado_at IS NULL ORDER BY ds.nombre`
	rows, err := r.pool.Query(ctx, sql)
	if err != nil { return nil, err }
	var res []domain.DivisionSecundaria
	for rows.Next() {
		var o domain.DivisionSecundaria
		if err := rows.Scan(&o.ID, &o.DivisionPrincipalID, &o.Nombre, &o.DivisionPrincipalNombre, &o.EsSistema); err != nil { return nil, err }
		res = append(res, o)
	}
	return res, nil
}

func (r *CatalogoRepo) CreateDivisionSecundaria(ctx context.Context, tx pgx.Tx, o domain.DivisionSecundaria) (domain.DivisionSecundaria, error) {
	const sql = `INSERT INTO public.divisiones_secundarias (division_principal_id, nombre) VALUES ($1, $2) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.DivisionPrincipalID, o.Nombre).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdateDivisionSecundaria(ctx context.Context, tx pgx.Tx, o domain.DivisionSecundaria) error {
	const sql = `UPDATE public.divisiones_secundarias SET division_principal_id = $1, nombre = $2 WHERE id = $3 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.DivisionPrincipalID, o.Nombre, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) DeleteDivisionSecundaria(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.divisiones_secundarias SET eliminado_at = NOW() WHERE id = $1 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) CreateLocalidad(ctx context.Context, tx pgx.Tx, o domain.Localidad) (domain.Localidad, error) {
	const sql = `INSERT INTO public.localidades (division_secundaria_id, nombre) VALUES ($1, $2) RETURNING id`
	err := tx.QueryRow(ctx, sql, o.DivisionSecundariaID, o.Nombre).Scan(&o.ID)
	return o, err
}

func (r *CatalogoRepo) UpdateLocalidad(ctx context.Context, tx pgx.Tx, o domain.Localidad) error {
	const sql = `UPDATE public.localidades SET division_secundaria_id = $1, nombre = $2 WHERE id = $3 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, o.DivisionSecundariaID, o.Nombre, o.ID)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}

func (r *CatalogoRepo) DeleteLocalidad(ctx context.Context, tx pgx.Tx, id int) error {
	const sql = `UPDATE public.localidades SET eliminado_at = NOW() WHERE id = $1 AND es_sistema = false AND eliminado_at IS NULL`
	t, err := tx.Exec(ctx, sql, id)
	if err != nil { return err }
	if t.RowsAffected() == 0 { return fmt.Errorf("not found or readonly") }
	return nil
}
