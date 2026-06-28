package poller

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/auditoria-sesiones/internal/domain"
	"sispardt/auditoria-sesiones/internal/keycloak"
	"sispardt/auditoria-sesiones/internal/metrics"
	"sispardt/auditoria-sesiones/internal/repository"
)

// Campos JSONB sensibles que NO deben persistirse (P-04).
var sensitiveKeys = map[string]bool{
	"code":          true,
	"token":         true,
	"refresh_token": true,
	"session_note":  true,
}

// Tipos de eventos de usuario que se capturan.
var eventTypes = []string{"LOGIN", "LOGOUT", "LOGIN_ERROR"}

// Tipos de admin events que se capturan.
var adminOperationTypes = []string{"CREATE", "UPDATE", "DELETE"}
var adminResourceTypes = []string{"USER", "REALM_ROLE_MAPPING"}

// State contiene el estado observable del poller para el /health endpoint.
type State struct {
	mu               sync.RWMutex
	LastPollAt       time.Time
	LastPollError    error
	ThresholdSeconds int
	eventsTotal      int64 // acceso atómico
}

func NewState(intervalSeconds int) *State {
	return &State{
		ThresholdSeconds: intervalSeconds*2 + 30,
	}
}

func (s *State) EventsInsertedTotal() int64 {
	return atomic.LoadInt64(&s.eventsTotal)
}

func (s *State) addEvents(n int64) {
	atomic.AddInt64(&s.eventsTotal, n)
}

func (s *State) update(pollAt time.Time, err error) {
	s.mu.Lock()
	s.LastPollAt = pollAt
	s.LastPollError = err
	s.mu.Unlock()
}

func (s *State) Read() (lastPollAt time.Time, lastErr error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.LastPollAt, s.LastPollError
}

// Poller consulta Keycloak Admin API cada `interval` y persiste los eventos.
type Poller struct {
	repo     *repository.SesionesRepo
	kcClient *keycloak.AdminClient
	realm    string
	interval time.Duration
	State    *State

	lastTSMu sync.Mutex
	lastTS   time.Time // cursor de la última marca procesada
}

func New(
	repo *repository.SesionesRepo,
	kcClient *keycloak.AdminClient,
	realm string,
	intervalSeconds int,
) *Poller {
	return &Poller{
		repo:     repo,
		kcClient: kcClient,
		realm:    realm,
		interval: time.Duration(intervalSeconds) * time.Second,
		State:    NewState(intervalSeconds),
	}
}

// Run inicia el bucle de polling. Bloquea hasta que ctx sea cancelado.
func (p *Poller) Run(ctx context.Context) {
	// Inicializar cursor desde la BD al arrancar
	if ts, ok, err := p.repo.GetMaxTimestamp(ctx); err != nil {
		log.Warn().Err(err).Msg("poller: no se pudo leer MAX timestamp; arrancando desde hace 1 hora")
		p.setLastTS(time.Now().Add(-1 * time.Hour))
	} else if ok {
		log.Info().Time("last_ts", ts).Msg("poller: cursor inicializado desde BD")
		p.setLastTS(ts)
	} else {
		log.Info().Msg("poller: tabla vacía, arrancando desde hace 1 hora")
		p.setLastTS(time.Now().Add(-1 * time.Hour))
	}

	// Primer ciclo inmediato
	p.runOnce(ctx)

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.runOnce(ctx)
		}
	}
}

