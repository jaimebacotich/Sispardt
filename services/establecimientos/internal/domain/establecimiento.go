package domain

import "time"

// Establecimiento representa un establecimiento de hospedaje.
type Establecimiento struct {
	ID                       string     `json:"id"`
	NroLicencia              *string    `json:"nroLicencia,omitempty"`
	RazonSocial              string     `json:"razonSocial"`
	Propietario              string     `json:"propietario"`
	LocalidadID              *int       `json:"localidadId,omitempty"`
	CategoriaID              *int       `json:"categoriaId,omitempty"`
	TieneLicenciaVigente     bool       `json:"tieneLicenciaVigente"`
	FechaVencimientoLicencia *string    `json:"fechaVencimientoLicencia,omitempty"`
	Direccion                string     `json:"direccion"`
	Latitud                  *float64   `json:"latitud,omitempty"`
	Longitud                 *float64   `json:"longitud,omitempty"`
	Telefono                 *string    `json:"telefono,omitempty"`
	Email                    *string    `json:"email,omitempty"`
	EstadoAdmin              string     `json:"estadoAdmin"`
	FechaInicioOperaciones   string     `json:"fechaInicioOperaciones"` // YYYY-MM-DD
	CreadoAt                 time.Time  `json:"creadoAt"`
	ActualizadoAt            time.Time  `json:"actualizadoAt"`
	EliminadoAt              *time.Time `json:"eliminadoAt,omitempty"`
	// Relaciones opcionales (enriquecidas)
	Categoria *Categoria `json:"categoria,omitempty"`
	Localidad *Localidad `json:"localidad,omitempty"`
}

type CreateEstablecimientoRequest struct {
	NroLicencia              *string  `json:"nroLicencia"`
	RazonSocial              string   `json:"razonSocial"`
	Propietario              string   `json:"propietario"`
	LocalidadID              *int     `json:"localidadId"`
	CategoriaID              *int     `json:"categoriaId"`
	TieneLicenciaVigente     bool     `json:"tieneLicenciaTuristica"`
	FechaVencimientoLicencia *string  `json:"fechaVencimientoLicencia"`
	Direccion                string   `json:"direccion"`
	Latitud                  *float64 `json:"latitud"`
	Longitud                 *float64 `json:"longitud"`
	Telefono                 *string  `json:"telefono"`
	Email                    *string  `json:"email"`
	ServiciosIds             []int    `json:"serviciosIds"`
	FechaInicioOperaciones   string   `json:"fechaInicioOperaciones"` // YYYY-MM-DD, requerido
}

type UpdateEstablecimientoRequest struct {
	NroLicencia              *string  `json:"nroLicencia"`
	RazonSocial              *string  `json:"razonSocial"`
	Propietario              *string  `json:"propietario"`
	LocalidadID              *int     `json:"localidadId"`
	CategoriaID              *int     `json:"categoriaId"`
	TieneLicenciaVigente     *bool    `json:"tieneLicenciaTuristica"`
	FechaVencimientoLicencia *string  `json:"fechaVencimientoLicencia"`
	Direccion                *string  `json:"direccion"`
	Latitud                  *float64 `json:"latitud"`
	Longitud                 *float64 `json:"longitud"`
	Telefono                 *string  `json:"telefono"`
	Email                    *string  `json:"email"`
	EstadoAdmin              *string  `json:"estadoAdmin"`
	FechaInicioOperaciones   *string  `json:"fechaInicioOperaciones"`
	ServiciosIds             *[]int   `json:"serviciosIds"`
}

// Habitacion representa una habitación dentro de un establecimiento.
type Habitacion struct {
	ID                string     `json:"id"`
	EstablecimientoID string     `json:"establecimientoId"`
	TipoHabitacionID  *int       `json:"tipoHabitacionId,omitempty"`
	NroHabitacion     string     `json:"nroHabitacion"`
	Piso              *string    `json:"piso,omitempty"`
	TieneBanoPrivado  bool       `json:"tieneBanoPrivado"`
	EstadoHab         string     `json:"estadoHab"`
	CreadoAt          time.Time  `json:"creadoAt"`
	EliminadoAt       *time.Time `json:"eliminadoAt,omitempty"`
	// Capacidad calculada (JOIN con habitacion_camas)
	CapacidadCalculada *int             `json:"capacidadCalculada,omitempty"`
	TipoHabitacion     *string          `json:"tipoHabitacion,omitempty"`
	Camas              []HabitacionCama `json:"camas,omitempty"`
}

