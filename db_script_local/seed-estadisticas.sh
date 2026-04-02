#!/usr/bin/env bash
# ============================================================
# SISPARDT — Seed de datos de prueba para pantalla Estadísticas
#
# Crea 3 establecimientos en Tarija con habitaciones y 90 días
# de partes diarios con distribución realista de nacionalidades,
# motivos de viaje y tipos de habitación.
#
# Uso:
#   bash db_script_local/seed-estadisticas.sh          # insertar
#   bash db_script_local/seed-estadisticas.sh --clean  # solo limpiar
#
# Requisitos: contenedores sispardt-db-establecimientos y
#             sispardt-db-movimientos corriendo.
# ============================================================
set -euo pipefail

CONTAINER_EST="sispardt-db-establecimientos"
CONTAINER_MOV="sispardt-db-movimientos"
DB_EST="sispardt_establecimientos"
DB_MOV="sispardt_movimientos"
PG_USER="postgres"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info() { echo -e "${CYAN}[seed]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}   $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
fail() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }
psql_est() { docker exec -i "$CONTAINER_EST" psql -U "$PG_USER" -d "$DB_EST" -v ON_ERROR_STOP=1 "$@"; }
psql_mov() { docker exec -i "$CONTAINER_MOV" psql -U "$PG_USER" -d "$DB_MOV" -v ON_ERROR_STOP=1 "$@"; }

# ---- verificar contenedores --------------------------------
for c in "$CONTAINER_EST" "$CONTAINER_MOV"; do
  docker inspect "$c" --format '{{.State.Running}}' 2>/dev/null | grep -q true \
    || fail "Contenedor $c no está corriendo. Levanta las BDs primero con:\n  docker compose -f docker-compose.db.yml up -d"
done

CLEAN_ONLY="${1:-}"

# ============================================================
# PASO 0 — LIMPIEZA (siempre, antes de reinsertar)
# Los UUIDs seed son fijos — esto es idempotente.
# ============================================================
info "Limpiando datos seed anteriores..."

psql_mov <<'SQL'
BEGIN;
-- tr_bloqueo_por_cierre usa NEW (NULL en DELETE) → devuelve NULL → cancela DELETEs silenciosamente
ALTER TABLE public.partes_diarios DISABLE TRIGGER tr_bloqueo_por_cierre;
DELETE FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'::uuid;
ALTER TABLE public.partes_diarios ENABLE TRIGGER tr_bloqueo_por_cierre;
DELETE FROM public.habitaciones_replica_cache
  WHERE establecimiento_id IN (
    'e1e10000-5eed-5eed-5eed-000000000001'::uuid,
    'e2e20000-5eed-5eed-5eed-000000000002'::uuid,
    'e3e30000-5eed-5eed-5eed-000000000003'::uuid,
    'e4e40000-5eed-5eed-5eed-000000000004'::uuid,
    'e5e50000-5eed-5eed-5eed-000000000005'::uuid,
    'e6e60000-5eed-5eed-5eed-000000000006'::uuid,
    'e7e70000-5eed-5eed-5eed-000000000007'::uuid
  );
COMMIT;
SQL
ok "Movimientos limpiados"

psql_est <<'SQL'
BEGIN;
DELETE FROM public.establecimientos
  WHERE id IN (
    'e1e10000-5eed-5eed-5eed-000000000001'::uuid,
    'e2e20000-5eed-5eed-5eed-000000000002'::uuid,
    'e3e30000-5eed-5eed-5eed-000000000003'::uuid,
    'e4e40000-5eed-5eed-5eed-000000000004'::uuid,
    'e5e50000-5eed-5eed-5eed-000000000005'::uuid,
    'e6e60000-5eed-5eed-5eed-000000000006'::uuid,
    'e7e70000-5eed-5eed-5eed-000000000007'::uuid
  );
COMMIT;
SQL
ok "Establecimientos limpiados (cascade a habitaciones y camas)"

[[ "$CLEAN_ONLY" == "--clean" ]] && { echo; ok "${BOLD}Modo --clean: listo.${NC}"; exit 0; }

# ============================================================
# PASO 1 — BD ESTABLECIMIENTOS
# 3 establecimientos en Tarija con habitaciones y camas.
#
# EST1 Hotel Victoria [SEED]   — Tarija ciudad, 3★, 15 hab, cap=33
# EST2 Hostal del Chaco [SEED] — Yacuiba,        2★, 10 hab, cap=19
# EST3 Alojamiento Las Flores [SEED] — San Lorenzo, Tipo A, 8 hab, cap=13
# ============================================================
info "Insertando establecimientos, habitaciones y camas..."

psql_est <<'SQL'
DO $$
DECLARE
  -- IDs fijos de establecimientos
  est1 uuid := 'e1e10000-5eed-5eed-5eed-000000000001';
  est2 uuid := 'e2e20000-5eed-5eed-5eed-000000000002';
  est3 uuid := 'e3e30000-5eed-5eed-5eed-000000000003';

  -- Localidades (resueltas dinámicamente del geo-catalog)
  loc_tarija     integer;
  loc_yacuiba    integer;
  loc_sanlorenzo integer;

  -- Categorías
  cat_hotel3  integer;
  cat_hostal2 integer;
  cat_aloj_a  integer;

  -- Tipos de habitación
  t_ind  integer;  -- Individual
  t_dob  integer;  -- Doble
  t_tri  integer;  -- Triple
  t_mat  integer;  -- Matrimonial
  t_fam  integer;  -- Familiar
  t_sui  integer;  -- Suite

  -- Tipos de cama
  tc_ind integer;  -- Individual (1p)
  tc_mat integer;  -- Matrimonial (2p)
  tc_que integer;  -- Queen (2p)
  tc_kin integer;  -- King (2p)
