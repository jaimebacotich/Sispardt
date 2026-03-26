-- ============================================================
-- SISPARDT - BD Auditoria Sesiones
-- 01: Esquema principal (extensiones, funciones, tabla, índices, triggers)
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Schema para pg_partman (debe crearse antes de instalar la extensión)
CREATE SCHEMA IF NOT EXISTS partman;

-- ============================================================
-- FUNCIÓN: Inmutabilidad de registros de auditoría
-- Los registros NO pueden modificarse ni eliminarse
-- ============================================================
CREATE OR REPLACE FUNCTION fn_impedir_alteracion_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría son inmutables y no pueden ser modificados o eliminados';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLA PRINCIPAL: sesiones_auditoria
-- Particionada mensualmente por evento_timestamp (pg_partman)
-- ============================================================
CREATE TABLE IF NOT EXISTS sesiones_auditoria (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    keycloak_event_id TEXT        NOT NULL,
    tipo_evento       TEXT        NOT NULL CHECK (tipo_evento IN ('LOGIN', 'LOGOUT', 'LOGIN_ERROR')),
    usuario_id        TEXT,
    username          TEXT,
    realm             TEXT        NOT NULL,
    client_id         TEXT,
    sesion_id         TEXT,
    ip_address        TEXT,
    detalle           JSONB,
    evento_timestamp  TIMESTAMPTZ NOT NULL,
    creado_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Clave única compuesta: requerida para ON CONFLICT en tablas particionadas
    -- El keycloak_event_id es un UUID único por evento; la combinación con
    -- evento_timestamp garantiza deduplicación correcta con particionado mensual.
    CONSTRAINT uq_sesiones_keycloak_event UNIQUE (keycloak_event_id, evento_timestamp)
) PARTITION BY RANGE (evento_timestamp);

-- ============================================================
-- ÍNDICES (definidos en tabla padre → se propagan a particiones)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sesiones_timestamp ON sesiones_auditoria (evento_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario   ON sesiones_auditoria (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_tipo      ON sesiones_auditoria (tipo_evento);
CREATE INDEX IF NOT EXISTS idx_sesiones_client    ON sesiones_auditoria (client_id);
-- Índice adicional para búsqueda de texto en username (ILIKE)
CREATE INDEX IF NOT EXISTS idx_sesiones_username  ON sesiones_auditoria (username);

-- ============================================================
-- TRIGGERS DE INMUTABILIDAD (R-01)
-- Impiden UPDATE y DELETE en todos los registros de auditoría
-- ============================================================

-- Impedir UPDATE
CREATE TRIGGER trg_inmutable_sesiones_upd
    BEFORE UPDATE ON sesiones_auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_alteracion_auditoria();

-- Impedir DELETE
CREATE TRIGGER trg_inmutable_sesiones_del
    BEFORE DELETE ON sesiones_auditoria
    FOR EACH ROW EXECUTE FUNCTION fn_impedir_alteracion_auditoria();

-- ============================================================
-- NOTA: El particionado con pg_partman y la retención de 12 meses
-- se configuran en init-auditoria-sesiones.sh después de instalar
-- la extensión pg_partman en el schema partman.
-- ============================================================
