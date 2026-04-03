package service

import (
	"context"
	"fmt"
	"time"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/movimientos/internal/domain"
	"sispardt/movimientos/internal/repository"
)

type ParteDiarioService struct {
	repo              *repository.ParteDiarioRepo
	auditRepo         *repository.AuditoriaRepo
	pool              *pgxpool.Pool
	statsPool         *pgxpool.Pool
	sistemaInicioDate string
}

func NewParteDiarioService(pool, statsPool *pgxpool.Pool, sistemaInicioDate string) *ParteDiarioService {
	return &ParteDiarioService{
		repo:              repository.NewParteDiarioRepo(pool, statsPool),
		auditRepo:         repository.NewAuditoriaRepo(statsPool),
		pool:              pool,
		statsPool:         statsPool,
		sistemaInicioDate: sistemaInicioDate,
	}
}

// ─── Catálogos ────────────────────────────────────────────────────────────────

func (s *ParteDiarioService) GetCatalogos(ctx context.Context) (*domain.CatalogosMovimientos, error) {
	return s.repo.GetCatalogos(ctx)
}

// ─── Habitaciones Estado ──────────────────────────────────────────────────────

func (s *ParteDiarioService) GetHabitacionesEstado(ctx context.Context, establecimientoID, fecha string) ([]domain.HabitacionEstado, error) {
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimiento_id requerido")
	}
	return s.repo.GetHabitacionesEstado(ctx, establecimientoID, fecha)
}

// ─── Partes Diarios ───────────────────────────────────────────────────────────

func (s *ParteDiarioService) List(ctx context.Context, params domain.ListPartesParams) (*domain.PagedResult[domain.ParteDiarioResponse], error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PageSize <= 0 {
		params.PageSize = 20
	} else if params.PageSize > 500 {
		params.PageSize = 500
	}
	data, total, err := s.repo.List(ctx, params)
	if err != nil {
		return nil, err
	}
	totalPages := total / params.PageSize
	if total%params.PageSize != 0 {
		totalPages++
	}
	return &domain.PagedResult[domain.ParteDiarioResponse]{
		Data:       data,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *ParteDiarioService) GetByID(ctx context.Context, id, establecimientoID string) (*domain.ParteDiarioResponse, error) {
	return s.repo.GetByID(ctx, id, establecimientoID)
}

func (s *ParteDiarioService) Create(ctx context.Context, userID, clientIP, establecimientoID string, req domain.CreateParteDiarioRequest) (*domain.ParteDiarioResponse, error) {
	if userID == "" {
		return nil, fmt.Errorf("userID (sub) no encontrado en el token")
	}
	if establecimientoID == "" {
		return nil, fmt.Errorf("establecimientoID no encontrado en session")
	}
	if err := validateCreateRequest(req); err != nil {
		return nil, err
	}
	var created *domain.ParteDiario
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		hab, err := s.repo.GetHabitacionCache(ctx, tx, req.HabitacionID)
		if err != nil {
			return err
		}
		if hab == nil {
			return fmt.Errorf("habitación no encontrada")
		}
		if hab.EstablecimientoID != establecimientoID {
			return fmt.Errorf("habitación no pertenece al establecimiento")
		}
		persona, err := s.repo.UpsertPersona(ctx, tx, req.Persona)
		if err != nil {
			return err
		}
		created, err = s.repo.CreateParte(ctx, tx, persona.ID, establecimientoID, userID, req, hab)
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, created.ID, establecimientoID)
}

func (s *ParteDiarioService) Checkout(ctx context.Context, parteID, userID, clientIP, establecimientoID string) (*domain.ParteDiarioResponse, error) {
	raw, err := s.repo.GetByIDRaw(ctx, parteID, establecimientoID)
	if err != nil {
		return nil, err
	}
	if raw == nil {
		return nil, fmt.Errorf("parte diario no encontrado")
	}
	if raw.EstablecimientoID != establecimientoID {
		return nil, fmt.Errorf("parte no pertenece a este establecimiento")
	}
	err = repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		return s.repo.Checkout(ctx, tx, parteID, establecimientoID)
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, parteID, establecimientoID)
}

func (s *ParteDiarioService) Anular(ctx context.Context, id, userID, clientIP, establecimientoID string) error {
	raw, err := s.repo.GetByIDRaw(ctx, id, establecimientoID)
	if err != nil {
		return err
	}
	if raw == nil {
		return fmt.Errorf("parte diario no encontrado")
	}
	if raw.EstablecimientoID != establecimientoID {
		return fmt.Errorf("parte no pertenece a este establecimiento")
	}
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		return s.repo.Anular(ctx, tx, id)
	})
}

// ─── Cierres ──────────────────────────────────────────────────────────────────

func (s *ParteDiarioService) ListCierres(ctx context.Context, establecimientoID string) ([]domain.CierreDiarioResponse, error) {
	cierres, err := s.repo.ListCierres(ctx, establecimientoID)
	if err != nil {
		return nil, err
	}
	resp := make([]domain.CierreDiarioResponse, len(cierres))
	for i, c := range cierres {
		resp[i] = toCierreResponse(c)
	}
	return resp, nil
}

