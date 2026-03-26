package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/rs/zerolog/log"
	kafka "github.com/segmentio/kafka-go"

	"sispardt/kafka-consumer/internal/models"
	"sispardt/kafka-consumer/internal/repository"
)

// epochDate convierte días desde 1970-01-01 (formato Debezium para tipo `date`) a string YYYY-MM-DD.
func epochDate(days int32) string {
	return time.Unix(0, 0).UTC().AddDate(0, 0, int(days)).Format("2006-01-02")
}

var managedTopics = []string{
	"sispardt.public.paises",
	"sispardt.public.divisiones_principales",
	"sispardt.public.divisiones_secundarias",
	"sispardt.public.localidades",
	"sispardt.public.establecimientos",
	"sispardt.public.tipo_habitaciones",
	"sispardt.public.tipo_camas",
	"sispardt.public.habitaciones",
	"sispardt.public.habitacion_camas",
}

type Consumer struct {
	reader           *kafka.Reader
	repo             *repository.ReplicaRepo
	tiposHab         map[int]string // id → nombre, cache en memoria
	tiposCama        map[int]int    // id → capacidad_personas, cache en memoria
	pendingCapacidad map[string]int // habitacion_id → delta acumulado pendiente
}

func New(brokers []string, groupID string, repo *repository.ReplicaRepo) *Consumer {
	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:               brokers,
		GroupID:               groupID,
		GroupTopics:           managedTopics,
		MinBytes:              1e3,
		MaxBytes:              10e6,
		CommitInterval:        time.Second,
		MaxAttempts:           5,
		StartOffset:           kafka.FirstOffset,
		ReadLagInterval:       -1,
		WatchPartitionChanges: true,
	})
	return &Consumer{reader: r, repo: repo, tiposHab: make(map[int]string), tiposCama: make(map[int]int), pendingCapacidad: make(map[string]int)}
}

func (c *Consumer) Run(ctx context.Context) error {
	log.Info().Strs("topics", managedTopics).Msg("consumer iniciado")

	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil
			}
			log.Error().Err(err).Msg("error leyendo mensaje Kafka — reintentando en 3s")
			time.Sleep(3 * time.Second)
			continue
		}

		if err := c.handle(ctx, msg); err != nil {
			log.Error().Err(err).
				Str("topic", msg.Topic).
				Int64("offset", msg.Offset).
				Msg("error procesando mensaje — ignorando y continuando")
		}

		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			log.Warn().Err(err).Msg("error al commitear offset")
		}
	}
}

func (c *Consumer) Close() error {
	return c.reader.Close()
}

func (c *Consumer) Stats() kafka.ReaderStats {
	return c.reader.Stats()
}

func (c *Consumer) handle(ctx context.Context, msg kafka.Message) error {
	if len(msg.Value) == 0 {
		return nil
	}

	env, err := ParseEnvelope(msg.Value)
	if err != nil {
		return fmt.Errorf("parsear envelope [%s]: %w", msg.Topic, err)
	}
	if env == nil {
		return nil
	}

	activeRaw := env.After
	if env.Op == OpDelete {
		activeRaw = env.Before
	}

	switch msg.Topic {
	case "sispardt.public.paises":
		return c.handlePais(ctx, env.Op, activeRaw)
	case "sispardt.public.divisiones_principales":
		return c.handleDivisionPrincipal(ctx, env.Op, activeRaw)
	case "sispardt.public.divisiones_secundarias":
		return c.handleDivisionSecundaria(ctx, env.Op, activeRaw)
	case "sispardt.public.localidades":
		return c.handleLocalidad(ctx, env.Op, activeRaw)
	case "sispardt.public.establecimientos":
		return c.handleEstablecimiento(ctx, env.Op, activeRaw)
	case "sispardt.public.tipo_habitaciones":
		return c.handleTipoHabitacion(ctx, env.Op, activeRaw)
	case "sispardt.public.tipo_camas":
		return c.handleTipoCama(env.Op, activeRaw)
	case "sispardt.public.habitaciones":
		return c.handleHabitacion(ctx, env.Op, activeRaw)
	case "sispardt.public.habitacion_camas":
		return c.handleHabitacionCama(ctx, env.Op, env.Before, env.After)
	default:
		return nil
	}
}

func (c *Consumer) handlePais(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalPais(raw)
	if err != nil || rec == nil {
		return err
	}
	if op == OpDelete {
		return c.repo.DeletePais(ctx, rec.ID)
	}
	return c.repo.UpsertPais(ctx, rec)
}

func (c *Consumer) handleDivisionPrincipal(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalDivisionPrincipal(raw)
	if err != nil || rec == nil {
		return err
	}
	return c.repo.UpsertDivisionPrincipal(ctx, rec)
}

func (c *Consumer) handleDivisionSecundaria(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalDivisionSecundaria(raw)
	if err != nil || rec == nil {
		return err
	}
	return c.repo.UpsertDivisionSecundaria(ctx, rec)
}

func (c *Consumer) handleLocalidad(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalLocalidad(raw)
	if err != nil || rec == nil {
		return err
	}
	return c.repo.UpsertLocalidad(ctx, rec)
}

func (c *Consumer) handleEstablecimiento(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalEstablecimiento(raw)
	if err != nil || rec == nil {
		return err
	}
	// Eliminados o sin fecha: ignorar (no afecta las fechas pendientes existentes)
	if op == OpDelete || rec.EliminadoAt != nil || rec.FechaInicioOperaciones == nil {
		return nil
	}
	fecha := epochDate(*rec.FechaInicioOperaciones)
	return c.repo.UpsertEstablecimientoReplica(ctx, rec.ID, fecha)
}

