-- ============================================================
-- Migración: agregar tipo_habitacion_id a habitaciones_replica_cache
-- Permite al kafka-consumer backfillear tipo_habitacion cuando
-- llegan eventos de tipo_habitaciones después de habitaciones
-- (race condition de startup).
-- ============================================================

ALTER TABLE public.habitaciones_replica_cache
    ADD COLUMN IF NOT EXISTS tipo_habitacion_id integer;
