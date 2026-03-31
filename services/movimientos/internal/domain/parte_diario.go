package domain

import "time"

// ─── Catálogos ────────────────────────────────────────────────────────────────

type TipoDocumento struct {
	ID          int    `json:"id"`
	Sigla       string `json:"sigla"`
	Descripcion string `json:"descripcion"`
}

type MotivoViaje struct {
	ID     int    `json:"id"`
	Nombre string `json:"nombre"`
}

type Pais struct {
	ID        int    `json:"id"`
	Nombre    string `json:"nombre"`
	CodigoIso string `json:"codigoIso"`
}

type DivisionPrincipal struct {
	ID     int    `json:"id"`
	PaisID int    `json:"paisId"`
	Nombre string `json:"nombre"`
}

type DivisionSecundaria struct {
	ID                  int    `json:"id"`
	DivisionPrincipalID int    `json:"divisionPrincipalId"`
	Nombre              string `json:"nombre"`
}

type LocalidadMov struct {
	ID                   int    `json:"id"`
	DivisionSecundariaID int    `json:"divisionSecundariaId"`
	Nombre               string `json:"nombre"`
}

type CatalogosMovimientos struct {
	TiposDocumento        []TipoDocumento      `json:"tiposDocumento"`
	MotivosViaje          []MotivoViaje        `json:"motivosViaje"`
	Paises                []Pais               `json:"paises"`
	DivisionesPrincipales []DivisionPrincipal  `json:"divisionesPrincipales"`
	DivisionesSecundarias []DivisionSecundaria `json:"divisionesSecundarias"`
	Localidades           []LocalidadMov       `json:"localidades"`
}

// ─── Persona ─────────────────────────────────────────────────────────────────

// PersonaResponse se devuelve embebido en ParteDiarioResponse.
type PersonaResponse struct {
	ID                 string  `json:"id"`
	TipoDocumentoID    *int    `json:"tipoDocumentoId"`
	TipoDocumentoSigla *string `json:"tipoDocumentoSigla"`
	DocumentoIdentidad string  `json:"documentoIdentidad"`
	PaisOrigenID       int     `json:"paisOrigenId"`
	PaisOrigenNombre   string  `json:"paisOrigenNombre"`
	Nombre             string  `json:"nombre"`
	ApellidoPaterno    string  `json:"apellidoPaterno"`
	ApellidoMaterno    *string `json:"apellidoMaterno"`
	FechaNacimiento    string  `json:"fechaNacimiento"`
	Profesion          *string `json:"profesion"`
	Genero             *string `json:"genero"`
	CreadoAt           string  `json:"creadoAt"`
}

// CreatePersonaRequest — acepta JSON camelCase del frontend.
type CreatePersonaRequest struct {
	TipoDocumentoID    *int    `json:"tipoDocumentoId"`
	DocumentoIdentidad string  `json:"documentoIdentidad"`
	PaisOrigenID       int     `json:"paisOrigenId"`
	Nombre             string  `json:"nombre"`
	ApellidoPaterno    string  `json:"apellidoPaterno"`
	ApellidoMaterno    *string `json:"apellidoMaterno"`
	FechaNacimiento    string  `json:"fechaNacimiento"` // YYYY-MM-DD
	Profesion          *string `json:"profesion"`
	Genero             *string `json:"genero"`
}

// Persona — dominio interno.
type Persona struct {
	ID                 string
	TipoDocumentoID    *int
	DocumentoIdentidad string
	PaisOrigenID       int
	Nombre             string
	ApellidoPaterno    string
	ApellidoMaterno    *string
	FechaNacimiento    string
	Profesion          *string
	CreadoAt           time.Time
}

// ─── Habitación Estado ────────────────────────────────────────────────────────

type HabitacionEstado struct {
	ID            string  `json:"id"`
	Numero        string  `json:"numero"`
	Piso          *string `json:"piso"`
	TipoNombre    string  `json:"tipoNombre"`
	Capacidad     int     `json:"capacidad"`
	Estado        string  `json:"estado"` // libre | ocupada | mantenimiento
	ParteActualId *string `json:"parteActualId,omitempty"`
	HuespedActual *string `json:"huespedActual,omitempty"`
}

