-- ============================================================
-- SISPARDT - BD Sistema
-- 04: Roles de Base de Datos y Permisos
-- ============================================================

-- Rol de aplicación (sin login)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_sistema') THEN
        CREATE ROLE rol_sistema NOLOGIN;
    END IF;
END
$$;

-- Permisos sobre sesiones_auditoria: solo SELECT e INSERT (inmutable)
GRANT USAGE ON SCHEMA public TO rol_sistema;
GRANT SELECT, INSERT ON TABLE public.sesiones_auditoria TO rol_sistema;

-- Permisos sobre tablas de usuarios: SELECT, INSERT, UPDATE (sin DELETE físico)
GRANT SELECT, INSERT, UPDATE ON TABLE public.usuarios_sistema TO rol_sistema;
GRANT SELECT, INSERT, UPDATE ON TABLE public.usuarios_roles TO rol_sistema;
GRANT SELECT ON TABLE public.roles TO rol_sistema;
GRANT USAGE, SELECT ON SEQUENCE public.roles_id_seq TO rol_sistema;
