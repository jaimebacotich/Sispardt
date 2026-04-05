package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/establecimientos/internal/domain"
)

type EstablecimientoRepo struct {
	pool *pgxpool.Pool
}

func NewEstablecimientoRepo(pool *pgxpool.Pool) *EstablecimientoRepo {
	return &EstablecimientoRepo{pool: pool}
}

// ─── Query builder ────────────────────────────────────────────────────────────

type queryBuilder struct {
	conditions []string
	args       []any
	idx        int
}

func newQB() *queryBuilder { return &queryBuilder{idx: 1} }

func (q *queryBuilder) add(cond string, arg any) {
	q.conditions = append(q.conditions, fmt.Sprintf(cond, q.idx))
	q.args = append(q.args, arg)
	q.idx++
}

func (q *queryBuilder) whereClause() string {
	base := "e.eliminado_at IS NULL"
	if len(q.conditions) == 0 {
		return base
	}
	return base + " AND " + strings.Join(q.conditions, " AND ")
}

func (q *queryBuilder) next() int { n := q.idx; q.idx++; return n }

// ─── SQL base para establecimiento enriquecido ────────────────────────────────

const estBaseSelect = `
	SELECT
		e.id, e.nro_licencia, e.razon_social, e.propietario,
		e.tiene_licencia_vigente, e.fecha_vencimiento_licencia::text,
		e.direccion, e.latitud, e.longitud, e.telefono, e.email,
		e.estado_admin, e.creado_at,
		c.id   AS cat_id,   c.nombre AS cat_nombre,
		cl.id  AS cls_id,   cl.nombre AS cls_nombre,
		l.id   AS loc_id,   l.nombre  AS loc_nombre,
		ds.id  AS ds_id,    ds.nombre AS ds_nombre,
		COALESCE((
			SELECT SUM(hc.cantidad * tc.capacidad_personas)
			FROM public.habitaciones h
			JOIN public.habitacion_camas hc ON hc.habitacion_id = h.id
			JOIN public.tipo_camas tc ON tc.id = hc.tipo_cama_id
			WHERE h.establecimiento_id = e.id AND h.eliminado_at IS NULL
		), 0) AS capacidad_hospedaje,
		COALESCE((
			SELECT ARRAY_AGG(es.servicio_id::text)
			FROM public.establecimiento_servicios es
			WHERE es.establecimiento_id = e.id
		), '{}') AS servicios_ids
	FROM public.establecimientos e
	LEFT JOIN public.categorias c ON c.id = e.categoria_id AND c.eliminado_at IS NULL
	LEFT JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id
	LEFT JOIN public.localidades l ON l.id = e.localidad_id AND l.eliminado_at IS NULL
	LEFT JOIN public.divisiones_secundarias ds ON ds.id = l.division_secundaria_id AND ds.eliminado_at IS NULL`

func scanEstablecimiento(row pgx.Row) (*domain.EstablecimientoResponse, error) {
	var e domain.EstablecimientoResponse
	var propietario *string
	var catID, clsID, locID, dsID *int
	var catNombre, clsNombre, locNombre, dsNombre *string
	var capacidad int
	var serviciosIDs []string
	var estadoAdmin string
	var creadoAt time.Time

	if err := row.Scan(
		&e.ID, &e.NroLicencia, &e.RazonSocial, &propietario,
		&e.TieneLicenciaTuristica, &e.FechaVencimientoLicencia,
		&e.Direccion, &e.Latitud, &e.Longitud, &e.Telefono, &e.Email,
		&estadoAdmin, &creadoAt,
		&catID, &catNombre,
		&clsID, &clsNombre,
		&locID, &locNombre,
		&dsID, &dsNombre,
		&capacidad, &serviciosIDs,
	); err != nil {
		return nil, err
	}

	e.PropietarioNombre = propietario
	e.RazonSocialCorta = razonSocialCorta(e.RazonSocial)
	e.Activo = estadoAdmin == "ACTIVO"
	e.CreadoEn = creadoAt.Format(time.RFC3339)
	e.CapacidadHospedaje = capacidad
	e.ServiciosIds = serviciosIDs
	if serviciosIDs == nil {
		e.ServiciosIds = []string{}
	}

	if catID != nil {
		s := fmt.Sprintf("%d", *catID)
		e.CategoriaID = &s
		e.CategoriaNombre = catNombre
	}
	if clsID != nil {
		s := fmt.Sprintf("%d", *clsID)
		e.ClasificacionID = &s
		e.ClasificacionNombre = clsNombre
	}
	if locID != nil {
		s := fmt.Sprintf("%d", *locID)
		e.LocalidadID = &s
		e.LocalidadNombre = locNombre
	}
	if dsID != nil {
		s := fmt.Sprintf("%d", *dsID)
		e.DivisionSecundariaID = &s
		e.DivisionSecundariaNombre = dsNombre
	}

	return &e, nil
}