BEGIN

  -- Localidades (el geo-catalog de establecimientos)
  SELECT id INTO loc_tarija     FROM public.localidades WHERE nombre = 'Tarija'      LIMIT 1;
  SELECT id INTO loc_yacuiba    FROM public.localidades WHERE nombre = 'Yacuiba'     LIMIT 1;
  SELECT id INTO loc_sanlorenzo FROM public.localidades WHERE nombre = 'San Lorenzo' LIMIT 1;

  IF loc_tarija IS NULL THEN
    RAISE EXCEPTION
      'Localidad "Tarija" no encontrada. ¿Corriste 03-datos-geograficos.sql?';
  END IF;
  IF loc_yacuiba IS NULL THEN
    RAISE WARNING 'Localidad "Yacuiba" no encontrada; EST2 usará localidad de Tarija.';
    loc_yacuiba := loc_tarija;
  END IF;
  IF loc_sanlorenzo IS NULL THEN
    RAISE WARNING 'Localidad "San Lorenzo" no encontrada; EST3 usará localidad de Tarija.';
    loc_sanlorenzo := loc_tarija;
  END IF;

  -- Categorías
  SELECT c.id INTO cat_hotel3
    FROM public.categorias c
    JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id
    WHERE cl.nombre = 'Hotel' AND c.nombre = '3 Estrellas' LIMIT 1;

  SELECT c.id INTO cat_hostal2
    FROM public.categorias c
    JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id
    WHERE cl.nombre = 'Hostal' AND c.nombre = '2 Estrellas' LIMIT 1;

  SELECT c.id INTO cat_aloj_a
    FROM public.categorias c
    JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id
    WHERE cl.nombre = 'Alojamiento' AND c.nombre = 'Tipo A' LIMIT 1;

  -- Tipos de habitación
  SELECT id INTO t_ind FROM public.tipo_habitaciones WHERE nombre = 'Individual'  LIMIT 1;
  SELECT id INTO t_dob FROM public.tipo_habitaciones WHERE nombre = 'Doble'       LIMIT 1;
  SELECT id INTO t_tri FROM public.tipo_habitaciones WHERE nombre = 'Triple'      LIMIT 1;
  SELECT id INTO t_mat FROM public.tipo_habitaciones WHERE nombre = 'Matrimonial' LIMIT 1;
  SELECT id INTO t_fam FROM public.tipo_habitaciones WHERE nombre = 'Familiar'    LIMIT 1;
  SELECT id INTO t_sui FROM public.tipo_habitaciones WHERE nombre = 'Suite'       LIMIT 1;

  -- Tipos de cama
  SELECT id INTO tc_ind FROM public.tipo_camas WHERE nombre = 'Individual'  LIMIT 1;
  SELECT id INTO tc_mat FROM public.tipo_camas WHERE nombre = 'Matrimonial' LIMIT 1;
  SELECT id INTO tc_que FROM public.tipo_camas WHERE nombre = 'Queen'       LIMIT 1;
  SELECT id INTO tc_kin FROM public.tipo_camas WHERE nombre = 'King'        LIMIT 1;

  -- ==========================================================
  -- EST1: Hotel Victoria [SEED] — Tarija, 3 Estrellas, 15 hab
  -- cap = 4×1 + 4×2 + 3×3 + 2×2 + 2×4 = 33
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est1, 'LIC-SEED-001', 'Hotel Victoria [SEED]', 'Propietario Seed S.R.L.',
     loc_tarija, cat_hotel3, true, CURRENT_DATE + INTERVAL '1 year',
     'Av. La Madrid 245, Tarija', '04-6641234', 'ACTIVO');

  -- Individual ×4 (1 cama Individual = 1p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10001-5eed-5eed-5eed-000000000001', est1, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e1e10002-5eed-5eed-5eed-000000000002', est1, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e1e10003-5eed-5eed-5eed-000000000003', est1, t_ind, 'H-103', '1', 'SERVICIO'),
    ('e1e10004-5eed-5eed-5eed-000000000004', est1, t_ind, 'H-104', '1', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e1e10002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e1e10003-5eed-5eed-5eed-000000000003', tc_ind, 1),
    ('e1e10004-5eed-5eed-5eed-000000000004', tc_ind, 1);

  -- Doble ×4 (2 camas Individual = 2p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10005-5eed-5eed-5eed-000000000005', est1, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e1e10006-5eed-5eed-5eed-000000000006', est1, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e1e10007-5eed-5eed-5eed-000000000007', est1, t_dob, 'H-203', '2', 'SERVICIO'),
    ('e1e10008-5eed-5eed-5eed-000000000008', est1, t_dob, 'H-204', '2', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e1e10006-5eed-5eed-5eed-000000000006', tc_ind, 2),
    ('e1e10007-5eed-5eed-5eed-000000000007', tc_ind, 2),
    ('e1e10008-5eed-5eed-5eed-000000000008', tc_ind, 2);

  -- Triple ×3 (1 Matrimonial + 1 Individual = 3p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10009-5eed-5eed-5eed-000000000009', est1, t_tri, 'H-301', '3', 'SERVICIO'),
    ('e1e10010-5eed-5eed-5eed-000000000010', est1, t_tri, 'H-302', '3', 'SERVICIO'),
    ('e1e10011-5eed-5eed-5eed-000000000011', est1, t_tri, 'H-303', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10009-5eed-5eed-5eed-000000000009', tc_mat, 1),
    ('e1e10009-5eed-5eed-5eed-000000000009', tc_ind, 1),
    ('e1e10010-5eed-5eed-5eed-000000000010', tc_mat, 1),
    ('e1e10010-5eed-5eed-5eed-000000000010', tc_ind, 1),
    ('e1e10011-5eed-5eed-5eed-000000000011', tc_mat, 1),
    ('e1e10011-5eed-5eed-5eed-000000000011', tc_ind, 1);

  -- Matrimonial ×2 (1 Matrimonial = 2p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10012-5eed-5eed-5eed-000000000012', est1, t_mat, 'H-401', '4', 'SERVICIO'),
    ('e1e10013-5eed-5eed-5eed-000000000013', est1, t_mat, 'H-402', '4', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10012-5eed-5eed-5eed-000000000012', tc_mat, 1),
    ('e1e10013-5eed-5eed-5eed-000000000013', tc_mat, 1);

  -- Familiar ×2 (1 Queen + 2 Individual = 4p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10014-5eed-5eed-5eed-000000000014', est1, t_fam, 'H-501', '5', 'SERVICIO'),
    ('e1e10015-5eed-5eed-5eed-000000000015', est1, t_fam, 'H-502', '5', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10014-5eed-5eed-5eed-000000000014', tc_que, 1),
    ('e1e10014-5eed-5eed-5eed-000000000014', tc_ind, 2),
    ('e1e10015-5eed-5eed-5eed-000000000015', tc_que, 1),
    ('e1e10015-5eed-5eed-5eed-000000000015', tc_ind, 2);

  -- ==========================================================
  -- EST2: Hostal del Chaco [SEED] — Yacuiba, 2 Estrellas, 10 hab
  -- cap = 3×1 + 4×2 + 2×3 + 1×2 = 19
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est2, 'LIC-SEED-002', 'Hostal del Chaco [SEED]', 'Propietario Seed Dos S.A.',
     loc_yacuiba, cat_hostal2, true, CURRENT_DATE + INTERVAL '1 year',
     'Calle Comercio 89, Yacuiba', '04-6820001', 'ACTIVO');

  -- Individual ×3
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20001-5eed-5eed-5eed-000000000001', est2, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e2e20002-5eed-5eed-5eed-000000000002', est2, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e2e20003-5eed-5eed-5eed-000000000003', est2, t_ind, 'H-103', '1', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e2e20002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e2e20003-5eed-5eed-5eed-000000000003', tc_ind, 1);

  -- Doble ×4
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20004-5eed-5eed-5eed-000000000004', est2, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e2e20005-5eed-5eed-5eed-000000000005', est2, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e2e20006-5eed-5eed-5eed-000000000006', est2, t_dob, 'H-203', '2', 'SERVICIO'),
    ('e2e20007-5eed-5eed-5eed-000000000007', est2, t_dob, 'H-204', '2', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e2e20005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e2e20006-5eed-5eed-5eed-000000000006', tc_ind, 2),
    ('e2e20007-5eed-5eed-5eed-000000000007', tc_ind, 2);

  -- Triple ×2
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20008-5eed-5eed-5eed-000000000008', est2, t_tri, 'H-301', '3', 'SERVICIO'),
    ('e2e20009-5eed-5eed-5eed-000000000009', est2, t_tri, 'H-302', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20008-5eed-5eed-5eed-000000000008', tc_mat, 1),
    ('e2e20008-5eed-5eed-5eed-000000000008', tc_ind, 1),
    ('e2e20009-5eed-5eed-5eed-000000000009', tc_mat, 1),
    ('e2e20009-5eed-5eed-5eed-000000000009', tc_ind, 1);

  -- Suite ×1 (1 King = 2p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20010-5eed-5eed-5eed-000000000010', est2, t_sui, 'H-401', '4', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20010-5eed-5eed-5eed-000000000010', tc_kin, 1);

  -- ==========================================================
  -- EST3: Alojamiento Las Flores [SEED] — San Lorenzo, Tipo A, 8 hab
  -- cap = 3×1 + 3×2 + 2×2 = 13
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est3, 'LIC-SEED-003', 'Alojamiento Las Flores [SEED]', 'Propietario Seed Tres',
     loc_sanlorenzo, cat_aloj_a, true, CURRENT_DATE + INTERVAL '1 year',
     'Calle Bolivar 12, San Lorenzo', '04-6450087', 'ACTIVO');

  -- Individual ×3
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e3e30001-5eed-5eed-5eed-000000000001', est3, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e3e30002-5eed-5eed-5eed-000000000002', est3, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e3e30003-5eed-5eed-5eed-000000000003', est3, t_ind, 'H-103', '1', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e3e30001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e3e30002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e3e30003-5eed-5eed-5eed-000000000003', tc_ind, 1);

  -- Doble ×3
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e3e30004-5eed-5eed-5eed-000000000004', est3, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e3e30005-5eed-5eed-5eed-000000000005', est3, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e3e30006-5eed-5eed-5eed-000000000006', est3, t_dob, 'H-203', '2', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e3e30004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e3e30005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e3e30006-5eed-5eed-5eed-000000000006', tc_ind, 2);

  -- Matrimonial ×2
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e3e30007-5eed-5eed-5eed-000000000007', est3, t_mat, 'H-301', '3', 'SERVICIO'),
    ('e3e30008-5eed-5eed-5eed-000000000008', est3, t_mat, 'H-302', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e3e30007-5eed-5eed-5eed-000000000007', tc_mat, 1),
    ('e3e30008-5eed-5eed-5eed-000000000008', tc_mat, 1);

END $$;

-- EST4–EST7 en bloque separado (Bermejo, Entre Ríos, Villa Montes, Uriondo)
DO $$
DECLARE
  est4 uuid := 'e4e40000-5eed-5eed-5eed-000000000004';
  est5 uuid := 'e5e50000-5eed-5eed-5eed-000000000005';
  est6 uuid := 'e6e60000-5eed-5eed-5eed-000000000006';
  est7 uuid := 'e7e70000-5eed-5eed-5eed-000000000007';

  loc_tarija    integer;
  loc_bermejo   integer;
  loc_entreri   integer;
  loc_villamont integer;
  loc_uriondo   integer;

  cat_hotel3  integer;
  cat_hostal2 integer;
  cat_aloj_a  integer;

  t_ind  integer;
  t_dob  integer;
  t_tri  integer;
  t_mat  integer;
  t_sui  integer;

  tc_ind integer;
  tc_mat integer;
  tc_kin integer;
BEGIN
  SELECT id INTO loc_tarija    FROM public.localidades WHERE nombre = 'Tarija'       LIMIT 1;
  SELECT id INTO loc_bermejo   FROM public.localidades WHERE nombre = 'Bermejo'      LIMIT 1;
  SELECT id INTO loc_entreri   FROM public.localidades WHERE nombre = 'Entre Ríos'   LIMIT 1;
  SELECT id INTO loc_villamont FROM public.localidades WHERE nombre = 'Villa Montes' LIMIT 1;
  SELECT id INTO loc_uriondo   FROM public.localidades WHERE nombre = 'Uriondo'      LIMIT 1;
  IF loc_bermejo   IS NULL THEN loc_bermejo   := loc_tarija; END IF;
  IF loc_entreri   IS NULL THEN loc_entreri   := loc_tarija; END IF;
  IF loc_villamont IS NULL THEN loc_villamont := loc_tarija; END IF;
  IF loc_uriondo   IS NULL THEN loc_uriondo   := loc_tarija; END IF;

  SELECT c.id INTO cat_hotel3  FROM public.categorias c JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id WHERE cl.nombre = 'Hotel'       AND c.nombre = '3 Estrellas' LIMIT 1;
  SELECT c.id INTO cat_hostal2 FROM public.categorias c JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id WHERE cl.nombre = 'Hostal'      AND c.nombre = '2 Estrellas' LIMIT 1;
  SELECT c.id INTO cat_aloj_a  FROM public.categorias c JOIN public.clasificaciones cl ON cl.id = c.clasificacion_id WHERE cl.nombre = 'Alojamiento' AND c.nombre = 'Tipo A'      LIMIT 1;

  SELECT id INTO t_ind FROM public.tipo_habitaciones WHERE nombre = 'Individual'  LIMIT 1;
  SELECT id INTO t_dob FROM public.tipo_habitaciones WHERE nombre = 'Doble'       LIMIT 1;
  SELECT id INTO t_tri FROM public.tipo_habitaciones WHERE nombre = 'Triple'      LIMIT 1;
  SELECT id INTO t_mat FROM public.tipo_habitaciones WHERE nombre = 'Matrimonial' LIMIT 1;
  SELECT id INTO t_sui FROM public.tipo_habitaciones WHERE nombre = 'Suite'       LIMIT 1;

  SELECT id INTO tc_ind FROM public.tipo_camas WHERE nombre = 'Individual'  LIMIT 1;
  SELECT id INTO tc_mat FROM public.tipo_camas WHERE nombre = 'Matrimonial' LIMIT 1;
  SELECT id INTO tc_kin FROM public.tipo_camas WHERE nombre = 'King'        LIMIT 1;

  -- ==========================================================
  -- EST4: Hostal del Sur [SEED] — Bermejo, Hostal 2 Estrellas, 8 hab
  -- cap = 3×1 + 3×2 + 2×3 = 15
  -- ==========================================================

  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est4, 'LIC-SEED-004', 'Hostal del Sur [SEED]', 'Propietario Seed Cuatro S.R.L.',
     loc_bermejo, cat_hostal2, true, CURRENT_DATE + INTERVAL '1 year',
     'Av. Internacional 120, Bermejo', '04-6960001', 'ACTIVO');

  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e4e40001-5eed-5eed-5eed-000000000001', est4, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e4e40002-5eed-5eed-5eed-000000000002', est4, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e4e40003-5eed-5eed-5eed-000000000003', est4, t_ind, 'H-103', '1', 'SERVICIO'),
    ('e4e40004-5eed-5eed-5eed-000000000004', est4, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e4e40005-5eed-5eed-5eed-000000000005', est4, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e4e40006-5eed-5eed-5eed-000000000006', est4, t_dob, 'H-203', '2', 'SERVICIO'),
    ('e4e40007-5eed-5eed-5eed-000000000007', est4, t_tri, 'H-301', '3', 'SERVICIO'),
    ('e4e40008-5eed-5eed-5eed-000000000008', est4, t_tri, 'H-302', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e4e40001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e4e40002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e4e40003-5eed-5eed-5eed-000000000003', tc_ind, 1),
    ('e4e40004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e4e40005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e4e40006-5eed-5eed-5eed-000000000006', tc_ind, 2),
    ('e4e40007-5eed-5eed-5eed-000000000007', tc_mat, 1),
    ('e4e40007-5eed-5eed-5eed-000000000007', tc_ind, 1),
    ('e4e40008-5eed-5eed-5eed-000000000008', tc_mat, 1),
    ('e4e40008-5eed-5eed-5eed-000000000008', tc_ind, 1);

  -- ==========================================================
  -- EST5: Alojamiento El Valle [SEED] — Entre Ríos, Alojamiento Tipo A, 6 hab
  -- cap = 2×1 + 3×2 + 1×2 = 10
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est5, 'LIC-SEED-005', 'Alojamiento El Valle [SEED]', 'Propietario Seed Cinco',
     loc_entreri, cat_aloj_a, true, CURRENT_DATE + INTERVAL '1 year',
     'Calle Principal 45, Entre Ríos', '04-6870001', 'ACTIVO');

  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e5e50001-5eed-5eed-5eed-000000000001', est5, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e5e50002-5eed-5eed-5eed-000000000002', est5, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e5e50003-5eed-5eed-5eed-000000000003', est5, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e5e50004-5eed-5eed-5eed-000000000004', est5, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e5e50005-5eed-5eed-5eed-000000000005', est5, t_dob, 'H-203', '2', 'SERVICIO'),
    ('e5e50006-5eed-5eed-5eed-000000000006', est5, t_mat, 'H-301', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e5e50001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e5e50002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e5e50003-5eed-5eed-5eed-000000000003', tc_ind, 2),
    ('e5e50004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e5e50005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e5e50006-5eed-5eed-5eed-000000000006', tc_mat, 1);

  -- ==========================================================
  -- EST6: Hotel Gran Villamontes [SEED] — Villa Montes, Hotel 3 Estrellas, 11 hab
  -- cap = 2×1 + 4×2 + 2×3 + 2×2 + 1×2 = 22
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est6, 'LIC-SEED-006', 'Hotel Gran Villamontes [SEED]', 'Propietario Seed Seis S.A.',
     loc_villamont, cat_hotel3, true, CURRENT_DATE + INTERVAL '1 year',
     'Av. Defensores del Chaco 300, Villa Montes', '04-6920001', 'ACTIVO');

  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e6e60001-5eed-5eed-5eed-000000000001', est6, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e6e60002-5eed-5eed-5eed-000000000002', est6, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e6e60003-5eed-5eed-5eed-000000000003', est6, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e6e60004-5eed-5eed-5eed-000000000004', est6, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e6e60005-5eed-5eed-5eed-000000000005', est6, t_dob, 'H-203', '2', 'SERVICIO'),
    ('e6e60006-5eed-5eed-5eed-000000000006', est6, t_dob, 'H-204', '2', 'SERVICIO'),
    ('e6e60007-5eed-5eed-5eed-000000000007', est6, t_tri, 'H-301', '3', 'SERVICIO'),
    ('e6e60008-5eed-5eed-5eed-000000000008', est6, t_tri, 'H-302', '3', 'SERVICIO'),
    ('e6e60009-5eed-5eed-5eed-000000000009', est6, t_mat, 'H-401', '4', 'SERVICIO'),
    ('e6e60010-5eed-5eed-5eed-000000000010', est6, t_mat, 'H-402', '4', 'SERVICIO'),
    ('e6e60011-5eed-5eed-5eed-000000000011', est6, t_sui, 'H-501', '5', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e6e60001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e6e60002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e6e60003-5eed-5eed-5eed-000000000003', tc_ind, 2),
    ('e6e60004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e6e60005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e6e60006-5eed-5eed-5eed-000000000006', tc_ind, 2),
    ('e6e60007-5eed-5eed-5eed-000000000007', tc_mat, 1),
    ('e6e60007-5eed-5eed-5eed-000000000007', tc_ind, 1),
    ('e6e60008-5eed-5eed-5eed-000000000008', tc_mat, 1),
    ('e6e60008-5eed-5eed-5eed-000000000008', tc_ind, 1),
    ('e6e60009-5eed-5eed-5eed-000000000009', tc_mat, 1),
    ('e6e60010-5eed-5eed-5eed-000000000010', tc_mat, 1),
    ('e6e60011-5eed-5eed-5eed-000000000011', tc_kin, 1);

  -- ==========================================================
  -- EST7: Posada Uriondo [SEED] — Uriondo, Alojamiento Tipo A, 5 hab
  -- cap = 2×1 + 2×2 + 1×2 = 8
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est7, 'LIC-SEED-007', 'Posada Uriondo [SEED]', 'Propietario Seed Siete',
     loc_uriondo, cat_aloj_a, true, CURRENT_DATE + INTERVAL '1 year',
     'Calle Viñedos 8, Uriondo', '04-6640087', 'ACTIVO');

  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e7e70001-5eed-5eed-5eed-000000000001', est7, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e7e70002-5eed-5eed-5eed-000000000002', est7, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e7e70003-5eed-5eed-5eed-000000000003', est7, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e7e70004-5eed-5eed-5eed-000000000004', est7, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e7e70005-5eed-5eed-5eed-000000000005', est7, t_mat, 'H-301', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e7e70001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e7e70002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e7e70003-5eed-5eed-5eed-000000000003', tc_ind, 2),
    ('e7e70004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e7e70005-5eed-5eed-5eed-000000000005', tc_mat, 1);

END $$;
SQL
ok "Establecimientos insertados (63 habitaciones en total, 7 municipios)"

# ============================================================
# PASO 2 — BD MOVIMIENTOS: replica cache + partes diarios
#
# habitaciones_replica_cache: refleja las 33 habitaciones
# con capacidad_calculada = suma(tipo_cama.capacidad × cantidad)
#
# partes_diarios: 90 días fijos (2026-01-01 a 2026-03-31) × 3 establecimientos
#   Variación diaria usando ondas sinusoidales → gráficas de línea con curvas reales
#   EST1: 8–20 huéspedes/día (pico carnaval ~Feb 20) → ~1 200 registros
#   EST2: 3–11 huéspedes/día (alto enero, cae en marzo) → ~  650 registros
#   EST3: 2–8  huéspedes/día (oscilación ~mensual)   → ~  450 registros
#   Total:                                           → ~2 300 partes diarios
#
# Distribución de nacionalidades (% aproximado):
#   Bolivia 45%, Argentina 20%, Brasil 10%, Chile 10%,
#   Peru 5%, España 5%, USA 3%, Colombia 2%
#
# Distribución de motivos:
#   Turismo 35%, Negocios 25%, Trabajo 20%,
#   Familiar 10%, Salud 5%, Otro 5%
# ============================================================
info "Insertando réplica de habitaciones y partes diarios (enero–marzo 2026, variación diaria)..."

psql_mov <<'SQL'
BEGIN;
-- Deshabilitamos triggers para la carga masiva:
-- tr_validar_capacidad_habitacion: no aplica a seed (todas las salidas son futuras)
-- tr_audit_partes: evita 3330 filas de auditoría de datos sintéticos
ALTER TABLE public.partes_diarios DISABLE TRIGGER tr_validar_capacidad_habitacion;
ALTER TABLE public.partes_diarios DISABLE TRIGGER tr_audit_partes;

-- ----------------------------------------------------------
-- 2A. habitaciones_replica_cache
-- capacidad_calculada = lo que calcularía el Kafka consumer
-- ----------------------------------------------------------

-- EST1 (cap total = 33)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  -- Individual (cap=1)
  ('e1e10001-5eed-5eed-5eed-000000000001','e1e10000-5eed-5eed-5eed-000000000001','H-101','Individual',1,'LIBRE','1'),
  ('e1e10002-5eed-5eed-5eed-000000000002','e1e10000-5eed-5eed-5eed-000000000001','H-102','Individual',1,'LIBRE','1'),
  ('e1e10003-5eed-5eed-5eed-000000000003','e1e10000-5eed-5eed-5eed-000000000001','H-103','Individual',1,'LIBRE','1'),
  ('e1e10004-5eed-5eed-5eed-000000000004','e1e10000-5eed-5eed-5eed-000000000001','H-104','Individual',1,'LIBRE','1'),
  -- Doble (cap=2)
  ('e1e10005-5eed-5eed-5eed-000000000005','e1e10000-5eed-5eed-5eed-000000000001','H-201','Doble',2,'LIBRE','2'),
  ('e1e10006-5eed-5eed-5eed-000000000006','e1e10000-5eed-5eed-5eed-000000000001','H-202','Doble',2,'LIBRE','2'),
  ('e1e10007-5eed-5eed-5eed-000000000007','e1e10000-5eed-5eed-5eed-000000000001','H-203','Doble',2,'LIBRE','2'),
  ('e1e10008-5eed-5eed-5eed-000000000008','e1e10000-5eed-5eed-5eed-000000000001','H-204','Doble',2,'LIBRE','2'),
  -- Triple (cap=3)
  ('e1e10009-5eed-5eed-5eed-000000000009','e1e10000-5eed-5eed-5eed-000000000001','H-301','Triple',3,'LIBRE','3'),
  ('e1e10010-5eed-5eed-5eed-000000000010','e1e10000-5eed-5eed-5eed-000000000001','H-302','Triple',3,'LIBRE','3'),
  ('e1e10011-5eed-5eed-5eed-000000000011','e1e10000-5eed-5eed-5eed-000000000001','H-303','Triple',3,'LIBRE','3'),
  -- Matrimonial (cap=2)
  ('e1e10012-5eed-5eed-5eed-000000000012','e1e10000-5eed-5eed-5eed-000000000001','H-401','Matrimonial',2,'LIBRE','4'),
  ('e1e10013-5eed-5eed-5eed-000000000013','e1e10000-5eed-5eed-5eed-000000000001','H-402','Matrimonial',2,'LIBRE','4'),
  -- Familiar (cap=4)
  ('e1e10014-5eed-5eed-5eed-000000000014','e1e10000-5eed-5eed-5eed-000000000001','H-501','Familiar',4,'LIBRE','5'),
  ('e1e10015-5eed-5eed-5eed-000000000015','e1e10000-5eed-5eed-5eed-000000000001','H-502','Familiar',4,'LIBRE','5');

-- EST2 (cap total = 19)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e2e20001-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002','H-101','Individual',1,'LIBRE','1'),
  ('e2e20002-5eed-5eed-5eed-000000000002','e2e20000-5eed-5eed-5eed-000000000002','H-102','Individual',1,'LIBRE','1'),
  ('e2e20003-5eed-5eed-5eed-000000000003','e2e20000-5eed-5eed-5eed-000000000002','H-103','Individual',1,'LIBRE','1'),
  ('e2e20004-5eed-5eed-5eed-000000000004','e2e20000-5eed-5eed-5eed-000000000002','H-201','Doble',2,'LIBRE','2'),
  ('e2e20005-5eed-5eed-5eed-000000000005','e2e20000-5eed-5eed-5eed-000000000002','H-202','Doble',2,'LIBRE','2'),
  ('e2e20006-5eed-5eed-5eed-000000000006','e2e20000-5eed-5eed-5eed-000000000002','H-203','Doble',2,'LIBRE','2'),
  ('e2e20007-5eed-5eed-5eed-000000000007','e2e20000-5eed-5eed-5eed-000000000002','H-204','Doble',2,'LIBRE','2'),
  ('e2e20008-5eed-5eed-5eed-000000000008','e2e20000-5eed-5eed-5eed-000000000002','H-301','Triple',3,'LIBRE','3'),
  ('e2e20009-5eed-5eed-5eed-000000000009','e2e20000-5eed-5eed-5eed-000000000002','H-302','Triple',3,'LIBRE','3'),
  ('e2e20010-5eed-5eed-5eed-000000000010','e2e20000-5eed-5eed-5eed-000000000002','H-401','Suite',2,'LIBRE','4');

-- EST3 (cap total = 13)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e3e30001-5eed-5eed-5eed-000000000001','e3e30000-5eed-5eed-5eed-000000000003','H-101','Individual',1,'LIBRE','1'),
  ('e3e30002-5eed-5eed-5eed-000000000002','e3e30000-5eed-5eed-5eed-000000000003','H-102','Individual',1,'LIBRE','1'),
  ('e3e30003-5eed-5eed-5eed-000000000003','e3e30000-5eed-5eed-5eed-000000000003','H-103','Individual',1,'LIBRE','1'),
  ('e3e30004-5eed-5eed-5eed-000000000004','e3e30000-5eed-5eed-5eed-000000000003','H-201','Doble',2,'LIBRE','2'),
  ('e3e30005-5eed-5eed-5eed-000000000005','e3e30000-5eed-5eed-5eed-000000000003','H-202','Doble',2,'LIBRE','2'),
  ('e3e30006-5eed-5eed-5eed-000000000006','e3e30000-5eed-5eed-5eed-000000000003','H-203','Doble',2,'LIBRE','2'),
  ('e3e30007-5eed-5eed-5eed-000000000007','e3e30000-5eed-5eed-5eed-000000000003','H-301','Matrimonial',2,'LIBRE','3'),
  ('e3e30008-5eed-5eed-5eed-000000000008','e3e30000-5eed-5eed-5eed-000000000003','H-302','Matrimonial',2,'LIBRE','3');

-- EST4 (Bermejo, cap total = 15)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e4e40001-5eed-5eed-5eed-000000000001','e4e40000-5eed-5eed-5eed-000000000004','H-101','Individual',1,'LIBRE','1'),
  ('e4e40002-5eed-5eed-5eed-000000000002','e4e40000-5eed-5eed-5eed-000000000004','H-102','Individual',1,'LIBRE','1'),
  ('e4e40003-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004','H-103','Individual',1,'LIBRE','1'),
  ('e4e40004-5eed-5eed-5eed-000000000004','e4e40000-5eed-5eed-5eed-000000000004','H-201','Doble',2,'LIBRE','2'),
  ('e4e40005-5eed-5eed-5eed-000000000005','e4e40000-5eed-5eed-5eed-000000000004','H-202','Doble',2,'LIBRE','2'),
  ('e4e40006-5eed-5eed-5eed-000000000006','e4e40000-5eed-5eed-5eed-000000000004','H-203','Doble',2,'LIBRE','2'),
  ('e4e40007-5eed-5eed-5eed-000000000007','e4e40000-5eed-5eed-5eed-000000000004','H-301','Triple',3,'LIBRE','3'),
  ('e4e40008-5eed-5eed-5eed-000000000008','e4e40000-5eed-5eed-5eed-000000000004','H-302','Triple',3,'LIBRE','3');

-- EST5 (Entre Ríos, cap total = 10)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e5e50001-5eed-5eed-5eed-000000000001','e5e50000-5eed-5eed-5eed-000000000005','H-101','Individual',1,'LIBRE','1'),
  ('e5e50002-5eed-5eed-5eed-000000000002','e5e50000-5eed-5eed-5eed-000000000005','H-102','Individual',1,'LIBRE','1'),
  ('e5e50003-5eed-5eed-5eed-000000000003','e5e50000-5eed-5eed-5eed-000000000005','H-201','Doble',2,'LIBRE','2'),
  ('e5e50004-5eed-5eed-5eed-000000000004','e5e50000-5eed-5eed-5eed-000000000005','H-202','Doble',2,'LIBRE','2'),
  ('e5e50005-5eed-5eed-5eed-000000000005','e5e50000-5eed-5eed-5eed-000000000005','H-203','Doble',2,'LIBRE','2'),
  ('e5e50006-5eed-5eed-5eed-000000000006','e5e50000-5eed-5eed-5eed-000000000005','H-301','Matrimonial',2,'LIBRE','3');

-- EST6 (Villa Montes, cap total = 22)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e6e60001-5eed-5eed-5eed-000000000001','e6e60000-5eed-5eed-5eed-000000000006','H-101','Individual',1,'LIBRE','1'),
  ('e6e60002-5eed-5eed-5eed-000000000002','e6e60000-5eed-5eed-5eed-000000000006','H-102','Individual',1,'LIBRE','1'),
  ('e6e60003-5eed-5eed-5eed-000000000003','e6e60000-5eed-5eed-5eed-000000000006','H-201','Doble',2,'LIBRE','2'),
  ('e6e60004-5eed-5eed-5eed-000000000004','e6e60000-5eed-5eed-5eed-000000000006','H-202','Doble',2,'LIBRE','2'),
  ('e6e60005-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006','H-203','Doble',2,'LIBRE','2'),
  ('e6e60006-5eed-5eed-5eed-000000000006','e6e60000-5eed-5eed-5eed-000000000006','H-204','Doble',2,'LIBRE','2'),
  ('e6e60007-5eed-5eed-5eed-000000000007','e6e60000-5eed-5eed-5eed-000000000006','H-301','Triple',3,'LIBRE','3'),
  ('e6e60008-5eed-5eed-5eed-000000000008','e6e60000-5eed-5eed-5eed-000000000006','H-302','Triple',3,'LIBRE','3'),
  ('e6e60009-5eed-5eed-5eed-000000000009','e6e60000-5eed-5eed-5eed-000000000006','H-401','Matrimonial',2,'LIBRE','4'),
  ('e6e60010-5eed-5eed-5eed-000000000010','e6e60000-5eed-5eed-5eed-000000000006','H-402','Matrimonial',2,'LIBRE','4'),
  ('e6e60011-5eed-5eed-5eed-000000000011','e6e60000-5eed-5eed-5eed-000000000006','H-501','Suite',2,'LIBRE','5');

-- EST7 (Uriondo, cap total = 8)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e7e70001-5eed-5eed-5eed-000000000001','e7e70000-5eed-5eed-5eed-000000000007','H-101','Individual',1,'LIBRE','1'),
  ('e7e70002-5eed-5eed-5eed-000000000002','e7e70000-5eed-5eed-5eed-000000000007','H-102','Individual',1,'LIBRE','1'),
  ('e7e70003-5eed-5eed-5eed-000000000003','e7e70000-5eed-5eed-5eed-000000000007','H-201','Doble',2,'LIBRE','2'),
  ('e7e70004-5eed-5eed-5eed-000000000004','e7e70000-5eed-5eed-5eed-000000000007','H-202','Doble',2,'LIBRE','2'),
  ('e7e70005-5eed-5eed-5eed-000000000005','e7e70000-5eed-5eed-5eed-000000000007','H-301','Matrimonial',2,'LIBRE','3');

-- ----------------------------------------------------------
-- 2B. partes_diarios
--
-- Técnica: generate_series(90 días) × generate_series(N huéspedes/día)
-- day_idx = días desde el inicio de la ventana (0..89)
-- Las distribuciones de país y motivo usan (day_idx * K + n * J) % 20
-- para un patrón pseudo-variado pero determinista.
--
-- País (array 20 elem, 0-indexado via %20):
--   [0..8]  → Bolivia (1)    45%
--   [9..12] → Argentina (2)  20%
--   [13,14] → Brasil (3)     10%
--   [15,16] → Chile (4)      10%
--   [17]    → Perú (8)        5%
--   [18]    → España (12)     5%
--   [19]    → USA (11)        5%
--
-- Motivo (array 20 elem):
--   [0..6]  → Turismo (1)   35%
--   [7..11] → Negocios (2)  25%
--   [12..15]→ Trabajo (3)   20%
--   [16,17] → Familiar (6)  10%
--   [18]    → Salud (4)      5%
--   [19]    → Otro (10)      5%
--
-- Estadía: 1–3 noches según (n + day_idx) % 3 + 1
-- Ingreso: fecha + (8..21)h según (day_idx*7 + n*3) % 14 + 8
-- Salida nula: huéspedes de los últimos 2 días con n%5=0 (~20%)
-- ----------------------------------------------------------

-- EST1: 8–20 huéspedes/día, pico carnaval ~Feb 20 (ocupación 24%–60%)
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e1e10000-5eed-5eed-5eed-000000000001'::uuid,
  -- 15 habitaciones, rotación por índice
  (ARRAY[
    'e1e10001-5eed-5eed-5eed-000000000001'::uuid,
    'e1e10002-5eed-5eed-5eed-000000000002'::uuid,
    'e1e10003-5eed-5eed-5eed-000000000003'::uuid,
    'e1e10004-5eed-5eed-5eed-000000000004'::uuid,
    'e1e10005-5eed-5eed-5eed-000000000005'::uuid,
    'e1e10006-5eed-5eed-5eed-000000000006'::uuid,
    'e1e10007-5eed-5eed-5eed-000000000007'::uuid,
    'e1e10008-5eed-5eed-5eed-000000000008'::uuid,
    'e1e10009-5eed-5eed-5eed-000000000009'::uuid,
    'e1e10010-5eed-5eed-5eed-000000000010'::uuid,
    'e1e10011-5eed-5eed-5eed-000000000011'::uuid,
    'e1e10012-5eed-5eed-5eed-000000000012'::uuid,
    'e1e10013-5eed-5eed-5eed-000000000013'::uuid,
    'e1e10014-5eed-5eed-5eed-000000000014'::uuid,
    'e1e10015-5eed-5eed-5eed-000000000015'::uuid
  ])[(t.n - 1) % 15 + 1],
  NULL,
  t.fecha,
  t.fecha::timestamp + ((t.day_idx * 7 + t.n * 3) % 14 + 8 || ' hours')::interval,
  t.fecha::timestamp
    + ((t.day_idx * 7 + t.n * 3) % 14 + 8 || ' hours')::interval
    + ((t.n + t.day_idx) % 3 + 1 || ' days')::interval,
  -- país
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,12,11])
    [(t.day_idx * 3 + t.n * 7) % 20 + 1],
  -- localidad (obligatoria si país=1/Bolivia, NULL para extranjeros)
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,12,11])
              [(t.day_idx * 3 + t.n * 7) % 20 + 1] = 1
    THEN (t.day_idx * 5 + t.n * 11) % 11 + 1
    ELSE NULL
  END,
  -- motivo
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,6,6,4,10])
    [(t.day_idx * 7 + t.n * 3) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-104',
         'H-201','H-202','H-203','H-204',
         'H-301','H-302','H-303',
         'H-401','H-402',
         'H-501','H-502'])
    [(t.n - 1) % 15 + 1],
  (ARRAY['Individual','Individual','Individual','Individual',
         'Doble','Doble','Doble','Doble',
         'Triple','Triple','Triple',
         'Matrimonial','Matrimonial',
         'Familiar','Familiar'])
    [(t.n - 1) % 15 + 1],
  'ACTIVO'
