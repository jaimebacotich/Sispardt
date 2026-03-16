-- ============================================
-- SISPARDT - BD Establecimientos
-- 02: Roles de Base de Datos y Permisos
-- ============================================

-- Crear roles de base de datos
DO $$
BEGIN
    -- Admin General (solo lectura total)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_admin_general') THEN
        CREATE ROLE rol_admin_general NOLOGIN;
    END IF;

    -- Responsable de Registro (CRUD inventario)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_responsable_registro') THEN
        CREATE ROLE rol_responsable_registro NOLOGIN;
    END IF;

    -- Tecnico de Registro (CRUD limitado)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_tecnico_registro') THEN
        CREATE ROLE rol_tecnico_registro NOLOGIN;
    END IF;

    -- Responsable de Estadistica (lectura global)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_responsable_estadistica') THEN
        CREATE ROLE rol_responsable_estadistica NOLOGIN;
    END IF;

    -- Recepcionista (solo su establecimiento, solo lectura en esta BD)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_recepcionista') THEN
        CREATE ROLE rol_recepcionista NOLOGIN;
    END IF;

    -- Migraciones (lectura global)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_migraciones') THEN
        CREATE ROLE rol_migraciones NOLOGIN;
    END IF;

    -- Estadistica Externa (solo vistas agregadas)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_estadistica_externa') THEN
        CREATE ROLE rol_estadistica_externa NOLOGIN;
    END IF;
END
$$;

-- ============================================
-- PERMISOS: Admin General (lectura total)
-- ============================================
GRANT SELECT ON TABLE public.clasificaciones TO rol_admin_general;
GRANT SELECT ON TABLE public.categorias TO rol_admin_general;
GRANT SELECT ON TABLE public.paises TO rol_admin_general;
GRANT SELECT ON TABLE public.divisiones_principales TO rol_admin_general;
GRANT SELECT ON TABLE public.divisiones_secundarias TO rol_admin_general;
GRANT SELECT ON TABLE public.localidades TO rol_admin_general;
GRANT SELECT ON TABLE public.establecimientos TO rol_admin_general;
GRANT SELECT ON TABLE public.tipo_habitaciones TO rol_admin_general;
GRANT SELECT ON TABLE public.tipo_camas TO rol_admin_general;
GRANT SELECT ON TABLE public.habitaciones TO rol_admin_general;
GRANT SELECT ON TABLE public.habitacion_camas TO rol_admin_general;
GRANT SELECT ON TABLE public.tipo_personal TO rol_admin_general;
GRANT SELECT ON TABLE public.personal TO rol_admin_general;
GRANT SELECT ON TABLE public.servicios TO rol_admin_general;
GRANT SELECT ON TABLE public.establecimiento_servicios TO rol_admin_general;
GRANT SELECT ON TABLE public.auditoria_transacciones TO rol_admin_general;

-- Permitir a casi todos insertar en la tabla de auditoría porque el trigger lo requiere
GRANT INSERT ON TABLE public.auditoria_transacciones TO rol_responsable_registro, rol_tecnico_registro;
-- Lectura de auditoría para responsable de registro
GRANT SELECT ON TABLE public.auditoria_transacciones TO rol_responsable_registro;

-- ============================================
-- PERMISOS: Responsable de Registro (CRUD catalogos + inventario)
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clasificaciones TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categorias TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.servicios TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tipo_habitaciones TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tipo_camas TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tipo_personal TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.paises TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.divisiones_principales TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.divisiones_secundarias TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.localidades TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.establecimientos TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habitaciones TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habitacion_camas TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal TO rol_responsable_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.establecimiento_servicios TO rol_responsable_registro;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO rol_responsable_registro;

-- ============================================
-- PERMISOS: Tecnico de Registro (sin catalogos globales)
-- ============================================
-- Lectura de catalogos
GRANT SELECT ON TABLE public.clasificaciones TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.categorias TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.servicios TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.tipo_habitaciones TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.tipo_camas TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.tipo_personal TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.paises TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.divisiones_principales TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.divisiones_secundarias TO rol_tecnico_registro;
GRANT SELECT ON TABLE public.localidades TO rol_tecnico_registro;
-- CRUD en inventario operativo
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.establecimientos TO rol_tecnico_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habitaciones TO rol_tecnico_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.habitacion_camas TO rol_tecnico_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personal TO rol_tecnico_registro;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.establecimiento_servicios TO rol_tecnico_registro;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO rol_tecnico_registro;

-- ============================================
-- PERMISOS: Responsable de Estadistica (lectura global)
-- ============================================
GRANT SELECT ON TABLE public.clasificaciones TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.categorias TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.paises TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.divisiones_principales TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.divisiones_secundarias TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.localidades TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.establecimientos TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.tipo_habitaciones TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.tipo_camas TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.habitaciones TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.habitacion_camas TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.servicios TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.establecimiento_servicios TO rol_responsable_estadistica;

-- ============================================
-- PERMISOS: Recepcionista (lectura limitada en esta BD)
-- ============================================
GRANT SELECT ON TABLE public.tipo_habitaciones TO rol_recepcionista;
GRANT SELECT ON TABLE public.tipo_camas TO rol_recepcionista;
GRANT SELECT ON TABLE public.servicios TO rol_recepcionista;

-- ============================================
-- PERMISOS: Migraciones (lectura global)
-- ============================================
GRANT SELECT ON TABLE public.establecimientos TO rol_migraciones;
GRANT SELECT ON TABLE public.localidades TO rol_migraciones;
GRANT SELECT ON TABLE public.divisiones_principales TO rol_migraciones;
GRANT SELECT ON TABLE public.divisiones_secundarias TO rol_migraciones;
GRANT SELECT ON TABLE public.paises TO rol_migraciones;

-- ============================================
-- PERMISOS: Estadistica Externa (solo lecturas basicas, sin detalles)
-- ============================================
GRANT SELECT ON TABLE public.establecimientos TO rol_estadistica_externa;
GRANT SELECT ON TABLE public.localidades TO rol_estadistica_externa;
GRANT SELECT ON TABLE public.categorias TO rol_estadistica_externa;
GRANT SELECT ON TABLE public.clasificaciones TO rol_estadistica_externa;

-- ============================================
-- RLS: Habitaciones - Admin puede ver todo
-- ============================================
CREATE POLICY admin_ver_todo ON public.habitaciones FOR SELECT TO rol_admin_general USING (true);