func razonSocialCorta(s string) string {
	words := strings.Fields(s)
	if len(words) <= 3 {
		return s
	}
	return strings.Join(words[:3], " ")
}

// ─── List ─────────────────────────────────────────────────────────────────────

func (r *EstablecimientoRepo) List(ctx context.Context, p domain.ListParams) ([]domain.EstablecimientoResponse, int, error) {
	qb := newQB()
	if p.Search != "" {
		qb.add("(e.razon_social ILIKE $%d OR CAST(e.nro_licencia AS text) ILIKE $%d)", "%"+p.Search+"%")
	}
	if p.LocalidadID != nil {
		qb.add("e.localidad_id = $%d", *p.LocalidadID)
	}
	if p.CategoriaID != nil {
		qb.add("e.categoria_id = $%d", *p.CategoriaID)
	}
	if p.EstadoAdmin != "" {
		qb.add("e.estado_admin = $%d", p.EstadoAdmin)
	}

	where := qb.whereClause()
	baseArgs := qb.args

	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.establecimientos e WHERE `+where, baseArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("contar establecimientos: %w", err)
	}

	limitIdx := qb.next()
	offsetIdx := qb.next()
	sql := fmt.Sprintf(`%s WHERE %s ORDER BY e.razon_social LIMIT $%d OFFSET $%d`,
		estBaseSelect, where, limitIdx, offsetIdx)

	offset := (p.Page - 1) * p.PageSize
	rows, err := r.pool.Query(ctx, sql, append(baseArgs, p.PageSize, offset)...)
	if err != nil {
		return nil, 0, fmt.Errorf("listar establecimientos: %w", err)
	}
	defer rows.Close()

	var results []domain.EstablecimientoResponse
	for rows.Next() {
		e, err := scanEstablecimiento(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan establecimiento: %w", err)
		}
		results = append(results, *e)
	}
	if results == nil {
		results = []domain.EstablecimientoResponse{}
	}
	return results, total, rows.Err()
}

// ─── GetByID ──────────────────────────────────────────────────────────────────

func (r *EstablecimientoRepo) GetByID(ctx context.Context, id string) (*domain.EstablecimientoResponse, error) {
	sql := estBaseSelect + ` WHERE e.id = $1 AND e.eliminado_at IS NULL`
	row := r.pool.QueryRow(ctx, sql, id)
	e, err := scanEstablecimiento(row)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("obtener establecimiento %s: %w", id, err)
	}
	return e, nil
}

// GetByIDRaw — para validaciones internas (no expuesto al frontend).
func (r *EstablecimientoRepo) GetByIDRaw(ctx context.Context, id string) (*domain.Establecimiento, error) {
	const sql = `
		SELECT e.id, e.nro_licencia, e.razon_social, e.propietario,
		       e.localidad_id, e.categoria_id, e.tiene_licencia_vigente,
		       e.fecha_vencimiento_licencia::text, e.direccion, e.latitud, e.longitud,
		       e.telefono, e.email, e.estado_admin, e.creado_at, e.actualizado_at
		FROM public.establecimientos e
		WHERE e.id = $1 AND e.eliminado_at IS NULL`

	var e domain.Establecimiento
	err := r.pool.QueryRow(ctx, sql, id).Scan(
		&e.ID, &e.NroLicencia, &e.RazonSocial, &e.Propietario,
		&e.LocalidadID, &e.CategoriaID, &e.TieneLicenciaVigente,
		&e.FechaVencimientoLicencia, &e.Direccion, &e.Latitud, &e.Longitud,
		&e.Telefono, &e.Email, &e.EstadoAdmin, &e.CreadoAt, &e.ActualizadoAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("obtener establecimiento raw %s: %w", id, err)
	}
	return &e, nil
}

// ─── Create ───────────────────────────────────────────────────────────────────

func (r *EstablecimientoRepo) Create(ctx context.Context, tx pgx.Tx, req domain.CreateEstablecimientoRequest) (*domain.EstablecimientoResponse, error) {
	const sql = `
		INSERT INTO public.establecimientos
			(nro_licencia, razon_social, propietario, localidad_id, categoria_id,
			 tiene_licencia_vigente, fecha_vencimiento_licencia, direccion,
			 latitud, longitud, telefono, email)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id`

	var id string
	if err := tx.QueryRow(ctx, sql,
		req.NroLicencia, req.RazonSocial, req.Propietario,
		req.LocalidadID, req.CategoriaID, req.TieneLicenciaVigente,
		req.FechaVencimientoLicencia, req.Direccion,
		req.Latitud, req.Longitud, req.Telefono, req.Email,
	).Scan(&id); err != nil {
		return nil, fmt.Errorf("crear establecimiento: %w", err)
	}

	if len(req.ServiciosIds) > 0 {
		for _, sID := range req.ServiciosIds {
			_, err := tx.Exec(ctx, `INSERT INTO public.establecimiento_servicios (establecimiento_id, servicio_id) VALUES ($1, $2)`, id, sID)
			if err != nil {
				return nil, fmt.Errorf("crear relacion servicio %d: %w", sID, err)
			}
		}
	}

	return r.GetByID(ctx, id)
}

// ─── SoftDelete ───────────────────────────────────────────────────────────────

func (r *EstablecimientoRepo) SoftDelete(ctx context.Context, tx pgx.Tx, id string) error {
	const sql = `
		UPDATE public.establecimientos
		SET eliminado_at = NOW(), actualizado_at = NOW()
		WHERE id = $1 AND eliminado_at IS NULL`
	tag, err := tx.Exec(ctx, sql, id)
	if err != nil {
		return fmt.Errorf("eliminar establecimiento %s: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("establecimiento %s no encontrado o ya eliminado", id)
	}
	return nil
}

// ─── Habitaciones ─────────────────────────────────────────────────────────────

func (r *EstablecimientoRepo) ListHabitaciones(ctx context.Context, establecimientoID string) ([]domain.HabitacionResponse, error) {
	const sql = `
		SELECT h.id, h.establecimiento_id, h.nro_habitacion, h.piso,
		       h.tipo_habitacion_id, th.nombre AS tipo_nombre,
		       COALESCE(public.calcular_capacidad_habitacion(h.id), 0),
		       h.estado_hab
		FROM public.habitaciones h
		LEFT JOIN public.tipo_habitaciones th ON th.id = h.tipo_habitacion_id
		WHERE h.establecimiento_id = $1 AND h.eliminado_at IS NULL
		ORDER BY h.nro_habitacion`

	rows, err := r.pool.Query(ctx, sql, establecimientoID)
	if err != nil {
		return nil, fmt.Errorf("listar habitaciones: %w", err)
	}
	defer rows.Close()

	var results []domain.HabitacionResponse
	for rows.Next() {
		var h domain.HabitacionResponse
		var tipoID *int
		var estadoHab string
		if err := rows.Scan(
			&h.ID, &h.EstablecimientoID, &h.Numero, &h.Piso,
			&tipoID, &h.TipoHabitacionNombre,
			&h.CapacidadTotal, &estadoHab,
		); err != nil {
			return nil, fmt.Errorf("scan habitacion: %w", err)
		}
		if tipoID != nil {
			s := fmt.Sprintf("%d", *tipoID)
			h.TipoHabitacionID = &s
		}
		h.Activa = estadoHab == "DISPONIBLE"
		h.Camas = []domain.HabitacionCamaResponse{}
		results = append(results, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Cargar camas para cada habitación
	for i := range results {
		camas, err := r.listCamasHabitacion(ctx, results[i].ID)
		if err != nil {
			return nil, err
		}
		results[i].Camas = camas
	}

	if results == nil {
		results = []domain.HabitacionResponse{}
	}
	return results, nil
}

func (r *EstablecimientoRepo) listCamasHabitacion(ctx context.Context, habitacionID string) ([]domain.HabitacionCamaResponse, error) {
	const sql = `
		SELECT hc.id, hc.tipo_cama_id, tc.nombre, tc.capacidad_personas, hc.cantidad
		FROM public.habitacion_camas hc
		JOIN public.tipo_camas tc ON tc.id = hc.tipo_cama_id
		WHERE hc.habitacion_id = $1`

	rows, err := r.pool.Query(ctx, sql, habitacionID)
	if err != nil {
		return nil, fmt.Errorf("listar camas habitacion %s: %w", habitacionID, err)
	}
	defer rows.Close()

	var camas []domain.HabitacionCamaResponse
	for rows.Next() {
		var c domain.HabitacionCamaResponse
		var tipoCamaID int
		if err := rows.Scan(&c.ID, &tipoCamaID, &c.TipoCamaNombre, &c.CapacidadPersonas, &c.Cantidad); err != nil {
			return nil, fmt.Errorf("scan cama: %w", err)
		}
		c.TipoCamaID = fmt.Sprintf("%d", tipoCamaID)
		camas = append(camas, c)
	}
	if camas == nil {
		camas = []domain.HabitacionCamaResponse{}
	}
	return camas, rows.Err()
}

func (r *EstablecimientoRepo) CreateHabitacion(ctx context.Context, tx pgx.Tx, establecimientoID string, req domain.CreateHabitacionRequest) (*domain.HabitacionResponse, error) {
	const sql = `
		INSERT INTO public.habitaciones
			(establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, tiene_bano_privado)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING id`

	var id string
	if err := tx.QueryRow(ctx, sql,
		establecimientoID, req.TipoHabitacionID, req.NroHabitacion,
		req.Piso, req.TieneBanoPrivado,
	).Scan(&id); err != nil {
		return nil, fmt.Errorf("crear habitacion: %w", err)
	}

	for _, c := range req.Camas {
		if c.Cantidad <= 0 {
			continue
		}
		_, err := tx.Exec(ctx,
			`INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad)
			 VALUES ($1, $2, $3)`,
			id, c.TipoCamaID, c.Cantidad,
		)
		if err != nil {
			return nil, fmt.Errorf("crear cama (tipo %d) para habitacion %s: %w", c.TipoCamaID, id, err)
		}
	}

	const sqlHab = `
		SELECT h.id, h.establecimiento_id, h.nro_habitacion, h.piso,
		       h.tipo_habitacion_id, th.nombre AS tipo_nombre,
		       COALESCE(public.calcular_capacidad_habitacion(h.id), 0),
		       h.estado_hab
		FROM public.habitaciones h
		LEFT JOIN public.tipo_habitaciones th ON th.id = h.tipo_habitacion_id
		WHERE h.id = $1`

	var h domain.HabitacionResponse
	var tipoID *int
	var estadoHab string
	if err := tx.QueryRow(ctx, sqlHab, id).Scan(
		&h.ID, &h.EstablecimientoID, &h.Numero, &h.Piso,
		&tipoID, &h.TipoHabitacionNombre,
		&h.CapacidadTotal, &estadoHab,
	); err != nil {
		return nil, fmt.Errorf("habitacion creada no encontrada o error: %w", err)
	}
	if tipoID != nil {
		s := fmt.Sprintf("%d", *tipoID)
		h.TipoHabitacionID = &s
	}
	h.Activa = (estadoHab == "DISPONIBLE" || estadoHab == "SERVICIO") // Asegurar activa. En DB default es 'SERVICIO'


	const sqlCamas = `
		SELECT hc.id, hc.tipo_cama_id, tc.nombre, tc.capacidad_personas, hc.cantidad
		FROM public.habitacion_camas hc
		JOIN public.tipo_camas tc ON tc.id = hc.tipo_cama_id
		WHERE hc.habitacion_id = $1 AND hc.eliminado_at IS NULL`

	rows, err := tx.Query(ctx, sqlCamas, id)
	if err != nil {
		return nil, fmt.Errorf("listar camas de habitacion recien creada: %w", err)
	}
	defer rows.Close()

	var camas []domain.HabitacionCamaResponse
	for rows.Next() {
		var c domain.HabitacionCamaResponse
		var tipoCamaID int
		if err := rows.Scan(&c.ID, &tipoCamaID, &c.TipoCamaNombre, &c.CapacidadPersonas, &c.Cantidad); err != nil {
			return nil, fmt.Errorf("scan cama recien creada: %w", err)
		}
		c.TipoCamaID = fmt.Sprintf("%d", tipoCamaID)
		camas = append(camas, c)
	}
	if camas == nil {
		camas = []domain.HabitacionCamaResponse{}
	}
	h.Camas = camas

	return &h, nil
}

func (r *EstablecimientoRepo) UpdateHabitacionEstado(ctx context.Context, tx pgx.Tx, establecimientoID, habitacionID, estado string) error {
	tag, err := tx.Exec(ctx,
		`UPDATE public.habitaciones SET estado_hab = $1 WHERE id = $2 AND establecimiento_id = $3`,
		estado, habitacionID, establecimientoID,
	)
	if err != nil {
		return fmt.Errorf("actualizar estado habitacion: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("habitacion no encontrada")
	}
	return nil
}

func (r *EstablecimientoRepo) UpdateHabitacion(ctx context.Context, tx pgx.Tx, establecimientoID, habitacionID string, req domain.UpdateHabitacionRequest) (*domain.HabitacionResponse, error) {
	_, err := tx.Exec(ctx,
		`UPDATE public.habitaciones
		 SET tipo_habitacion_id = $1, nro_habitacion = $2, piso = $3, tiene_bano_privado = $4
		 WHERE id = $5 AND establecimiento_id = $6`,
		req.TipoHabitacionID, req.NroHabitacion, req.Piso, req.TieneBanoPrivado,
		habitacionID, establecimientoID,
	)
	if err != nil {
		return nil, fmt.Errorf("actualizar habitacion: %w", err)
	}

	// Reemplazar camas: eliminar todas las existentes y re-insertar
	if _, err := tx.Exec(ctx,
		`DELETE FROM public.habitacion_camas WHERE habitacion_id = $1`,
		habitacionID,
	); err != nil {
		return nil, fmt.Errorf("eliminar camas anteriores: %w", err)
	}

	for _, c := range req.Camas {
		if c.Cantidad <= 0 {
			continue
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad)
			 VALUES ($1, $2, $3)`,
			habitacionID, c.TipoCamaID, c.Cantidad,
		); err != nil {
			return nil, fmt.Errorf("crear cama (tipo %d) para habitacion %s: %w", c.TipoCamaID, habitacionID, err)
		}
	}

	const sqlHab = `
		SELECT h.id, h.establecimiento_id, h.nro_habitacion, h.piso,
		       h.tipo_habitacion_id, th.nombre AS tipo_nombre,
		       COALESCE(public.calcular_capacidad_habitacion(h.id), 0),
		       h.estado_hab
		FROM public.habitaciones h
		LEFT JOIN public.tipo_habitaciones th ON th.id = h.tipo_habitacion_id
		WHERE h.id = $1`

	var h domain.HabitacionResponse
	var tipoID *int
	var estadoHab string
	if err := tx.QueryRow(ctx, sqlHab, habitacionID).Scan(
		&h.ID, &h.EstablecimientoID, &h.Numero, &h.Piso,
		&tipoID, &h.TipoHabitacionNombre,
		&h.CapacidadTotal, &estadoHab,
	); err != nil {
		return nil, fmt.Errorf("leer habitacion actualizada: %w", err)
	}
	if tipoID != nil {
		s := fmt.Sprintf("%d", *tipoID)
		h.TipoHabitacionID = &s
	}
	h.Activa = estadoHab == "DISPONIBLE" || estadoHab == "SERVICIO"

	const sqlCamas = `
		SELECT hc.id, hc.tipo_cama_id, tc.nombre, tc.capacidad_personas, hc.cantidad
		FROM public.habitacion_camas hc
		JOIN public.tipo_camas tc ON tc.id = hc.tipo_cama_id
		WHERE hc.habitacion_id = $1`

	rows, err := tx.Query(ctx, sqlCamas, habitacionID)
	if err != nil {
		return nil, fmt.Errorf("listar camas actualizadas: %w", err)
	}
	defer rows.Close()

	var camas []domain.HabitacionCamaResponse
	for rows.Next() {
		var c domain.HabitacionCamaResponse
		var tipoCamaID int
		if err := rows.Scan(&c.ID, &tipoCamaID, &c.TipoCamaNombre, &c.CapacidadPersonas, &c.Cantidad); err != nil {
			return nil, fmt.Errorf("scan cama actualizada: %w", err)
		}
		c.TipoCamaID = fmt.Sprintf("%d", tipoCamaID)
		camas = append(camas, c)
	}
	if camas == nil {
		camas = []domain.HabitacionCamaResponse{}
	}
	h.Camas = camas

	return &h, nil
}

