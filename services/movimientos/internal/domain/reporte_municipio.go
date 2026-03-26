package domain

// ─── Reporte Consolidado por Municipio ────────────────────────────────────────

// EstablecimientoMetadata contiene los datos descriptivos del establecimiento
// que provienen de la BD de establecimientos (no están replicados en movimientos).
type EstablecimientoMetadata struct {
	ID           string `json:"id"`
	Nombre       string `json:"nombre"`
	Clasificacion string `json:"clasificacion"`
	Categoria    string `json:"categoria"`
}

// ReqReporteMunicipio es el cuerpo del POST para generar el reporte del municipio.
type ReqReporteMunicipio struct {
	Municipio        string                    `json:"municipio"`
	Anio             int                       `json:"anio"`
	Mes              int                       `json:"mes"`
	Establecimientos []EstablecimientoMetadata `json:"establecimientos"`
}

// FilaEstablecimiento representa una fila del reporte: un establecimiento con sus totales.
type FilaEstablecimiento struct {
	Numero        int
	Clasificacion string
	Nombre        string
	Categoria     string
	PorDepto      map[string]CeldaDia
	TotalLlegadas int
	TotalPernoc   int
}

// ReporteMunicipioNacional es la estructura completa del reporte por municipio.
type ReporteMunicipioNacional struct {
	Municipio     string
	MesAnio       string
	Departamentos []string // orden canónico de los 9 deptos
	Filas         []FilaEstablecimiento
	TotalGeneral  FilaEstablecimiento
}

// ParteParaMunicipio es el registro interno del query para el reporte por municipio.
type ParteParaMunicipio struct {
	EstablecimientoID string
	IngresoAt         int64
	SalidaAt          *int64
	Departamento      string // nombre del depto de procedencia (bolivianos)
}