FROM (
  SELECT
    d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx,
    g.n,
    -- Onda: mínimo ~8 en enero, pico 20 en carnaval (~20-feb = día 50), baja a 10 en marzo
    (8 + round(12 * (0.5 + 0.5 * sin((d::date - '2026-01-01'::date)::float * pi() / 60 - pi() / 3))))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 20) g(n)
) t
WHERE t.n <= t.load;

-- EST2: 3–11 huéspedes/día, alto en enero (negocios inicio de año), cae en marzo
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e2e20000-5eed-5eed-5eed-000000000002'::uuid,
  (ARRAY[
    'e2e20001-5eed-5eed-5eed-000000000001'::uuid,
    'e2e20002-5eed-5eed-5eed-000000000002'::uuid,
    'e2e20003-5eed-5eed-5eed-000000000003'::uuid,
    'e2e20004-5eed-5eed-5eed-000000000004'::uuid,
    'e2e20005-5eed-5eed-5eed-000000000005'::uuid,
    'e2e20006-5eed-5eed-5eed-000000000006'::uuid,
    'e2e20007-5eed-5eed-5eed-000000000007'::uuid,
    'e2e20008-5eed-5eed-5eed-000000000008'::uuid,
    'e2e20009-5eed-5eed-5eed-000000000009'::uuid,
    'e2e20010-5eed-5eed-5eed-000000000010'::uuid
  ])[(t.n - 1) % 10 + 1],
  NULL,
  t.fecha,
  t.fecha::timestamp + ((t.day_idx * 5 + t.n * 11) % 14 + 8 || ' hours')::interval,
  t.fecha::timestamp
    + ((t.day_idx * 5 + t.n * 11) % 14 + 8 || ' hours')::interval
    + ((t.n + t.day_idx) % 3 + 1 || ' days')::interval,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,8,12,11])
    [(t.day_idx * 11 + t.n * 5) % 20 + 1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,8,12,11])
              [(t.day_idx * 11 + t.n * 5) % 20 + 1] = 1
    THEN (t.day_idx * 7 + t.n * 13) % 11 + 1
    ELSE NULL
  END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,6,6,4,10,10])
    [(t.day_idx * 5 + t.n * 11) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103',
         'H-201','H-202','H-203','H-204',
         'H-301','H-302',
         'H-401'])
    [(t.n - 1) % 10 + 1],
  (ARRAY['Individual','Individual','Individual',
         'Doble','Doble','Doble','Doble',
         'Triple','Triple',
         'Suite'])
    [(t.n - 1) % 10 + 1],
  'ACTIVO'