type CreateHabitacionCama struct {
	TipoCamaID int `json:"tipoCamaId"`
	Cantidad   int `json:"cantidad"`
}

type CreateHabitacionRequest struct {
	TipoHabitacionID *int                   `json:"tipoHabitacionId"`
	NroHabitacion    string                 `json:"nroHabitacion"`
	Piso             *string                `json:"piso"`
	TieneBanoPrivado bool                   `json:"tieneBanoPrivado"`
	Camas            []CreateHabitacionCama `json:"camas"`
}

type UpdateHabitacionRequest struct {
	TipoHabitacionID *int                   `json:"tipoHabitacionId"`
	NroHabitacion    string                 `json:"nroHabitacion"`
	Piso             *string                `json:"piso"`
	TieneBanoPrivado bool                   `json:"tieneBanoPrivado"`
	Camas            []CreateHabitacionCama `json:"camas"`
}

type UpdateHabitacionEstadoRequest struct {
	Estado string `json:"estado"` // "DISPONIBLE" | "MANTENIMIENTO"
}

type HabitacionCama struct {
	ID           int        `json:"id"`
	HabitacionID string     `json:"habitacionId"`
	TipoCamaID   int        `json:"tipoCamaId"`
	Cantidad     int        `json:"cantidad"`
	EliminadoAt  *time.Time `json:"eliminadoAt,omitempty"`
	// Enriquecido
	TipoCama  *string `json:"tipoCama,omitempty"`
	Capacidad *int    `json:"capacidadPersonas,omitempty"`
}

// Catálogos (tablas de referencia)
type Categoria struct {
	ID              int     `json:"id"`
	ClasificacionID *int    `json:"clasificacionId,omitempty"`
	Nombre          string  `json:"nombre"`
	Descripcion     *string `json:"descripcion"`
	Clasificacion   *string `json:"clasificacionNombre,omitempty"`
}

type Localidad struct {
	ID                       int     `json:"id"`
	Nombre                   string  `json:"nombre"`
	DivisionSecundariaID     *int    `json:"divisionSecundariaId,omitempty"`
	DivisionSecundariaNombre *string `json:"divisionSecundariaNombre,omitempty"`
	DivisionPrincipalID      *int    `json:"divisionPrincipalId,omitempty"`
	DivisionPrincipalNombre  *string `json:"divisionPrincipalNombre,omitempty"`
	EsSistema                bool    `json:"esSistema"`
}

// EstablecimientoResponse — DTO camelCase para el frontend.
type EstablecimientoResponse struct {
	ID                       string   `json:"id"`
	NroLicencia              *string  `json:"nroLicencia"`
	RazonSocial              string   `json:"razonSocial"`
	RazonSocialCorta         string   `json:"razonSocialCorta"`
	PropietarioNombre        *string  `json:"propietarioNombre"`
	ClasificacionID          *string  `json:"clasificacionId"`
	ClasificacionNombre      *string  `json:"clasificacionNombre"`
	CategoriaID              *string  `json:"categoriaId"`
	CategoriaNombre          *string  `json:"categoriaNombre"`
	DivisionSecundariaID     *string  `json:"divisionSecundariaId"`
	DivisionSecundariaNombre *string  `json:"divisionSecundariaNombre"`
	LocalidadID              *string  `json:"localidadId"`
	LocalidadNombre          *string  `json:"localidadNombre"`
	Direccion                string   `json:"direccion"`
	Telefono                 *string  `json:"telefono"`
	Email                    *string  `json:"email"`
	TieneLicenciaTuristica   bool     `json:"tieneLicenciaTuristica"`
	FechaVencimientoLicencia *string  `json:"fechaVencimientoLicencia"`
	Latitud                  *float64 `json:"latitud"`
	Longitud                 *float64 `json:"longitud"`
	ServiciosIds             []string `json:"serviciosIds"`
	CapacidadHospedaje       int      `json:"capacidadHospedaje"`
	Activo                   bool     `json:"activo"`
	CreadoEn                 string   `json:"creadoEn"`
	FechaInicioOperaciones   string   `json:"fechaInicioOperaciones"`
}

