package domain

// ─── Reporte Consolidado Nacional ─────────────────────────────────────────────

// CeldaDia almacena llegadas (I) y pernoctaciones (P) de un departamento en un día.
type CeldaDia struct {
	Llegadas       int
	Pernoctaciones int
}

// FilaDiaria representa una fila del reporte: un día del mes con datos por departamento.
type FilaDiaria struct {
	Dia           int
	PorDepto      map[string]CeldaDia // key: nombre departamento
	TotalLlegadas int
	TotalPernoc   int
}

// ReporteNacional es la estructura completa del reporte mensual para un establecimiento.
type ReporteNacional struct {
	NombreEstablecimiento string
	Municipio             string       // "Tarija"
	MesAnio               string       // "MAYO 2026"
	Departamentos         []string     // orden canónico de columnas
	Filas                 []FilaDiaria // días 1..N
	TotalesPorDepto       map[string]CeldaDia
	TotalGeneral          CeldaDia
}

// parteParaReporte es un registro interno del query para calcular la matriz.
type ParteParaReporte struct {
	Dia         int    // día del mes (1..31)
	IngresoAt   int64  // unix timestamp (segundo) — para cálculo de pernoctaciones
	SalidaAt    *int64 // nil si sigue activo
	Departamento string // nombre del depto de procedencia
}