// ─── Catálogos ────────────────────────────────────────────────────────────────

// ─── Personal ────────────────────────────────────────────────────────────────

const personalSelectSQL = `
	SELECT p.id, p.establecimiento_id, p.tipo_personal_id, tp.nombre AS tipo_personal_nombre,
	       p.nombres, p.apellidos, p.nombre_completo,
	       p.documento_identidad, p.telefono, p.activo,
	       p.usuario_sistema, p.keycloak_user_id
	FROM public.personal p
	LEFT JOIN public.tipo_personal tp ON tp.id = p.tipo_personal_id`

func scanPersonal(row pgx.Row) (*domain.PersonalResponse, error) {
	var p domain.PersonalResponse
	var tipoID int
	if err := row.Scan(
		&p.ID, &p.EstablecimientoID, &tipoID, &p.TipoPersonalNombre,
		&p.Nombres, &p.Apellidos, &p.NombreCompleto,
		&p.DocumentoIdentidad, &p.Telefono, &p.Activo,
		&p.UsuarioSistema, &p.KeycloakUserID,
	); err != nil {
		return nil, err
	}
	p.TipoPersonalID = fmt.Sprintf("%d", tipoID)
	return &p, nil
}

func (r *EstablecimientoRepo) ListPersonal(ctx context.Context, establecimientoID string) ([]domain.PersonalResponse, error) {
	q := personalSelectSQL + `
		WHERE p.establecimiento_id = $1 AND p.eliminado_at IS NULL
		ORDER BY p.nombre_completo`

	rows, err := r.pool.Query(ctx, q, establecimientoID)
	if err != nil {
		return nil, fmt.Errorf("listar personal: %w", err)
	}
	defer rows.Close()

	var results []domain.PersonalResponse
	for rows.Next() {
		p, err := scanPersonal(rows)
		if err != nil {
			return nil, fmt.Errorf("scan personal: %w", err)
		}
		results = append(results, *p)
	}
	if results == nil {
		results = []domain.PersonalResponse{}
	}
	return results, rows.Err()
}

