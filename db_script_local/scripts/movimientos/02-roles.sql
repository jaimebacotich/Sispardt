-- ============================================
-- SISPARDT - BD Movimientos
-- 02: Roles de Base de Datos y Permisos
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_admin_general') THEN CREATE ROLE rol_admin_general NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_responsable_registro') THEN CREATE ROLE rol_responsable_registro NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_tecnico_registro') THEN CREATE ROLE rol_tecnico_registro NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_responsable_estadistica') THEN CREATE ROLE rol_responsable_estadistica NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_recepcionista') THEN CREATE ROLE rol_recepcionista NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_migraciones') THEN CREATE ROLE rol_migraciones NOLOGIN; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'rol_estadistica_externa') THEN CREATE ROLE rol_estadistica_externa NOLOGIN; END IF;
END$$;

-- ============================================
-- Admin General: lectura total, no modifica partes ni cierra dia
-- ============================================
GRANT SELECT ON TABLE public.auditoria_transacciones TO rol_admin_general;
GRANT SELECT ON TABLE public.partes_diarios TO rol_admin_general;
GRANT SELECT ON TABLE public.cierres_diarios TO rol_admin_general;
GRANT SELECT ON TABLE public.personas TO rol_admin_general;
GRANT SELECT ON TABLE public.tipos_documento TO rol_admin_general;
GRANT SELECT ON TABLE public.motivos_viaje TO rol_admin_general;
GRANT SELECT ON TABLE public.habitaciones_replica_cache TO rol_admin_general;
GRANT SELECT ON TABLE public.paises_replica_cache TO rol_admin_general;
GRANT SELECT ON TABLE public.divisiones_principales_replica_cache TO rol_admin_general;
GRANT SELECT ON TABLE public.divisiones_secundarias_replica_cache TO rol_admin_general;
GRANT SELECT ON TABLE public.localidades_replica_cache TO rol_admin_general;
GRANT SELECT ON TABLE public.outbox_events TO rol_admin_general;

-- Permitir a los roles operativos insertar en la tabla de auditoría y usar sus secuencias
GRANT INSERT ON TABLE public.auditoria_transacciones TO rol_admin_general, rol_responsable_registro, rol_tecnico_registro, rol_recepcionista;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rol_admin_general, rol_responsable_registro, rol_tecnico_registro, rol_recepcionista;

-- ============================================
-- Responsable Registro: solo lectura en movimientos
-- ============================================
GRANT SELECT ON TABLE public.partes_diarios TO rol_responsable_registro;
GRANT SELECT ON TABLE public.cierres_diarios TO rol_responsable_registro;

-- ============================================
-- Responsable Estadistica: lectura global partes/cierres + vistas + auditoria
-- ============================================
GRANT SELECT ON TABLE public.auditoria_transacciones TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.partes_diarios TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.cierres_diarios TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.habitaciones_replica_cache TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.personas TO rol_responsable_estadistica;
-- Catálogos necesarios para queries de estadísticas
GRANT SELECT ON TABLE public.paises_replica_cache TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.motivos_viaje TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.localidades_replica_cache TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.divisiones_principales_replica_cache TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.divisiones_secundarias_replica_cache TO rol_responsable_estadistica;
GRANT SELECT ON TABLE public.tipos_documento TO rol_responsable_estadistica;
-- Vistas estadísticas (usadas por statsPool en svc-movimientos)
GRANT SELECT ON public.vw_capacidad_establecimiento TO rol_responsable_estadistica;
GRANT SELECT ON public.vw_ocupacion_diaria TO rol_responsable_estadistica;
GRANT SELECT ON public.vw_estadistica_ingresos TO rol_responsable_estadistica;
GRANT SELECT ON public.vw_estadistica_pernocte TO rol_responsable_estadistica;
GRANT SELECT ON public.vw_estadistica_consolidada TO rol_responsable_estadistica;
GRANT SELECT ON public.vw_dias_no_cerrados TO rol_responsable_estadistica;

