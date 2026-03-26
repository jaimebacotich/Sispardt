package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/movimientos/internal/domain"
)

type ParteDiarioRepo struct {
	pool      *pgxpool.Pool // app_recepcionista (RLS)
	statsPool *pgxpool.Pool // app_resp_estadistica (sin RLS)
}

func NewParteDiarioRepo(pool, statsPool *pgxpool.Pool) *ParteDiarioRepo {
	return &ParteDiarioRepo{pool: pool, statsPool: statsPool}
}

// ─── Catálogos ────────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) GetCatalogos(ctx context.Context) (*domain.CatalogosMovimientos, error) {
	cat := &domain.CatalogosMovimientos{
		TiposDocumento:        []domain.TipoDocumento{},
		MotivosViaje:          []domain.MotivoViaje{},
		Paises:                []domain.Pais{},
		DivisionesPrincipales: []domain.DivisionPrincipal{},
		DivisionesSecundarias: []domain.DivisionSecundaria{},
		Localidades:           []domain.LocalidadMov{},
	}

	rows, err := r.pool.Query(ctx, `SELECT id, sigla, descripcion FROM public.tipos_documento ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("tipos_documento: %w", err)
	}
	for rows.Next() {
		var t domain.TipoDocumento
		if err := rows.Scan(&t.ID, &t.Sigla, &t.Descripcion); err != nil {
			rows.Close(); return nil, fmt.Errorf("scan tipo_documento: %w", err)
		}
		cat.TiposDocumento = append(cat.TiposDocumento, t)
	}
	rows.Close()

	rows, err = r.pool.Query(ctx, `SELECT id, nombre FROM public.motivos_viaje ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("motivos_viaje: %w", err)
	}
	for rows.Next() {
		var m domain.MotivoViaje
		if err := rows.Scan(&m.ID, &m.Nombre); err != nil {
			rows.Close(); return nil, fmt.Errorf("scan motivo_viaje: %w", err)
		}
		cat.MotivosViaje = append(cat.MotivosViaje, m)
	}
	rows.Close()

	rows, err = r.pool.Query(ctx, `SELECT id, nombre, codigo_iso FROM public.paises_replica_cache ORDER BY nombre`)
	if err != nil {
		return nil, fmt.Errorf("paises: %w", err)
	}
	for rows.Next() {
		var p domain.Pais
		if err := rows.Scan(&p.ID, &p.Nombre, &p.CodigoIso); err != nil {
			rows.Close(); return nil, fmt.Errorf("scan pais: %w", err)
		}
		cat.Paises = append(cat.Paises, p)
	}
	rows.Close()

	rows, err = r.pool.Query(ctx, `SELECT id, pais_id, nombre FROM public.divisiones_principales_replica_cache ORDER BY nombre`)
	if err != nil {
		return nil, fmt.Errorf("divisiones_principales: %w", err)
	}
	for rows.Next() {
		var d domain.DivisionPrincipal
		if err := rows.Scan(&d.ID, &d.PaisID, &d.Nombre); err != nil {
			rows.Close(); return nil, fmt.Errorf("scan division_principal: %w", err)
		}
		cat.DivisionesPrincipales = append(cat.DivisionesPrincipales, d)
	}
	rows.Close()

	rows, err = r.pool.Query(ctx, `SELECT id, division_principal_id, nombre FROM public.divisiones_secundarias_replica_cache ORDER BY nombre`)
	if err != nil {
		return nil, fmt.Errorf("divisiones_secundarias: %w", err)
	}
	for rows.Next() {
		var d domain.DivisionSecundaria
		if err := rows.Scan(&d.ID, &d.DivisionPrincipalID, &d.Nombre); err != nil {
			rows.Close(); return nil, fmt.Errorf("scan division_secundaria: %w", err)
		}
		cat.DivisionesSecundarias = append(cat.DivisionesSecundarias, d)
	}
	rows.Close()

	rows, err = r.pool.Query(ctx, `SELECT id, division_secundaria_id, nombre FROM public.localidades_replica_cache ORDER BY nombre`)
	if err != nil {
		return nil, fmt.Errorf("localidades: %w", err)
	}
	for rows.Next() {
		var l domain.LocalidadMov
		if err := rows.Scan(&l.ID, &l.DivisionSecundariaID, &l.Nombre); err != nil {
			rows.Close(); return nil, fmt.Errorf("scan localidad: %w", err)
		}
		cat.Localidades = append(cat.Localidades, l)
	}
	rows.Close()

	return cat, nil
}