func (r *EstablecimientoRepo) GetPersonalByID(ctx context.Context, personalID, establecimientoID string) (*domain.PersonalResponse, error) {
	q := personalSelectSQL + `
		WHERE p.id = $1 AND p.establecimiento_id = $2 AND p.eliminado_at IS NULL`
	p, err := scanPersonal(r.pool.QueryRow(ctx, q, personalID, establecimientoID))
	if err != nil {
		return nil, fmt.Errorf("obtener personal: %w", err)
	}
	return p, nil
}

func (r *EstablecimientoRepo) CreatePersonal(ctx context.Context, tx pgx.Tx, establecimientoID string, req domain.CreatePersonalRequest, kcUserID *string) (*domain.PersonalResponse, error) {
	const sqlInsert = `
		INSERT INTO public.personal
		       (establecimiento_id, tipo_personal_id, nombres, apellidos, documento_identidad, telefono, activo, usuario_sistema, keycloak_user_id)
		VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8)
		RETURNING id`

	var id string
	if err := tx.QueryRow(ctx, sqlInsert,
		establecimientoID, req.TipoPersonalID, req.Nombres, req.Apellidos,
		req.DocumentoIdentidad, req.Telefono, req.UsuarioSistema, kcUserID,
	).Scan(&id); err != nil {
		return nil, fmt.Errorf("insertar personal: %w", err)
	}

	q := personalSelectSQL + " WHERE p.id = $1"
	p, err := scanPersonal(tx.QueryRow(ctx, q, id))
	if err != nil {
		return nil, fmt.Errorf("leer personal creado: %w", err)
	}
	return p, nil
}