FROM (
  SELECT
    d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx,
    g.n,
    -- Onda: empieza alto (11 en enero), decrece hacia 3 en marzo, leve rebote en carnaval
    (3 + round(8 * (0.5 + 0.5 * cos((d::date - '2026-01-01'::date)::float * pi() / 89) + 0.0)))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 11) g(n)
) t
WHERE t.n <= t.load;

-- EST3: 2–8 huéspedes/día, oscilación periódica ~mensual (patrón distinto)
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e3e30000-5eed-5eed-5eed-000000000003'::uuid,
  (ARRAY[
    'e3e30001-5eed-5eed-5eed-000000000001'::uuid,
    'e3e30002-5eed-5eed-5eed-000000000002'::uuid,
    'e3e30003-5eed-5eed-5eed-000000000003'::uuid,
    'e3e30004-5eed-5eed-5eed-000000000004'::uuid,
    'e3e30005-5eed-5eed-5eed-000000000005'::uuid,
    'e3e30006-5eed-5eed-5eed-000000000006'::uuid,
    'e3e30007-5eed-5eed-5eed-000000000007'::uuid,
    'e3e30008-5eed-5eed-5eed-000000000008'::uuid
  ])[(t.n - 1) % 8 + 1],
  NULL,
  t.fecha,
  t.fecha::timestamp + ((t.day_idx * 13 + t.n * 5) % 12 + 9 || ' hours')::interval,
  t.fecha::timestamp
    + ((t.day_idx * 13 + t.n * 5) % 12 + 9 || ' hours')::interval
    + ((t.n + t.day_idx) % 2 + 1 || ' days')::interval,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,12,11])
    [(t.day_idx * 7 + t.n * 13) % 20 + 1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,12,11])
              [(t.day_idx * 7 + t.n * 13) % 20 + 1] = 1
    THEN (t.day_idx * 11 + t.n * 7) % 11 + 1
    ELSE NULL
  END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,3,3,3,3,6,6,4,10,10,10])
    [(t.day_idx * 13 + t.n * 7) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103',
         'H-201','H-202','H-203',
         'H-301','H-302'])
    [(t.n - 1) % 8 + 1],
  (ARRAY['Individual','Individual','Individual',
         'Doble','Doble','Doble',
         'Matrimonial','Matrimonial'])
    [(t.n - 1) % 8 + 1],
  'ACTIVO'
