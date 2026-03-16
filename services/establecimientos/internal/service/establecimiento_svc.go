package service

import (
	"context"
	"fmt"
	"strings"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"sispardt/establecimientos/internal/domain"
	"sispardt/establecimientos/internal/keycloak"
	"sispardt/establecimientos/internal/repository"
)

type EstablecimientoService struct {
	repo      *repository.EstablecimientoRepo
	auditRepo *repository.AuditoriaRepo
	pool      *pgxpool.Pool
	kcClient  *keycloak.AdminClient // nil si no está configurado
}

func NewEstablecimientoService(pool *pgxpool.Pool, kcClient *keycloak.AdminClient) *EstablecimientoService {
	return &EstablecimientoService{
		repo:      repository.NewEstablecimientoRepo(pool),
		auditRepo: repository.NewAuditoriaRepo(pool),
		pool:      pool,
		kcClient:  kcClient,
	}
}

func (s *EstablecimientoService) List(ctx context.Context, p domain.ListParams) (*domain.PagedResult[domain.EstablecimientoResponse], error) {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 20
	}
	data, total, err := s.repo.List(ctx, p)
	if err != nil {
		return nil, err
	}
	totalPages := total / p.PageSize
	if total%p.PageSize != 0 {
		totalPages++
	}
	return &domain.PagedResult[domain.EstablecimientoResponse]{
		Data:       data,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *EstablecimientoService) GetByID(ctx context.Context, id string) (*domain.EstablecimientoResponse, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *EstablecimientoService) Create(ctx context.Context, userID, clientIP string, req domain.CreateEstablecimientoRequest) (*domain.EstablecimientoResponse, error) {
	if req.RazonSocial == "" {
		return nil, fmt.Errorf("razon_social es requerida")
	}
	if req.Propietario == "" {
		return nil, fmt.Errorf("propietario es requerido")
	}
	if req.Direccion == "" {
		return nil, fmt.Errorf("direccion es requerida")
	}

	var result *domain.EstablecimientoResponse
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		result, err = s.repo.Create(ctx, tx, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *EstablecimientoService) Delete(ctx context.Context, id, userID, clientIP string) error {
	e, err := s.repo.GetByIDRaw(ctx, id)
	if err != nil {
		return err
	}
	if e == nil {
		return fmt.Errorf("establecimiento no encontrado")
	}
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.SoftDelete(ctx, tx, id)
	})
}

func (s *EstablecimientoService) ListHabitaciones(ctx context.Context, establecimientoID string) ([]domain.HabitacionResponse, error) {
	return s.repo.ListHabitaciones(ctx, establecimientoID)
}

func (s *EstablecimientoService) CreateHabitacion(ctx context.Context, establecimientoID, userID, clientIP string, req domain.CreateHabitacionRequest) (*domain.HabitacionResponse, error) {
	if req.NroHabitacion == "" {
		return nil, fmt.Errorf("nro_habitacion es requerido")
	}
	e, err := s.repo.GetByIDRaw(ctx, establecimientoID)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, fmt.Errorf("establecimiento no encontrado")
	}

	var result *domain.HabitacionResponse
	err = repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		result, err = s.repo.CreateHabitacion(ctx, tx, establecimientoID, req)
		return err
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ─── Personal ────────────────────────────────────────────────────────────────

func (s *EstablecimientoService) ListPersonal(ctx context.Context, establecimientoID string) ([]domain.PersonalResponse, error) {
	return s.repo.ListPersonal(ctx, establecimientoID)
}

