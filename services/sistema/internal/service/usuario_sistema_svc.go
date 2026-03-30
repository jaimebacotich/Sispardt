package service

import (
	"context"
	"fmt"
	"strings"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog/log"

	"sispardt/sistema/internal/domain"
	"sispardt/sistema/internal/keycloak"
	"sispardt/sistema/internal/repository"
	"sispardt/sistema/internal/utils"
)

type UsuarioSistemaService struct {
	repo     *repository.UsuarioSistemaRepo
	pool     *pgxpool.Pool
	kcClient *keycloak.AdminClient
}

func NewUsuarioSistemaService(pool *pgxpool.Pool, kcClient *keycloak.AdminClient) *UsuarioSistemaService {
	return &UsuarioSistemaService{
		repo:     repository.NewUsuarioSistemaRepo(pool),
		pool:     pool,
		kcClient: kcClient,
	}
}

// ─── Creación ─────────────────────────────────────────────────────────────────

func (s *UsuarioSistemaService) Create(ctx context.Context, req domain.CreateUsuarioSistemaRequest) (*domain.UsuarioSistemaCreadoResponse, error) {
	if req.Username == "" {
		return nil, fmt.Errorf("username es requerido")
	}
	if req.Nombres == "" {
		return nil, fmt.Errorf("nombres es requerido")
	}
	if req.Apellidos == "" {
		return nil, fmt.Errorf("apellidos es requerido")
	}
	if req.RolNombre == "" {
		return nil, fmt.Errorf("rol_nombre es requerido")
	}

	rol, err := s.repo.GetRolByNombre(ctx, req.RolNombre)
	if err != nil {
		return nil, fmt.Errorf("obtener rol: %w", err)
	}
	if rol == nil {
		return nil, fmt.Errorf("rol '%s' no existe", req.RolNombre)
	}

	// Generar contraseña temporal
	tempPass, err := utils.GenerateSecurePassword()
	if err != nil {
		return nil, fmt.Errorf("generar contraseña: %w", err)
	}

	// Crear en Keycloak
	kcReq := keycloak.CreateUserRequest{
		Username:  req.Username,
		FirstName: req.Nombres,
		LastName:  req.Apellidos,
		Password:  tempPass,
		RoleName:  kcRoleName(req.RolNombre),
	}
	kcUserID, err := s.kcClient.CreateUser(ctx, kcReq)
	if err != nil {
		return nil, fmt.Errorf("crear usuario en Keycloak: %w", err)
	}
	log.Info().Str("username", req.Username).Str("kc_user_id", kcUserID).Msg("usuario sistema creado en Keycloak")

	// Crear en BD local con transacción
	err = repository.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		if err := s.repo.Create(ctx, tx, kcUserID, req.Username, req.Nombres, req.Apellidos); err != nil {
			return err
		}
		return s.repo.AsignarRol(ctx, tx, kcUserID, rol.ID)
	})
	if err != nil {
		// Rollback Keycloak
		if delErr := s.kcClient.DeleteUser(ctx, kcUserID); delErr != nil {
			log.Error().Err(delErr).Str("kc_user_id", kcUserID).Msg("fallo al revertir usuario KC tras error DB")
		}
		return nil, fmt.Errorf("guardar usuario en BD: %w", err)
	}

	userResp, err := s.repo.GetByID(ctx, kcUserID)
	if err != nil || userResp == nil {
		return nil, fmt.Errorf("obtener usuario recién creado: %w", err)
	}

	return &domain.UsuarioSistemaCreadoResponse{
		Usuario:          *userResp,
		PasswordTemporal: tempPass,
		ReqActions:       []string{"UPDATE_PASSWORD"},
	}, nil
}

// ─── Consulta ─────────────────────────────────────────────────────────────────