FROM (
  SELECT
    d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx,
    g.n,
    -- Onda: oscilación ~mensual (período 30 días), entre 2 y 8 huéspedes
    (2 + round(6 * abs(sin((d::date - '2026-01-01'::date)::float * pi() / 30))))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 8) g(n)
) t
WHERE t.n <= t.load;

-- EST4: 3–8 huéspedes/día, tendencia creciente (Bermejo, frontera Argentina)
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e4e40000-5eed-5eed-5eed-000000000004'::uuid,
  (ARRAY[
    'e4e40001-5eed-5eed-5eed-000000000001'::uuid,
    'e4e40002-5eed-5eed-5eed-000000000002'::uuid,
    'e4e40003-5eed-5eed-5eed-000000000003'::uuid,
    'e4e40004-5eed-5eed-5eed-000000000004'::uuid,
    'e4e40005-5eed-5eed-5eed-000000000005'::uuid,
    'e4e40006-5eed-5eed-5eed-000000000006'::uuid,
    'e4e40007-5eed-5eed-5eed-000000000007'::uuid,
    'e4e40008-5eed-5eed-5eed-000000000008'::uuid
  ])[(t.n - 1) % 8 + 1],
  NULL, t.fecha,
  t.fecha::timestamp + ((t.day_idx * 9 + t.n * 7) % 13 + 8 || ' hours')::interval,
  t.fecha::timestamp + ((t.day_idx * 9 + t.n * 7) % 13 + 8 || ' hours')::interval
    + ((t.n + t.day_idx) % 3 + 1 || ' days')::interval,
  -- Bermejo fronterizo: más Argentina y Bolivia, algo de Paraguay
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,2,3,3,4,4,8,8,12,11])
    [(t.day_idx * 9 + t.n * 11) % 20 + 1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,2,2,2,2,2,2,3,3,4,4,8,8,12,11])
              [(t.day_idx * 9 + t.n * 11) % 20 + 1] = 1
    THEN (t.day_idx * 5 + t.n * 9) % 11 + 1 ELSE NULL END,
  (ARRAY[1,1,1,1,2,2,2,2,2,3,3,3,3,3,6,6,4,4,10,10])
    [(t.day_idx * 11 + t.n * 9) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-301','H-302'])[(t.n - 1) % 8 + 1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Triple','Triple'])[(t.n - 1) % 8 + 1],
  'ACTIVO'