// ─── Parte Diario ─────────────────────────────────────────────────────────────

// ParteDiarioResponse — respuesta enriquecida para el frontend (camelCase).
type ParteDiarioResponse struct {
	ID                         string           `json:"id"`
	EstablecimientoID          string           `json:"establecimientoId"`
	HabitacionID               string           `json:"habitacionId"`
	HabNroSnapshot             *string          `json:"habNroSnapshot"`
	HabTipoSnapshot            *string          `json:"habTipoSnapshot"`
	HabPisoSnapshot            *string          `json:"habPisoSnapshot"`
	Persona                    *PersonaResponse `json:"persona"`
	FechaReporte               string           `json:"fechaReporte"`
	IngresoAt                  string           `json:"ingresoAt"`
	SalidaAt                   *string          `json:"salidaAt"`
	PaisProcedenciaID          int              `json:"paisProcedenciaId"`
	PaisProcedenciaNombre      string           `json:"paisProcedenciaNombre"`
	LocalidadProcedenciaID     *int             `json:"localidadProcedenciaId"`
	LocalidadProcedenciaNombre *string          `json:"localidadProcedenciaNombre"`
	PaisDestinoID              *int             `json:"paisDestinoId"`
	PaisDestinoNombre          *string          `json:"paisDestinoNombre"`
	LocalidadDestinoID         *int             `json:"localidadDestinoId"`
	LocalidadDestinoNombre     *string          `json:"localidadDestinoNombre"`
	MotivoViajeID              *int             `json:"motivoViajeId"`
	MotivoViajeNombre          *string          `json:"motivoViajeNombre"`
	EstadoOperativo            string           `json:"estadoOperativo"`
	CondicionEntrega           string           `json:"condicionEntrega"`
	CreadoAt                   string           `json:"creadoAt"`
}

// ParteDiario — dominio interno.
type ParteDiario struct {
	ID                      string
	EstablecimientoID       string
	HabitacionID            string
	PersonaID               *string
	FechaReporte            string
	IngresoAt               time.Time
	SalidaAt                *time.Time
	PaisProcedenciaID       *int
	LocalidadProcedenciaID  *int
	PaisDestinoID           *int
	LocalidadDestinoID      *int
	MotivoViajeID           *int
	KeycloakRecepcionistaID string
	HabNroSnapshot          *string
	HabTipoSnapshot         *string
	HabPisoSnapshot         *string
	EstadoOperativo         string
	CondicionEntrega        string
	CreadoAt                time.Time
}

// CreateParteDiarioRequest — acepta JSON camelCase del frontend.
type CreateParteDiarioRequest struct {
	HabitacionID           string               `json:"habitacionId"`
	FechaReporte           string               `json:"fechaReporte"`
	PaisProcedenciaID      int                  `json:"paisProcedenciaId"`
	LocalidadProcedenciaID *int                 `json:"localidadProcedenciaId"`
	PaisDestinoID          *int                 `json:"paisDestinoId"`
	LocalidadDestinoID     *int                 `json:"localidadDestinoId"`
	MotivoViajeID          *int                 `json:"motivoViajeId"`
	Persona                CreatePersonaRequest `json:"persona"`
}

// HabitacionResumen — datos del replica_cache.
type HabitacionResumen struct {
	HabitacionID       string
	EstablecimientoID  string
	NroHabitacion      string
	TipoHabitacion     string
	CapacidadCalculada int
	Piso               *string
}

// ─── Cierre Diario ────────────────────────────────────────────────────────────

