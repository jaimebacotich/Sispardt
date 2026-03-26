package models

import "encoding/json"

// Structs para cada tabla de establecimientos (usados por consumer y repository)

type PaisRecord struct {
	ID          int    `json:"id"`
	Nombre      string `json:"nombre"`
	CodigoISO   string `json:"codigo_iso"`
	EliminadoAt *int64 `json:"eliminado_at"` // epoch microseconds
	EsSistema   bool   `json:"es_sistema"`
}

type DivisionPrincipalRecord struct {
	ID          int    `json:"id"`
	PaisID      int    `json:"pais_id"`
	Nombre      string `json:"nombre"`
	EliminadoAt *int64 `json:"eliminado_at"`
	EsSistema   bool   `json:"es_sistema"`
}

type DivisionSecundariaRecord struct {
	ID                  int    `json:"id"`
	DivisionPrincipalID int    `json:"division_principal_id"`
	Nombre              string `json:"nombre"`
	EliminadoAt         *int64 `json:"eliminado_at"`
	EsSistema           bool   `json:"es_sistema"`
}

type LocalidadRecord struct {
	ID                   int    `json:"id"`
	DivisionSecundariaID int    `json:"division_secundaria_id"`
	Nombre               string `json:"nombre"`
	EliminadoAt          *int64 `json:"eliminado_at"`
	EsSistema            bool   `json:"es_sistema"`
}

type EstablecimientoRecord struct {
	ID                     string  `json:"id"`
	FechaInicioOperaciones *string `json:"fecha_inicio_operaciones"` // epoch days (Debezium date type) o null
	EliminadoAt            *int64  `json:"eliminado_at"`
}

// Debezium codifica columnas tipo `date` como número de días desde la época Unix (1970-01-01).
// FechaInicioOperacionesDays contiene ese entero cuando el campo llega como número.
type EstablecimientoRawRecord struct {
	ID                     string `json:"id"`
	FechaInicioOperaciones *int32 `json:"fecha_inicio_operaciones"` // días desde 1970-01-01
	EliminadoAt            *int64 `json:"eliminado_at"`
}

type HabitacionRecord struct {
	ID                string  `json:"id"`
	EstablecimientoID string  `json:"establecimiento_id"`
	TipoHabitacionID  *int    `json:"tipo_habitacion_id"`
	NroHabitacion     string  `json:"nro_habitacion"`
	Piso              *string `json:"piso"`
	EstadoHab         string  `json:"estado_hab"`
	EliminadoAt       *int64  `json:"eliminado_at"`
}

type HabitacionCamaRecord struct {
	ID           int    `json:"id"`
	HabitacionID string `json:"habitacion_id"`
	TipoCamaID   int    `json:"tipo_cama_id"`
	Cantidad     int    `json:"cantidad"`
	EliminadoAt  *int64 `json:"eliminado_at"`
}

// Unmarshal helpers

func UnmarshalPais(raw json.RawMessage) (*PaisRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r PaisRecord
	return &r, json.Unmarshal(raw, &r)
}

func UnmarshalDivisionPrincipal(raw json.RawMessage) (*DivisionPrincipalRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r DivisionPrincipalRecord
	return &r, json.Unmarshal(raw, &r)
}

func UnmarshalDivisionSecundaria(raw json.RawMessage) (*DivisionSecundariaRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r DivisionSecundariaRecord
	return &r, json.Unmarshal(raw, &r)
}

func UnmarshalLocalidad(raw json.RawMessage) (*LocalidadRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r LocalidadRecord
	return &r, json.Unmarshal(raw, &r)
}

func UnmarshalEstablecimiento(raw json.RawMessage) (*EstablecimientoRawRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r EstablecimientoRawRecord
	return &r, json.Unmarshal(raw, &r)
}

func UnmarshalHabitacion(raw json.RawMessage) (*HabitacionRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r HabitacionRecord
	return &r, json.Unmarshal(raw, &r)
}

func UnmarshalHabitacionCama(raw json.RawMessage) (*HabitacionCamaRecord, error) {
	if raw == nil {
		return nil, nil
	}
	var r HabitacionCamaRecord
	return &r, json.Unmarshal(raw, &r)
}
