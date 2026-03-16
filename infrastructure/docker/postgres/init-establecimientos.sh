#!/bin/bash
# ============================================================
# SISPARDT - Inicializacion BD Establecimientos
# Se ejecuta por el entrypoint de postgres:17.2-alpine
# contra la DB ya creada (POSTGRES_DB=sispardt_establecimientos)
# ============================================================
set -e

DB="${POSTGRES_DB}"
SCRIPTS="/docker-entrypoint-scripts/establecimientos"
PG_USER="${POSTGRES_USER}"

log() { echo "[INIT-EST] $*"; }

log "====== Iniciando BD: $DB ======"

# ---- 1. Esquema principal (extensiones, funciones, tablas, indices, triggers) ----
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

# ---- 4. Datos geograficos de Bolivia (Tarija) ----
log "--> 03: Datos geograficos..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/03-datos-geograficos.sql"

# ---- 5. Catalogos (clasificaciones, categorias, tipos, servicios) ----
log "--> 04: Catalogos..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/04-datos-catalogos.sql"

# ---- 6. Datos de prueba (solo entorno dev) ----
if [ "${LOAD_TEST_DATA:-false}" = "true" ]; then
    log "--> 05: Datos de prueba (dev)..."
    psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/05-datos-prueba.sql"
fi

# ---- 7. Publicacion CDC para Debezium ----
# Publica las tablas que se replican en la BD Movimientos (replica_cache)
log "--> Creando publicacion CDC pardt_establecimientos_pub..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    CREATE PUBLICATION pardt_establecimientos_pub
    FOR TABLE
        public.paises,
        public.divisiones_principales,
        public.divisiones_secundarias,
        public.localidades,
        public.establecimientos,
        public.habitaciones,
        public.habitacion_camas
    WITH (publish = 'insert, update, delete, truncate');
EOSQL

# ---- 8. Usuarios de aplicacion con login ----
# Los roles NOLOGIN ya fueron creados en 02-roles.sql.
# Aqui creamos los usuarios reales y les asignamos los roles.
log "--> Creando usuarios de aplicacion..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    DO \$\$
    BEGIN
        -- Admin general
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin_general') THEN
            CREATE USER app_admin_general WITH PASSWORD '${APP_PASS_ADMIN:-changeme_admin}';
        END IF;
        -- Responsable de registro
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_responsable_registro') THEN
            CREATE USER app_responsable_registro WITH PASSWORD '${APP_PASS_RESP_REG:-changeme_resp}';
        END IF;
        -- Tecnico de registro
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_tecnico_registro') THEN
            CREATE USER app_tecnico_registro WITH PASSWORD '${APP_PASS_TEC_REG:-changeme_tec}';
        END IF;
        -- Recepcionista
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_recepcionista') THEN
            CREATE USER app_recepcionista WITH PASSWORD '${APP_PASS_RECEP:-changeme_recep}';
        END IF;
        -- Responsable estadistica
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_resp_estadistica') THEN
            CREATE USER app_resp_estadistica WITH PASSWORD '${APP_PASS_ESTAD:-changeme_estad}';
        END IF;
        -- Debezium (replicacion logica)
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_debezium') THEN
            CREATE USER app_debezium WITH REPLICATION PASSWORD '${APP_PASS_DEBEZIUM:-changeme_debezium}';
        END IF;
    END\$\$;

    -- Asignar roles a usuarios
    GRANT rol_admin_general          TO app_admin_general;
    GRANT rol_responsable_registro   TO app_responsable_registro;
    GRANT rol_tecnico_registro       TO app_tecnico_registro;
    GRANT rol_recepcionista          TO app_recepcionista;
    GRANT rol_responsable_estadistica TO app_resp_estadistica;

    -- Debezium necesita SELECT en tablas publicadas
    GRANT USAGE ON SCHEMA public TO app_debezium;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_debezium;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_debezium;
EOSQL

log "====== BD $DB inicializada correctamente ======"