func (c *Consumer) handleTipoHabitacion(ctx context.Context, op string, raw json.RawMessage) error {
	var rec struct {
		ID          int    `json:"id"`
		Nombre      string `json:"nombre"`
		EliminadoAt *int64 `json:"eliminado_at"`
	}
	if err := json.Unmarshal(raw, &rec); err != nil {
		return err
	}
	if op == OpDelete || rec.EliminadoAt != nil {
		delete(c.tiposHab, rec.ID)
	} else {
		c.tiposHab[rec.ID] = rec.Nombre
		// Backfillear habitaciones que llegaron antes que este evento de tipo
		if err := c.repo.BackfillTipoHabitacion(ctx, rec.ID, rec.Nombre); err != nil {
			log.Warn().Err(err).Int("tipo_id", rec.ID).Msg("backfill tipo_habitacion falló (no crítico)")
		}
	}
	return nil
}

func (c *Consumer) handleTipoCama(op string, raw json.RawMessage) error {
	var rec struct {
		ID                int    `json:"id"`
		CapacidadPersonas int    `json:"capacidad_personas"`
		EliminadoAt       *int64 `json:"eliminado_at"`
	}
	if err := json.Unmarshal(raw, &rec); err != nil {
		return err
	}
	if op == OpDelete || rec.EliminadoAt != nil {
		delete(c.tiposCama, rec.ID)
	} else {
		c.tiposCama[rec.ID] = rec.CapacidadPersonas
	}
	return nil
}

func (c *Consumer) handleHabitacion(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalHabitacion(raw)
	if err != nil || rec == nil {
		return err
	}
	if op == OpDelete || rec.EliminadoAt != nil {
		return c.repo.UpsertHabitacion(ctx, rec, "desconocido", 0)
	}
	tipoNombre := "desconocido"
	if rec.TipoHabitacionID != nil {
		if nombre, ok := c.tiposHab[*rec.TipoHabitacionID]; ok {
			tipoNombre = nombre
		}
	}
	if err := c.repo.UpsertHabitacion(ctx, rec, tipoNombre, 0); err != nil {
		return err
	}
	// Aplicar delta de capacidad pendiente (race condition: camas llegaron antes que la habitación)
	if delta, ok := c.pendingCapacidad[rec.ID]; ok && delta > 0 {
		if err := c.repo.SetCapacidadHabitacion(ctx, rec.ID, delta); err != nil {
			return err
		}
		delete(c.pendingCapacidad, rec.ID)
	}
	return nil
}

func (c *Consumer) handleHabitacionCama(ctx context.Context, op string, before, after json.RawMessage) error {
	var afterRec, beforeRec *models.HabitacionCamaRecord
	var err error

	if len(after) > 0 && string(after) != "null" {
		afterRec, err = models.UnmarshalHabitacionCama(after)
		if err != nil {
			return err
		}
	}
	if len(before) > 0 && string(before) != "null" {
		beforeRec, err = models.UnmarshalHabitacionCama(before)
		if err != nil {
			return err
		}
	}

	var habitacionID string
	var delta int

	// capacidadPorCama devuelve capacidad_personas del tipo, o 1 si no está en cache
	capacidadPorCama := func(tipoCamaID int) int {
		if cap, ok := c.tiposCama[tipoCamaID]; ok && cap > 0 {
			return cap
		}
		return 1
	}

	switch op {
	case OpCreate, OpRead:
		if afterRec != nil {
			habitacionID = afterRec.HabitacionID
			delta = afterRec.Cantidad * capacidadPorCama(afterRec.TipoCamaID)
		}
	case OpUpdate:
		if afterRec != nil && beforeRec != nil {
			habitacionID = afterRec.HabitacionID
			if afterRec.EliminadoAt != nil && beforeRec.EliminadoAt == nil {
				// soft-delete: restar capacidad anterior
				delta = -(beforeRec.Cantidad * capacidadPorCama(beforeRec.TipoCamaID))
			} else if afterRec.EliminadoAt == nil && beforeRec.EliminadoAt != nil {
				// restauración: sumar capacidad nueva
				delta = afterRec.Cantidad * capacidadPorCama(afterRec.TipoCamaID)
			} else {
				// actualización normal: diferencia neta
				delta = afterRec.Cantidad*capacidadPorCama(afterRec.TipoCamaID) -
					beforeRec.Cantidad*capacidadPorCama(beforeRec.TipoCamaID)
			}
		}
	case OpDelete:
		if beforeRec != nil {
			habitacionID = beforeRec.HabitacionID
			delta = -(beforeRec.Cantidad * capacidadPorCama(beforeRec.TipoCamaID))
		}
	}

	if habitacionID == "" || delta == 0 {
		return nil
	}

	actual, err := c.repo.GetCapacidadActual(ctx, habitacionID)
	if err != nil {
		// Habitación aún no en cache (race condition snapshot): acumular delta para aplicar luego
		c.pendingCapacidad[habitacionID] += delta
		return nil
	}

	nueva := actual + delta
	if nueva < 0 {
		nueva = 0
	}
	return c.repo.SetCapacidadHabitacion(ctx, habitacionID, nueva)
}

func safeInt(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}