func (r *EstablecimientoRepo) UpdatePersonal(ctx context.Context, tx pgx.Tx, establecimientoID, personalID string, req domain.UpdatePersonalRequest, kcUserID *string) (*domain.PersonalResponse, error) {
	const sqlUpdate = `
		UPDATE public.personal
		SET tipo_personal_id = $1, nombres = $2, apellidos = $3,
		    documento_identidad = $4, telefono = $5,
		    usuario_sistema = $6, keycloak_user_id = COALESCE($7, keycloak_user_id)
		WHERE id = $8 AND establecimiento_id = $9 AND eliminado_at IS NULL`

	t, err := tx.Exec(ctx, sqlUpdate,
		req.TipoPersonalID, req.Nombres, req.Apellidos,
		req.DocumentoIdentidad, req.Telefono,
		req.UsuarioSistema, kcUserID,
		personalID, establecimientoID,
	)
	if err != nil {
		return nil, fmt.Errorf("actualizar personal: %w", err)
	}
	if t.RowsAffected() == 0 {
		return nil, fmt.Errorf("personal no encontrado o no pertenece al establecimiento")
	}

	q := personalSelectSQL + " WHERE p.id = $1"
	p, err := scanPersonal(tx.QueryRow(ctx, q, personalID))
	if err != nil {
		return nil, fmt.Errorf("leer personal actualizado: %w", err)
	}
	return p, nil
}

