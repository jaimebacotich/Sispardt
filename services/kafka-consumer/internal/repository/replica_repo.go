package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/kafka-consumer/internal/models"
)

type ReplicaRepo struct {
	pool *pgxpool.Pool
}

func NewReplicaRepo(pool *pgxpool.Pool) *ReplicaRepo {
	return &ReplicaRepo{pool: pool}
}

func microsToTime(micros *int64) *time.Time {
	if micros == nil {
		return nil
	}
	t := time.UnixMicro(*micros).UTC()
	return &t
}

func (r *ReplicaRepo) UpsertPais(ctx context.Context, rec *models.PaisRecord) error {
	const sql = `
		INSERT INTO public.paises_replica_cache (id, nombre, codigo_iso, eliminado_at, es_sistema)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			nombre       = EXCLUDED.nombre,
			codigo_iso   = EXCLUDED.codigo_iso,
			eliminado_at = EXCLUDED.eliminado_at,
			es_sistema   = EXCLUDED.es_sistema`
	_, err := r.pool.Exec(ctx, sql, rec.ID, rec.Nombre, rec.CodigoISO, microsToTime(rec.EliminadoAt), rec.EsSistema)
	return wrapErr("upsert pais", err)
}

func (r *ReplicaRepo) DeletePais(ctx context.Context, id int) error {
	const sql = `UPDATE public.paises_replica_cache SET eliminado_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, sql, id)
	return wrapErr("delete pais", err)
}

func (r *ReplicaRepo) UpsertDivisionPrincipal(ctx context.Context, rec *models.DivisionPrincipalRecord) error {
	const sql = `
		INSERT INTO public.divisiones_principales_replica_cache (id, pais_id, nombre, eliminado_at, es_sistema)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			pais_id      = EXCLUDED.pais_id,
			nombre       = EXCLUDED.nombre,
			eliminado_at = EXCLUDED.eliminado_at,
			es_sistema   = EXCLUDED.es_sistema`
	_, err := r.pool.Exec(ctx, sql, rec.ID, rec.PaisID, rec.Nombre, microsToTime(rec.EliminadoAt), rec.EsSistema)
	return wrapErr("upsert division_principal", err)
}

func (r *ReplicaRepo) UpsertDivisionSecundaria(ctx context.Context, rec *models.DivisionSecundariaRecord) error {
	const sql = `
		INSERT INTO public.divisiones_secundarias_replica_cache (id, division_principal_id, nombre, eliminado_at, es_sistema)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			division_principal_id = EXCLUDED.division_principal_id,
			nombre                = EXCLUDED.nombre,
			eliminado_at          = EXCLUDED.eliminado_at,
			es_sistema            = EXCLUDED.es_sistema`
	_, err := r.pool.Exec(ctx, sql, rec.ID, rec.DivisionPrincipalID, rec.Nombre, microsToTime(rec.EliminadoAt), rec.EsSistema)
	return wrapErr("upsert division_secundaria", err)
}

func (r *ReplicaRepo) UpsertLocalidad(ctx context.Context, rec *models.LocalidadRecord) error {
	const sql = `
		INSERT INTO public.localidades_replica_cache (id, division_secundaria_id, nombre, eliminado_at, es_sistema)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (id) DO UPDATE SET
			division_secundaria_id = EXCLUDED.division_secundaria_id,
			nombre                 = EXCLUDED.nombre,
			eliminado_at           = EXCLUDED.eliminado_at,
			es_sistema             = EXCLUDED.es_sistema`
	_, err := r.pool.Exec(ctx, sql, rec.ID, rec.DivisionSecundariaID, rec.Nombre, microsToTime(rec.EliminadoAt), rec.EsSistema)
	return wrapErr("upsert localidad", err)
}

func (r *ReplicaRepo) UpsertHabitacion(ctx context.Context, rec *models.HabitacionRecord, tipoNombre string, capacidad int) error {
	const sql = `
		INSERT INTO public.habitaciones_replica_cache
			(habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion,
			 capacidad_calculada, estado_actual, piso, eliminado_at, actualizado_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		ON CONFLICT (habitacion_id) DO UPDATE SET
			establecimiento_id  = EXCLUDED.establecimiento_id,
			nro_habitacion      = EXCLUDED.nro_habitacion,
			tipo_habitacion     = EXCLUDED.tipo_habitacion,
			capacidad_calculada = EXCLUDED.capacidad_calculada,
			estado_actual       = EXCLUDED.estado_actual,
			piso                = EXCLUDED.piso,
			eliminado_at        = EXCLUDED.eliminado_at,
			actualizado_at      = NOW()`
	_, err := r.pool.Exec(ctx, sql,
		rec.ID, rec.EstablecimientoID, rec.NroHabitacion, tipoNombre,
		capacidad, rec.EstadoHab, rec.Piso, microsToTime(rec.EliminadoAt),
	)
	return wrapErr("upsert habitacion", err)
}

func (r *ReplicaRepo) SetCapacidadHabitacion(ctx context.Context, habitacionID string, nuevaCapacidad int) error {
	const sql = `
		UPDATE public.habitaciones_replica_cache
		SET capacidad_calculada = $2, actualizado_at = NOW()
		WHERE habitacion_id = $1`
	_, err := r.pool.Exec(ctx, sql, habitacionID, nuevaCapacidad)
	return wrapErr("set capacidad habitacion", err)
}

func (r *ReplicaRepo) GetCapacidadActual(ctx context.Context, habitacionID string) (int, error) {
	var cap int
	err := r.pool.QueryRow(ctx,
		`SELECT capacidad_calculada FROM public.habitaciones_replica_cache WHERE habitacion_id = $1`,
		habitacionID,
	).Scan(&cap)
	return cap, wrapErr("get capacidad actual", err)
}

func wrapErr(op string, err error) error {
	if err != nil {
		return fmt.Errorf("%s: %w", op, err)
	}
	return nil
}