FROM (
  SELECT d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx, g.n,
    -- Tendencia creciente lineal: de 3 en enero a 8 en marzo
    (3 + round(5 * (d::date - '2026-01-01'::date)::float / 89))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 8) g(n)
) t
WHERE t.n <= t.load;

-- EST5: 2–6 huéspedes/día, bimodal (Entre Ríos, turismo de aventura)
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e5e50000-5eed-5eed-5eed-000000000005'::uuid,
  (ARRAY[
    'e5e50001-5eed-5eed-5eed-000000000001'::uuid,
    'e5e50002-5eed-5eed-5eed-000000000002'::uuid,
    'e5e50003-5eed-5eed-5eed-000000000003'::uuid,
    'e5e50004-5eed-5eed-5eed-000000000004'::uuid,
    'e5e50005-5eed-5eed-5eed-000000000005'::uuid,
    'e5e50006-5eed-5eed-5eed-000000000006'::uuid
  ])[(t.n - 1) % 6 + 1],
  NULL, t.fecha,
  t.fecha::timestamp + ((t.day_idx * 7 + t.n * 11) % 12 + 9 || ' hours')::interval,
  t.fecha::timestamp + ((t.day_idx * 7 + t.n * 11) % 12 + 9 || ' hours')::interval
    + ((t.n + t.day_idx) % 2 + 1 || ' days')::interval,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11])
    [(t.day_idx * 13 + t.n * 7) % 20 + 1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11])
              [(t.day_idx * 13 + t.n * 7) % 20 + 1] = 1
    THEN (t.day_idx * 7 + t.n * 11) % 11 + 1 ELSE NULL END,
  -- Turismo prevalente (aventura)
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,3,6,6,6,4,10,10])
    [(t.day_idx * 7 + t.n * 13) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-301'])[(t.n - 1) % 6 + 1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Matrimonial'])[(t.n - 1) % 6 + 1],
  'ACTIVO'
