#!/bin/bash
# ============================================================
# SISPARDT - Inicializacion BD Movimientos
# Se ejecuta por el entrypoint de postgres:17.2-alpine
# contra la DB ya creada (POSTGRES_DB=sispardt_movimientos)
# ============================================================
set -e

DB="${POSTGRES_DB}"
SCRIPTS="/docker-entrypoint-scripts/movimientos"
PG_USER="${POSTGRES_USER}"

log() { echo "[INIT-MOV] $*"; }

log "====== Iniciando BD: $DB ======"

# ---- 1. Esquema principal (extensiones, funciones, tablas, vistas, indices, triggers, RLS, publicacion CDC) ----
log "--> 01: Esquema principal..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/01-esquema.sql"

# ---- 2. Instalar pg_partman ahora que el schema partman existe ----
log "--> Instalando extension pg_partman en schema partman..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pg_partman WITH SCHEMA partman;
EOSQL

# ---- 3. Roles y permisos ----
log "--> 02: Roles y permisos..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/02-roles.sql"

# ---- 4. Catalogos (tipos_documento, motivos_viaje) ----
log "--> 03: Catalogos..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/03-datos-catalogos.sql"

# ---- 5. Replica cache inicial (paises + geo Tarija + habitaciones de prueba) ----
log "--> 04: Datos replica cache inicial..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/04-datos-replica.sql"

# ---- 5b. Tabla replica establecimientos ----
log "--> 05: Replica establecimientos..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/05-add-establecimientos-replica.sql"

# ---- 6. Usuarios de aplicacion con login ----
# Los roles NOLOGIN ya fueron creados en 02-roles.sql.
log "--> Creando usuarios de aplicacion..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    DO \$\$
    BEGIN
        -- Admin general
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin_general') THEN
            CREATE USER app_admin_general WITH PASSWORD '${APP_PASS_ADMIN:-changeme_admin}';
        END IF;
        -- Responsable de registro (solo lectura en movimientos)
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_responsable_registro') THEN
            CREATE USER app_responsable_registro WITH PASSWORD '${APP_PASS_RESP_REG:-changeme_resp}';
        END IF;
        -- Responsable estadistica
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_resp_estadistica') THEN
            CREATE USER app_resp_estadistica WITH PASSWORD '${APP_PASS_ESTAD:-changeme_estad}';
        END IF;
        -- Recepcionista (INSERT/UPDATE partes, INSERT cierres via RLS)
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_recepcionista') THEN
            CREATE USER app_recepcionista WITH PASSWORD '${APP_PASS_RECEP:-changeme_recep}';
        END IF;
        -- Debezium (replicacion logica - publica outbox_events y partes_diarios)
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_debezium') THEN
            CREATE USER app_debezium WITH REPLICATION PASSWORD '${APP_PASS_DEBEZIUM:-changeme_debezium}';
        END IF;
        -- Consumidor Kafka/Debezium para actualizacion de replica_cache
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_kafka_consumer') THEN
            CREATE USER app_kafka_consumer WITH BYPASSRLS PASSWORD '${APP_PASS_KAFKA:-changeme_kafka}';
        END IF;
    END\$\$;

    -- Asignar roles a usuarios
    GRANT rol_admin_general           TO app_admin_general;
    GRANT rol_responsable_registro    TO app_responsable_registro;
    GRANT rol_responsable_estadistica TO app_resp_estadistica;
    GRANT rol_recepcionista           TO app_recepcionista;

    -- Recepcionista: necesita lectura en tablas de replica para validaciones de formulario
    GRANT SELECT ON
        public.paises_replica_cache,
        public.divisiones_principales_replica_cache,
        public.divisiones_secundarias_replica_cache,
        public.localidades_replica_cache,
        public.habitaciones_replica_cache,
        public.establecimientos_replica_cache,
        public.cierres_diarios
    TO app_recepcionista;

    -- Kafka consumer: actualiza las tablas de replica_cache
    GRANT USAGE ON SCHEMA public TO app_kafka_consumer;
    GRANT SELECT, INSERT, UPDATE, DELETE ON
        public.paises_replica_cache,
        public.divisiones_principales_replica_cache,
        public.divisiones_secundarias_replica_cache,
        public.localidades_replica_cache,
        public.habitaciones_replica_cache,
        public.establecimientos_replica_cache
    TO app_kafka_consumer;

    -- Debezium necesita SELECT en tablas publicadas
    GRANT USAGE ON SCHEMA public TO app_debezium;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_debezium;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_debezium;

    -- Desactivar RLS en tablas de replica para el consumidor (automatizacion)
    ALTER TABLE public.paises_replica_cache DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.divisiones_principales_replica_cache DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.divisiones_secundarias_replica_cache DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.localidades_replica_cache DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.habitaciones_replica_cache DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.establecimientos_replica_cache DISABLE ROW LEVEL SECURITY;
EOSQL

# Re-establecer contraseña de postgres con scram-sha-256
psql -U "$PG_USER" -d "$DB" -c "ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD}';"

log "====== BD $DB inicializada correctamente ======"
