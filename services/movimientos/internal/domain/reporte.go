package domain

// ─── Reporte Parte Diario ─────────────────────────────────────────────────────

type ReporteFilaParteDiario struct {
	Numero          int    `json:"numero"`
	FechaIngreso    string `json:"fechaIngreso"`    // DD/MM/YYYY
	Nombre          string `json:"nombre"`
	ApellidoPaterno string `json:"apellidoPaterno"`
	ApellidoMaterno string `json:"apellidoMaterno"`
	TipoDocumento   string `json:"tipoDocumento"`   // CI | DNI | PAS
	NroDocumento    string `json:"nroDocumento"`
	FechaNacimiento string `json:"fechaNacimiento"` // DD/MM/YYYY
	Nacionalidad    string `json:"nacionalidad"`
	Procedencia     string `json:"procedencia"`
	NroPieza        string `json:"nroPieza"`
	FechaSalida     string `json:"fechaSalida"` // vacío para ingresos
}

type ReporteParteDiario struct {
	Fecha    string                   `json:"fecha"`    // DD/MM/YYYY
	Ingresos []ReporteFilaParteDiario `json:"ingresos"`
	Salidas  []ReporteFilaParteDiario `json:"salidas"`
}