// ─── Habitaciones Estado ──────────────────────────────────────────────────────

func (r *ParteDiarioRepo) GetHabitacionesEstado(ctx context.Context, establecimientoID, fecha string) ([]domain.HabitacionEstado, error) {
	// Cuando fecha != "", consulta estado histórico: habitaciones ocupadas en esa fecha.
	// Cuando fecha == "", consulta estado actual.
	ocupacionCond := "p.estado_operativo = 'ACTIVO' AND p.salida_at IS NULL"
	if fecha != "" {
		ocupacionCond = "p.estado_operativo = 'ACTIVO' AND p.fecha_reporte <= $2::date AND (p.salida_at IS NULL OR p.salida_at::date > $2::date)"
	}
	sql := `
		SELECT
			h.habitacion_id,
			h.nro_habitacion,
			h.piso,
			h.tipo_habitacion,
			h.capacidad_calculada,
			h.estado_actual,
			p.id AS parte_id,
			NULLIF(TRIM(per.nombre || ' ' || per.apellido_paterno
				|| COALESCE(' ' || per.apellido_materno, '')), '') AS huesped
		FROM public.habitaciones_replica_cache h
		LEFT JOIN public.partes_diarios p
			ON p.habitacion_id = h.habitacion_id
			AND ` + ocupacionCond + `
		LEFT JOIN public.personas per ON per.id = p.persona_id
		WHERE h.establecimiento_id = $1
		  AND h.eliminado_at IS NULL
		ORDER BY h.nro_habitacion`

	var results []domain.HabitacionEstado
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		var rows pgx.Rows
		var err error
		if fecha != "" {
			rows, err = tx.Query(ctx, sql, establecimientoID, fecha)
		} else {
			rows, err = tx.Query(ctx, sql, establecimientoID)
		}
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var h domain.HabitacionEstado
			var estadoActual string
			var parteID *string
			var huesped *string
			if err := rows.Scan(
				&h.ID, &h.Numero, &h.Piso, &h.TipoNombre, &h.Capacidad,
				&estadoActual, &parteID, &huesped,
			); err != nil {
				return err
			}
			if parteID != nil {
				h.Estado = "ocupada"
				h.ParteActualId = parteID
				h.HuespedActual = huesped
			} else if estadoActual == "MANTENIMIENTO" {
				h.Estado = "mantenimiento"
			} else {
				h.Estado = "libre"
			}
			results = append(results, h)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("habitaciones estado: %w", err)
	}
	if results == nil {
		results = []domain.HabitacionEstado{}
	}
	return results, nil
}

