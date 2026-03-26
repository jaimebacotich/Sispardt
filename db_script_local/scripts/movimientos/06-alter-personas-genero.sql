-- ============================================
-- SISPARDT - BD Movimientos
-- 06: Migracion — agregar columna genero a personas
-- ============================================

ALTER TABLE public.personas
    ADD COLUMN IF NOT EXISTS genero character varying(10)
    CONSTRAINT chk_genero CHECK (genero IN ('M', 'F', 'OTRO'));

COMMENT ON COLUMN public.personas.genero IS 'Genero del huesped: M=Masculino, F=Femenino, OTRO';
