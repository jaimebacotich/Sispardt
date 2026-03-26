-- ============================================================
-- SISPARDT - BD Establecimientos
-- 08: Migración tabla personal — nombres/apellidos + usuario_sistema
-- Ejecutar UNA sola vez sobre una BD ya existente.
-- Para instalaciones nuevas usar 01-esquema.sql actualizado.
-- ============================================================

-- 1. Agregar nuevas columnas (idempotente vía IF NOT EXISTS)
ALTER TABLE public.personal
    ADD COLUMN IF NOT EXISTS nombres          varchar(60),
    ADD COLUMN IF NOT EXISTS apellidos        varchar(60),
    ADD COLUMN IF NOT EXISTS usuario_sistema  boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS keycloak_user_id uuid;

-- 2. Poblar nombres/apellidos desde nombre_completo existente
--    Primer token = nombres, el resto = apellidos
UPDATE public.personal
SET
    nombres  = TRIM(SPLIT_PART(nombre_completo, ' ', 1)),
    apellidos = TRIM(SUBSTRING(nombre_completo FROM POSITION(' ' IN nombre_completo) + 1))
WHERE nombres IS NULL OR nombres = '';

-- 3. Establecer NOT NULL ahora que los datos están poblados
ALTER TABLE public.personal
    ALTER COLUMN nombres   SET NOT NULL,
    ALTER COLUMN nombres   SET DEFAULT '',
    ALTER COLUMN apellidos SET NOT NULL,
    ALTER COLUMN apellidos SET DEFAULT '';

-- 4. Eliminar la columna nombre_completo (se reemplaza por columna generada)
ALTER TABLE public.personal DROP COLUMN IF EXISTS nombre_completo;

-- 5. Agregar nombre_completo como columna GENERATED (computed)
ALTER TABLE public.personal
    ADD COLUMN nombre_completo varchar(121)
        GENERATED ALWAYS AS (nombres || ' ' || apellidos) STORED;

-- 6. Índice para buscar por nombre generado
CREATE INDEX IF NOT EXISTS idx_personal_nombre_completo
    ON public.personal USING btree (nombre_completo)
    WHERE eliminado_at IS NULL;