FROM (
  SELECT d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx, g.n,
    -- Bimodal: picos alrededor de día 20 (ene) y día 65 (mar)
    (2 + round(4 * abs(sin((d::date - '2026-01-01'::date)::float * pi() / 40))))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 6) g(n)
) t
WHERE t.n <= t.load;

-- EST6: 5–14 huéspedes/día, alto en verano (Villa Montes, calor extremo en verano)
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e6e60000-5eed-5eed-5eed-000000000006'::uuid,
  (ARRAY[
    'e6e60001-5eed-5eed-5eed-000000000001'::uuid,
    'e6e60002-5eed-5eed-5eed-000000000002'::uuid,
    'e6e60003-5eed-5eed-5eed-000000000003'::uuid,
    'e6e60004-5eed-5eed-5eed-000000000004'::uuid,
    'e6e60005-5eed-5eed-5eed-000000000005'::uuid,
    'e6e60006-5eed-5eed-5eed-000000000006'::uuid,
    'e6e60007-5eed-5eed-5eed-000000000007'::uuid,
    'e6e60008-5eed-5eed-5eed-000000000008'::uuid,
    'e6e60009-5eed-5eed-5eed-000000000009'::uuid,
    'e6e60010-5eed-5eed-5eed-000000000010'::uuid,
    'e6e60011-5eed-5eed-5eed-000000000011'::uuid
  ])[(t.n - 1) % 11 + 1],
  NULL, t.fecha,
  t.fecha::timestamp + ((t.day_idx * 5 + t.n * 9) % 14 + 8 || ' hours')::interval,
  t.fecha::timestamp + ((t.day_idx * 5 + t.n * 9) % 14 + 8 || ' hours')::interval
    + ((t.n + t.day_idx) % 3 + 1 || ' days')::interval,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,8,12,11])
    [(t.day_idx * 5 + t.n * 13) % 20 + 1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,8,12,11])
              [(t.day_idx * 5 + t.n * 13) % 20 + 1] = 1
    THEN (t.day_idx * 9 + t.n * 5) % 11 + 1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,2,2,3,3,3,3,6,6,4,4,10,10,10])
    [(t.day_idx * 9 + t.n * 5) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-204','H-301','H-302','H-401','H-402','H-501'])[(t.n - 1) % 11 + 1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Doble','Triple','Triple','Matrimonial','Matrimonial','Suite'])[(t.n - 1) % 11 + 1],
  'ACTIVO'