func (p *Poller) runOnce(ctx context.Context) {
	now := time.Now()

	// Ventana de solapamiento de -1 minuto para eventos desordenados
	lastTS := p.getLastTS()
	dateFrom := lastTS.Add(-1 * time.Minute)

	// Keycloak espera milisegundos Unix en dateFrom
	dateFromMs := dateFrom.UnixMilli()

	events, err := p.kcClient.FetchEvents(ctx, dateFromMs, eventTypes, 200)
	if err != nil {
		log.Warn().Err(err).Msg("poller: error obteniendo eventos de Keycloak")
		p.State.update(now, err)
		return
	}

	// Convertir user events
	sesiones := make([]domain.SesionAuditoria, 0, len(events))
	var maxTS time.Time

	for _, ev := range events {
		ts := time.UnixMilli(ev.Time).UTC()

		username := ""
		if u, ok := ev.Details["username"].(string); ok {
			username = u
		}

		detalle := sanitizeDetails(ev.Details)

		s := domain.SesionAuditoria{
			KeycloakEventID: ev.ID,
			TipoEvento:      ev.Type,
			UsuarioID:       ev.UserID,
			Username:        username,
			Realm:           p.realm,
			ClientID:        ev.ClientID,
			SesionID:        ev.SessionID,
			IPAddress:       ev.IPAddress,
			Detalle:         detalle,
			EventoTimestamp: ts,
		}
		sesiones = append(sesiones, s)

		if ts.After(maxTS) {
			maxTS = ts
		}
	}

	// Obtener admin events (CREATE/UPDATE/DELETE de USER y REALM_ROLE_MAPPING)
	adminEvents, err := p.kcClient.FetchAdminEvents(ctx, dateFromMs, adminOperationTypes, adminResourceTypes, 200)
	if err != nil {
		log.Warn().Err(err).Msg("poller: error obteniendo admin-events de Keycloak")
	} else {
		for _, ae := range adminEvents {
			ts := time.UnixMilli(ae.Time).UTC()
			tipoEvento := ae.OperationType + "_" + ae.ResourceType

			eventID := fmt.Sprintf("admin-%s-%d-%s", ae.AuthDetails.UserID, ae.Time, ae.ResourcePath)

			s := domain.SesionAuditoria{
				KeycloakEventID: eventID,
				TipoEvento:      tipoEvento,
				UsuarioID:       ae.AuthDetails.UserID,
				Realm:           p.realm,
				ClientID:        ae.AuthDetails.ClientID,
				IPAddress:       ae.AuthDetails.IPAddress,
				EventoTimestamp: ts,
			}
			sesiones = append(sesiones, s)

			if ts.After(maxTS) {
				maxTS = ts
			}
		}
	}

	if len(sesiones) == 0 {
		p.State.update(now, nil)
		metrics.PollerLastPollTimestamp.SetToCurrentTime()
		return
	}

	// Resolver usernames faltantes para LOGOUT (KC no los incluye en details).
	// Buscamos en la BD por los usuario_id que no tengan username todavía.
	var missingIDs []string
	for _, s := range sesiones {
		if s.Username == "" && s.UsuarioID != "" {
			missingIDs = append(missingIDs, s.UsuarioID)
		}
	}
	if len(missingIDs) > 0 {
		if unames, err := p.repo.GetUsernamesByUserIDs(ctx, missingIDs); err != nil {
			log.Warn().Err(err).Msg("poller: no se pudieron resolver usernames faltantes")
		} else {
			for i := range sesiones {
				if sesiones[i].Username == "" {
					if uname, ok := unames[sesiones[i].UsuarioID]; ok {
						sesiones[i].Username = uname
					}
				}
			}
		}
	}

	inserted, err := p.repo.InsertBatch(ctx, sesiones)
	if err != nil {
		log.Warn().Err(err).Msg("poller: error insertando batch de eventos")
		p.State.update(now, err)
		return
	}

	if inserted > 0 {
		p.State.addEvents(inserted)
		metrics.PollerEventsInsertedTotal.Add(float64(inserted))
		log.Debug().Int64("inserted", inserted).Int("fetched", len(events)).Msg("poller: ciclo completado")
	}

	// Avanzar cursor solo si recibimos eventos
	if !maxTS.IsZero() && maxTS.After(lastTS) {
		p.setLastTS(maxTS)
	}

	p.State.update(now, nil)
	metrics.PollerLastPollTimestamp.SetToCurrentTime()
}

func (p *Poller) getLastTS() time.Time {
	p.lastTSMu.Lock()
	defer p.lastTSMu.Unlock()
	return p.lastTS
}

func (p *Poller) setLastTS(ts time.Time) {
	p.lastTSMu.Lock()
	defer p.lastTSMu.Unlock()
	p.lastTS = ts
}

// sanitizeDetails elimina campos sensibles del mapa de detalles (P-04).
func sanitizeDetails(details map[string]interface{}) json.RawMessage {
	if len(details) == 0 {
		return nil
	}
	clean := make(map[string]interface{}, len(details))
	for k, v := range details {
		if !sensitiveKeys[k] {
			clean[k] = v
		}
	}
	if len(clean) == 0 {
		return nil
	}
	b, err := json.Marshal(clean)
	if err != nil {
		return nil
	}
	return json.RawMessage(b)
}