// CierreDiarioResponse — respuesta camelCase.
type CierreDiarioResponse struct {
	ID                string  `json:"id"`
	EstablecimientoID string  `json:"establecimientoId"`
	FechaReporte      string  `json:"fechaReporte"`
	TotalRegistros    int     `json:"totalRegistros"`
	TotalCheckins     int     `json:"totalCheckins"`
	TotalCheckouts    int     `json:"totalCheckouts"`
	CerradoPor        string  `json:"cerradoPor"`
	CerradoAt         string  `json:"cerradoAt"`
	Observacion       *string `json:"observacion"`
	CondicionEntrega  string  `json:"condicionEntrega"`
}

// CierreDiario — dominio interno.
type CierreDiario struct {
	ID                string
	EstablecimientoID string
	FechaReporte      string
	TotalRegistros    int
	TotalCheckins     int
	TotalCheckouts    int
	CerradoPor        string
	CerradoAt         time.Time
	Observacion       *string
	CondicionEntrega  string
}

// CreateCierreDiarioRequest — acepta JSON camelCase del frontend.
type CreateCierreDiarioRequest struct {
	FechaReporte string  `json:"fechaReporte"`
	Observacion  *string `json:"observacion"`
}

// FechaPendiente — fecha con partes pero sin cierre.
type FechaPendiente struct {
	Fecha          string `json:"fecha"`
	TotalCheckins  int    `json:"totalCheckins"`
	TotalCheckouts int    `json:"totalCheckouts"`
}

// ─── Estadísticas ─────────────────────────────────────────────────────────────

type OcupacionDiaria struct {
	EstablecimientoID   string   `json:"establecimientoId"`
	FechaReporte        string   `json:"fechaReporte"`
	TotalHuespedes      int64    `json:"totalHuespedes"`
	CapacidadTotal      *int64   `json:"capacidadTotal,omitempty"`
	PorcentajeOcupacion *float64 `json:"porcentajeOcupacion,omitempty"`
}

type ResumenEstadisticas struct {
	TotalHuespedes    int64   `json:"totalHuespedes"`
	TotalExtranjeros  int64   `json:"totalExtranjeros"`
	OcupacionPromedio float64 `json:"ocupacionPromedio"`
	EstadiaProm       float64 `json:"estadiaPromedioDias"`
	TotalCheckins     int64   `json:"totalCheckins"`
	TotalCheckouts    int64   `json:"totalCheckouts"`
	TotalPernoctes    int64   `json:"totalPernoctes"`
	CapacidadTotal    int64   `json:"capacidadTotal"`
	DiasConDatos      int     `json:"diasConDatos"`
}

type NacionalidadStat struct {
	PaisID           int     `json:"paisId"`
	PaisNombre       string  `json:"paisNombre"`
	CantidadIngresos int64   `json:"cantidadIngresos"`
	Porcentaje       float64 `json:"porcentaje"`
}

type MotivoMes struct {
	MotivoID     *int   `json:"motivoId"`
	MotivoNombre string `json:"motivoNombre"`
	Cantidad     int64  `json:"cantidad"`
}

type MotivosPeriodo struct {
	Periodo string      `json:"periodo"`
	Motivos []MotivoMes `json:"motivos"`
}

type TipoHabitacionStat struct {
	TipoHabitacion       string  `json:"tipoHabitacion"`
	TotalCamas           int64   `json:"totalCamas"`
	TotalOcupadas        int64   `json:"totalOcupadas"`
	PorcentajeOcupacion  float64 `json:"porcentajeOcupacion"`
	PorcentajeDistribucion float64 `json:"porcentajeDistribucion"`
}

// ─── Parámetros de consulta ───────────────────────────────────────────────────

type ListPartesParams struct {
	EstablecimientoID string
	FechaDesde        string
	FechaHasta        string
	FechaReporte      string
	HabitacionID      string
	EstadoOperativo   string
	SoloActivos       bool
	SoloCheckout      bool
	IncluirAnulados   bool
	SalidaFecha       string
	ActivoEnFecha     string // fecha_reporte <= X AND (salida_at IS NULL OR salida_at::date > X)
	Page              int
	PageSize          int
}

type PagedResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalPages int `json:"totalPages"`
}
