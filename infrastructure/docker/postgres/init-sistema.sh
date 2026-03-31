#!/bin/bash
# ============================================================
# SISPARDT - Inicializacion BD Sistema
# Se ejecuta por el entrypoint de postgres:17.2-alpine
# contra la DB ya creada (POSTGRES_DB=sispardt_sistema)
# ============================================================
set -e

DB="${POSTGRES_DB}"
SCRIPTS="/docker-entrypoint-scripts/sistema"
PG_USER="${POSTGRES_USER}"

log() { echo "[INIT-SISTEMA] $*"; }

log "====== Iniciando BD: $DB ======"

# ---- 1. Esquema sesiones_auditoria ----
log "--> 01: Esquema sesiones_auditoria..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/01-schema-sesiones.sql"

# ---- 2. Instalar pg_partman y configurar particionado mensual (retención 12 meses) ----
log "--> Instalando pg_partman y configurando particionado mensual (retención 12 meses)..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pg_partman WITH SCHEMA partman;

    SELECT partman.create_parent(
        p_parent_table    => 'public.sesiones_auditoria',
        p_control         => 'evento_timestamp',
        p_interval        => '1 month',
        p_start_partition => to_char(NOW() - INTERVAL '1 month', 'YYYY-MM-DD')
    );

    UPDATE partman.part_config
    SET retention              = '12 months',
        retention_keep_table   = false
    WHERE parent_table = 'public.sesiones_auditoria';
EOSQL

# ---- 3. Esquema usuarios del sistema ----
log "--> 02: Esquema usuarios del sistema..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/02-schema-usuarios.sql"

# ---- 4. Seed de roles ----
log "--> 03: Seed de roles..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/03-seed-roles.sql"

# ---- 5. Roles y permisos de BD ----
log "--> 04: Roles y permisos de BD..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/04-roles-db.sql"

# ---- 6. Auditoría transaccional ----
log "--> 05: Auditoría transaccional (triggers sobre tablas de usuarios)..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/05-schema-auditoria.sql"

# ---- 6. Usuario de aplicación con login ----
log "--> Creando usuario de aplicacion app_sistema..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_sistema') THEN
            CREATE USER app_sistema WITH PASSWORD '${APP_PASS_SISTEMA:-changeme_sistema}';
        END IF;
    END\$\$;

    GRANT rol_sistema TO app_sistema;
EOSQL

# Re-establecer contraseña de postgres con scram-sha-256
psql -U "$PG_USER" -d "$DB" -c "ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD}';"

log "====== BD $DB inicializada correctamente ======"