-- ============================================
-- Recepcionista: INSERT/UPDATE partes, INSERT cierres (solo su establecimiento via RLS)
-- ============================================
GRANT SELECT, INSERT, UPDATE ON TABLE public.partes_diarios TO rol_recepcionista;
GRANT SELECT, INSERT ON TABLE public.cierres_diarios TO rol_recepcionista;
GRANT SELECT ON TABLE public.habitaciones_replica_cache TO rol_recepcionista;
GRANT SELECT ON TABLE public.paises_replica_cache TO rol_recepcionista;
GRANT SELECT ON TABLE public.divisiones_principales_replica_cache TO rol_recepcionista;
GRANT SELECT ON TABLE public.divisiones_secundarias_replica_cache TO rol_recepcionista;
GRANT SELECT ON TABLE public.localidades_replica_cache TO rol_recepcionista;
GRANT SELECT, INSERT, UPDATE ON TABLE public.personas TO rol_recepcionista;
GRANT SELECT ON TABLE public.tipos_documento TO rol_recepcionista;
GRANT SELECT ON TABLE public.motivos_viaje TO rol_recepcionista;

-- ============================================
-- Migraciones: lectura global
-- ============================================
GRANT SELECT ON TABLE public.partes_diarios TO rol_migraciones;
GRANT SELECT ON TABLE public.cierres_diarios TO rol_migraciones;
GRANT SELECT ON TABLE public.personas TO rol_migraciones;

-- ============================================
-- Estadistica Externa: SOLO vistas agregadas, SIN datos personales
-- ============================================
-- NO se otorga acceso directo a partes_diarios ni personas
-- Solo se otorga acceso a vistas estadisticas consolidadas

-- ============================================
-- RLS Policies
-- ============================================

-- Partes Diarios: lectura global para ciertos roles
CREATE POLICY partes_global_read ON public.partes_diarios FOR SELECT
    TO rol_admin_general, rol_responsable_estadistica, rol_migraciones
    USING (true);

-- Partes Diarios: recepcionista solo ve su establecimiento
CREATE POLICY partes_recepcionista_select ON public.partes_diarios FOR SELECT
    TO rol_recepcionista
    USING (establecimiento_id = (current_setting('app.establecimiento_id', true))::uuid);

CREATE POLICY partes_recepcionista_insert ON public.partes_diarios FOR INSERT
    TO rol_recepcionista
    WITH CHECK (establecimiento_id = (current_setting('app.establecimiento_id', true))::uuid);

CREATE POLICY partes_recepcionista_update ON public.partes_diarios FOR UPDATE
    TO rol_recepcionista
    USING (establecimiento_id = (current_setting('app.establecimiento_id', true))::uuid)
    WITH CHECK (establecimiento_id = (current_setting('app.establecimiento_id', true))::uuid);

-- Cierres Diarios: lectura global
CREATE POLICY cierres_global_read ON public.cierres_diarios FOR SELECT
    TO rol_admin_general, rol_responsable_estadistica, rol_migraciones, rol_estadistica_externa
    USING (true);

-- Cierres Diarios: recepcionista solo su establecimiento
CREATE POLICY cierres_recepcionista_select ON public.cierres_diarios FOR SELECT
    TO rol_recepcionista
    USING (establecimiento_id = (current_setting('app.establecimiento_id', true))::uuid);

CREATE POLICY cierres_recepcionista_insert ON public.cierres_diarios FOR INSERT
    TO rol_recepcionista
    WITH CHECK (establecimiento_id = (current_setting('app.establecimiento_id', true))::uuid);

-- Habitaciones cache: lectura global para roles operativos para evitar bloqueos de permisos en validaciones
CREATE POLICY habitaciones_cache_read_all ON public.habitaciones_replica_cache FOR SELECT
    TO rol_admin_general, rol_responsable_estadistica, rol_recepcionista
    USING (true);