// ─── Persona ──────────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) UpsertPersona(ctx context.Context, tx pgx.Tx, req domain.CreatePersonaRequest) (*domain.Persona, error) {
	const sql = `
		INSERT INTO public.personas
			(tipo_documento_id, documento_identidad, pais_origen_id, nombre,
			 apellido_paterno, apellido_materno, fecha_nacimiento, profesion)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		ON CONFLICT (tipo_documento_id, documento_identidad) DO UPDATE
			SET nombre           = EXCLUDED.nombre,
			    apellido_paterno  = EXCLUDED.apellido_paterno,
			    apellido_materno  = EXCLUDED.apellido_materno,
			    profesion         = EXCLUDED.profesion
		RETURNING id, tipo_documento_id, documento_identidad, pais_origen_id,
		          nombre, apellido_paterno, apellido_materno, fecha_nacimiento::text,
		          profesion, creado_at`

	var p domain.Persona
	err := tx.QueryRow(ctx, sql,
		req.TipoDocumentoID, req.DocumentoIdentidad, req.PaisOrigenID,
		req.Nombre, req.ApellidoPaterno, req.ApellidoMaterno,
		req.FechaNacimiento, req.Profesion,
	).Scan(
		&p.ID, &p.TipoDocumentoID, &p.DocumentoIdentidad, &p.PaisOrigenID,
		&p.Nombre, &p.ApellidoPaterno, &p.ApellidoMaterno, &p.FechaNacimiento,
		&p.Profesion, &p.CreadoAt,
	)
	if err != nil {
		return nil, fmt.Errorf("upsert persona: %w", err)
	}
	return &p, nil
}

// ─── Habitación Cache ─────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) GetHabitacionCache(ctx context.Context, tx pgx.Tx, habitacionID string) (*domain.HabitacionResumen, error) {
	const sql = `
		SELECT habitacion_id, establecimiento_id, nro_habitacion,
		       tipo_habitacion, capacidad_calculada, piso
		FROM public.habitaciones_replica_cache
		WHERE habitacion_id = $1 AND eliminado_at IS NULL`

	var h domain.HabitacionResumen
	err := tx.QueryRow(ctx, sql, habitacionID).Scan(
		&h.HabitacionID, &h.EstablecimientoID, &h.NroHabitacion,
		&h.TipoHabitacion, &h.CapacidadCalculada, &h.Piso,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("obtener habitacion cache %s: %w", habitacionID, err)
	}
	return &h, nil
}

