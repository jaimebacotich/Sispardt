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

var managedTopics = []string{
	"sispardt.public.paises",
	"sispardt.public.divisiones_principales",
	"sispardt.public.divisiones_secundarias",
	"sispardt.public.localidades",
	"sispardt.public.habitaciones",
	"sispardt.public.habitacion_camas",
}

type Consumer struct {
	reader *kafka.Reader
	repo   *repository.ReplicaRepo
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
	return &Consumer{reader: r, repo: repo}
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

func (c *Consumer) handleHabitacion(ctx context.Context, op string, raw json.RawMessage) error {
	rec, err := models.UnmarshalHabitacion(raw)
	if err != nil || rec == nil {
		return err
	}
	if op == OpDelete || rec.EliminadoAt != nil {
		return c.repo.UpsertHabitacion(ctx, rec, "desconocido", 0)
	}
	tipoNombre := fmt.Sprintf("tipo_%d", safeInt(rec.TipoHabitacionID))
	return c.repo.UpsertHabitacion(ctx, rec, tipoNombre, 0)
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

	switch op {
	case OpCreate, OpRead:
		if afterRec != nil {
			habitacionID = afterRec.HabitacionID
			delta = afterRec.Cantidad
		}
	case OpUpdate:
		if afterRec != nil && beforeRec != nil {
			habitacionID = afterRec.HabitacionID
			if afterRec.EliminadoAt != nil && beforeRec.EliminadoAt == nil {
				delta = -beforeRec.Cantidad
			} else if afterRec.EliminadoAt == nil && beforeRec.EliminadoAt != nil {
				delta = afterRec.Cantidad
			} else {
				delta = afterRec.Cantidad - beforeRec.Cantidad
			}
		}
	case OpDelete:
		if beforeRec != nil {
			habitacionID = beforeRec.HabitacionID
			delta = -beforeRec.Cantidad
		}
	}

	if habitacionID == "" || delta == 0 {
		return nil
	}

	actual, err := c.repo.GetCapacidadActual(ctx, habitacionID)
	if err != nil {
		log.Warn().Err(err).Str("habitacion_id", habitacionID).
			Msg("habitación no encontrada en cache — ignorando actualización de capacidad")
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
