-- ============================================================
-- Migración: snapshot de usuario en partes_diarios y cierres_diarios
-- Agrega username, nombre y apellido del recepcionista/cerrador
-- para fines de auditoría y trazabilidad (DevSecOps).
-- ============================================================

ALTER TABLE public.partes_diarios
    ADD COLUMN IF NOT EXISTS recepcionista_username  character varying(100),
    ADD COLUMN IF NOT EXISTS recepcionista_nombre    character varying(100),
    ADD COLUMN IF NOT EXISTS recepcionista_apellido  character varying(100);

ALTER TABLE public.cierres_diarios
    ADD COLUMN IF NOT EXISTS cerrado_por_username  character varying(100),
    ADD COLUMN IF NOT EXISTS cerrado_por_nombre    character varying(100),
    ADD COLUMN IF NOT EXISTS cerrado_por_apellido  character varying(100);