func (s *UsuarioSistemaService) List(ctx context.Context, p domain.UsuarioSistemaListParams) (*domain.PagedResult[domain.UsuarioSistemaResponse], error) {
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
	return &domain.PagedResult[domain.UsuarioSistemaResponse]{
		Data:       data,
		Total:      total,
		Page:       p.Page,
		PageSize:   p.PageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *UsuarioSistemaService) GetByID(ctx context.Context, id string) (*domain.UsuarioSistemaResponse, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *UsuarioSistemaService) ListRoles(ctx context.Context) ([]domain.Rol, error) {
	return s.repo.ListRoles(ctx)
}

// ─── Actualización ────────────────────────────────────────────────────────────

func (s *UsuarioSistemaService) Update(ctx context.Context, id string, req domain.UpdateUsuarioSistemaRequest) (*domain.UsuarioSistemaResponse, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, fmt.Errorf("usuario no encontrado")
	}

	if req.Nombres != nil || req.Apellidos != nil {
		nombres := existing.Nombres
		apellidos := existing.Apellidos
		if req.Nombres != nil {
			nombres = *req.Nombres
		}
		if req.Apellidos != nil {
			apellidos = *req.Apellidos
		}
		if err := s.kcClient.UpdateUserDetails(ctx, id, nombres, apellidos); err != nil {
			return nil, fmt.Errorf("actualizar datos en Keycloak: %w", err)
		}
	}

	if req.Estado != nil {
		enabled := *req.Estado == "ACTIVO"
		if err := s.kcClient.UpdateUserEnabled(ctx, id, enabled); err != nil {
			return nil, fmt.Errorf("actualizar estado en Keycloak: %w", err)
		}
	}

	err = repository.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		return s.repo.UpdateDatos(ctx, tx, id, req)
	})
	if err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, id)
}

// CambiarRol asigna un nuevo rol al usuario (revocando el anterior si lo tiene).
func (s *UsuarioSistemaService) CambiarRol(ctx context.Context, usuarioID, nuevoRolNombre string) (*domain.UsuarioSistemaResponse, error) {
	existing, err := s.repo.GetByID(ctx, usuarioID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, fmt.Errorf("usuario no encontrado")
	}

	nuevoRol, err := s.repo.GetRolByNombre(ctx, nuevoRolNombre)
	if err != nil {
		return nil, fmt.Errorf("obtener nuevo rol: %w", err)
	}
	if nuevoRol == nil {
		return nil, fmt.Errorf("rol '%s' no existe", nuevoRolNombre)
	}

	err = repository.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		for _, rolActual := range existing.Roles {
			rolDB, err := s.repo.GetRolByNombre(ctx, rolActual)
			if err != nil || rolDB == nil {
				continue
			}
			if err := s.repo.RevocarRol(ctx, tx, usuarioID, rolDB.ID); err != nil {
				return err
			}
		}
		return s.repo.AsignarRol(ctx, tx, usuarioID, nuevoRol.ID)
	})
	if err != nil {
		return nil, err
	}

	// Sincronizar roles en Keycloak
	for _, rolActual := range existing.Roles {
		_ = s.kcClient.RemoveRealmRole(ctx, usuarioID, kcRoleName(rolActual))
	}
	if err := s.kcClient.AddRealmRole(ctx, usuarioID, kcRoleName(nuevoRolNombre)); err != nil {
		log.Warn().Err(err).Str("usuario_id", usuarioID).Str("rol", nuevoRolNombre).Msg("no se pudo asignar rol en Keycloak")
	}

	return s.repo.GetByID(ctx, usuarioID)
}

// ─── Eliminación lógica ───────────────────────────────────────────────────────

func (s *UsuarioSistemaService) Delete(ctx context.Context, adminID, id string) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return fmt.Errorf("usuario no encontrado")
	}
	if id == adminID {
		return fmt.Errorf("no puedes eliminar tu propio usuario")
	}

	if err := s.kcClient.UpdateUserEnabled(ctx, id, false); err != nil {
		log.Warn().Err(err).Str("usuario_id", id).Msg("no se pudo deshabilitar usuario en Keycloak al eliminar")
	}

	return repository.WithTx(ctx, s.pool, func(tx pgx.Tx) error {
		return s.repo.SoftDelete(ctx, tx, id)
	})
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func kcRoleName(bdRole string) string {
	return strings.TrimPrefix(bdRole, "rol_")
}
