package poller

import (
	"context"
	"encoding/json"
	"sync"
	"sync/atomic"
	"time"

	"github.com/rs/zerolog/log"

	"sispardt/sistema/internal/domain"
	"sispardt/sistema/internal/keycloak"
	"sispardt/sistema/internal/metrics"
	"sispardt/sistema/internal/repository"
)

// Campos JSONB sensibles que NO deben persistirse (P-04).
var sensitiveKeys = map[string]bool{
	"code":          true,
	"token":         true,
	"refresh_token": true,
	"session_note":  true,
}

// Tipos de eventos que se capturan (v1).
var eventTypes = []string{"LOGIN", "LOGOUT", "LOGIN_ERROR"}

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

// rolKCaDB mapea roles de Keycloak a nombres en la tabla roles de la BD.
// Solo incluye los roles del sistema institucional que deben sincronizarse.
var rolKCaDB = map[string]string{
	"admin_general":        "rol_admin_general",
	"responsable_registro": "rol_responsable_registro",
	"tecnico_registro":     "rol_tecnico_registro",
}

const instUUID = "11111111-1111-1111-1111-111111111111"

// Poller consulta Keycloak Admin API cada `interval` y persiste los eventos.
type Poller struct {
	repo         *repository.SesionesRepo
	usuariosRepo *repository.UsuarioSistemaRepo
	kcClient     *keycloak.AdminClient
	realm        string
	interval     time.Duration
	State        *State

	lastTSMu sync.Mutex
	lastTS   time.Time // cursor de la última marca procesada
	syncDone bool      // true cuando la sincronización inicial KC→DB completó
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

// SetUsuariosRepo habilita la sincronización KC→DB de usuarios del sistema.
func (p *Poller) SetUsuariosRepo(repo *repository.UsuarioSistemaRepo) {
	p.usuariosRepo = repo
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
	if p.usuariosRepo != nil && !p.syncDone {
		p.syncUsuariosDesdeKeycloak(ctx)
	}

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

	if len(events) == 0 {
		p.State.update(now, nil)
		metrics.PollerLastPollTimestamp.SetToCurrentTime()
		return
	}

	// Convertir y sanitizar
	sesiones := make([]domain.SesionAuditoria, 0, len(events))
	var maxTS time.Time

	for _, ev := range events {
		ts := time.UnixMilli(ev.Time).UTC()

		// Extraer username del mapa details ANTES de sanitizar (está disponible en LOGIN/LOGIN_ERROR)
		username := ""
		if u, ok := ev.Details["username"].(string); ok {
			username = u
		}

		// Sanitizar detalle JSONB (P-04): eliminar campos sensibles
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

// syncUsuariosDesdeKeycloak sincroniza los usuarios institucionales de Keycloak
// a la tabla usuarios_sistema. Se ejecuta en cada tick hasta que tenga éxito.
func (p *Poller) syncUsuariosDesdeKeycloak(ctx context.Context) {
	users, err := p.kcClient.ListUsers(ctx)
	if err != nil {
		log.Warn().Err(err).Msg("poller: sync usuarios KC→DB: error listando usuarios")
		return
	}

	found := 0
	inserted := 0
	for _, u := range users {
		if !u.Enabled {
			continue
		}
		estID := ""
		if vals, ok := u.Attributes["establecimiento_id"]; ok && len(vals) > 0 {
			estID = vals[0]
		}
		if estID != instUUID {
			continue
		}

		roles, err := p.kcClient.FetchUserRoles(ctx, u.ID)
		if err != nil {
			log.Warn().Err(err).Str("user", u.Username).Msg("poller: sync: no se pudieron obtener roles")
			continue
		}

		dbRol := ""
		for _, r := range roles {
			if mapped, ok := rolKCaDB[r]; ok {
				dbRol = mapped
				break
			}
		}
		if dbRol == "" {
			continue
		}

		found++
		ok, err := p.usuariosRepo.SyncUsuario(ctx, u.ID, u.Username, u.FirstName, u.LastName, dbRol)
		if err != nil {
			log.Warn().Err(err).Str("user", u.Username).Msg("poller: sync: error insertando usuario")
			continue
		}
		if ok {
			inserted++
			log.Info().Str("username", u.Username).Str("rol", dbRol).Msg("poller: usuario sincronizado desde Keycloak")
		}
	}

	if found > 0 {
		log.Info().Int("encontrados", found).Int("insertados", inserted).Msg("poller: sync KC→DB completado")
		p.syncDone = true
	}
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
