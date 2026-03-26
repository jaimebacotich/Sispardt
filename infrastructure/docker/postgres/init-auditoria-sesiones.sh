#!/bin/bash
# ============================================================
# SISPARDT - Inicializacion BD Auditoria Sesiones
# Se ejecuta por el entrypoint de postgres:17.2-alpine
# contra la DB ya creada (POSTGRES_DB=sispardt_auditoria_sesiones)
# ============================================================
set -e

DB="${POSTGRES_DB}"
SCRIPTS="/docker-entrypoint-scripts/auditoria-sesiones"
PG_USER="${POSTGRES_USER}"

log() { echo "[INIT-AUD-SES] $*"; }

log "====== Iniciando BD: $DB ======"

# ---- 1. Esquema principal (extensiones, función inmutabilidad, tabla particionada, índices, triggers) ----
log "--> 01: Esquema principal..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/01-esquema.sql"

# ---- 2. Instalar pg_partman y configurar particionado mensual con retención 12 meses ----
log "--> Instalando pg_partman y configurando particionado mensual (retención 12 meses)..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS pg_partman WITH SCHEMA partman;

    SELECT partman.create_parent(
        p_parent_table    => 'public.sesiones_auditoria',
        p_control         => 'evento_timestamp',
        p_interval        => '1 month',
        p_start_partition => to_char(NOW() - INTERVAL '1 month', 'YYYY-MM-DD')
    );

    -- En pg_partman v5 la retención se configura post-creación (p_retention fue removido)
    UPDATE partman.part_config
    SET retention              = '12 months',
        retention_keep_table   = false
    WHERE parent_table = 'public.sesiones_auditoria';
EOSQL

# ---- 3. Roles y permisos ----
log "--> 02: Roles y permisos..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" -f "$SCRIPTS/02-roles.sql"

# ---- 4. Usuario de aplicación con login ----
# El rol NOLOGIN ya fue creado en 02-roles.sql.
# Aquí creamos el usuario real y le asignamos el rol.
log "--> Creando usuario de aplicacion app_auditoria_sesiones..."
psql -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_auditoria_sesiones') THEN
            CREATE USER app_auditoria_sesiones WITH PASSWORD '${APP_PASS_AUDIT_SES_APP:-changeme_audit_ses_app}';
        END IF;
    END\$\$;

    GRANT rol_auditoria_sesiones TO app_auditoria_sesiones;
EOSQL

# Re-establecer contraseña de postgres con scram-sha-256
psql -U "$PG_USER" -d "$DB" -c "ALTER USER postgres WITH PASSWORD '${POSTGRES_PASSWORD}';"

log "====== BD $DB inicializada correctamente ======"