// HabitacionResponse — DTO camelCase para el frontend.
type HabitacionResponse struct {
	ID                   string                   `json:"id"`
	EstablecimientoID    string                   `json:"establecimientoId"`
	Numero               string                   `json:"numero"`
	Piso                 *string                  `json:"piso"`
	TipoHabitacionID     *string                  `json:"tipoHabitacionId"`
	TipoHabitacionNombre *string                  `json:"tipoHabitacionNombre"`
	CapacidadTotal       int                      `json:"capacidadTotal"`
	Activa               bool                     `json:"activa"`
	Camas                []HabitacionCamaResponse `json:"camas"`
}

type HabitacionCamaResponse struct {
	ID                int    `json:"id"`
	TipoCamaID        string `json:"tipoCamaId"`
	TipoCamaNombre    string `json:"tipoCamaNombre"`
	CapacidadPersonas int    `json:"capacidadPersonas"`
	Cantidad          int    `json:"cantidad"`
}

// ─── Personal ────────────────────────────────────────────────────────────────

type PersonalResponse struct {
	ID                 string  `json:"id"`
	EstablecimientoID  string  `json:"establecimientoId"`
	TipoPersonalID     string  `json:"tipoPersonalId"`
	TipoPersonalNombre string  `json:"tipoPersonalNombre,omitempty"`
	Nombres            string  `json:"nombres"`
	Apellidos          string  `json:"apellidos"`
	NombreCompleto     string  `json:"nombreCompleto"`
	DocumentoIdentidad *string `json:"documentoIdentidad,omitempty"`
	Telefono           *string `json:"telefono,omitempty"`
	Activo             bool    `json:"activo"`
	UsuarioSistema     bool    `json:"usuarioSistema"`
	KeycloakUserID     *string `json:"keycloakUserId,omitempty"`
	// Username y PasswordTemporal se devuelven una única vez al crear la cuenta Keycloak.
	Username         *string `json:"username,omitempty"`
	PasswordTemporal *string `json:"password_temporal,omitempty"`
}

type CreatePersonalRequest struct {
	TipoPersonalID     int     `json:"tipoPersonalId"`
	Nombres            string  `json:"nombres"`
	Apellidos          string  `json:"apellidos"`
	DocumentoIdentidad *string `json:"documentoIdentidad"`
	Telefono           *string `json:"telefono"`
	UsuarioSistema     bool    `json:"usuarioSistema"`
	Username           string  `json:"username"`
}

type UpdatePersonalRequest struct {
	TipoPersonalID     int     `json:"tipoPersonalId"`
	Nombres            string  `json:"nombres"`
	Apellidos          string  `json:"apellidos"`
	DocumentoIdentidad *string `json:"documentoIdentidad"`
	Telefono           *string `json:"telefono"`
	UsuarioSistema     bool    `json:"usuarioSistema"`
	Username           string  `json:"username"`
}

type TogglePersonalActivoRequest struct {
	Activo bool `json:"activo"`
}

// ─── Paginación ──────────────────────────────────────────────────────────────

type ListParams struct {
	Page     int    `json:"page"`
	PageSize int    `json:"pageSize"`
	Search   string `json:"search,omitempty"`
	// Filtros opcionales
	LocalidadID *int   `json:"localidadId,omitempty"`
	CategoriaID *int   `json:"categoriaId,omitempty"`
	EstadoAdmin string `json:"estadoAdmin,omitempty"`
}

type PagedResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalPages int `json:"totalPages"`
}
