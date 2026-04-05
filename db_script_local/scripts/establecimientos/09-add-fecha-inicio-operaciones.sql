-- ============================================
-- SISPARDT - BD Establecimientos
-- 09: Añadir fecha_inicio_operaciones a establecimientos
-- Ejecutar una sola vez en entornos existentes.
-- ============================================

ALTER TABLE public.establecimientos
    ADD COLUMN IF NOT EXISTS fecha_inicio_operaciones date NOT NULL DEFAULT CURRENT_DATE;