func (s *EstablecimientoService) CreatePersonal(ctx context.Context, userID, clientIP, establecimientoID string, req domain.CreatePersonalRequest) (*domain.PersonalResponse, error) {
	if req.Nombres == "" {
		return nil, fmt.Errorf("nombres es requerido")
	}
	if req.Apellidos == "" {
		return nil, fmt.Errorf("apellidos es requerido")
	}

	e, err := s.repo.GetByID(ctx, establecimientoID)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, fmt.Errorf("establecimiento no encontrado")
	}

	// Si es usuario de sistema, crear en Keycloak ANTES de la tx DB
	var kcUserID *string
	if req.UsuarioSistema {
		if s.kcClient == nil {
			return nil, fmt.Errorf("la integración con Keycloak no está configurada (KC_CLIENT_SECRET no definido)")
		}
		if req.DocumentoIdentidad == nil || *req.DocumentoIdentidad == "" {
			return nil, fmt.Errorf("documento de identidad es requerido para crear usuario de sistema")
		}
		username := "recep." + normalizeUsername(*req.DocumentoIdentidad)
		id, err := s.kcClient.CreateUser(ctx, keycloak.CreateUserRequest{
			Username:          username,
			FirstName:         req.Nombres,
			LastName:          req.Apellidos,
			EstablecimientoID: establecimientoID,
		})
		if err != nil {
			return nil, fmt.Errorf("crear usuario en Keycloak: %w", err)
		}
		kcUserID = &id
		log.Info().Str("username", username).Str("kc_user_id", id).Msg("usuario Keycloak creado")
	}

	var result *domain.PersonalResponse
	err = repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		result, err = s.repo.CreatePersonal(ctx, tx, establecimientoID, req, kcUserID)
		return err
	})
	if err != nil {
		// Rollback: eliminar usuario KC si fue creado
		if kcUserID != nil {
			if delErr := s.kcClient.DeleteUser(ctx, *kcUserID); delErr != nil {
				log.Error().Err(delErr).Str("kc_user_id", *kcUserID).Msg("fallo al revertir usuario KC tras error DB")
			}
		}
		return nil, err
	}
	return result, nil
}

func (s *EstablecimientoService) UpdatePersonal(ctx context.Context, userID, clientIP, establecimientoID, personalID string, req domain.UpdatePersonalRequest) (*domain.PersonalResponse, error) {
	if req.Nombres == "" {
		return nil, fmt.Errorf("nombres es requerido")
	}
	if req.Apellidos == "" {
		return nil, fmt.Errorf("apellidos es requerido")
	}

	// Verificar si necesita crear KC (nuevo usuario de sistema sin KC aún)
	var kcUserID *string
	if req.UsuarioSistema {
		existing, err := s.repo.GetPersonalByID(ctx, personalID, establecimientoID)
		if err != nil {
			return nil, err
		}
		if existing.KeycloakUserID == nil {
			// Todavía no tiene cuenta KC → crearla ahora
			if s.kcClient == nil {
				return nil, fmt.Errorf("la integración con Keycloak no está configurada")
			}
			if req.DocumentoIdentidad == nil || *req.DocumentoIdentidad == "" {
				return nil, fmt.Errorf("documento de identidad es requerido para crear usuario de sistema")
			}
			username := "recep." + normalizeUsername(*req.DocumentoIdentidad)
			id, err := s.kcClient.CreateUser(ctx, keycloak.CreateUserRequest{
				Username:          username,
				FirstName:         req.Nombres,
				LastName:          req.Apellidos,
				EstablecimientoID: establecimientoID,
			})
			if err != nil {
				return nil, fmt.Errorf("crear usuario en Keycloak: %w", err)
			}
			kcUserID = &id
			log.Info().Str("username", username).Str("kc_user_id", id).Msg("usuario Keycloak creado en actualización")
		}
	}

	var result *domain.PersonalResponse
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		result, err = s.repo.UpdatePersonal(ctx, tx, establecimientoID, personalID, req, kcUserID)
		return err
	})
	if err != nil {
		if kcUserID != nil {
			if delErr := s.kcClient.DeleteUser(ctx, *kcUserID); delErr != nil {
				log.Error().Err(delErr).Str("kc_user_id", *kcUserID).Msg("fallo al revertir usuario KC tras error DB")
			}
		}
		return nil, err
	}
	return result, nil
}

func (s *EstablecimientoService) TogglePersonalActivo(ctx context.Context, userID, clientIP, establecimientoID, personalID string, activo bool) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.TogglePersonalActivo(ctx, tx, establecimientoID, personalID, activo)
	})
}

func (s *EstablecimientoService) ListCategorias(ctx context.Context) ([]domain.Categoria, error) {
	return s.repo.ListCategorias(ctx)
}

func (s *EstablecimientoService) ListLocalidades(ctx context.Context) ([]domain.Localidad, error) {
	return s.repo.ListLocalidades(ctx)
}

// ─── Auditoría ────────────────────────────────────────────────────────────────

func (s *EstablecimientoService) ListAuditoria(ctx context.Context, p domain.AuditoriaListParams) ([]domain.AuditoriaTransaccion, int, error) {
	return s.auditRepo.List(ctx, p)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// normalizeUsername convierte un string a minúsculas y reemplaza espacios por guiones.
func normalizeUsername(s string) string {
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(s), " ", "-"))
}
