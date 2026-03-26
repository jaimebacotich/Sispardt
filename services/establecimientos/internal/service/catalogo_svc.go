package service

import (
	"context"

	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"sispardt/establecimientos/internal/domain"
	"sispardt/establecimientos/internal/repository"
)

type CatalogoService struct {
	repo *repository.CatalogoRepo
	pool *pgxpool.Pool
}

func NewCatalogoService(pool *pgxpool.Pool) *CatalogoService {
	return &CatalogoService{
		repo: repository.NewCatalogoRepo(pool),
		pool: pool,
	}
}

// ─── Clasificaciones ─────────────────────────────────────────────────────────

func (s *CatalogoService) ListClasificaciones(ctx context.Context) ([]domain.Clasificacion, error) {
	return s.repo.ListClasificaciones(ctx)
}
func (s *CatalogoService) CreateClasificacion(ctx context.Context, userID, clientIP string, o domain.Clasificacion) (domain.Clasificacion, error) {
	var n domain.Clasificacion
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateClasificacion(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateClasificacion(ctx context.Context, userID, clientIP string, o domain.Clasificacion) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateClasificacion(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteClasificacion(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteClasificacion(ctx, tx, id)
	})
}

// ─── Categorias ──────────────────────────────────────────────────────────────
// ListCategorias está en EstablecimientoService / Repo para no romper dependencias,
// pero podemos agregar Create/Update/Delete aquí.

func (s *CatalogoService) CreateCategoria(ctx context.Context, userID, clientIP string, o domain.Categoria) (domain.Categoria, error) {
	var n domain.Categoria
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateCategoria(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateCategoria(ctx context.Context, userID, clientIP string, o domain.Categoria) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateCategoria(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteCategoria(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteCategoria(ctx, tx, id)
	})
}

// ─── Servicios ───────────────────────────────────────────────────────────────

func (s *CatalogoService) ListServicios(ctx context.Context) ([]domain.Servicio, error) {
	return s.repo.ListServicios(ctx)
}
func (s *CatalogoService) CreateServicio(ctx context.Context, userID, clientIP string, o domain.Servicio) (domain.Servicio, error) {
	var n domain.Servicio
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateServicio(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateServicio(ctx context.Context, userID, clientIP string, o domain.Servicio) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateServicio(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteServicio(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteServicio(ctx, tx, id)
	})
}

// ─── Tipos Habitacion ────────────────────────────────────────────────────────

func (s *CatalogoService) ListTiposHabitacion(ctx context.Context) ([]domain.TipoHabitacion, error) {
	return s.repo.ListTiposHabitacion(ctx)
}
func (s *CatalogoService) CreateTipoHabitacion(ctx context.Context, userID, clientIP string, o domain.TipoHabitacion) (domain.TipoHabitacion, error) {
	var n domain.TipoHabitacion
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateTipoHabitacion(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateTipoHabitacion(ctx context.Context, userID, clientIP string, o domain.TipoHabitacion) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateTipoHabitacion(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteTipoHabitacion(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteTipoHabitacion(ctx, tx, id)
	})
}

// ─── Tipos Cama ──────────────────────────────────────────────────────────────

func (s *CatalogoService) ListTiposCama(ctx context.Context) ([]domain.TipoCama, error) {
	return s.repo.ListTiposCama(ctx)
}
func (s *CatalogoService) CreateTipoCama(ctx context.Context, userID, clientIP string, o domain.TipoCama) (domain.TipoCama, error) {
	var n domain.TipoCama
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateTipoCama(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateTipoCama(ctx context.Context, userID, clientIP string, o domain.TipoCama) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateTipoCama(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteTipoCama(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteTipoCama(ctx, tx, id)
	})
}

// ─── Tipos Personal ──────────────────────────────────────────────────────────

func (s *CatalogoService) ListTiposPersonal(ctx context.Context) ([]domain.TipoPersonal, error) {
	return s.repo.ListTiposPersonal(ctx)
}

// ─── Geograficos ─────────────────────────────────────────────────────────────

func (s *CatalogoService) ListPaises(ctx context.Context) ([]domain.Pais, error) {
	return s.repo.ListPaises(ctx)
}
func (s *CatalogoService) CreatePais(ctx context.Context, userID, clientIP string, o domain.Pais) (domain.Pais, error) {
	var n domain.Pais
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreatePais(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdatePais(ctx context.Context, userID, clientIP string, o domain.Pais) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdatePais(ctx, tx, o)
	})
}
func (s *CatalogoService) DeletePais(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeletePais(ctx, tx, id)
	})
}

func (s *CatalogoService) ListDivisionesPrincipales(ctx context.Context) ([]domain.DivisionPrincipal, error) {
	return s.repo.ListDivisionesPrincipales(ctx)
}
func (s *CatalogoService) CreateDivisionPrincipal(ctx context.Context, userID, clientIP string, o domain.DivisionPrincipal) (domain.DivisionPrincipal, error) {
	var n domain.DivisionPrincipal
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateDivisionPrincipal(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateDivisionPrincipal(ctx context.Context, userID, clientIP string, o domain.DivisionPrincipal) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateDivisionPrincipal(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteDivisionPrincipal(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteDivisionPrincipal(ctx, tx, id)
	})
}

func (s *CatalogoService) ListDivisionesSecundarias(ctx context.Context) ([]domain.DivisionSecundaria, error) {
	return s.repo.ListDivisionesSecundarias(ctx)
}
func (s *CatalogoService) CreateDivisionSecundaria(ctx context.Context, userID, clientIP string, o domain.DivisionSecundaria) (domain.DivisionSecundaria, error) {
	var n domain.DivisionSecundaria
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateDivisionSecundaria(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateDivisionSecundaria(ctx context.Context, userID, clientIP string, o domain.DivisionSecundaria) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateDivisionSecundaria(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteDivisionSecundaria(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteDivisionSecundaria(ctx, tx, id)
	})
}

func (s *CatalogoService) CreateLocalidad(ctx context.Context, userID, clientIP string, o domain.Localidad) (domain.Localidad, error) {
	var n domain.Localidad
	err := repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		var err error
		n, err = s.repo.CreateLocalidad(ctx, tx, o)
		return err
	})
	return n, err
}
func (s *CatalogoService) UpdateLocalidad(ctx context.Context, userID, clientIP string, o domain.Localidad) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.UpdateLocalidad(ctx, tx, o)
	})
}
func (s *CatalogoService) DeleteLocalidad(ctx context.Context, userID, clientIP string, id int) error {
	return repository.WithAuditTx(ctx, s.pool, userID, clientIP, func(tx pgx.Tx) error {
		return s.repo.DeleteLocalidad(ctx, tx, id)
	})
}
