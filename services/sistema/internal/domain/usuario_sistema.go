package domain

import "time"

// ─── Entidades ────────────────────────────────────────────────────────────────

type UsuarioSistema struct {
	ID            string     `json:"id"`
	Username      string     `json:"username"`
	Nombres       string     `json:"nombres"`
	Apellidos     string     `json:"apellidos"`
	Estado        string     `json:"estado"`
	CreadoAt      time.Time  `json:"creado_at"`
	ActualizadoAt time.Time  `json:"actualizado_at"`
	EliminadoAt   *time.Time `json:"eliminado_at,omitempty"`
}

type Rol struct {
	ID          int     `json:"id"`
	Nombre      string  `json:"nombre"`
	Descripcion *string `json:"descripcion,omitempty"`
}

// ─── Responses ────────────────────────────────────────────────────────────────

type UsuarioSistemaResponse struct {
	ID        string   `json:"id"`
	Username  string   `json:"username"`
	Nombres   string   `json:"nombres"`
	Apellidos string   `json:"apellidos"`
	Estado    string   `json:"estado"`
	Roles     []string `json:"roles"`
	CreadoAt  string   `json:"creado_at"`
}

// UsuarioSistemaCreadoResponse devuelve las credenciales la única vez que se crea.
type UsuarioSistemaCreadoResponse struct {
	Usuario          UsuarioSistemaResponse `json:"usuario"`
	PasswordTemporal string                 `json:"password_temporal"`
	ReqActions       []string               `json:"required_actions"`
}

// PagedResult respuesta paginada genérica
type PagedResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PageSize   int `json:"pageSize"`
	TotalPages int `json:"totalPages"`
}

// ─── Requests ─────────────────────────────────────────────────────────────────

type CreateUsuarioSistemaRequest struct {
	Username  string `json:"username"`
	Nombres   string `json:"nombres"`
	Apellidos string `json:"apellidos"`
	RolNombre string `json:"rol_nombre"` // Se exige al menos uno al crear
	// Nota DevSecOps: NO viene password desde el frontend.
}

type UpdateUsuarioSistemaRequest struct {
	Nombres   *string `json:"nombres,omitempty"`
	Apellidos *string `json:"apellidos,omitempty"`
	Estado    *string `json:"estado,omitempty"`
}

type UsuarioSistemaListParams struct {
	Page     int
	PageSize int
	Search   string
	Estado   string
}