func (s *ParteDiarioService) GetCierrePorFecha(ctx context.Context, establecimientoID, fecha string) (*domain.CierreDiarioResponse, error) {
	c, err := s.repo.GetCierrePorFecha(ctx, establecimientoID, fecha)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, nil
	}
	r := toCierreResponse(*c)
	return &r, nil
}

func (s *ParteDiarioService) GetFechasPendientes(ctx context.Context, establecimientoID string) ([]domain.FechaPendiente, error) {
	return s.repo.GetFechasPendientes(ctx, establecimientoID, s.sistemaInicioDate)
}

func (s *ParteDiarioService) CreateCierre(ctx context.Context, userID, cerradoPor, clientIP, establecimientoID string, req domain.CreateCierreDiarioRequest) (*domain.CierreDiarioResponse, error) {
	if req.FechaReporte == "" {
		return nil, fmt.Errorf("fechaReporte es requerida")
	}
	var c *domain.CierreDiario
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, establecimientoID, func(tx pgx.Tx) error {
		var err error
		c, err = s.repo.CreateCierre(ctx, tx, establecimientoID, cerradoPor, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	r := toCierreResponse(*c)
	return &r, nil
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

func (s *ParteDiarioService) OcupacionDiaria(ctx context.Context, estIDs []string, desde, hasta string) ([]domain.OcupacionDiaria, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.OcupacionDiaria(ctx, estIDs, desdeT, hastaT)
}

func (s *ParteDiarioService) ResumenEstadisticas(ctx context.Context, estIDs []string, desde, hasta string) (domain.ResumenEstadisticas, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return domain.ResumenEstadisticas{}, err
	}
	return s.repo.ResumenEstadisticas(ctx, estIDs, desdeT, hastaT)
}

func (s *ParteDiarioService) Nacionalidades(ctx context.Context, estIDs []string, desde, hasta string) ([]domain.NacionalidadStat, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.Nacionalidades(ctx, estIDs, desdeT, hastaT)
}

func (s *ParteDiarioService) MotivosViaje(ctx context.Context, estIDs []string, desde, hasta, agrupacion string) ([]domain.MotivosPeriodo, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.MotivosViaje(ctx, estIDs, desdeT, hastaT, agrupacion)
}

func (s *ParteDiarioService) TiposHabitacion(ctx context.Context, estIDs []string, desde, hasta string) ([]domain.TipoHabitacionStat, error) {
	desdeT, hastaT, err := parseFechas(desde, hasta)
	if err != nil {
		return nil, err
	}
	return s.repo.TiposHabitacion(ctx, estIDs, desdeT, hastaT)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func parseFechas(desde, hasta string) (time.Time, time.Time, error) {
	desdeT, err := time.Parse("2006-01-02", desde)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("fecha_desde inválida (use YYYY-MM-DD)")
	}
	hastaT, err := time.Parse("2006-01-02", hasta)
	if err != nil {
		return time.Time{}, time.Time{}, fmt.Errorf("fecha_hasta inválida (use YYYY-MM-DD)")
	}
	if hastaT.Before(desdeT) {
		return time.Time{}, time.Time{}, fmt.Errorf("fecha_hasta debe ser >= fecha_desde")
	}
	return desdeT, hastaT, nil
}

func toCierreResponse(c domain.CierreDiario) domain.CierreDiarioResponse {
	return domain.CierreDiarioResponse{
		ID:                c.ID,
		EstablecimientoID: c.EstablecimientoID,
		FechaReporte:      c.FechaReporte,
		TotalRegistros:    c.TotalRegistros,
		TotalCheckins:     c.TotalCheckins,
		TotalCheckouts:    c.TotalCheckouts,
		CerradoPor:        c.CerradoPor,
		CerradoAt:         c.CerradoAt.Format(time.RFC3339),
		Observacion:       c.Observacion,
		CondicionEntrega:  c.CondicionEntrega,
	}
}

func validateCreateRequest(req domain.CreateParteDiarioRequest) error {
	if req.HabitacionID == "" {
		return fmt.Errorf("habitacionId es requerido")
	}
	if req.FechaReporte == "" {
		return fmt.Errorf("fechaReporte es requerida")
	}
	if req.PaisProcedenciaID == 0 {
		return fmt.Errorf("paisProcedenciaId es requerido")
	}
	if req.Persona.DocumentoIdentidad == "" {
		return fmt.Errorf("documentoIdentidad del huésped es requerido")
	}
	if req.Persona.Nombre == "" {
		return fmt.Errorf("nombre del huésped es requerido")
	}
	if req.Persona.ApellidoPaterno == "" {
		return fmt.Errorf("apellidoPaterno del huésped es requerido")
	}
	return nil
}


// ─── Auditoría ────────────────────────────────────────────────────────────────

func (s *ParteDiarioService) ListAuditoria(ctx context.Context, p domain.AuditoriaListParams) ([]domain.AuditoriaTransaccion, int, error) {
	return s.auditRepo.List(ctx, p)
}