// ─── Crear Parte ──────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) CreateParte(ctx context.Context, tx pgx.Tx, personaID, establecimientoID, recepcionistaID string, req domain.CreateParteDiarioRequest, hab *domain.HabitacionResumen) (*domain.ParteDiario, error) {
	condicion := "DENTRO_PLAZO"
	if fechaLimite, err := time.Parse("2006-01-02", req.FechaReporte); err == nil {
		if time.Now().After(fechaLimite.Add(48 * time.Hour)) {
			condicion = "FUERA_PLAZO"
		}
	}

	const sql = `
		INSERT INTO public.partes_diarios (
			establecimiento_id, habitacion_id, persona_id, fecha_reporte,
			ingreso_at, pais_procedencia_id, localidad_procedencia_id,
			pais_destino_id, localidad_destino_id, motivo_viaje_id,
			keycloak_recepcionista_id,
			hab_nro_snapshot, hab_tipo_snapshot, hab_piso_snapshot,
			condicion_entrega
		) VALUES ($1,$2,$3,$4,($4::date)::timestamp AT TIME ZONE 'America/La_Paz',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
		RETURNING id, establecimiento_id, habitacion_id, persona_id, fecha_reporte::text,
		          ingreso_at, salida_at, keycloak_recepcionista_id,
		          hab_nro_snapshot, hab_tipo_snapshot, hab_piso_snapshot,
		          pais_procedencia_id, localidad_procedencia_id,
		          pais_destino_id, localidad_destino_id, motivo_viaje_id,
		          estado_operativo, condicion_entrega, creado_at`

	var p domain.ParteDiario
	var fr string
	err := tx.QueryRow(ctx, sql,
		establecimientoID, req.HabitacionID, personaID, req.FechaReporte,
		req.PaisProcedenciaID, req.LocalidadProcedenciaID,
		req.PaisDestinoID, req.LocalidadDestinoID, req.MotivoViajeID,
		recepcionistaID,
		hab.NroHabitacion, hab.TipoHabitacion, hab.Piso,
		condicion,
	).Scan(
		&p.ID, &p.EstablecimientoID, &p.HabitacionID, &p.PersonaID, &fr,
		&p.IngresoAt, &p.SalidaAt, &p.KeycloakRecepcionistaID,
		&p.HabNroSnapshot, &p.HabTipoSnapshot, &p.HabPisoSnapshot,
		&p.PaisProcedenciaID, &p.LocalidadProcedenciaID,
		&p.PaisDestinoID, &p.LocalidadDestinoID, &p.MotivoViajeID,
		&p.EstadoOperativo, &p.CondicionEntrega, &p.CreadoAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			return nil, fmt.Errorf("%s", pgErr.Message)
		}
		return nil, fmt.Errorf("crear parte diario: %w", err)
	}
	p.FechaReporte = fr
	return &p, nil
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) Checkout(ctx context.Context, tx pgx.Tx, parteID, establecimientoID string) error {
	const sql = `
		UPDATE public.partes_diarios
		SET salida_at = GREATEST(ingreso_at, CASE
		        WHEN fecha_reporte < CURRENT_DATE THEN (fecha_reporte::timestamp + interval '23:59:59') AT TIME ZONE 'America/La_Paz'
		        ELSE NOW()
		    END),
		    condicion_entrega = CASE
		        WHEN fecha_reporte < CURRENT_DATE THEN 'FUERA_PLAZO'
		        ELSE condicion_entrega
		    END
		WHERE id = $1
		  AND establecimiento_id = $2
		  AND estado_operativo = 'ACTIVO'
		  AND salida_at IS NULL`
	tag, err := tx.Exec(ctx, sql, parteID, establecimientoID)
	if err != nil {
		return fmt.Errorf("checkout parte %s: %w", parteID, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("parte no encontrado, ya tiene checkout o está anulado")
	}
	return nil
}

// ─── Listar Partes (enriquecido) ─────────────────────────────────────────────

func listParteSQL(where string, limitIdx, offsetIdx int) string {
	return fmt.Sprintf(`
	SELECT pd.id, pd.establecimiento_id, pd.habitacion_id,
	       pd.hab_nro_snapshot, pd.hab_tipo_snapshot, pd.hab_piso_snapshot,
	       pd.fecha_reporte::text, pd.ingreso_at, pd.salida_at,
	       pd.pais_procedencia_id, pp.nombre AS pais_proc_nombre,
	       pd.localidad_procedencia_id, lp.nombre AS loc_proc_nombre,
	       pd.pais_destino_id, pd2.nombre AS pais_dest_nombre,
	       pd.localidad_destino_id, ld.nombre AS loc_dest_nombre,
	       pd.motivo_viaje_id, mv.nombre AS motivo_nombre,
	       pd.estado_operativo, pd.condicion_entrega, pd.creado_at,
	       per.id AS per_id, per.tipo_documento_id, td.sigla AS td_sigla,
	       per.documento_identidad, per.pais_origen_id, po.nombre AS pais_origen_nombre,
	       per.nombre AS per_nombre, per.apellido_paterno, per.apellido_materno,
	       per.fecha_nacimiento::text, per.profesion, per.creado_at AS per_creado_at
	FROM public.partes_diarios pd
	LEFT JOIN public.paises_replica_cache pp   ON pp.id  = pd.pais_procedencia_id
	LEFT JOIN public.localidades_replica_cache lp ON lp.id = pd.localidad_procedencia_id
	LEFT JOIN public.paises_replica_cache pd2  ON pd2.id  = pd.pais_destino_id
	LEFT JOIN public.localidades_replica_cache ld ON ld.id = pd.localidad_destino_id
	LEFT JOIN public.motivos_viaje mv          ON mv.id  = pd.motivo_viaje_id
	LEFT JOIN public.personas per              ON per.id = pd.persona_id
	LEFT JOIN public.tipos_documento td        ON td.id  = per.tipo_documento_id
	LEFT JOIN public.paises_replica_cache po   ON po.id  = per.pais_origen_id
	WHERE %s
	ORDER BY pd.fecha_reporte DESC, pd.ingreso_at DESC
	LIMIT $%d OFFSET $%d`, where, limitIdx, offsetIdx)
}

func scanParteRow(rows pgx.Rows) (*domain.ParteDiarioResponse, error) {
	var p domain.ParteDiarioResponse
	var per domain.PersonaResponse
	var salidaAt *time.Time
	var ingresoAt time.Time
	var creadoAt, perCreadoAt time.Time
	var perID *string

	if err := rows.Scan(
		&p.ID, &p.EstablecimientoID, &p.HabitacionID,
		&p.HabNroSnapshot, &p.HabTipoSnapshot, &p.HabPisoSnapshot,
		&p.FechaReporte, &ingresoAt, &salidaAt,
		&p.PaisProcedenciaID, &p.PaisProcedenciaNombre,
		&p.LocalidadProcedenciaID, &p.LocalidadProcedenciaNombre,
		&p.PaisDestinoID, &p.PaisDestinoNombre,
		&p.LocalidadDestinoID, &p.LocalidadDestinoNombre,
		&p.MotivoViajeID, &p.MotivoViajeNombre,
		&p.EstadoOperativo, &p.CondicionEntrega, &creadoAt,
		&perID, &per.TipoDocumentoID, &per.TipoDocumentoSigla,
		&per.DocumentoIdentidad, &per.PaisOrigenID, &per.PaisOrigenNombre,
		&per.Nombre, &per.ApellidoPaterno, &per.ApellidoMaterno,
		&per.FechaNacimiento, &per.Profesion, &perCreadoAt,
	); err != nil {
		return nil, err
	}

	p.IngresoAt = ingresoAt.Format(time.RFC3339)
	if salidaAt != nil {
		s := salidaAt.Format(time.RFC3339)
		p.SalidaAt = &s
	}
	p.CreadoAt = creadoAt.Format(time.RFC3339)

	if perID != nil {
		per.ID = *perID
		per.CreadoAt = perCreadoAt.Format(time.RFC3339)
		p.Persona = &per
	}
	return &p, nil
}

func (r *ParteDiarioRepo) List(ctx context.Context, params domain.ListPartesParams) ([]domain.ParteDiarioResponse, int, error) {
	var conds []string
	var args []any
	idx := 1

	if params.EstablecimientoID != "" {
		conds = append(conds, fmt.Sprintf("pd.establecimiento_id = $%d", idx))
		args = append(args, params.EstablecimientoID)
		idx++
	}
	if params.SoloActivos {
		conds = append(conds, "pd.estado_operativo = 'ACTIVO' AND pd.salida_at IS NULL")
	} else if params.SoloCheckout {
		conds = append(conds, "pd.estado_operativo = 'ACTIVO' AND pd.salida_at IS NOT NULL")
	} else if params.EstadoOperativo != "" {
		conds = append(conds, fmt.Sprintf("pd.estado_operativo = $%d", idx))
		args = append(args, params.EstadoOperativo)
		idx++
	} else if !params.IncluirAnulados {
		conds = append(conds, "pd.estado_operativo != 'ANULADO'")
	}
	if params.FechaReporte != "" {
		conds = append(conds, fmt.Sprintf("pd.fecha_reporte = $%d", idx))
		args = append(args, params.FechaReporte)
		idx++
	}
	if params.FechaDesde != "" {
		conds = append(conds, fmt.Sprintf("pd.fecha_reporte >= $%d", idx))
		args = append(args, params.FechaDesde)
		idx++
	}
	if params.FechaHasta != "" {
		conds = append(conds, fmt.Sprintf("pd.fecha_reporte <= $%d", idx))
		args = append(args, params.FechaHasta)
		idx++
	}
	if params.SalidaFecha != "" {
		conds = append(conds, fmt.Sprintf("(pd.salida_at AT TIME ZONE 'America/La_Paz')::date = $%d", idx))
		args = append(args, params.SalidaFecha)
		idx++
	}
	if params.ActivoEnFecha != "" {
		conds = append(conds, fmt.Sprintf("pd.fecha_reporte <= $%d AND pd.salida_at IS NULL", idx))
		args = append(args, params.ActivoEnFecha)
		idx++
	}
	if params.HabitacionID != "" {
		conds = append(conds, fmt.Sprintf("pd.habitacion_id = $%d", idx))
		args = append(args, params.HabitacionID)
		idx++
	}

	if len(conds) == 0 {
		conds = append(conds, "TRUE")
	}
	where := strings.Join(conds, " AND ")

	var total int
	var results []domain.ParteDiarioResponse

	err := WithRLS(ctx, r.pool, params.EstablecimientoID, func(tx pgx.Tx) error {
		// Contar total con el mismo WHERE
		countSQL := `SELECT COUNT(*) FROM public.partes_diarios pd WHERE ` + where
		if err := tx.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
			return fmt.Errorf("contar partes: %w", err)
		}

		if params.PageSize <= 0 || params.PageSize > 100 {
			params.PageSize = 20
		}
		if params.Page <= 0 {
			params.Page = 1
		}
		offset := (params.Page - 1) * params.PageSize
		queryArgs := append(args, params.PageSize, offset)

		rows, err := tx.Query(ctx, listParteSQL(where, idx, idx+1), queryArgs...)
		if err != nil {
			return fmt.Errorf("listar partes: %w", err)
		}
		defer rows.Close()

		for rows.Next() {
			p, err := scanParteRow(rows)
			if err != nil {
				return fmt.Errorf("scan parte: %w", err)
			}
			results = append(results, *p)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, 0, err
	}

	if results == nil {
		results = []domain.ParteDiarioResponse{}
	}
	return results, total, nil
}

func (r *ParteDiarioRepo) GetByID(ctx context.Context, id, establecimientoID string) (*domain.ParteDiarioResponse, error) {
	var result *domain.ParteDiarioResponse
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, listParteSQL("pd.id = $1", 2, 3), id, 1, 0)
		if err != nil {
			return err
		}
		defer rows.Close()
		if !rows.Next() {
			return nil
		}
		res, err := scanParteRow(rows)
		if err != nil {
			return err
		}
		result = res
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("obtener parte %s: %w", id, err)
	}
	return result, nil
}

