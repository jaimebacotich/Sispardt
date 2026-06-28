package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
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
	// Agrega huéspedes activos por habitación; no produce filas duplicadas.
	// Cuando fecha != "" consulta estado histórico.
	var ocupacionCond string
	if fecha != "" {
		ocupacionCond = "p.estado_operativo = 'ACTIVO' AND p.fecha_reporte <= $2::date AND (p.salida_at IS NULL OR p.salida_at::date > $2::date)"
	} else {
		ocupacionCond = "p.estado_operativo = 'ACTIVO' AND p.salida_at IS NULL"
	}
	sql := `
		SELECT
			h.habitacion_id,
			h.nro_habitacion,
			h.piso,
			h.tipo_habitacion,
			h.capacidad_calculada,
			h.estado_actual,
			COALESCE(occ.ocupacion_actual, 0)  AS ocupacion_actual,
			occ.parte_id,
			occ.huespedes
		FROM public.habitaciones_replica_cache h
		LEFT JOIN (
			SELECT
				p.habitacion_id,
				COUNT(*)                                                          AS ocupacion_actual,
				MIN(p.id::text)                                                   AS parte_id,
				ARRAY_REMOVE(
					ARRAY_AGG(
						NULLIF(TRIM(COALESCE(per.nombre,'') || ' '
							|| COALESCE(per.apellido_paterno,'')
							|| COALESCE(' ' || per.apellido_materno, '')), '')
						ORDER BY per.nombre, per.apellido_paterno
					), NULL
				)                                                                 AS huespedes
			FROM public.partes_diarios p
			LEFT JOIN public.personas per ON per.id = p.persona_id
			WHERE ` + ocupacionCond + `
			GROUP BY p.habitacion_id
		) occ ON occ.habitacion_id = h.habitacion_id
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
			var huespedes pgtype.Array[pgtype.Text]
			if err := rows.Scan(
				&h.ID, &h.Numero, &h.Piso, &h.TipoNombre, &h.Capacidad,
				&estadoActual, &h.OcupacionActual, &parteID, &huespedes,
			); err != nil {
				return err
			}
			h.ParteActualId = parteID
			h.Huespedes = make([]string, 0, len(huespedes.Elements))
			for _, t := range huespedes.Elements {
				if t.Valid {
					h.Huespedes = append(h.Huespedes, t.String)
				}
			}
			switch {
			case estadoActual == "MANTENIMIENTO":
				h.Estado = "mantenimiento"
			case h.Capacidad > 0 && h.OcupacionActual >= h.Capacidad:
				h.Estado = "ocupada"
			default:
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

func (r *ParteDiarioRepo) CreateParte(ctx context.Context, tx pgx.Tx, personaID, establecimientoID, recepcionistaID, username, nombre, apellido string, req domain.CreateParteDiarioRequest, hab *domain.HabitacionResumen) (*domain.ParteDiario, error) {
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
			recepcionista_username, recepcionista_nombre, recepcionista_apellido,
			hab_nro_snapshot, hab_tipo_snapshot, hab_piso_snapshot,
			condicion_entrega
		) VALUES ($1,$2,$3,$4,($4::date)::timestamp AT TIME ZONE 'America/La_Paz',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
		RETURNING id, establecimiento_id, habitacion_id, persona_id, fecha_reporte::text,
		          ingreso_at, salida_at, keycloak_recepcionista_id,
		          recepcionista_username, recepcionista_nombre, recepcionista_apellido,
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
		recepcionistaID, username, nombre, apellido,
		hab.NroHabitacion, hab.TipoHabitacion, hab.Piso,
		condicion,
	).Scan(
		&p.ID, &p.EstablecimientoID, &p.HabitacionID, &p.PersonaID, &fr,
		&p.IngresoAt, &p.SalidaAt, &p.KeycloakRecepcionistaID,
		&p.RecepcionistaUsername, &p.RecepcionistaNombre, &p.RecepcionistaApellido,
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
	       pd.recepcionista_username,
	       NULLIF(TRIM(COALESCE(pd.recepcionista_nombre,'') || ' ' || COALESCE(pd.recepcionista_apellido,'')), '') AS recepcionista_nombre_completo,
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
	var salidaAt *time.Time
	var ingresoAt time.Time
	var creadoAt time.Time

	// Persona fields are nullable (LEFT JOIN may miss when persona_id IS NULL)
	var perID *string
	var perTipoDocID *int
	var perTipoDocSigla *string
	var perDocIdentidad *string
	var perPaisOrigenID *int
	var perPaisOrigenNombre *string
	var perNombre *string
	var perApPat *string
	var perApMat *string
	var perFechaNac *string
	var perProfesion *string
	var perCreadoAt *time.Time

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
		&p.RecepcionistaUsername, &p.RecepcionistaNombreCompleto,
		&perID, &perTipoDocID, &perTipoDocSigla,
		&perDocIdentidad, &perPaisOrigenID, &perPaisOrigenNombre,
		&perNombre, &perApPat, &perApMat,
		&perFechaNac, &perProfesion, &perCreadoAt,
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
		per := domain.PersonaResponse{ID: *perID}
		per.TipoDocumentoID = perTipoDocID
		per.TipoDocumentoSigla = perTipoDocSigla
		if perDocIdentidad != nil {
			per.DocumentoIdentidad = *perDocIdentidad
		}
		if perPaisOrigenID != nil {
			per.PaisOrigenID = *perPaisOrigenID
		}
		if perPaisOrigenNombre != nil {
			per.PaisOrigenNombre = *perPaisOrigenNombre
		}
		if perNombre != nil {
			per.Nombre = *perNombre
		}
		if perApPat != nil {
			per.ApellidoPaterno = *perApPat
		}
		per.ApellidoMaterno = perApMat
		if perFechaNac != nil {
			per.FechaNacimiento = *perFechaNac
		}
		per.Profesion = perProfesion
		if perCreadoAt != nil {
			per.CreadoAt = perCreadoAt.Format(time.RFC3339)
		}
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

	// Excluir partes sin persona (datos incompletos — seed histórico sin personas)
	conds = append(conds, "pd.persona_id IS NOT NULL")

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

func (r *ParteDiarioRepo) CreateCierre(ctx context.Context, tx pgx.Tx, establecimientoID, cerradoPor, username, nombre, apellido string, req domain.CreateCierreDiarioRequest) (*domain.CierreDiario, error) {
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
			 total_checkins, total_checkouts, cerrado_por,
			 cerrado_por_username, cerrado_por_nombre, cerrado_por_apellido,
			 observacion, condicion_entrega)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING id, establecimiento_id, fecha_reporte::text, total_registros,
		          total_checkins, total_checkouts, cerrado_por::text,
		          cerrado_por_username, cerrado_por_nombre, cerrado_por_apellido,
		          cerrado_at, observacion, condicion_entrega`

	var c domain.CierreDiario
	if err := tx.QueryRow(ctx, sql,
		establecimientoID, req.FechaReporte, totalCheckins,
		totalCheckins, totalCheckouts, cerradoPor,
		username, nombre, apellido,
		req.Observacion, condicion,
	).Scan(
		&c.ID, &c.EstablecimientoID, &c.FechaReporte, &c.TotalRegistros,
		&c.TotalCheckins, &c.TotalCheckouts, &c.CerradoPor,
		&c.CerradoPorUsername, &c.CerradoPorNombre, &c.CerradoPorApellido,
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
		       cerrado_por_username, cerrado_por_nombre, cerrado_por_apellido,
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
				&c.CerradoPorUsername, &c.CerradoPorNombre, &c.CerradoPorApellido,
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
		       cerrado_por_username, cerrado_por_nombre, cerrado_por_apellido,
		       cerrado_at, observacion, condicion_entrega
		FROM public.cierres_diarios
		WHERE establecimiento_id=$1 AND fecha_reporte=$2`

	var c domain.CierreDiario
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		return tx.QueryRow(ctx, sql, establecimientoID, fecha).Scan(
			&c.ID, &c.EstablecimientoID, &c.FechaReporte, &c.TotalRegistros,
			&c.TotalCheckins, &c.TotalCheckouts, &c.CerradoPor,
			&c.CerradoPorUsername, &c.CerradoPorNombre, &c.CerradoPorApellido,
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

// ErrFechaInicioNoDisponible se retorna cuando el establecimiento no tiene
// fecha_inicio_operaciones registrada en la caché de réplica (CDC aún no propagado
// o el campo es NULL en la BD origen).
var ErrFechaInicioNoDisponible = errors.New("FECHA_INICIO_NO_DISPONIBLE")

func (r *ParteDiarioRepo) GetFechasPendientes(ctx context.Context, establecimientoID string) ([]domain.FechaPendiente, error) {
	// Genera todas las fechas desde la fecha_inicio_operaciones del establecimiento
	// hasta CURRENT_DATE-2 (fuera de plazo), excluyendo las que ya tienen cierre.
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
		FROM generate_series(
			(SELECT fecha_inicio_operaciones FROM public.establecimientos_replica_cache
			 WHERE establecimiento_id = $1),
			CURRENT_DATE - INTERVAL '2 days',
			INTERVAL '1 day'
		) AS d(fecha)
		WHERE NOT EXISTS (
			SELECT 1 FROM public.cierres_diarios cd
			WHERE cd.establecimiento_id = $1 AND cd.fecha_reporte = d.fecha::date
		)
		ORDER BY d.fecha`

	var results []domain.FechaPendiente
	err := WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		// Pre-check: si el establecimiento no está en la réplica (CDC no propagado
		// o fecha_inicio_operaciones es NULL), retornar error explícito en lugar
		// de lista vacía que simularía "todo al día".
		var tieneCache bool
		if err := tx.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM public.establecimientos_replica_cache WHERE establecimiento_id = $1)`,
			establecimientoID,
		).Scan(&tieneCache); err != nil {
			return err
		}
		if !tieneCache {
			return ErrFechaInicioNoDisponible
		}

		rows, err := tx.Query(ctx, sql, establecimientoID)
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
		if errors.Is(err, ErrFechaInicioNoDisponible) {
			return nil, ErrFechaInicioNoDisponible
		}
		return nil, fmt.Errorf("fechas pendientes: %w", err)
	}
	if results == nil {
		results = []domain.FechaPendiente{}
	}
	return results, nil
}

// GetFechaCierreActual devuelve la fecha de ayer (hora Bolivia) y la
// fecha de inicio de operaciones del establecimiento, ambas desde el servidor BD.
func (r *ParteDiarioRepo) GetFechaCierreActual(ctx context.Context, establecimientoID string) (fechaAyer string, fechaInicio *string, err error) {
	const sql = `
		SELECT (CURRENT_DATE AT TIME ZONE 'America/La_Paz' - INTERVAL '1 day')::date::text,
		       (SELECT fecha_inicio_operaciones::text
		        FROM public.establecimientos_replica_cache
		        WHERE establecimiento_id = $1)`
	var inicio *string
	if err := r.pool.QueryRow(ctx, sql, establecimientoID).Scan(&fechaAyer, &inicio); err != nil {
		return "", nil, fmt.Errorf("fecha cierre actual: %w", err)
	}
	return fechaAyer, inicio, nil
}

// GetFechaInicioOperaciones devuelve la fecha de inicio de operaciones desde la caché de réplica.
func (r *ParteDiarioRepo) GetFechaInicioOperaciones(ctx context.Context, establecimientoID string) (*string, error) {
	const sql = `SELECT fecha_inicio_operaciones::text
	             FROM public.establecimientos_replica_cache
	             WHERE establecimiento_id = $1`
	var fecha *string
	if err := r.pool.QueryRow(ctx, sql, establecimientoID).Scan(&fecha); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("fecha inicio operaciones: %w", err)
	}
	return fecha, nil
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

func (r *ParteDiarioRepo) OcupacionDiaria(ctx context.Context, estIDs []string, desde, hasta time.Time) ([]domain.OcupacionDiaria, error) {
	const sql = `
		SELECT od.fecha_reporte::text,
		       SUM(od.total_huespedes)          AS total_huespedes,
		       SUM(vce.capacidad_total)          AS capacidad_total
		FROM public.vw_ocupacion_diaria od
		LEFT JOIN public.vw_capacidad_establecimiento vce
		       ON vce.establecimiento_id = od.establecimiento_id
		WHERE ($1::text IS NULL OR od.establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
		  AND od.fecha_reporte BETWEEN $2 AND $3
		GROUP BY od.fecha_reporte
		ORDER BY od.fecha_reporte`

	rows, err := r.statsPool.Query(ctx, sql, estIDsParam(estIDs), desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("ocupacion diaria: %w", err)
	}
	defer rows.Close()

	var results []domain.OcupacionDiaria
	for rows.Next() {
		var o domain.OcupacionDiaria
		if err := rows.Scan(&o.FechaReporte, &o.TotalHuespedes, &o.CapacidadTotal); err != nil {
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

func (r *ParteDiarioRepo) ResumenEstadisticas(ctx context.Context, estIDs []string, desde, hasta time.Time) (domain.ResumenEstadisticas, error) {
	const sql = `
		WITH capacidad AS (
			SELECT COALESCE(SUM(capacidad_total), 0) AS capacidad_total
			FROM public.vw_capacidad_establecimiento
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
		),
		pernoctes AS (
			SELECT
				COUNT(*) FILTER (WHERE ingreso_at < (fecha_reporte + INTERVAL '1 day')
				  AND (salida_at IS NULL OR salida_at >= (fecha_reporte + INTERVAL '1 day')))   AS total_pernoctes,
				COUNT(*) FILTER (WHERE estado_operativo = 'ACTIVO'
				  AND DATE(ingreso_at) BETWEEN $2 AND $3)                                       AS total_checkins,
				COUNT(*) FILTER (WHERE estado_operativo = 'ACTIVO'
				  AND salida_at IS NOT NULL
				  AND DATE(salida_at) BETWEEN $2 AND $3)                                        AS total_checkouts,
				COUNT(*) FILTER (WHERE estado_operativo = 'ACTIVO'
				  AND pais_procedencia_id NOT IN (
				      SELECT id FROM public.paises_replica_cache WHERE codigo_iso = 'BOL'))     AS total_extranjeros
			FROM public.partes_diarios
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			  AND fecha_reporte BETWEEN $2 AND $3
			  AND estado_operativo = 'ACTIVO'
		),
		ocupacion_diaria AS (
			SELECT od.fecha_reporte,
			       SUM(od.total_huespedes)                              AS total_huespedes,
			       COALESCE((SELECT capacidad_total FROM capacidad), 0) AS capacidad_total
			FROM public.vw_ocupacion_diaria od
			WHERE ($1::text IS NULL OR od.establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			  AND od.fecha_reporte BETWEEN $2 AND $3
			GROUP BY od.fecha_reporte
		),
		estadias AS (
			SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(salida_at, NOW()) - ingreso_at)) / 86400.0), 0) AS estadia_prom
			FROM public.partes_diarios
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			  AND estado_operativo = 'ACTIVO'
			  AND DATE(ingreso_at) BETWEEN $2 AND $3
		)
		SELECT
			(SELECT total_checkins    FROM pernoctes)  AS total_huespedes,
			(SELECT total_extranjeros FROM pernoctes)  AS total_extranjeros,
			COALESCE((SELECT AVG(CASE WHEN od.capacidad_total > 0
			     THEN od.total_huespedes::float / od.capacidad_total * 100.0 END)
			     FROM ocupacion_diaria od), 0)         AS ocupacion_promedio,
			(SELECT estadia_prom FROM estadias)        AS estadia_prom,
			(SELECT total_checkins   FROM pernoctes)   AS total_checkins,
			(SELECT total_checkouts  FROM pernoctes)   AS total_checkouts,
			(SELECT total_pernoctes  FROM pernoctes)   AS total_pernoctes,
			COALESCE((SELECT capacidad_total FROM capacidad), 0) AS capacidad_total,
			COALESCE((SELECT COUNT(DISTINCT fecha_reporte) FROM ocupacion_diaria), 0) AS dias_con_datos,
			-- Huéspedes activos AHORA (sin salida_at), independiente del período seleccionado
			COALESCE((
			    SELECT COUNT(*)
			    FROM public.partes_diarios
			    WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			      AND estado_operativo = 'ACTIVO'
			      AND salida_at IS NULL
			), 0) AS total_activos,
			-- Pico de ocupación: máximo de huéspedes en un solo día del período
			COALESCE((
			    SELECT MAX(total_huespedes)
			    FROM public.vw_ocupacion_diaria
			    WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			      AND fecha_reporte BETWEEN $2 AND $3
			), 0) AS pico_ocupacion`

	var res domain.ResumenEstadisticas
	err := r.statsPool.QueryRow(ctx, sql, estIDsParam(estIDs), desde, hasta).Scan(
		&res.TotalHuespedes,
		&res.TotalExtranjeros,
		&res.OcupacionPromedio,
		&res.EstadiaProm,
		&res.TotalCheckins,
		&res.TotalCheckouts,
		&res.TotalPernoctes,
		&res.CapacidadTotal,
		&res.DiasConDatos,
		&res.TotalActivos,
		&res.PicoOcupacion,
	)
	if err != nil {
		return domain.ResumenEstadisticas{}, fmt.Errorf("resumen estadisticas: %w", err)
	}
	return res, nil
}

func (r *ParteDiarioRepo) Nacionalidades(ctx context.Context, estIDs []string, desde, hasta time.Time) ([]domain.NacionalidadStat, error) {
	const sql = `
		WITH totales AS (
			SELECT pais_id, pais_nombre, SUM(cantidad_ingresos) AS cantidad
			FROM public.vw_estadistica_ingresos
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			  AND fecha_reporte BETWEEN $2 AND $3
			GROUP BY pais_id, pais_nombre
		),
		gran_total AS (SELECT COALESCE(SUM(cantidad), 0) AS total FROM totales)
		SELECT t.pais_id, t.pais_nombre, t.cantidad,
		       ROUND(t.cantidad::numeric / NULLIF(gt.total, 0) * 100, 2)
		FROM totales t, gran_total gt
		ORDER BY t.cantidad DESC
		LIMIT 10`

	rows, err := r.statsPool.Query(ctx, sql, estIDsParam(estIDs), desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("nacionalidades: %w", err)
	}
	defer rows.Close()

	var results []domain.NacionalidadStat
	for rows.Next() {
		var n domain.NacionalidadStat
		if err := rows.Scan(&n.PaisID, &n.PaisNombre, &n.CantidadIngresos, &n.Porcentaje); err != nil {
			return nil, fmt.Errorf("scan nacionalidades: %w", err)
		}
		results = append(results, n)
	}
	if results == nil {
		results = []domain.NacionalidadStat{}
	}
	return results, rows.Err()
}

func (r *ParteDiarioRepo) MotivosViaje(ctx context.Context, estIDs []string, desde, hasta time.Time, agrupacion string) ([]domain.MotivosPeriodo, error) {
	var periodoExpr string
	switch agrupacion {
	case "dia":
		periodoExpr = "TO_CHAR(fecha_reporte, 'YYYY-MM-DD')"
	case "semana":
		periodoExpr = "TO_CHAR(fecha_reporte, 'IYYY-IW')"
	default:
		periodoExpr = "TO_CHAR(fecha_reporte, 'YYYY-MM')"
	}

	query := fmt.Sprintf(`
		SELECT %s AS periodo,
		       mv.id                                AS motivo_id,
		       COALESCE(mv.nombre, 'Sin dato')      AS motivo_nombre,
		       COUNT(*)                             AS cantidad
		FROM public.partes_diarios pd
		LEFT JOIN public.motivos_viaje mv ON mv.id = pd.motivo_viaje_id
		WHERE ($1::text IS NULL OR pd.establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
		  AND pd.fecha_reporte BETWEEN $2 AND $3
		  AND pd.estado_operativo = 'ACTIVO'
		GROUP BY periodo, mv.id, mv.nombre
		ORDER BY periodo ASC, cantidad DESC`, periodoExpr)

	rows, err := r.statsPool.Query(ctx, query, estIDsParam(estIDs), desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("motivos viaje: %w", err)
	}
	defer rows.Close()

	periodMap := make(map[string]*domain.MotivosPeriodo)
	var order []string
	for rows.Next() {
		var periodo, motivoNombre string
		var motivoID *int
		var cantidad int64
		if err := rows.Scan(&periodo, &motivoID, &motivoNombre, &cantidad); err != nil {
			return nil, fmt.Errorf("scan motivos: %w", err)
		}
		if _, ok := periodMap[periodo]; !ok {
			periodMap[periodo] = &domain.MotivosPeriodo{Periodo: periodo}
			order = append(order, periodo)
		}
		periodMap[periodo].Motivos = append(periodMap[periodo].Motivos, domain.MotivoMes{
			MotivoID:     motivoID,
			MotivoNombre: motivoNombre,
			Cantidad:     cantidad,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	results := make([]domain.MotivosPeriodo, 0, len(order))
	for _, p := range order {
		results = append(results, *periodMap[p])
	}
	return results, nil
}

func (r *ParteDiarioRepo) TiposHabitacion(ctx context.Context, estIDs []string, desde, hasta time.Time) ([]domain.TipoHabitacionStat, error) {
	const sql = `
		WITH cache AS (
			SELECT tipo_habitacion,
			       SUM(GREATEST(capacidad_calculada, 0)) AS total_camas
			FROM public.habitaciones_replica_cache
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			GROUP BY tipo_habitacion
		),
		partes_tipos AS (
			SELECT hab_tipo_snapshot AS tipo_habitacion,
			       COUNT(DISTINCT habitacion_id) AS total_rooms
			FROM public.partes_diarios
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			  AND fecha_reporte BETWEEN $2 AND $3
			  AND hab_tipo_snapshot IS NOT NULL
			GROUP BY hab_tipo_snapshot
		),
		capacidad AS (
			SELECT COALESCE(c.tipo_habitacion, p.tipo_habitacion) AS tipo_habitacion,
			       COALESCE(NULLIF(c.total_camas, 0), p.total_rooms)::bigint AS total_camas
			FROM cache c
			FULL OUTER JOIN partes_tipos p ON p.tipo_habitacion = c.tipo_habitacion
		),
		ocupadas AS (
			SELECT hab_tipo_snapshot AS tipo_habitacion,
			       COUNT(DISTINCT habitacion_id) AS ocupadas_promedio
			FROM public.partes_diarios
			WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1, ',')::uuid[]))
			  AND fecha_reporte BETWEEN $2 AND $3
			  AND estado_operativo = 'ACTIVO'
			  AND ingreso_at < (fecha_reporte + INTERVAL '1 day')
			  AND (salida_at IS NULL OR salida_at >= (fecha_reporte + INTERVAL '1 day'))
			GROUP BY hab_tipo_snapshot
		),
		dist_total AS (SELECT COALESCE(SUM(total_camas), 0) AS total FROM capacidad WHERE total_camas > 0)
		SELECT
			c.tipo_habitacion,
			COALESCE(c.total_camas, 0),
			COALESCE(o.ocupadas_promedio, 0),
			COALESCE(ROUND(COALESCE(o.ocupadas_promedio, 0)::numeric / NULLIF(c.total_camas, 0) * 100, 1), 0),
			COALESCE(ROUND(c.total_camas::numeric / NULLIF(dt.total, 0) * 100, 1), 0)
		FROM capacidad c
		LEFT JOIN ocupadas o ON o.tipo_habitacion = c.tipo_habitacion
		CROSS JOIN dist_total dt
		WHERE c.total_camas > 0
		ORDER BY c.total_camas DESC`

	rows, err := r.statsPool.Query(ctx, sql, estIDsParam(estIDs), desde, hasta)
	if err != nil {
		return nil, fmt.Errorf("tipos habitacion: %w", err)
	}
	defer rows.Close()

	var results []domain.TipoHabitacionStat
	for rows.Next() {
		var t domain.TipoHabitacionStat
		if err := rows.Scan(&t.TipoHabitacion, &t.TotalCamas, &t.TotalOcupadas, &t.PorcentajeOcupacion, &t.PorcentajeDistribucion); err != nil {
			return nil, fmt.Errorf("scan tipos habitacion: %w", err)
		}
		results = append(results, t)
	}
	if results == nil {
		results = []domain.TipoHabitacionStat{}
	}
	return results, rows.Err()
}

// ─── Reporte Parte Diario ─────────────────────────────────────────────────────

const reporteParteSQL = `
	SELECT
		pd.hab_nro_snapshot,
		pd.ingreso_at,
		pd.salida_at,
		pc.nombre,
		pc.apellido_paterno,
		pc.apellido_materno,
		COALESCE(td.sigla, '')          AS tipo_documento,
		pc.documento_identidad,
		pc.fecha_nacimiento::text,
		pr.nombre                        AS pais_origen,
		pp.nombre                        AS pais_procedencia
	FROM public.partes_diarios pd
	JOIN public.personas pc ON pc.id = pd.persona_id
	LEFT JOIN public.tipos_documento td ON td.id = pc.tipo_documento_id
	JOIN public.paises_replica_cache pr ON pr.id = pc.pais_origen_id
	JOIN public.paises_replica_cache pp ON pp.id = pd.pais_procedencia_id
	WHERE pd.establecimiento_id = $1
	  AND pd.estado_operativo != 'ANULADO'
	  AND pd.persona_id IS NOT NULL
	  AND %s
	ORDER BY %s`

func (r *ParteDiarioRepo) GetReportePorFecha(
	ctx context.Context,
	establecimientoID string,
	fecha string,
) (ingresos []domain.ReporteFilaParteDiario, salidas []domain.ReporteFilaParteDiario, err error) {

	ingresos = []domain.ReporteFilaParteDiario{}
	salidas = []domain.ReporteFilaParteDiario{}

	scanFila := func(rows pgx.Rows) (*domain.ReporteFilaParteDiario, error) {
		var habNro *string
		var ingresoAt time.Time
		var salidaAt *time.Time
		var nombre, apPat string
		var apMat *string
		var tipoDoc, nroDoc, paisOrigen, paisProcedencia string
		var fechaNac *string

		if err := rows.Scan(
			&habNro, &ingresoAt, &salidaAt,
			&nombre, &apPat, &apMat,
			&tipoDoc, &nroDoc, &fechaNac,
			&paisOrigen, &paisProcedencia,
		); err != nil {
			return nil, err
		}

		fila := &domain.ReporteFilaParteDiario{
			Nombre:          nombre,
			ApellidoPaterno: apPat,
			TipoDocumento:   tipoDoc,
			NroDocumento:    nroDoc,
			Nacionalidad:    paisOrigen,
			Procedencia:     paisProcedencia,
			FechaIngreso:    ingresoAt.In(boliviaLoc()).Format("02/01/2006"),
		}
		if apMat != nil {
			fila.ApellidoMaterno = *apMat
		}
		if fechaNac != nil && *fechaNac != "" {
			if t, e := time.Parse("2006-01-02", *fechaNac); e == nil {
				fila.FechaNacimiento = t.Format("02/01/2006")
			}
		}
		if habNro != nil {
			fila.NroPieza = *habNro
		}
		if salidaAt != nil {
			fila.FechaSalida = salidaAt.In(boliviaLoc()).Format("02/01/2006")
		}
		return fila, nil
	}

	err = WithRLS(ctx, r.pool, establecimientoID, func(tx pgx.Tx) error {
		// INGRESOS: fecha_reporte = fecha solicitada
		ingresoQuery := fmt.Sprintf(reporteParteSQL,
			"pd.fecha_reporte = $2",
			"pd.ingreso_at ASC",
		)
		rows, qErr := tx.Query(ctx, ingresoQuery, establecimientoID, fecha)
		if qErr != nil {
			return fmt.Errorf("reporte ingresos: %w", qErr)
		}
		defer rows.Close()
		i := 1
		for rows.Next() {
			fila, sErr := scanFila(rows)
			if sErr != nil {
				return fmt.Errorf("scan ingreso: %w", sErr)
			}
			fila.Numero = i
			i++
			ingresos = append(ingresos, *fila)
		}
		if err := rows.Err(); err != nil {
			return err
		}

		// SALIDAS: salida_at::date = fecha solicitada (hora Bolivia)
		salidaQuery := fmt.Sprintf(reporteParteSQL,
			"(pd.salida_at AT TIME ZONE 'America/La_Paz')::date = $2::date AND pd.salida_at IS NOT NULL",
			"pd.salida_at ASC",
		)
		rows2, qErr := tx.Query(ctx, salidaQuery, establecimientoID, fecha)
		if qErr != nil {
			return fmt.Errorf("reporte salidas: %w", qErr)
		}
		defer rows2.Close()
		j := 1
		for rows2.Next() {
			fila, sErr := scanFila(rows2)
			if sErr != nil {
				return fmt.Errorf("scan salida: %w", sErr)
			}
			fila.Numero = j
			j++
			salidas = append(salidas, *fila)
		}
		return rows2.Err()
	})

	return ingresos, salidas, err
}

func boliviaLoc() *time.Location {
	loc, err := time.LoadLocation("America/La_Paz")
	if err != nil {
		return time.UTC
	}
	return loc
}

// ─── Reporte Consolidado Nacional ─────────────────────────────────────────────

// GetReporteNacional devuelve todos los partes nacionales (Bolivia) de un mes
// para un establecimiento, con el nombre del departamento de procedencia.
// El cálculo de la matriz día × departamento se hace en Go para mantener la
// query simple y evitar SQL complejo de 31 × 9 celdas.
func (r *ParteDiarioRepo) GetReporteNacional(
	ctx context.Context,
	establecimientoID string,
	anio, mes int,
) ([]domain.ParteParaReporte, error) {

	const sql = `
		SELECT
			EXTRACT(DAY FROM pd.fecha_reporte)::int           AS dia,
			EXTRACT(EPOCH FROM pd.ingreso_at)::bigint         AS ingreso_ts,
			CASE WHEN pd.salida_at IS NOT NULL
			     THEN EXTRACT(EPOCH FROM pd.salida_at)::bigint
			     ELSE NULL END                                AS salida_ts,
			COALESCE(dp.nombre, 'Sin datos')                  AS departamento
		FROM public.partes_diarios pd
		LEFT JOIN public.localidades_replica_cache          lc ON lc.id = pd.localidad_procedencia_id
		LEFT JOIN public.divisiones_secundarias_replica_cache ds ON ds.id = lc.division_secundaria_id
		LEFT JOIN public.divisiones_principales_replica_cache dp ON dp.id = ds.division_principal_id
		WHERE pd.establecimiento_id = $1
		  AND pd.estado_operativo   = 'ACTIVO'
		  AND EXTRACT(YEAR  FROM pd.fecha_reporte) = $2
		  AND EXTRACT(MONTH FROM pd.fecha_reporte) = $3
		  AND pd.pais_procedencia_id = (
		      SELECT id FROM public.paises_replica_cache WHERE codigo_iso = 'BOL' LIMIT 1
		  )
		ORDER BY pd.ingreso_at`

	rows, err := r.statsPool.Query(ctx, sql, establecimientoID, anio, mes)
	if err != nil {
		return nil, fmt.Errorf("reporte nacional query: %w", err)
	}
	defer rows.Close()

	var result []domain.ParteParaReporte
	for rows.Next() {
		var p domain.ParteParaReporte
		if err := rows.Scan(&p.Dia, &p.IngresoAt, &p.SalidaAt, &p.Departamento); err != nil {
			return nil, fmt.Errorf("scan reporte nacional: %w", err)
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

// ─── Reporte Consolidado Internacional ────────────────────────────────────────

// GetReporteInternacional devuelve todos los partes de un mes para un establecimiento
// con el código ISO del país de procedencia. El mapeo a columnas se hace en el service.
func (r *ParteDiarioRepo) GetReporteInternacional(
	ctx context.Context,
	establecimientoID string,
	anio, mes int,
) ([]domain.ParteParaReporte, error) {

	const sql = `
		SELECT
			EXTRACT(DAY FROM pd.fecha_reporte)::int           AS dia,
			EXTRACT(EPOCH FROM pd.ingreso_at)::bigint         AS ingreso_ts,
			CASE WHEN pd.salida_at IS NOT NULL
			     THEN EXTRACT(EPOCH FROM pd.salida_at)::bigint
			     ELSE NULL END                                AS salida_ts,
			COALESCE(p.codigo_iso, 'XX')                      AS pais_iso
		FROM public.partes_diarios pd
		LEFT JOIN public.paises_replica_cache p ON p.id = pd.pais_procedencia_id
		WHERE pd.establecimiento_id = $1
		  AND pd.estado_operativo   = 'ACTIVO'
		  AND EXTRACT(YEAR  FROM pd.fecha_reporte) = $2
		  AND EXTRACT(MONTH FROM pd.fecha_reporte) = $3
		ORDER BY pd.ingreso_at`

	rows, err := r.statsPool.Query(ctx, sql, establecimientoID, anio, mes)
	if err != nil {
		return nil, fmt.Errorf("reporte internacional query: %w", err)
	}
	defer rows.Close()

	var result []domain.ParteParaReporte
	for rows.Next() {
		var p domain.ParteParaReporte
		if err := rows.Scan(&p.Dia, &p.IngresoAt, &p.SalidaAt, &p.Departamento); err != nil {
			return nil, fmt.Errorf("scan reporte internacional: %w", err)
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

// ─── Reporte Consolidado por Municipio ────────────────────────────────────────

// GetReporteMunicipioNacional trae todos los partes bolivianos del mes para
// una lista de establecimientos, con el departamento de procedencia de cada parte.
func (r *ParteDiarioRepo) GetReporteMunicipioNacional(
	ctx context.Context,
	estIDs []string,
	anio, mes int,
) ([]domain.ParteParaMunicipio, error) {
	if len(estIDs) == 0 {
		return nil, nil
	}

	const sql = `
		SELECT
			pd.establecimiento_id::text                       AS est_id,
			EXTRACT(EPOCH FROM pd.ingreso_at)::bigint         AS ingreso_ts,
			CASE WHEN pd.salida_at IS NOT NULL
			     THEN EXTRACT(EPOCH FROM pd.salida_at)::bigint
			     ELSE NULL END                                AS salida_ts,
			COALESCE(dp.nombre, 'Sin datos')                  AS departamento
		FROM public.partes_diarios pd
		LEFT JOIN public.localidades_replica_cache           lc ON lc.id = pd.localidad_procedencia_id
		LEFT JOIN public.divisiones_secundarias_replica_cache ds ON ds.id = lc.division_secundaria_id
		LEFT JOIN public.divisiones_principales_replica_cache dp ON dp.id = ds.division_principal_id
		WHERE pd.establecimiento_id = ANY($1::uuid[])
		  AND pd.estado_operativo   = 'ACTIVO'
		  AND EXTRACT(YEAR  FROM pd.fecha_reporte) = $2
		  AND EXTRACT(MONTH FROM pd.fecha_reporte) = $3
		  AND pd.pais_procedencia_id = (
		      SELECT id FROM public.paises_replica_cache WHERE codigo_iso = 'BOL' LIMIT 1
		  )
		ORDER BY pd.establecimiento_id, pd.ingreso_at`

	rows, err := r.statsPool.Query(ctx, sql, estIDs, anio, mes)
	if err != nil {
		return nil, fmt.Errorf("reporte municipio nacional query: %w", err)
	}
	defer rows.Close()

	var result []domain.ParteParaMunicipio
	for rows.Next() {
		var p domain.ParteParaMunicipio
		if err := rows.Scan(&p.EstablecimientoID, &p.IngresoAt, &p.SalidaAt, &p.Departamento); err != nil {
			return nil, fmt.Errorf("scan reporte municipio: %w", err)
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

// GetReporteMunicipioInternacional trae todos los partes del mes para una lista
// de establecimientos con el ISO del país de procedencia (sin filtrar por Bolivia).
func (r *ParteDiarioRepo) GetReporteMunicipioInternacional(
	ctx context.Context,
	estIDs []string,
	anio, mes int,
) ([]domain.ParteParaMunicipio, error) {
	if len(estIDs) == 0 {
		return nil, nil
	}

	const sql = `
		SELECT
			pd.establecimiento_id::text                       AS est_id,
			EXTRACT(EPOCH FROM pd.ingreso_at)::bigint         AS ingreso_ts,
			CASE WHEN pd.salida_at IS NOT NULL
			     THEN EXTRACT(EPOCH FROM pd.salida_at)::bigint
			     ELSE NULL END                                AS salida_ts,
			COALESCE(p.codigo_iso, 'XX')                      AS pais_iso
		FROM public.partes_diarios pd
		LEFT JOIN public.paises_replica_cache p ON p.id = pd.pais_procedencia_id
		WHERE pd.establecimiento_id = ANY($1::uuid[])
		  AND pd.estado_operativo   = 'ACTIVO'
		  AND EXTRACT(YEAR  FROM pd.fecha_reporte) = $2
		  AND EXTRACT(MONTH FROM pd.fecha_reporte) = $3
		ORDER BY pd.establecimiento_id, pd.ingreso_at`

	rows, err := r.statsPool.Query(ctx, sql, estIDs, anio, mes)
	if err != nil {
		return nil, fmt.Errorf("reporte municipio internacional query: %w", err)
	}
	defer rows.Close()

	var result []domain.ParteParaMunicipio
	for rows.Next() {
		var p domain.ParteParaMunicipio
		if err := rows.Scan(&p.EstablecimientoID, &p.IngresoAt, &p.SalidaAt, &p.Departamento); err != nil {
			return nil, fmt.Errorf("scan reporte municipio intl: %w", err)
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

// estIDsParam convierte una lista de establecimiento_ids a interface{} para pgx.
// Retorna nil (NULL en SQL) cuando la lista está vacía, lo que hace que la cláusula
// WHERE ($1::text IS NULL OR establecimiento_id = ANY(string_to_array($1,',')::uuid[]))
// incluya todos los establecimientos. Con 1+ IDs filtra solo esos.
func estIDsParam(ids []string) interface{} {
	if len(ids) == 0 {
		return nil
	}
	return strings.Join(ids, ",")
}
