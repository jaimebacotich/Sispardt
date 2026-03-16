package domain

import (
	"encoding/json"
	"time"
)

type AuditoriaTransaccion struct {
	ID                string          `json:"id"`
	Timestamp         time.Time       `json:"timestamp"`
	Usuario           string          `json:"usuario"`           // username (snapshot o UUID como fallback)
	NombreCompleto    string          `json:"nombreCompleto"`    // enriquecido desde KC o snapshot
	Rol               string          `json:"rol"`               // enriquecido desde KC
	EstablecimientoID string          `json:"establecimientoId"` // enriquecido desde KC
	KeycloakUserID    string          `json:"-"`                 // uso interno para enriquecimiento
	Accion            string          `json:"accion"`
	Tabla             string          `json:"tabla"`
	RecordID          string          `json:"recordId"`
	IPAddress         string          `json:"ipAddress"`
	ValorAnterior     json.RawMessage `json:"valorAnterior"`
	ValorNuevo        json.RawMessage `json:"valorNuevo"`
}

type AuditoriaListParams struct {
	Page       int
	PageSize   int
	Search     string
	Accion     string
	Tabla      string
	Rol        string // filtro post-enriquecimiento KC
	FechaDesde string // YYYY-MM-DD
	FechaHasta string // YYYY-MM-DD
}