FROM (
  SELECT d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx, g.n,
    -- Alto en enero (verano/calor), baja gradualmente hacia marzo
    (5 + round(9 * (0.5 + 0.45 * cos((d::date - '2026-01-01'::date)::float * pi() / 89))))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 14) g(n)
) t
WHERE t.n <= t.load;

-- EST7: 2–5 huéspedes/día, oscilación pequeña (Uriondo, viñedos, turismo bajo)
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e7e70000-5eed-5eed-5eed-000000000007'::uuid,
  (ARRAY[
    'e7e70001-5eed-5eed-5eed-000000000001'::uuid,
    'e7e70002-5eed-5eed-5eed-000000000002'::uuid,
    'e7e70003-5eed-5eed-5eed-000000000003'::uuid,
    'e7e70004-5eed-5eed-5eed-000000000004'::uuid,
    'e7e70005-5eed-5eed-5eed-000000000005'::uuid
  ])[(t.n - 1) % 5 + 1],
  NULL, t.fecha,
  t.fecha::timestamp + ((t.day_idx * 11 + t.n * 7) % 11 + 9 || ' hours')::interval,
  t.fecha::timestamp + ((t.day_idx * 11 + t.n * 7) % 11 + 9 || ' hours')::interval
    + ((t.n + t.day_idx) % 2 + 1 || ' days')::interval,
  (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11])
    [(t.day_idx * 11 + t.n * 7) % 20 + 1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11])
              [(t.day_idx * 11 + t.n * 7) % 20 + 1] = 1
    THEN (t.day_idx * 7 + t.n * 11) % 11 + 1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,3,3,6,6,6,4,4,10,10,10])
    [(t.day_idx * 7 + t.n * 11) % 20 + 1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-301'])[(t.n - 1) % 5 + 1],
  (ARRAY['Individual','Individual','Doble','Doble','Matrimonial'])[(t.n - 1) % 5 + 1],
  'ACTIVO'
FROM (
  SELECT d::date AS fecha,
    (d::date - '2026-01-01'::date)::int AS day_idx, g.n,
    -- Pequeña oscilación mensual, capacidad limitada
    (2 + round(3 * abs(sin((d::date - '2026-01-01'::date)::float * pi() / 25))))::int AS load
  FROM generate_series('2026-01-01'::date, '2026-03-31'::date, '1 day'::interval) d
  CROSS JOIN generate_series(1, 5) g(n)
) t
WHERE t.n <= t.load;

-- Restaurar triggers
ALTER TABLE public.partes_diarios ENABLE TRIGGER tr_validar_capacidad_habitacion;
ALTER TABLE public.partes_diarios ENABLE TRIGGER tr_audit_partes;

-- Corrección de capacidad_calculada: el Kafka consumer puede haber sobreescrito los valores
-- antes de procesar los eventos de habitacion_camas. Este UPDATE fuerza los valores correctos.
UPDATE public.habitaciones_replica_cache
SET capacidad_calculada = CASE tipo_habitacion
  WHEN 'Individual'   THEN 1
  WHEN 'Doble'        THEN 2
  WHEN 'Triple'       THEN 3
  WHEN 'Matrimonial'  THEN 2
  WHEN 'Familiar'     THEN 4
  WHEN 'Suite'        THEN 2
  ELSE capacidad_calculada
END
WHERE establecimiento_id IN (
  'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
  'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
  'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
  'e7e70000-5eed-5eed-5eed-000000000007'
);

COMMIT;
SQL
ok "Réplica y partes diarios insertados"

# ============================================================
# PASO 3 — RESUMEN
# ============================================================
echo
info "Resumen del seed:"
psql_mov -t <<'SQL'
SELECT
  '  Establecimientos (replica):' AS concepto,
  COUNT(DISTINCT establecimiento_id)::text AS valor
FROM public.habitaciones_replica_cache
WHERE establecimiento_id IN (
  'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
  'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
  'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
  'e7e70000-5eed-5eed-5eed-000000000007'
)
UNION ALL
SELECT '  Habitaciones en cache:',
  COUNT(*)::text
  FROM public.habitaciones_replica_cache
  WHERE establecimiento_id IN (
    'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
    'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
    'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
    'e7e70000-5eed-5eed-5eed-000000000007'
  )
UNION ALL
SELECT '  Capacidad total (camas):',
  SUM(capacidad_calculada)::text
  FROM public.habitaciones_replica_cache
  WHERE establecimiento_id IN (
    'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
    'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
    'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
    'e7e70000-5eed-5eed-5eed-000000000007'
  )
UNION ALL
SELECT '  Partes diarios insertados:',
  COUNT(*)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
UNION ALL
SELECT '  Rango de fechas:',
  MIN(fecha_reporte)::text || ' → ' || MAX(fecha_reporte)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
UNION ALL
SELECT '  Países distintos:',
  COUNT(DISTINCT pais_procedencia_id)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001';
SQL

echo
ok "${BOLD}Seed completado. Los 7 establecimientos (7 municipios de Tarija) aparecen${NC}"
ok "${BOLD}en el desplegable de Estadísticas filtrado por departamento Tarija.${NC}"
echo -e "  Para limpiar sin reinsertar: ${YELLOW}bash db_script_local/seed-estadisticas.sh --clean${NC}"
