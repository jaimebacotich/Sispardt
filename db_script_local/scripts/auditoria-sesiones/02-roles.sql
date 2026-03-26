-- ============================================================
-- SISPARDT - BD Auditoria Sesiones
-- 02: Roles de Base de Datos y Permisos
-- ============================================================

-- Crear rol de aplicación (sin login — el usuario de login se crea en el init script)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_auditoria_sesiones') THEN
        CREATE ROLE rol_auditoria_sesiones NOLOGIN;
    END IF;
END
$$;

-- ============================================================
-- PERMISOS: rol_auditoria_sesiones
-- Solo SELECT e INSERT — sin UPDATE, DELETE ni TRUNCATE
-- Los triggers de inmutabilidad refuerzan esto a nivel de BD
-- ============================================================
GRANT USAGE ON SCHEMA public TO rol_auditoria_sesiones;
GRANT SELECT, INSERT ON TABLE public.sesiones_auditoria TO rol_auditoria_sesiones;
