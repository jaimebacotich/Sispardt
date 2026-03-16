package consumer

import (
	"encoding/json"
	"fmt"
)

// Envelope es el envoltorio de mensaje Debezium (sin schema registry, JSON plano).
type Envelope struct {
	Before json.RawMessage `json:"before"`
	After  json.RawMessage `json:"after"`
	Op     string          `json:"op"` // r=snapshot c=create u=update d=delete
	Source Source          `json:"source"`
}

type Source struct {
	Table string `json:"table"`
	DB    string `json:"db"`
}

// Op constants
const (
	OpRead   = "r" // snapshot inicial
	OpCreate = "c"
	OpUpdate = "u"
	OpDelete = "d"
)

// ParseEnvelope parsea el payload JSON de un mensaje Debezium.
func ParseEnvelope(data []byte) (*Envelope, error) {
	if len(data) == 0 || string(data) == "null" {
		return nil, nil
	}
	var env Envelope
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, fmt.Errorf("parsear envelope Debezium: %w", err)
	}
	return &env, nil
}
