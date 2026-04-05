-- ============================================
-- SISPARDT - BD Movimientos
-- 05: Crear tabla establecimientos_replica_cache
-- Ejecutar una sola vez en entornos existentes.
-- ============================================

CREATE TABLE IF NOT EXISTS public.establecimientos_replica_cache (
    establecimiento_id uuid PRIMARY KEY,
    fecha_inicio_operaciones date NOT NULL,
    actualizado_at timestamptz DEFAULT NOW() NOT NULL
);
-- Los GRANTs se aplican en init-movimientos.sh después de crear los usuarios.