func (r *EstablecimientoRepo) TogglePersonalActivo(ctx context.Context, tx pgx.Tx, establecimientoID, personalID string, activo bool) error {
	const sqlUpdate = `
		UPDATE public.personal
		SET activo = $1
		WHERE id = $2 AND establecimiento_id = $3 AND eliminado_at IS NULL`

	t, err := tx.Exec(ctx, sqlUpdate, activo, personalID, establecimientoID)
	if err != nil {
		return fmt.Errorf("toggle activo personal: %w", err)
	}
	if t.RowsAffected() == 0 {
		return fmt.Errorf("personal no encontrado o no pertenece al establecimiento")
	}
	return nil
}

func (r *EstablecimientoRepo) ListCategorias(ctx context.Context) ([]domain.Categoria, error) {
	const sql = `
		SELECT c.id, c.clasificacion_id, c.nombre, cl.nombre
		FROM public.categorias c
		LEFT JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id
		WHERE c.eliminado_at IS NULL
		ORDER BY cl.nombre NULLS LAST, c.nombre`

	rows, err := r.pool.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("listar categorias: %w", err)
	}
	defer rows.Close()

	var results []domain.Categoria
	for rows.Next() {
		var c domain.Categoria
		if err := rows.Scan(&c.ID, &c.ClasificacionID, &c.Nombre, &c.Clasificacion); err != nil {
			return nil, fmt.Errorf("scan categoria: %w", err)
		}
		results = append(results, c)
	}
	if results == nil {
		results = []domain.Categoria{}
	}
	return results, rows.Err()
}

