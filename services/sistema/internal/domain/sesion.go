package domain

import (
	"encoding/json"
	"fmt"
	"time"
)

// SesionAuditoria representa un evento de sesión registrado desde Keycloak.
type SesionAuditoria struct {
	ID              string          `json:"id"`
	KeycloakEventID string          `json:"keycloakEventId"`
	TipoEvento      string          `json:"tipoEvento"`
	UsuarioID       string          `json:"usuarioId"`
	Username        string          `json:"username"`
	NombreCompleto  string          `json:"nombreCompleto"`
	Rol             string          `json:"rol"`
	EstablecimientoID string        `json:"establecimientoId"`
	Realm           string          `json:"realm"`
	ClientID        string          `json:"clientId"`
	SesionID        string          `json:"sesionId"`
	IPAddress       string          `json:"ipAddress"`
	Detalle         json.RawMessage `json:"detalle,omitempty"`
	EventoTimestamp time.Time       `json:"eventoTimestamp"`
	CreadoAt        time.Time       `json:"creadoAt"`
}

// ConectadoInfo representa una sesión activa en Keycloak.
type ConectadoInfo struct {
	UsuarioID       string    `json:"usuarioId"`
	Username        string    `json:"username"`
	NombreCompleto    string    `json:"nombreCompleto"`
	EstablecimientoID string    `json:"establecimientoId"`
	ClientID          string    `json:"clientId"`
	ClientNombre    string    `json:"clientNombre"`
	SesionID        string    `json:"sesionId"`
	IPAddress       string    `json:"ipAddress"`
	InicioSesion    time.Time `json:"inicioSesion"`
	TiempoConectado string    `json:"tiempoConectado"`
	Roles           []string  `json:"roles"`
}

// ConectadosResponse respuesta del endpoint /conectados.
type ConectadosResponse struct {
	Conectados  []ConectadoInfo `json:"conectados"`
	Total       int             `json:"total"`
	ConsultadoAt time.Time      `json:"consultadoAt"`
	Advertencias []string       `json:"advertencias,omitempty"`
}

// ListParams parámetros de filtrado para el endpoint de historial.
type ListParams struct {
	Page       int
	PageSize   int
	Tipo       string // LOGIN, LOGOUT, LOGIN_ERROR
	Username   string // búsqueda ILIKE
	ClientID   string
	Rol        string // filtro por rol de aplicación (post-enriquecimiento KC)
	IP         string // búsqueda ILIKE
	FechaDesde *time.Time
	FechaHasta *time.Time
}

// FormatDuration formatea una duración en formato legible "Xh Ym" o "Xm Ys".
func FormatDuration(d time.Duration) string {
	d = d.Round(time.Second)
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	s := int(d.Seconds()) % 60

	if h > 0 {
		return fmt.Sprintf("%dh %dm", h, m)
	}
	if m > 0 {
		return fmt.Sprintf("%dm %ds", m, s)
	}
	return fmt.Sprintf("%ds", s)
}