func (r *ParteDiarioRepo) GetByIDRaw(ctx context.Context, id, establecimientoID string) (*domain.ParteDiario, error) {
	const sql = `
		SELECT id, establecimiento_id, habitacion_id, persona_id,
		       fecha_reporte::text, ingreso_at, salida_at,
		       estado_operativo, creado_at
		FROM public.partes_diarios WHERE id = $1`
	var p domain.ParteDiario
	var fr string
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx, sql, id).Scan(
			&p.ID, &p.EstablecimientoID, &p.HabitacionID, &p.PersonaID,
			&fr, &p.IngresoAt, &p.SalidaAt,
			&p.EstadoOperativo, &p.CreadoAt,
		)
	})
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("obtener parte raw %s: %w", id, err)
	}
	p.FechaReporte = fr
	return &p, nil
}

func (r *ParteDiarioRepo) Anular(ctx context.Context, tx pgx.Tx, id string) error {
	const sql = `
		UPDATE public.partes_diarios
		SET estado_operativo = 'ANULADO'
		WHERE id = $1 AND estado_operativo = 'ACTIVO'`
	tag, err := tx.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("anular parte %s: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("parte %s no encontrado o ya anulado", id)
	}
	return nil
}

// ─── Cierres ──────────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) CreateCierre(ctx context.Context, tx pgx.Tx, establecimientoID, cerradoPor string, req domain.CreateCierreDiarioRequest) (*domain.CierreDiario, error) {
	var totalCheckins int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM public.partes_diarios
		 WHERE establecimiento_id=$1 AND fecha_reporte=$2 AND estado_operativo='ACTIVO'`,
		establecimientoID, req.FechaReporte,
	).Scan(&totalCheckins); err != nil {
		return nil, fmt.Errorf("contar checkins: %w", err)
	}

	var totalCheckouts int
	if err := tx.QueryRow(ctx,
		`SELECT COUNT(*) FROM public.partes_diarios
		 WHERE establecimiento_id=$1 AND (salida_at AT TIME ZONE 'America/La_Paz')::date=$2::date AND estado_operativo='ACTIVO'`,
		establecimientoID, req.FechaReporte,
	).Scan(&totalCheckouts); err != nil {
		return nil, fmt.Errorf("contar checkouts: %w", err)
	}

	condicion := "DENTRO_PLAZO"
	if fechaLimite, err := time.Parse("2006-01-02", req.FechaReporte); err == nil {
		if time.Now().After(fechaLimite.Add(48 * time.Hour)) {
			condicion = "FUERA_PLAZO"
		}
	}

	const sql = `
		INSERT INTO public.cierres_diarios
			(establecimiento_id, fecha_reporte, total_registros,
			 total_checkins, total_checkouts, cerrado_por, observacion, condicion_entrega)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
		RETURNING id, establecimiento_id, fecha_reporte::text, total_registros,
		          total_checkins, total_checkouts, cerrado_por::text,
		          cerrado_at, observacion, condicion_entrega`

	var c domain.CierreDiario
	if err := tx.QueryRow(ctx, sql,
		establecimientoID, req.FechaReporte, totalCheckins,
		totalCheckins, totalCheckouts, cerradoPor, req.Observacion, condicion,
	).Scan(
		&c.ID, &c.EstablecimientoID, &c.FechaReporte, &c.TotalRegistros,
		&c.TotalCheckins, &c.TotalCheckouts, &c.CerradoPor,
		&c.CerradoAt, &c.Observacion, &c.CondicionEntrega,
	); err != nil {
		return nil, fmt.Errorf("crear cierre: %w", err)
	}
	return &c, nil
}

func (r *ParteDiarioRepo) ListCierres(ctx context.Context, establecimientoID string) ([]domain.CierreDiario, error) {
	const sql = `
		SELECT id, establecimiento_id, fecha_reporte::text, total_registros,
		       total_checkins, total_checkouts, cerrado_por::text,
		       cerrado_at, observacion, condicion_entrega
		FROM public.cierres_diarios
		WHERE establecimiento_id=$1
		ORDER BY fecha_reporte DESC`

	var results []domain.CierreDiario
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, sql, establecimientoID)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var c domain.CierreDiario
			if err := rows.Scan(
				&c.ID, &c.EstablecimientoID, &c.FechaReporte, &c.TotalRegistros,
				&c.TotalCheckins, &c.TotalCheckouts, &c.CerradoPor,
				&c.CerradoAt, &c.Observacion, &c.CondicionEntrega,
			); err != nil {
				return err
			}
			results = append(results, c)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("listar cierres: %w", err)
	}
	if results == nil {
		results = []domain.CierreDiario{}
	}
	return results, nil
}

func (r *ParteDiarioRepo) GetCierrePorFecha(ctx context.Context, establecimientoID, fecha string) (*domain.CierreDiario, error) {
	const sql = `
		SELECT id, establecimiento_id, fecha_reporte::text, total_registros,
		       total_checkins, total_checkouts, cerrado_por::text,
		       cerrado_at, observacion, condicion_entrega
		FROM public.cierres_diarios
		WHERE establecimiento_id=$1 AND fecha_reporte=$2`

	var c domain.CierreDiario
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx, sql, establecimientoID, fecha).Scan(
			&c.ID, &c.EstablecimientoID, &c.FechaReporte, &c.TotalRegistros,
			&c.TotalCheckins, &c.TotalCheckouts, &c.CerradoPor,
			&c.CerradoAt, &c.Observacion, &c.CondicionEntrega,
		)
	})
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("cierre por fecha %s: %w", fecha, err)
	}
	return &c, nil
}

func (r *ParteDiarioRepo) GetFechasPendientes(ctx context.Context, establecimientoID, sistemaInicioDate string) ([]domain.FechaPendiente, error) {
	// Genera todas las fechas desde el inicio del sistema hasta ayer-1 (today-2),
	// excluyendo las que ya tienen un cierre registrado.
	// Check-ins: partes cuya fecha_reporte = ese día.
	// Check-outs: partes cuya salida_at (en hora Bolivia) = ese día (sin importar fecha_reporte).
	const sql = `
		SELECT
			d.fecha::date::text AS fecha_reporte,
			(SELECT COUNT(*) FROM public.partes_diarios pd
			 WHERE pd.establecimiento_id = $1
			   AND pd.fecha_reporte = d.fecha::date
			   AND pd.estado_operativo = 'ACTIVO') AS total_checkins,
			(SELECT COUNT(*) FROM public.partes_diarios pd
			 WHERE pd.establecimiento_id = $1
			   AND (pd.salida_at AT TIME ZONE 'America/La_Paz')::date = d.fecha::date
			   AND pd.estado_operativo = 'ACTIVO') AS total_checkouts
		FROM generate_series($2::date, CURRENT_DATE - INTERVAL '2 days', INTERVAL '1 day') AS d(fecha)
		WHERE NOT EXISTS (
			SELECT 1 FROM public.cierres_diarios cd
			WHERE cd.establecimiento_id = $1 AND cd.fecha_reporte = d.fecha::date
		)
		ORDER BY d.fecha`

	var results []domain.FechaPendiente
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		rows, err := tx.Query(ctx, sql, establecimientoID, sistemaInicioDate)
		if err != nil {
			return err
		}
		defer rows.Close()

		for rows.Next() {
			var f domain.FechaPendiente
			if err := rows.Scan(&f.Fecha, &f.TotalCheckins, &f.TotalCheckouts); err != nil {
				return err
			}
			results = append(results, f)
		}
		return rows.Err()
	})

	if err != nil {
		return nil, fmt.Errorf("fechas pendientes: %w", err)
	}
	if results == nil {
		results = []domain.FechaPendiente{}
	}
	return results, nil
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) OcupacionDiaria(ctx context.Context, establecimientoID string, desde, hasta time.Time) ([]domain.OcupacionDiaria, error) {
	const sql = `
		SELECT od.establecimiento_id, od.fecha_reporte::text,
		       od.total_huespedes, vce.capacidad_total
		FROM public.vw_ocupacion_diaria od
		LEFT JOIN public.vw_capacidad_establecimiento vce
		       ON vce.establecimiento_id = od.establecimiento_id
		WHERE od.establecimiento_id = $1
		  AND od.fecha_reporte BETWEEN $2 AND $3
		ORDER BY od.fecha_reporte`

	rows, err := r.statsPool.Query(ctx, sql, establecimientoID, desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("ocupacion diaria: %w", err)
	}
	defer rows.Close()

	var results []domain.OcupacionDiaria
	for rows.Next() {
		var o domain.OcupacionDiaria
		if err := rows.Scan(&o.EstablecimientoID, &o.FechaReporte, &o.TotalHuespedes, &o.CapacidadTotal); err != nil {
			return nil, fmt.Errorf("scan ocupacion: %w", err)
		}
		if o.CapacidadTotal != nil && *o.CapacidadTotal > 0 {
			pct := float64(o.TotalHuespedes) / float64(*o.CapacidadTotal) * 100
			o.PorcentajeOcupacion = &pct
		}
		results = append(results, o)
	}
	if results == nil {
		results = []domain.OcupacionDiaria{}
	}
	return results, rows.Err()
}