func (r *EstablecimientoRepo) ListLocalidades(ctx context.Context) ([]domain.Localidad, error) {
	const sql = `
		SELECT l.id, l.nombre, ds.id AS ds_id, ds.nombre AS ds_nombre, dp.id AS dp_id, dp.nombre AS dp_nombre, l.es_sistema
		FROM public.localidades l
		JOIN public.divisiones_secundarias ds ON ds.id = l.division_secundaria_id
		JOIN public.divisiones_principales dp ON dp.id = ds.division_principal_id
		WHERE l.eliminado_at IS NULL
		ORDER BY dp.nombre, ds.nombre, l.nombre`

	rows, err := r.pool.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("listar localidades: %w", err)
	}
	defer rows.Close()

	var results []domain.Localidad
	for rows.Next() {
		var l domain.Localidad
		var dsID int
		var dsNombre string
		var dpID int
		var dpNombre string
		if err := rows.Scan(&l.ID, &l.Nombre, &dsID, &dsNombre, &dpID, &dpNombre, &l.EsSistema); err != nil {
			return nil, fmt.Errorf("scan localidad: %w", err)
		}
		l.DivisionSecundariaID = &dsID
		l.DivisionSecundariaNombre = &dsNombre
		l.DivisionPrincipalID = &dpID
		l.DivisionPrincipalNombre = &dpNombre
		results = append(results, l)
	}
	if results == nil {
		results = []domain.Localidad{}
	}
	return results, rows.Err()
}
