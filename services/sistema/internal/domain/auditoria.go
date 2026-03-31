package domain

import (
	"encoding/json"
	"time"
)

type AuditoriaTransaccion struct {
	ID                string          `json:"id"`
	Timestamp         time.Time       `json:"timestamp"`
	Usuario           string          `json:"usuario"`
	NombreCompleto    string          `json:"nombreCompleto"`
	Rol               string          `json:"rol"`
	EstablecimientoID string          `json:"establecimientoId"`
	KeycloakUserID    string          `json:"-"`
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
