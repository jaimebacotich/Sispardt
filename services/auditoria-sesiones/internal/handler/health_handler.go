package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"sispardt/auditoria-sesiones/internal/poller"
)

// HealthHandler expone el estado de salud del servicio y del poller.
type HealthHandler struct {
	pollerState *poller.State
}

func NewHealthHandler(state *poller.State) *HealthHandler {
	return &HealthHandler{pollerState: state}
}

type healthResponse struct {
	Status string       `json:"status"`
	Poller pollerStatus `json:"poller"`
}

type pollerStatus struct {
	LastPollAt          *time.Time `json:"last_poll_at"`
	LastPollError       *string    `json:"last_poll_error"`
	EventsInsertedTotal int64      `json:"events_inserted_total"`
	ThresholdSeconds    int        `json:"threshold_seconds"`
}

// Health responde 200 si el poller está activo, 503 si está degradado.
// Criterio: now() - last_poll_at ≤ threshold (2×interval + 30s).
func (h *HealthHandler) Health(w http.ResponseWriter, r *http.Request) {
	lastPollAt, lastErr := h.pollerState.Read()

	var lastPollAtPtr *time.Time
	var lastErrPtr *string

	if !lastPollAt.IsZero() {
		t := lastPollAt
		lastPollAtPtr = &t
	}
	if lastErr != nil {
		s := lastErr.Error()
		lastErrPtr = &s
	}

	ps := pollerStatus{
		LastPollAt:          lastPollAtPtr,
		LastPollError:       lastErrPtr,
		EventsInsertedTotal: h.pollerState.EventsInsertedTotal(),
		ThresholdSeconds:    h.pollerState.ThresholdSeconds,
	}

	// Determinar estado: si nunca corrió o excede el umbral → degraded
	threshold := time.Duration(h.pollerState.ThresholdSeconds) * time.Second
	isHealthy := !lastPollAt.IsZero() && time.Since(lastPollAt) <= threshold

	if isHealthy {
		jsonOK(w, healthResponse{Status: "ok", Poller: ps})
	} else {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(healthResponse{Status: "degraded", Poller: ps})
	}
}
