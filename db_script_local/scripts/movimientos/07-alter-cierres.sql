-- Migración: agrega columnas a cierres_diarios para totalizar checkins/checkouts y condicion_entrega.
-- Ejecutar solo si la tabla ya existe (instalaciones previas).

ALTER TABLE public.cierres_diarios
    ADD COLUMN IF NOT EXISTS total_checkins    integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_checkouts   integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS condicion_entrega text    NOT NULL DEFAULT 'DENTRO_PLAZO';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chk_condicion_entrega_cierre'
          AND table_name = 'cierres_diarios'
    ) THEN
        ALTER TABLE public.cierres_diarios
            ADD CONSTRAINT chk_condicion_entrega_cierre
            CHECK (condicion_entrega IN ('DENTRO_PLAZO', 'FUERA_PLAZO'));
    END IF;
END $$;
