#!/usr/bin/env bash
# ============================================================
# SISPARDT — Datos de prueba para pantalla Estadisticas
#
# Crea 27 establecimientos en los 10 municipios de Tarija con
# habitaciones y partes diarios con distribucion realista de
# nacionalidades, motivos de viaje y tipos de habitacion.
# Genera datos desde 2026-01-01 hasta CURRENT_DATE.
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

info() { echo -e "${CYAN}[datos]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}   $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
fail() { echo -e "${RED}[error]${NC} $*" >&2; exit 1; }
psql_est() { docker exec -i "$CONTAINER_EST" psql -U "$PG_USER" -d "$DB_EST" -v ON_ERROR_STOP=1 "$@"; }
psql_mov() { docker exec -i "$CONTAINER_MOV" psql -U "$PG_USER" -d "$DB_MOV" -v ON_ERROR_STOP=1 "$@"; }

# ---- verificar contenedores --------------------------------
for c in "$CONTAINER_EST" "$CONTAINER_MOV"; do
  docker inspect "$c" --format '{{.State.Running}}' 2>/dev/null | grep -q true \
    || fail "Contenedor $c no esta corriendo. Levanta las BDs primero con:\n  docker compose -f docker-compose.db.yml up -d"
done

CLEAN_ONLY="${1:-}"

# ============================================================
# PASO 0 — LIMPIEZA (siempre, antes de reinsertar)
# Los UUIDs son fijos — esto es idempotente.
# ============================================================
info "Limpiando datos de prueba anteriores..."

psql_mov <<'SQL'
BEGIN;
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
    'e7e70000-5eed-5eed-5eed-000000000007'::uuid,
    'e8e80000-5eed-5eed-5eed-000000000008'::uuid,
    'e9e90000-5eed-5eed-5eed-000000000009'::uuid,
    'eaaa0000-5eed-5eed-5eed-00000000000a'::uuid,
    'ebbb0000-5eed-5eed-5eed-00000000000b'::uuid,
    'eccc0000-5eed-5eed-5eed-00000000000c'::uuid,
    'eddd0000-5eed-5eed-5eed-00000000000d'::uuid,
    'eeee0000-5eed-5eed-5eed-00000000000e'::uuid,
    'efff0000-5eed-5eed-5eed-00000000000f'::uuid,
    'f1f10000-5eed-5eed-5eed-000000000010'::uuid,
    'f2f20000-5eed-5eed-5eed-000000000011'::uuid,
    'f3f30000-5eed-5eed-5eed-000000000012'::uuid,
    'f4f40000-5eed-5eed-5eed-000000000013'::uuid,
    'f5f50000-5eed-5eed-5eed-000000000014'::uuid,
    'f6f60000-5eed-5eed-5eed-000000000015'::uuid,
    'f7f70000-5eed-5eed-5eed-000000000016'::uuid,
    'f8f80000-5eed-5eed-5eed-000000000017'::uuid,
    'f9f90000-5eed-5eed-5eed-000000000018'::uuid,
    'fafa0000-5eed-5eed-5eed-000000000019'::uuid,
    'fbfb0000-5eed-5eed-5eed-00000000001a'::uuid,
    'fcfc0000-5eed-5eed-5eed-00000000001b'::uuid
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
    'e7e70000-5eed-5eed-5eed-000000000007'::uuid,
    'e8e80000-5eed-5eed-5eed-000000000008'::uuid,
    'e9e90000-5eed-5eed-5eed-000000000009'::uuid,
    'eaaa0000-5eed-5eed-5eed-00000000000a'::uuid,
    'ebbb0000-5eed-5eed-5eed-00000000000b'::uuid,
    'eccc0000-5eed-5eed-5eed-00000000000c'::uuid,
    'eddd0000-5eed-5eed-5eed-00000000000d'::uuid,
    'eeee0000-5eed-5eed-5eed-00000000000e'::uuid,
    'efff0000-5eed-5eed-5eed-00000000000f'::uuid,
    'f1f10000-5eed-5eed-5eed-000000000010'::uuid,
    'f2f20000-5eed-5eed-5eed-000000000011'::uuid,
    'f3f30000-5eed-5eed-5eed-000000000012'::uuid,
    'f4f40000-5eed-5eed-5eed-000000000013'::uuid,
    'f5f50000-5eed-5eed-5eed-000000000014'::uuid,
    'f6f60000-5eed-5eed-5eed-000000000015'::uuid,
    'f7f70000-5eed-5eed-5eed-000000000016'::uuid,
    'f8f80000-5eed-5eed-5eed-000000000017'::uuid,
    'f9f90000-5eed-5eed-5eed-000000000018'::uuid,
    'fafa0000-5eed-5eed-5eed-000000000019'::uuid,
    'fbfb0000-5eed-5eed-5eed-00000000001a'::uuid,
    'fcfc0000-5eed-5eed-5eed-00000000001b'::uuid
  );
COMMIT;
SQL
ok "Establecimientos limpiados (cascade a habitaciones y camas)"

[[ "$CLEAN_ONLY" == "--clean" ]] && { echo; ok "${BOLD}Modo --clean: listo.${NC}"; exit 0; }

# ============================================================
# PASO 1 — BD ESTABLECIMIENTOS
# 27 establecimientos en 10 municipios de Tarija con habitaciones y camas.
#
# EST1  Hotel Victoria             — Tarija,       3 Estrellas, 15 hab, cap=33
# EST2  Hostal del Chaco           — Yacuiba,      2 Estrellas, 10 hab, cap=19
# EST3  Alojamiento Las Flores     — San Lorenzo,  Tipo A,       8 hab, cap=13
# EST4  Hostal del Sur             — Bermejo,      2 Estrellas,  8 hab, cap=15
# EST5  Alojamiento El Valle       — Entre Rios,   Tipo A,       6 hab, cap=10
# EST6  Hotel Gran Villamontes     — Villa Montes, 3 Estrellas, 11 hab, cap=22
# EST7  Posada Uriondo             — Uriondo,      Tipo A,       5 hab, cap=8
# EST8  Hotel Tarija Plaza         — Tarija,       3 Estrellas,  9 hab, cap=19
# EST9  Hostal San Jacinto         — Tarija,       2 Estrellas,  7 hab, cap=11
# EST10 Hotel Gran Yacuiba         — Yacuiba,      3 Estrellas,  9 hab, cap=16
# EST11 Alojamiento Frontera Norte — Yacuiba,      Tipo A,       5 hab, cap=8
# EST12 Hostal Colonial            — San Lorenzo,  2 Estrellas,  6 hab, cap=9
# EST13 Alojamiento La Hacienda    — San Lorenzo,  Tipo A,       4 hab, cap=6
# EST14 Hotel Bermejo Palace       — Bermejo,      3 Estrellas,  8 hab, cap=16
# EST15 Alojamiento La Ceiba       — Bermejo,      Tipo A,       5 hab, cap=7
# EST16 Hostal El Rio Verde        — Entre Rios,   2 Estrellas,  6 hab, cap=10
# EST17 Posada La Selva            — Entre Rios,   Tipo A,       4 hab, cap=6
# EST18 Hostal El Petrolero        — Villa Montes, 2 Estrellas,  7 hab, cap=11
# EST19 Alojamiento Chaco Boreal   — Villa Montes, Tipo A,       5 hab, cap=8
# EST20 Hostal Los Vinedos         — Uriondo,      2 Estrellas,  5 hab, cap=8
# EST21 Cabana Don Jose            — Uriondo,      Tipo A,       4 hab, cap=6
# EST22 Hostal La Frontera         — Padcaya,      2 Estrellas,  6 hab, cap=9
# EST23 Alojamiento San Jose       — Padcaya,      Tipo A,       4 hab, cap=6
# EST24 Hotel Aguarague            — Carapari,     3 Estrellas,  7 hab, cap=13
# EST25 Alojamiento El Gas         — Carapari,     Tipo A,       4 hab, cap=6
# EST26 Hostal El Puente           — El Puente,    2 Estrellas,  5 hab, cap=8
# EST27 Alojamiento Mendez         — El Puente,    Tipo A,       4 hab, cap=6
# ============================================================
info "Insertando establecimientos, habitaciones y camas..."

psql_est <<'SQL'
DO $$
DECLARE
  -- IDs fijos de establecimientos
  est1 uuid := 'e1e10000-5eed-5eed-5eed-000000000001';
  est2 uuid := 'e2e20000-5eed-5eed-5eed-000000000002';
  est3 uuid := 'e3e30000-5eed-5eed-5eed-000000000003';

  -- Localidades (resueltas dinamicamente del geo-catalog)
  loc_tarija     integer;
  loc_yacuiba    integer;
  loc_sanlorenzo integer;

  -- Categorias
  cat_hotel3  integer;
  cat_hostal2 integer;
  cat_aloj_a  integer;

  -- Tipos de habitacion
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
      'Localidad "Tarija" no encontrada. Corriste 03-datos-geograficos.sql?';
  END IF;
  IF loc_yacuiba IS NULL THEN
    RAISE WARNING 'Localidad "Yacuiba" no encontrada; EST2 usara localidad de Tarija.';
    loc_yacuiba := loc_tarija;
  END IF;
  IF loc_sanlorenzo IS NULL THEN
    RAISE WARNING 'Localidad "San Lorenzo" no encontrada; EST3 usara localidad de Tarija.';
    loc_sanlorenzo := loc_tarija;
  END IF;

  -- Categorias
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

  -- Tipos de habitacion
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
  -- EST1: Hotel Victoria — Tarija, 3 Estrellas, 15 hab
  -- cap = 4x1 + 4x2 + 3x3 + 2x2 + 2x4 = 33
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est1, 'LIC-001', 'Hotel Victoria', 'Inversiones Hoteleras del Sur S.R.L.',
     loc_tarija, cat_hotel3, true, CURRENT_DATE + INTERVAL '1 year',
     'Av. La Madrid 245, Tarija', '04-6641234', 'ACTIVO');

  -- Individual x4 (1 cama Individual = 1p)
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

  -- Doble x4 (2 camas Individual = 2p)
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

  -- Triple x3 (1 Matrimonial + 1 Individual = 3p)
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

  -- Matrimonial x2 (1 Matrimonial = 2p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10012-5eed-5eed-5eed-000000000012', est1, t_mat, 'H-401', '4', 'SERVICIO'),
    ('e1e10013-5eed-5eed-5eed-000000000013', est1, t_mat, 'H-402', '4', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10012-5eed-5eed-5eed-000000000012', tc_mat, 1),
    ('e1e10013-5eed-5eed-5eed-000000000013', tc_mat, 1);

  -- Familiar x2 (1 Queen + 2 Individual = 4p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e1e10014-5eed-5eed-5eed-000000000014', est1, t_fam, 'H-501', '5', 'SERVICIO'),
    ('e1e10015-5eed-5eed-5eed-000000000015', est1, t_fam, 'H-502', '5', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e1e10014-5eed-5eed-5eed-000000000014', tc_que, 1),
    ('e1e10014-5eed-5eed-5eed-000000000014', tc_ind, 2),
    ('e1e10015-5eed-5eed-5eed-000000000015', tc_que, 1),
    ('e1e10015-5eed-5eed-5eed-000000000015', tc_ind, 2);

  -- ==========================================================
  -- EST2: Hostal del Chaco — Yacuiba, 2 Estrellas, 10 hab
  -- cap = 3x1 + 4x2 + 2x3 + 1x2 = 19
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est2, 'LIC-002', 'Hostal del Chaco', 'Comercial Chaco S.A.',
     loc_yacuiba, cat_hostal2, true, CURRENT_DATE + INTERVAL '1 year',
     'Calle Comercio 89, Yacuiba', '04-6820001', 'ACTIVO');

  -- Individual x3
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20001-5eed-5eed-5eed-000000000001', est2, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e2e20002-5eed-5eed-5eed-000000000002', est2, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e2e20003-5eed-5eed-5eed-000000000003', est2, t_ind, 'H-103', '1', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e2e20002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e2e20003-5eed-5eed-5eed-000000000003', tc_ind, 1);

  -- Doble x4
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

  -- Triple x2
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20008-5eed-5eed-5eed-000000000008', est2, t_tri, 'H-301', '3', 'SERVICIO'),
    ('e2e20009-5eed-5eed-5eed-000000000009', est2, t_tri, 'H-302', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20008-5eed-5eed-5eed-000000000008', tc_mat, 1),
    ('e2e20008-5eed-5eed-5eed-000000000008', tc_ind, 1),
    ('e2e20009-5eed-5eed-5eed-000000000009', tc_mat, 1),
    ('e2e20009-5eed-5eed-5eed-000000000009', tc_ind, 1);

  -- Suite x1 (1 King = 2p)
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e2e20010-5eed-5eed-5eed-000000000010', est2, t_sui, 'H-401', '4', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e2e20010-5eed-5eed-5eed-000000000010', tc_kin, 1);

  -- ==========================================================
  -- EST3: Alojamiento Las Flores — San Lorenzo, Tipo A, 8 hab
  -- cap = 3x1 + 3x2 + 2x2 = 13
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est3, 'LIC-003', 'Alojamiento Las Flores', 'Maria Elena Torrez',
     loc_sanlorenzo, cat_aloj_a, true, CURRENT_DATE + INTERVAL '1 year',
     'Calle Bolivar 12, San Lorenzo', '04-6450087', 'ACTIVO');

  -- Individual x3
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e3e30001-5eed-5eed-5eed-000000000001', est3, t_ind, 'H-101', '1', 'SERVICIO'),
    ('e3e30002-5eed-5eed-5eed-000000000002', est3, t_ind, 'H-102', '1', 'SERVICIO'),
    ('e3e30003-5eed-5eed-5eed-000000000003', est3, t_ind, 'H-103', '1', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e3e30001-5eed-5eed-5eed-000000000001', tc_ind, 1),
    ('e3e30002-5eed-5eed-5eed-000000000002', tc_ind, 1),
    ('e3e30003-5eed-5eed-5eed-000000000003', tc_ind, 1);

  -- Doble x3
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e3e30004-5eed-5eed-5eed-000000000004', est3, t_dob, 'H-201', '2', 'SERVICIO'),
    ('e3e30005-5eed-5eed-5eed-000000000005', est3, t_dob, 'H-202', '2', 'SERVICIO'),
    ('e3e30006-5eed-5eed-5eed-000000000006', est3, t_dob, 'H-203', '2', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e3e30004-5eed-5eed-5eed-000000000004', tc_ind, 2),
    ('e3e30005-5eed-5eed-5eed-000000000005', tc_ind, 2),
    ('e3e30006-5eed-5eed-5eed-000000000006', tc_ind, 2);

  -- Matrimonial x2
  INSERT INTO public.habitaciones (id, establecimiento_id, tipo_habitacion_id, nro_habitacion, piso, estado_hab) VALUES
    ('e3e30007-5eed-5eed-5eed-000000000007', est3, t_mat, 'H-301', '3', 'SERVICIO'),
    ('e3e30008-5eed-5eed-5eed-000000000008', est3, t_mat, 'H-302', '3', 'SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id, tipo_cama_id, cantidad) VALUES
    ('e3e30007-5eed-5eed-5eed-000000000007', tc_mat, 1),
    ('e3e30008-5eed-5eed-5eed-000000000008', tc_mat, 1);

END $$;

-- EST4-EST7 en bloque separado (Bermejo, Entre Rios, Villa Montes, Uriondo)
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
  SELECT l.id INTO loc_entreri FROM public.localidades l JOIN public.divisiones_secundarias ds ON ds.id = l.division_secundaria_id WHERE l.nombre = 'Entre Ríos' AND ds.nombre = 'O''Connor' LIMIT 1;
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
  -- EST4: Hostal del Sur — Bermejo, Hostal 2 Estrellas, 8 hab
  -- cap = 3x1 + 3x2 + 2x3 = 15
  -- ==========================================================

  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est4, 'LIC-004', 'Hostal del Sur', 'Hermanos Cardozo S.R.L.',
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
  -- EST5: Alojamiento El Valle — Entre Rios, Alojamiento Tipo A, 6 hab
  -- cap = 2x1 + 3x2 + 1x2 = 10
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est5, 'LIC-005', 'Alojamiento El Valle', 'Roberto Flores Gutierrez',
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
  -- EST6: Hotel Gran Villamontes — Villa Montes, Hotel 3 Estrellas, 11 hab
  -- cap = 2x1 + 4x2 + 2x3 + 2x2 + 1x2 = 22
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est6, 'LIC-006', 'Hotel Gran Villamontes', 'Grupo Petrolero del Chaco S.A.',
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
  -- EST7: Posada Uriondo — Uriondo, Alojamiento Tipo A, 5 hab
  -- cap = 2x1 + 2x2 + 1x2 = 8
  -- ==========================================================
  INSERT INTO public.establecimientos
    (id, nro_licencia, razon_social, propietario, localidad_id, categoria_id,
     tiene_licencia_vigente, fecha_vencimiento_licencia, direccion, telefono, estado_admin)
  VALUES (est7, 'LIC-007', 'Posada Uriondo', 'Familia Ortega Velasquez',
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

-- EST8-EST27: establecimientos adicionales (3 por municipio original + nuevos municipios)
DO $$
DECLARE
  est8  uuid := 'e8e80000-5eed-5eed-5eed-000000000008'; -- Tarija,      Hotel 3★
  est9  uuid := 'e9e90000-5eed-5eed-5eed-000000000009'; -- Tarija,      Hostal 2★
  est10 uuid := 'eaaa0000-5eed-5eed-5eed-00000000000a'; -- Yacuiba,     Hotel 3★
  est11 uuid := 'ebbb0000-5eed-5eed-5eed-00000000000b'; -- Yacuiba,     Tipo A
  est12 uuid := 'eccc0000-5eed-5eed-5eed-00000000000c'; -- San Lorenzo, Hostal 2★
  est13 uuid := 'eddd0000-5eed-5eed-5eed-00000000000d'; -- San Lorenzo, Tipo A
  est14 uuid := 'eeee0000-5eed-5eed-5eed-00000000000e'; -- Bermejo,     Hotel 3★
  est15 uuid := 'efff0000-5eed-5eed-5eed-00000000000f'; -- Bermejo,     Tipo A
  est16 uuid := 'f1f10000-5eed-5eed-5eed-000000000010'; -- Entre Rios,  Hostal 2★
  est17 uuid := 'f2f20000-5eed-5eed-5eed-000000000011'; -- Entre Rios,  Tipo A
  est18 uuid := 'f3f30000-5eed-5eed-5eed-000000000012'; -- VillaMontes, Hostal 2★
  est19 uuid := 'f4f40000-5eed-5eed-5eed-000000000013'; -- VillaMontes, Tipo A
  est20 uuid := 'f5f50000-5eed-5eed-5eed-000000000014'; -- Uriondo,     Hostal 2★
  est21 uuid := 'f6f60000-5eed-5eed-5eed-000000000015'; -- Uriondo,     Tipo A
  -- Nuevos municipios
  est22 uuid := 'f7f70000-5eed-5eed-5eed-000000000016'; -- Padcaya,     Hostal 2★
  est23 uuid := 'f8f80000-5eed-5eed-5eed-000000000017'; -- Padcaya,     Tipo A
  est24 uuid := 'f9f90000-5eed-5eed-5eed-000000000018'; -- Carapari,    Hotel 3★
  est25 uuid := 'fafa0000-5eed-5eed-5eed-000000000019'; -- Carapari,    Tipo A
  est26 uuid := 'fbfb0000-5eed-5eed-5eed-00000000001a'; -- El Puente,   Hostal 2★
  est27 uuid := 'fcfc0000-5eed-5eed-5eed-00000000001b'; -- El Puente,   Tipo A

  loc_tarija    integer; loc_yacuiba   integer; loc_sanlorenzo integer;
  loc_bermejo   integer; loc_entreri   integer; loc_villamont  integer;
  loc_uriondo   integer; loc_padcaya   integer; loc_carapari   integer;
  loc_elpuente  integer;
  cat_hotel3  integer; cat_hostal2 integer; cat_aloj_a integer;
  t_ind integer; t_dob integer; t_tri integer; t_mat integer; t_fam integer; t_sui integer;
  tc_ind integer; tc_mat integer; tc_que integer; tc_kin integer;
BEGIN
  SELECT id INTO loc_tarija     FROM public.localidades WHERE nombre = 'Tarija'      LIMIT 1;
  SELECT id INTO loc_yacuiba    FROM public.localidades WHERE nombre = 'Yacuiba'     LIMIT 1;
  SELECT id INTO loc_sanlorenzo FROM public.localidades WHERE nombre = 'San Lorenzo' LIMIT 1;
  SELECT id INTO loc_bermejo    FROM public.localidades WHERE nombre = 'Bermejo'     LIMIT 1;
  SELECT l.id INTO loc_entreri  FROM public.localidades l JOIN public.divisiones_secundarias ds ON ds.id = l.division_secundaria_id WHERE l.nombre = 'Entre Ríos' AND ds.nombre = 'O''Connor' LIMIT 1;
  SELECT id INTO loc_villamont  FROM public.localidades WHERE nombre = 'Villa Montes' LIMIT 1;
  SELECT id INTO loc_uriondo    FROM public.localidades WHERE nombre = 'Uriondo'     LIMIT 1;
  SELECT id INTO loc_padcaya    FROM public.localidades WHERE nombre = 'Padcaya'     LIMIT 1;
  SELECT id INTO loc_carapari   FROM public.localidades WHERE nombre = 'Caraparí'    LIMIT 1;
  SELECT id INTO loc_elpuente   FROM public.localidades WHERE nombre = 'El Puente'   LIMIT 1;
  IF loc_yacuiba    IS NULL THEN loc_yacuiba    := loc_tarija; END IF;
  IF loc_sanlorenzo IS NULL THEN loc_sanlorenzo := loc_tarija; END IF;
  IF loc_bermejo    IS NULL THEN loc_bermejo    := loc_tarija; END IF;
  IF loc_entreri    IS NULL THEN loc_entreri    := loc_tarija; END IF;
  IF loc_villamont  IS NULL THEN loc_villamont  := loc_tarija; END IF;
  IF loc_uriondo    IS NULL THEN loc_uriondo    := loc_tarija; END IF;
  IF loc_padcaya    IS NULL THEN loc_padcaya    := loc_tarija; END IF;
  IF loc_carapari   IS NULL THEN loc_carapari   := loc_tarija; END IF;
  IF loc_elpuente   IS NULL THEN loc_elpuente   := loc_tarija; END IF;

  SELECT c.id INTO cat_hotel3  FROM public.categorias c JOIN public.clasificaciones cl ON cl.id=c.clasificacion_id WHERE cl.nombre='Hotel'       AND c.nombre='3 Estrellas' LIMIT 1;
  SELECT c.id INTO cat_hostal2 FROM public.categorias c JOIN public.clasificaciones cl ON cl.id=c.clasificacion_id WHERE cl.nombre='Hostal'      AND c.nombre='2 Estrellas' LIMIT 1;
  SELECT c.id INTO cat_aloj_a  FROM public.categorias c JOIN public.clasificaciones cl ON cl.id=c.clasificacion_id WHERE cl.nombre='Alojamiento' AND c.nombre='Tipo A'      LIMIT 1;

  SELECT id INTO t_ind FROM public.tipo_habitaciones WHERE nombre='Individual'  LIMIT 1;
  SELECT id INTO t_dob FROM public.tipo_habitaciones WHERE nombre='Doble'       LIMIT 1;
  SELECT id INTO t_tri FROM public.tipo_habitaciones WHERE nombre='Triple'      LIMIT 1;
  SELECT id INTO t_mat FROM public.tipo_habitaciones WHERE nombre='Matrimonial' LIMIT 1;
  SELECT id INTO t_fam FROM public.tipo_habitaciones WHERE nombre='Familiar'    LIMIT 1;
  SELECT id INTO t_sui FROM public.tipo_habitaciones WHERE nombre='Suite'       LIMIT 1;
  SELECT id INTO tc_ind FROM public.tipo_camas WHERE nombre='Individual'  LIMIT 1;
  SELECT id INTO tc_mat FROM public.tipo_camas WHERE nombre='Matrimonial' LIMIT 1;
  SELECT id INTO tc_que FROM public.tipo_camas WHERE nombre='Queen'       LIMIT 1;
  SELECT id INTO tc_kin FROM public.tipo_camas WHERE nombre='King'        LIMIT 1;

  -- ── EST8: Hotel Tarija Plaza — Tarija, 3★, 9 hab, cap=19
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est8,'LIC-008','Hotel Tarija Plaza','Grupo Hotelero Plaza S.A.',loc_tarija,cat_hotel3,true,CURRENT_DATE+INTERVAL'1 year','Calle Bolivar 180, Tarija','04-6641800','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('e8e80001-5eed-5eed-5eed-000000000001',est8,t_ind,'H-101','1','SERVICIO'),
    ('e8e80002-5eed-5eed-5eed-000000000002',est8,t_ind,'H-102','1','SERVICIO'),
    ('e8e80003-5eed-5eed-5eed-000000000003',est8,t_ind,'H-103','1','SERVICIO'),
    ('e8e80004-5eed-5eed-5eed-000000000004',est8,t_dob,'H-201','2','SERVICIO'),
    ('e8e80005-5eed-5eed-5eed-000000000005',est8,t_dob,'H-202','2','SERVICIO'),
    ('e8e80006-5eed-5eed-5eed-000000000006',est8,t_dob,'H-203','2','SERVICIO'),
    ('e8e80007-5eed-5eed-5eed-000000000007',est8,t_tri,'H-301','3','SERVICIO'),
    ('e8e80008-5eed-5eed-5eed-000000000008',est8,t_tri,'H-302','3','SERVICIO'),
    ('e8e80009-5eed-5eed-5eed-000000000009',est8,t_fam,'H-401','4','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('e8e80001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('e8e80002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('e8e80003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('e8e80004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('e8e80005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('e8e80006-5eed-5eed-5eed-000000000006',tc_ind,2),
    ('e8e80007-5eed-5eed-5eed-000000000007',tc_mat,1),
    ('e8e80007-5eed-5eed-5eed-000000000007',tc_ind,1),
    ('e8e80008-5eed-5eed-5eed-000000000008',tc_mat,1),
    ('e8e80008-5eed-5eed-5eed-000000000008',tc_ind,1),
    ('e8e80009-5eed-5eed-5eed-000000000009',tc_que,1),
    ('e8e80009-5eed-5eed-5eed-000000000009',tc_ind,2);

  -- ── EST9: Hostal San Jacinto — Tarija, 2★, 7 hab, cap=11
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est9,'LIC-009','Hostal San Jacinto','Juana Mendoza de Quiroga',loc_tarija,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Av. Victor Paz Estenssoro 67, Tarija','04-6641967','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('e9e90001-5eed-5eed-5eed-000000000001',est9,t_ind,'H-101','1','SERVICIO'),
    ('e9e90002-5eed-5eed-5eed-000000000002',est9,t_ind,'H-102','1','SERVICIO'),
    ('e9e90003-5eed-5eed-5eed-000000000003',est9,t_ind,'H-103','1','SERVICIO'),
    ('e9e90004-5eed-5eed-5eed-000000000004',est9,t_dob,'H-201','2','SERVICIO'),
    ('e9e90005-5eed-5eed-5eed-000000000005',est9,t_dob,'H-202','2','SERVICIO'),
    ('e9e90006-5eed-5eed-5eed-000000000006',est9,t_dob,'H-203','2','SERVICIO'),
    ('e9e90007-5eed-5eed-5eed-000000000007',est9,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('e9e90001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('e9e90002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('e9e90003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('e9e90004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('e9e90005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('e9e90006-5eed-5eed-5eed-000000000006',tc_ind,2),
    ('e9e90007-5eed-5eed-5eed-000000000007',tc_mat,1);

  -- ── EST10: Hotel Gran Yacuiba — Yacuiba, 3★, 9 hab, cap=16
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est10,'LIC-010','Hotel Gran Yacuiba','Cadena Hotelera Frontera S.A.',loc_yacuiba,cat_hotel3,true,CURRENT_DATE+INTERVAL'1 year','Av. 6 de Agosto 320, Yacuiba','04-6821000','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('eaaa0001-5eed-5eed-5eed-000000000001',est10,t_ind,'H-101','1','SERVICIO'),
    ('eaaa0002-5eed-5eed-5eed-000000000002',est10,t_ind,'H-102','1','SERVICIO'),
    ('eaaa0003-5eed-5eed-5eed-000000000003',est10,t_dob,'H-201','2','SERVICIO'),
    ('eaaa0004-5eed-5eed-5eed-000000000004',est10,t_dob,'H-202','2','SERVICIO'),
    ('eaaa0005-5eed-5eed-5eed-000000000005',est10,t_dob,'H-203','2','SERVICIO'),
    ('eaaa0006-5eed-5eed-5eed-000000000006',est10,t_dob,'H-204','2','SERVICIO'),
    ('eaaa0007-5eed-5eed-5eed-000000000007',est10,t_mat,'H-301','3','SERVICIO'),
    ('eaaa0008-5eed-5eed-5eed-000000000008',est10,t_mat,'H-302','3','SERVICIO'),
    ('eaaa0009-5eed-5eed-5eed-000000000009',est10,t_sui,'H-401','4','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('eaaa0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('eaaa0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('eaaa0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('eaaa0004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('eaaa0005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('eaaa0006-5eed-5eed-5eed-000000000006',tc_ind,2),
    ('eaaa0007-5eed-5eed-5eed-000000000007',tc_mat,1),
    ('eaaa0008-5eed-5eed-5eed-000000000008',tc_mat,1),
    ('eaaa0009-5eed-5eed-5eed-000000000009',tc_kin,1);

  -- ── EST11: Alojamiento Frontera Norte — Yacuiba, Tipo A, 5 hab, cap=8
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est11,'LIC-011','Alojamiento Frontera Norte','Carlos Mamani Quispe',loc_yacuiba,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Independencia 44, Yacuiba','04-6820044','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('ebbb0001-5eed-5eed-5eed-000000000001',est11,t_ind,'H-101','1','SERVICIO'),
    ('ebbb0002-5eed-5eed-5eed-000000000002',est11,t_ind,'H-102','1','SERVICIO'),
    ('ebbb0003-5eed-5eed-5eed-000000000003',est11,t_dob,'H-201','2','SERVICIO'),
    ('ebbb0004-5eed-5eed-5eed-000000000004',est11,t_dob,'H-202','2','SERVICIO'),
    ('ebbb0005-5eed-5eed-5eed-000000000005',est11,t_dob,'H-203','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('ebbb0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('ebbb0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('ebbb0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('ebbb0004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('ebbb0005-5eed-5eed-5eed-000000000005',tc_ind,2);

  -- ── EST12: Hostal Colonial — San Lorenzo, 2★, 6 hab, cap=9
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est12,'LIC-012','Hostal Colonial','Herederos Barrientos',loc_sanlorenzo,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Plaza Central s/n, San Lorenzo','04-6450012','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('eccc0001-5eed-5eed-5eed-000000000001',est12,t_ind,'H-101','1','SERVICIO'),
    ('eccc0002-5eed-5eed-5eed-000000000002',est12,t_ind,'H-102','1','SERVICIO'),
    ('eccc0003-5eed-5eed-5eed-000000000003',est12,t_ind,'H-103','1','SERVICIO'),
    ('eccc0004-5eed-5eed-5eed-000000000004',est12,t_dob,'H-201','2','SERVICIO'),
    ('eccc0005-5eed-5eed-5eed-000000000005',est12,t_dob,'H-202','2','SERVICIO'),
    ('eccc0006-5eed-5eed-5eed-000000000006',est12,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('eccc0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('eccc0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('eccc0003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('eccc0004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('eccc0005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('eccc0006-5eed-5eed-5eed-000000000006',tc_mat,1);

  -- ── EST13: Alojamiento La Hacienda — San Lorenzo, Tipo A, 4 hab, cap=6
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est13,'LIC-013','Alojamiento La Hacienda','Patricia Ruiz de Mendoza',loc_sanlorenzo,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Camino a Muyupampa km 2, San Lorenzo','04-6450013','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('eddd0001-5eed-5eed-5eed-000000000001',est13,t_ind,'H-101','1','SERVICIO'),
    ('eddd0002-5eed-5eed-5eed-000000000002',est13,t_ind,'H-102','1','SERVICIO'),
    ('eddd0003-5eed-5eed-5eed-000000000003',est13,t_dob,'H-201','2','SERVICIO'),
    ('eddd0004-5eed-5eed-5eed-000000000004',est13,t_dob,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('eddd0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('eddd0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('eddd0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('eddd0004-5eed-5eed-5eed-000000000004',tc_ind,2);

  -- ── EST14: Hotel Bermejo Palace — Bermejo, 3★, 8 hab, cap=16
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est14,'LIC-014','Hotel Bermejo Palace','Inversiones Bermejo S.A.',loc_bermejo,cat_hotel3,true,CURRENT_DATE+INTERVAL'1 year','Av. Antofagasta 88, Bermejo','04-6960088','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('eeee0001-5eed-5eed-5eed-000000000001',est14,t_ind,'H-101','1','SERVICIO'),
    ('eeee0002-5eed-5eed-5eed-000000000002',est14,t_ind,'H-102','1','SERVICIO'),
    ('eeee0003-5eed-5eed-5eed-000000000003',est14,t_dob,'H-201','2','SERVICIO'),
    ('eeee0004-5eed-5eed-5eed-000000000004',est14,t_dob,'H-202','2','SERVICIO'),
    ('eeee0005-5eed-5eed-5eed-000000000005',est14,t_dob,'H-203','2','SERVICIO'),
    ('eeee0006-5eed-5eed-5eed-000000000006',est14,t_tri,'H-301','3','SERVICIO'),
    ('eeee0007-5eed-5eed-5eed-000000000007',est14,t_tri,'H-302','3','SERVICIO'),
    ('eeee0008-5eed-5eed-5eed-000000000008',est14,t_sui,'H-401','4','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('eeee0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('eeee0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('eeee0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('eeee0004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('eeee0005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('eeee0006-5eed-5eed-5eed-000000000006',tc_mat,1),
    ('eeee0006-5eed-5eed-5eed-000000000006',tc_ind,1),
    ('eeee0007-5eed-5eed-5eed-000000000007',tc_mat,1),
    ('eeee0007-5eed-5eed-5eed-000000000007',tc_ind,1),
    ('eeee0008-5eed-5eed-5eed-000000000008',tc_kin,1);

  -- ── EST15: Alojamiento La Ceiba — Bermejo, Tipo A, 5 hab, cap=7
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est15,'LIC-015','Alojamiento La Ceiba','Francisca Lea de Torrez',loc_bermejo,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Sucre 15, Bermejo','04-6960015','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('efff0001-5eed-5eed-5eed-000000000001',est15,t_ind,'H-101','1','SERVICIO'),
    ('efff0002-5eed-5eed-5eed-000000000002',est15,t_ind,'H-102','1','SERVICIO'),
    ('efff0003-5eed-5eed-5eed-000000000003',est15,t_ind,'H-103','1','SERVICIO'),
    ('efff0004-5eed-5eed-5eed-000000000004',est15,t_dob,'H-201','2','SERVICIO'),
    ('efff0005-5eed-5eed-5eed-000000000005',est15,t_dob,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('efff0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('efff0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('efff0003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('efff0004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('efff0005-5eed-5eed-5eed-000000000005',tc_ind,2);

  -- ── EST16: Hostal El Rio Verde — Entre Rios, 2★, 6 hab, cap=10
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est16,'LIC-016','Hostal El Rio Verde','Cooperativa Rio Verde Ltda.',loc_entreri,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Av. Rivadavia 22, Entre Ríos','04-6870022','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f1f10001-5eed-5eed-5eed-000000000001',est16,t_ind,'H-101','1','SERVICIO'),
    ('f1f10002-5eed-5eed-5eed-000000000002',est16,t_ind,'H-102','1','SERVICIO'),
    ('f1f10003-5eed-5eed-5eed-000000000003',est16,t_ind,'H-103','1','SERVICIO'),
    ('f1f10004-5eed-5eed-5eed-000000000004',est16,t_dob,'H-201','2','SERVICIO'),
    ('f1f10005-5eed-5eed-5eed-000000000005',est16,t_dob,'H-202','2','SERVICIO'),
    ('f1f10006-5eed-5eed-5eed-000000000006',est16,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f1f10001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f1f10002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f1f10003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('f1f10004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('f1f10005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('f1f10006-5eed-5eed-5eed-000000000006',tc_mat,1);

  -- ── EST17: Posada La Selva — Entre Rios, Tipo A, 4 hab, cap=6
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est17,'LIC-017','Posada La Selva','Ernesto Vargas Montano',loc_entreri,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Monte Verde 5, Entre Ríos','04-6870005','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f2f20001-5eed-5eed-5eed-000000000001',est17,t_ind,'H-101','1','SERVICIO'),
    ('f2f20002-5eed-5eed-5eed-000000000002',est17,t_ind,'H-102','1','SERVICIO'),
    ('f2f20003-5eed-5eed-5eed-000000000003',est17,t_mat,'H-201','2','SERVICIO'),
    ('f2f20004-5eed-5eed-5eed-000000000004',est17,t_mat,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f2f20001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f2f20002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f2f20003-5eed-5eed-5eed-000000000003',tc_mat,1),
    ('f2f20004-5eed-5eed-5eed-000000000004',tc_mat,1);

  -- ── EST18: Hostal El Petrolero — Villa Montes, 2★, 7 hab, cap=11
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est18,'LIC-018','Hostal El Petrolero','Servicios Petroleros VM S.R.L.',loc_villamont,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Calle YPFB 100, Villa Montes','04-6920100','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f3f30001-5eed-5eed-5eed-000000000001',est18,t_ind,'H-101','1','SERVICIO'),
    ('f3f30002-5eed-5eed-5eed-000000000002',est18,t_ind,'H-102','1','SERVICIO'),
    ('f3f30003-5eed-5eed-5eed-000000000003',est18,t_ind,'H-103','1','SERVICIO'),
    ('f3f30004-5eed-5eed-5eed-000000000004',est18,t_dob,'H-201','2','SERVICIO'),
    ('f3f30005-5eed-5eed-5eed-000000000005',est18,t_dob,'H-202','2','SERVICIO'),
    ('f3f30006-5eed-5eed-5eed-000000000006',est18,t_dob,'H-203','2','SERVICIO'),
    ('f3f30007-5eed-5eed-5eed-000000000007',est18,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f3f30001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f3f30002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f3f30003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('f3f30004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('f3f30005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('f3f30006-5eed-5eed-5eed-000000000006',tc_ind,2),
    ('f3f30007-5eed-5eed-5eed-000000000007',tc_mat,1);

  -- ── EST19: Alojamiento Chaco Boreal — Villa Montes, Tipo A, 5 hab, cap=8
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est19,'LIC-019','Alojamiento Chaco Boreal','Comunidad Weenhayek',loc_villamont,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Pilcomayo 19, Villa Montes','04-6920019','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f4f40001-5eed-5eed-5eed-000000000001',est19,t_ind,'H-101','1','SERVICIO'),
    ('f4f40002-5eed-5eed-5eed-000000000002',est19,t_ind,'H-102','1','SERVICIO'),
    ('f4f40003-5eed-5eed-5eed-000000000003',est19,t_dob,'H-201','2','SERVICIO'),
    ('f4f40004-5eed-5eed-5eed-000000000004',est19,t_dob,'H-202','2','SERVICIO'),
    ('f4f40005-5eed-5eed-5eed-000000000005',est19,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f4f40001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f4f40002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f4f40003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('f4f40004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('f4f40005-5eed-5eed-5eed-000000000005',tc_mat,1);

  -- ── EST20: Hostal Los Vinedos — Uriondo, 2★, 5 hab, cap=8
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est20,'LIC-020','Hostal Los Vinedos','Bodega y Hospedaje Valle S.R.L.',loc_uriondo,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Ruta del Vino km 5, Uriondo','04-6640520','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f5f50001-5eed-5eed-5eed-000000000001',est20,t_ind,'H-101','1','SERVICIO'),
    ('f5f50002-5eed-5eed-5eed-000000000002',est20,t_ind,'H-102','1','SERVICIO'),
    ('f5f50003-5eed-5eed-5eed-000000000003',est20,t_dob,'H-201','2','SERVICIO'),
    ('f5f50004-5eed-5eed-5eed-000000000004',est20,t_dob,'H-202','2','SERVICIO'),
    ('f5f50005-5eed-5eed-5eed-000000000005',est20,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f5f50001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f5f50002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f5f50003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('f5f50004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('f5f50005-5eed-5eed-5eed-000000000005',tc_mat,1);

  -- ── EST21: Cabana Don Jose — Uriondo, Tipo A, 4 hab, cap=6
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est21,'LIC-021','Cabana Don Jose','Jose Antonio Paz Soldan',loc_uriondo,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Camino Viñedos s/n, Uriondo','04-6640521','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f6f60001-5eed-5eed-5eed-000000000001',est21,t_ind,'H-101','1','SERVICIO'),
    ('f6f60002-5eed-5eed-5eed-000000000002',est21,t_ind,'H-102','1','SERVICIO'),
    ('f6f60003-5eed-5eed-5eed-000000000003',est21,t_mat,'H-201','2','SERVICIO'),
    ('f6f60004-5eed-5eed-5eed-000000000004',est21,t_mat,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f6f60001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f6f60002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f6f60003-5eed-5eed-5eed-000000000003',tc_mat,1),
    ('f6f60004-5eed-5eed-5eed-000000000004',tc_mat,1);

  -- ── EST22: Hostal La Frontera — Padcaya, 2★, 6 hab, cap=9
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est22,'LIC-022','Hostal La Frontera','Familia Zenteno Arce',loc_padcaya,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Calle Bolivar 30, Padcaya','04-6490030','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f7f70001-5eed-5eed-5eed-000000000001',est22,t_ind,'H-101','1','SERVICIO'),
    ('f7f70002-5eed-5eed-5eed-000000000002',est22,t_ind,'H-102','1','SERVICIO'),
    ('f7f70003-5eed-5eed-5eed-000000000003',est22,t_ind,'H-103','1','SERVICIO'),
    ('f7f70004-5eed-5eed-5eed-000000000004',est22,t_dob,'H-201','2','SERVICIO'),
    ('f7f70005-5eed-5eed-5eed-000000000005',est22,t_dob,'H-202','2','SERVICIO'),
    ('f7f70006-5eed-5eed-5eed-000000000006',est22,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f7f70001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f7f70002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f7f70003-5eed-5eed-5eed-000000000003',tc_ind,1),
    ('f7f70004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('f7f70005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('f7f70006-5eed-5eed-5eed-000000000006',tc_mat,1);

  -- ── EST23: Alojamiento San Jose — Padcaya, Tipo A, 4 hab, cap=6
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est23,'LIC-023','Alojamiento San Jose','Rosario Condori Huanca',loc_padcaya,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Sucre 8, Padcaya','04-6490008','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f8f80001-5eed-5eed-5eed-000000000001',est23,t_ind,'H-101','1','SERVICIO'),
    ('f8f80002-5eed-5eed-5eed-000000000002',est23,t_ind,'H-102','1','SERVICIO'),
    ('f8f80003-5eed-5eed-5eed-000000000003',est23,t_dob,'H-201','2','SERVICIO'),
    ('f8f80004-5eed-5eed-5eed-000000000004',est23,t_dob,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f8f80001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f8f80002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f8f80003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('f8f80004-5eed-5eed-5eed-000000000004',tc_ind,2);

  -- ── EST24: Hotel Aguarague — Carapari, 3★, 7 hab, cap=13
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est24,'LIC-024','Hotel Aguarague','Empresa Gas y Turismo S.A.',loc_carapari,cat_hotel3,true,CURRENT_DATE+INTERVAL'1 year','Av. Principal 50, Caraparí','04-6840050','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('f9f90001-5eed-5eed-5eed-000000000001',est24,t_ind,'H-101','1','SERVICIO'),
    ('f9f90002-5eed-5eed-5eed-000000000002',est24,t_ind,'H-102','1','SERVICIO'),
    ('f9f90003-5eed-5eed-5eed-000000000003',est24,t_dob,'H-201','2','SERVICIO'),
    ('f9f90004-5eed-5eed-5eed-000000000004',est24,t_dob,'H-202','2','SERVICIO'),
    ('f9f90005-5eed-5eed-5eed-000000000005',est24,t_dob,'H-203','2','SERVICIO'),
    ('f9f90006-5eed-5eed-5eed-000000000006',est24,t_tri,'H-301','3','SERVICIO'),
    ('f9f90007-5eed-5eed-5eed-000000000007',est24,t_mat,'H-401','4','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('f9f90001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('f9f90002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('f9f90003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('f9f90004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('f9f90005-5eed-5eed-5eed-000000000005',tc_ind,2),
    ('f9f90006-5eed-5eed-5eed-000000000006',tc_mat,1),
    ('f9f90006-5eed-5eed-5eed-000000000006',tc_ind,1),
    ('f9f90007-5eed-5eed-5eed-000000000007',tc_mat,1);

  -- ── EST25: Alojamiento El Gas — Carapari, Tipo A, 4 hab, cap=6
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est25,'LIC-025','Alojamiento El Gas','Pedro Chambi Rojas',loc_carapari,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Petrolera 12, Caraparí','04-6840012','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('fafa0001-5eed-5eed-5eed-000000000001',est25,t_ind,'H-101','1','SERVICIO'),
    ('fafa0002-5eed-5eed-5eed-000000000002',est25,t_ind,'H-102','1','SERVICIO'),
    ('fafa0003-5eed-5eed-5eed-000000000003',est25,t_dob,'H-201','2','SERVICIO'),
    ('fafa0004-5eed-5eed-5eed-000000000004',est25,t_dob,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('fafa0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('fafa0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('fafa0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('fafa0004-5eed-5eed-5eed-000000000004',tc_ind,2);

  -- ── EST26: Hostal El Puente — El Puente, 2★, 5 hab, cap=8
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est26,'LIC-026','Hostal El Puente','Asociacion Turistica Mendez',loc_elpuente,cat_hostal2,true,CURRENT_DATE+INTERVAL'1 year','Plaza Principal s/n, El Puente','04-6470010','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('fbfb0001-5eed-5eed-5eed-000000000001',est26,t_ind,'H-101','1','SERVICIO'),
    ('fbfb0002-5eed-5eed-5eed-000000000002',est26,t_ind,'H-102','1','SERVICIO'),
    ('fbfb0003-5eed-5eed-5eed-000000000003',est26,t_dob,'H-201','2','SERVICIO'),
    ('fbfb0004-5eed-5eed-5eed-000000000004',est26,t_dob,'H-202','2','SERVICIO'),
    ('fbfb0005-5eed-5eed-5eed-000000000005',est26,t_mat,'H-301','3','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('fbfb0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('fbfb0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('fbfb0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('fbfb0004-5eed-5eed-5eed-000000000004',tc_ind,2),
    ('fbfb0005-5eed-5eed-5eed-000000000005',tc_mat,1);

  -- ── EST27: Alojamiento Mendez — El Puente, Tipo A, 4 hab, cap=6
  INSERT INTO public.establecimientos (id,nro_licencia,razon_social,propietario,localidad_id,categoria_id,tiene_licencia_vigente,fecha_vencimiento_licencia,direccion,telefono,estado_admin)
  VALUES (est27,'LIC-027','Alojamiento Mendez','Nilda Aguilar Zenteno',loc_elpuente,cat_aloj_a,true,CURRENT_DATE+INTERVAL'1 year','Calle Eustaquio Mendez 5, El Puente','04-6470005','ACTIVO');
  INSERT INTO public.habitaciones (id,establecimiento_id,tipo_habitacion_id,nro_habitacion,piso,estado_hab) VALUES
    ('fcfc0001-5eed-5eed-5eed-000000000001',est27,t_ind,'H-101','1','SERVICIO'),
    ('fcfc0002-5eed-5eed-5eed-000000000002',est27,t_ind,'H-102','1','SERVICIO'),
    ('fcfc0003-5eed-5eed-5eed-000000000003',est27,t_dob,'H-201','2','SERVICIO'),
    ('fcfc0004-5eed-5eed-5eed-000000000004',est27,t_dob,'H-202','2','SERVICIO');
  INSERT INTO public.habitacion_camas (habitacion_id,tipo_cama_id,cantidad) VALUES
    ('fcfc0001-5eed-5eed-5eed-000000000001',tc_ind,1),
    ('fcfc0002-5eed-5eed-5eed-000000000002',tc_ind,1),
    ('fcfc0003-5eed-5eed-5eed-000000000003',tc_ind,2),
    ('fcfc0004-5eed-5eed-5eed-000000000004',tc_ind,2);

END $$;
SQL
ok "Establecimientos insertados (EST1-EST27, 27 establecimientos, 10 municipios)"

# ============================================================
# PASO 2 — BD MOVIMIENTOS: replica cache + partes diarios
#
# habitaciones_replica_cache: refleja las habitaciones de los 27 establecimientos
# con capacidad_calculada = suma(tipo_cama.capacidad x cantidad)
#
# partes_diarios: 2026-01-01 a CURRENT_DATE x 27 establecimientos
#   Variacion diaria usando ondas sinusoidales distintas por establecimiento
#   para graficas de linea con curvas reales y diferenciadas.
#
#   Patrones de ocupacion:
#   - Tarija (EST1,8,9): pico carnaval (~Feb 20), Semana Santa (~Apr 4), turismo invierno (Jul)
#   - Yacuiba (EST2,10,11): comercio fronterizo, picos inicio de mes
#   - San Lorenzo (EST3,12,13): turismo fin de semana, vino, oscilacion quincenal
#   - Bermejo (EST4,14,15): frontera Argentina, tendencia creciente + pico carnaval
#   - Entre Rios (EST5,16,17): turismo de aventura, bimodal estacional
#   - Villa Montes (EST6,18,19): petrolero + comercio, alto verano, baja invierno
#   - Uriondo (EST7,20,21): enoturismo, pico vendimia (Mar), fin de semana
#   - Padcaya (EST22,23): agro-turismo, bajo, oscilacion mensual
#   - Carapari (EST24,25): gas/petrolero, picos de proyecto, tendencia estable
#   - El Puente (EST26,27): turismo rural, bajo, estacional con pico Semana Santa
#
# Distribucion de nacionalidades (% aproximado):
#   Bolivia 45%, Argentina 20%, Brasil 10%, Chile 10%,
#   Peru 5%, Espana 5%, USA 3%, Colombia 2%
#
# Distribucion de motivos:
#   Turismo 35%, Negocios 25%, Trabajo 20%,
#   Familiar 10%, Salud 5%, Otro 5%
#
# AYER (CURRENT_DATE - 1): se fuerza actividad alta con check-ins Y check-outs
# ============================================================
info "Insertando replica de habitaciones y partes diarios (enero 2026 a hoy, variacion diaria)..."

psql_mov <<'SQL'
BEGIN;
-- Deshabilitamos triggers para la carga masiva
ALTER TABLE public.partes_diarios DISABLE TRIGGER tr_validar_capacidad_habitacion;
ALTER TABLE public.partes_diarios DISABLE TRIGGER tr_audit_partes;

-- ----------------------------------------------------------
-- 2A. habitaciones_replica_cache
-- capacidad_calculada = lo que calcularia el Kafka consumer
-- Limpiamos primero por si el CDC ya inserto registros
-- ----------------------------------------------------------
DELETE FROM public.habitaciones_replica_cache
WHERE establecimiento_id IN (
  'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
  'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
  'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
  'e7e70000-5eed-5eed-5eed-000000000007','e8e80000-5eed-5eed-5eed-000000000008',
  'e9e90000-5eed-5eed-5eed-000000000009','eaaa0000-5eed-5eed-5eed-00000000000a',
  'ebbb0000-5eed-5eed-5eed-00000000000b','eccc0000-5eed-5eed-5eed-00000000000c',
  'eddd0000-5eed-5eed-5eed-00000000000d','eeee0000-5eed-5eed-5eed-00000000000e',
  'efff0000-5eed-5eed-5eed-00000000000f','f1f10000-5eed-5eed-5eed-000000000010',
  'f2f20000-5eed-5eed-5eed-000000000011','f3f30000-5eed-5eed-5eed-000000000012',
  'f4f40000-5eed-5eed-5eed-000000000013','f5f50000-5eed-5eed-5eed-000000000014',
  'f6f60000-5eed-5eed-5eed-000000000015','f7f70000-5eed-5eed-5eed-000000000016',
  'f8f80000-5eed-5eed-5eed-000000000017','f9f90000-5eed-5eed-5eed-000000000018',
  'fafa0000-5eed-5eed-5eed-000000000019','fbfb0000-5eed-5eed-5eed-00000000001a',
  'fcfc0000-5eed-5eed-5eed-00000000001b'
);

-- EST1 (cap total = 33)
INSERT INTO public.habitaciones_replica_cache
  (habitacion_id, establecimiento_id, nro_habitacion, tipo_habitacion, capacidad_calculada, estado_actual, piso) VALUES
  ('e1e10001-5eed-5eed-5eed-000000000001','e1e10000-5eed-5eed-5eed-000000000001','H-101','Individual',1,'LIBRE','1'),
  ('e1e10002-5eed-5eed-5eed-000000000002','e1e10000-5eed-5eed-5eed-000000000001','H-102','Individual',1,'LIBRE','1'),
  ('e1e10003-5eed-5eed-5eed-000000000003','e1e10000-5eed-5eed-5eed-000000000001','H-103','Individual',1,'LIBRE','1'),
  ('e1e10004-5eed-5eed-5eed-000000000004','e1e10000-5eed-5eed-5eed-000000000001','H-104','Individual',1,'LIBRE','1'),
  ('e1e10005-5eed-5eed-5eed-000000000005','e1e10000-5eed-5eed-5eed-000000000001','H-201','Doble',2,'LIBRE','2'),
  ('e1e10006-5eed-5eed-5eed-000000000006','e1e10000-5eed-5eed-5eed-000000000001','H-202','Doble',2,'LIBRE','2'),
  ('e1e10007-5eed-5eed-5eed-000000000007','e1e10000-5eed-5eed-5eed-000000000001','H-203','Doble',2,'LIBRE','2'),
  ('e1e10008-5eed-5eed-5eed-000000000008','e1e10000-5eed-5eed-5eed-000000000001','H-204','Doble',2,'LIBRE','2'),
  ('e1e10009-5eed-5eed-5eed-000000000009','e1e10000-5eed-5eed-5eed-000000000001','H-301','Triple',3,'LIBRE','3'),
  ('e1e10010-5eed-5eed-5eed-000000000010','e1e10000-5eed-5eed-5eed-000000000001','H-302','Triple',3,'LIBRE','3'),
  ('e1e10011-5eed-5eed-5eed-000000000011','e1e10000-5eed-5eed-5eed-000000000001','H-303','Triple',3,'LIBRE','3'),
  ('e1e10012-5eed-5eed-5eed-000000000012','e1e10000-5eed-5eed-5eed-000000000001','H-401','Matrimonial',2,'LIBRE','4'),
  ('e1e10013-5eed-5eed-5eed-000000000013','e1e10000-5eed-5eed-5eed-000000000001','H-402','Matrimonial',2,'LIBRE','4'),
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

-- EST5 (Entre Rios, cap total = 10)
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

-- EST8 (Tarija Hotel 3★, cap=19)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('e8e80001-5eed-5eed-5eed-000000000001','e8e80000-5eed-5eed-5eed-000000000008','H-101','Individual',1,'LIBRE','1'),
  ('e8e80002-5eed-5eed-5eed-000000000002','e8e80000-5eed-5eed-5eed-000000000008','H-102','Individual',1,'LIBRE','1'),
  ('e8e80003-5eed-5eed-5eed-000000000003','e8e80000-5eed-5eed-5eed-000000000008','H-103','Individual',1,'LIBRE','1'),
  ('e8e80004-5eed-5eed-5eed-000000000004','e8e80000-5eed-5eed-5eed-000000000008','H-201','Doble',2,'LIBRE','2'),
  ('e8e80005-5eed-5eed-5eed-000000000005','e8e80000-5eed-5eed-5eed-000000000008','H-202','Doble',2,'LIBRE','2'),
  ('e8e80006-5eed-5eed-5eed-000000000006','e8e80000-5eed-5eed-5eed-000000000008','H-203','Doble',2,'LIBRE','2'),
  ('e8e80007-5eed-5eed-5eed-000000000007','e8e80000-5eed-5eed-5eed-000000000008','H-301','Triple',3,'LIBRE','3'),
  ('e8e80008-5eed-5eed-5eed-000000000008','e8e80000-5eed-5eed-5eed-000000000008','H-302','Triple',3,'LIBRE','3'),
  ('e8e80009-5eed-5eed-5eed-000000000009','e8e80000-5eed-5eed-5eed-000000000008','H-401','Familiar',4,'LIBRE','4');

-- EST9 (Tarija Hostal 2★, cap=11)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('e9e90001-5eed-5eed-5eed-000000000001','e9e90000-5eed-5eed-5eed-000000000009','H-101','Individual',1,'LIBRE','1'),
  ('e9e90002-5eed-5eed-5eed-000000000002','e9e90000-5eed-5eed-5eed-000000000009','H-102','Individual',1,'LIBRE','1'),
  ('e9e90003-5eed-5eed-5eed-000000000003','e9e90000-5eed-5eed-5eed-000000000009','H-103','Individual',1,'LIBRE','1'),
  ('e9e90004-5eed-5eed-5eed-000000000004','e9e90000-5eed-5eed-5eed-000000000009','H-201','Doble',2,'LIBRE','2'),
  ('e9e90005-5eed-5eed-5eed-000000000005','e9e90000-5eed-5eed-5eed-000000000009','H-202','Doble',2,'LIBRE','2'),
  ('e9e90006-5eed-5eed-5eed-000000000006','e9e90000-5eed-5eed-5eed-000000000009','H-203','Doble',2,'LIBRE','2'),
  ('e9e90007-5eed-5eed-5eed-000000000007','e9e90000-5eed-5eed-5eed-000000000009','H-301','Matrimonial',2,'LIBRE','3');

-- EST10 (Yacuiba Hotel 3★, cap=16)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('eaaa0001-5eed-5eed-5eed-000000000001','eaaa0000-5eed-5eed-5eed-00000000000a','H-101','Individual',1,'LIBRE','1'),
  ('eaaa0002-5eed-5eed-5eed-000000000002','eaaa0000-5eed-5eed-5eed-00000000000a','H-102','Individual',1,'LIBRE','1'),
  ('eaaa0003-5eed-5eed-5eed-000000000003','eaaa0000-5eed-5eed-5eed-00000000000a','H-201','Doble',2,'LIBRE','2'),
  ('eaaa0004-5eed-5eed-5eed-000000000004','eaaa0000-5eed-5eed-5eed-00000000000a','H-202','Doble',2,'LIBRE','2'),
  ('eaaa0005-5eed-5eed-5eed-000000000005','eaaa0000-5eed-5eed-5eed-00000000000a','H-203','Doble',2,'LIBRE','2'),
  ('eaaa0006-5eed-5eed-5eed-000000000006','eaaa0000-5eed-5eed-5eed-00000000000a','H-204','Doble',2,'LIBRE','2'),
  ('eaaa0007-5eed-5eed-5eed-000000000007','eaaa0000-5eed-5eed-5eed-00000000000a','H-301','Matrimonial',2,'LIBRE','3'),
  ('eaaa0008-5eed-5eed-5eed-000000000008','eaaa0000-5eed-5eed-5eed-00000000000a','H-302','Matrimonial',2,'LIBRE','3'),
  ('eaaa0009-5eed-5eed-5eed-000000000009','eaaa0000-5eed-5eed-5eed-00000000000a','H-401','Suite',2,'LIBRE','4');

-- EST11 (Yacuiba Tipo A, cap=8)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('ebbb0001-5eed-5eed-5eed-000000000001','ebbb0000-5eed-5eed-5eed-00000000000b','H-101','Individual',1,'LIBRE','1'),
  ('ebbb0002-5eed-5eed-5eed-000000000002','ebbb0000-5eed-5eed-5eed-00000000000b','H-102','Individual',1,'LIBRE','1'),
  ('ebbb0003-5eed-5eed-5eed-000000000003','ebbb0000-5eed-5eed-5eed-00000000000b','H-201','Doble',2,'LIBRE','2'),
  ('ebbb0004-5eed-5eed-5eed-000000000004','ebbb0000-5eed-5eed-5eed-00000000000b','H-202','Doble',2,'LIBRE','2'),
  ('ebbb0005-5eed-5eed-5eed-000000000005','ebbb0000-5eed-5eed-5eed-00000000000b','H-203','Doble',2,'LIBRE','2');

-- EST12 (San Lorenzo Hostal 2★, cap=9)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('eccc0001-5eed-5eed-5eed-000000000001','eccc0000-5eed-5eed-5eed-00000000000c','H-101','Individual',1,'LIBRE','1'),
  ('eccc0002-5eed-5eed-5eed-000000000002','eccc0000-5eed-5eed-5eed-00000000000c','H-102','Individual',1,'LIBRE','1'),
  ('eccc0003-5eed-5eed-5eed-000000000003','eccc0000-5eed-5eed-5eed-00000000000c','H-103','Individual',1,'LIBRE','1'),
  ('eccc0004-5eed-5eed-5eed-000000000004','eccc0000-5eed-5eed-5eed-00000000000c','H-201','Doble',2,'LIBRE','2'),
  ('eccc0005-5eed-5eed-5eed-000000000005','eccc0000-5eed-5eed-5eed-00000000000c','H-202','Doble',2,'LIBRE','2'),
  ('eccc0006-5eed-5eed-5eed-000000000006','eccc0000-5eed-5eed-5eed-00000000000c','H-301','Matrimonial',2,'LIBRE','3');

-- EST13 (San Lorenzo Tipo A, cap=6)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('eddd0001-5eed-5eed-5eed-000000000001','eddd0000-5eed-5eed-5eed-00000000000d','H-101','Individual',1,'LIBRE','1'),
  ('eddd0002-5eed-5eed-5eed-000000000002','eddd0000-5eed-5eed-5eed-00000000000d','H-102','Individual',1,'LIBRE','1'),
  ('eddd0003-5eed-5eed-5eed-000000000003','eddd0000-5eed-5eed-5eed-00000000000d','H-201','Doble',2,'LIBRE','2'),
  ('eddd0004-5eed-5eed-5eed-000000000004','eddd0000-5eed-5eed-5eed-00000000000d','H-202','Doble',2,'LIBRE','2');

-- EST14 (Bermejo Hotel 3★, cap=16)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('eeee0001-5eed-5eed-5eed-000000000001','eeee0000-5eed-5eed-5eed-00000000000e','H-101','Individual',1,'LIBRE','1'),
  ('eeee0002-5eed-5eed-5eed-000000000002','eeee0000-5eed-5eed-5eed-00000000000e','H-102','Individual',1,'LIBRE','1'),
  ('eeee0003-5eed-5eed-5eed-000000000003','eeee0000-5eed-5eed-5eed-00000000000e','H-201','Doble',2,'LIBRE','2'),
  ('eeee0004-5eed-5eed-5eed-000000000004','eeee0000-5eed-5eed-5eed-00000000000e','H-202','Doble',2,'LIBRE','2'),
  ('eeee0005-5eed-5eed-5eed-000000000005','eeee0000-5eed-5eed-5eed-00000000000e','H-203','Doble',2,'LIBRE','2'),
  ('eeee0006-5eed-5eed-5eed-000000000006','eeee0000-5eed-5eed-5eed-00000000000e','H-301','Triple',3,'LIBRE','3'),
  ('eeee0007-5eed-5eed-5eed-000000000007','eeee0000-5eed-5eed-5eed-00000000000e','H-302','Triple',3,'LIBRE','3'),
  ('eeee0008-5eed-5eed-5eed-000000000008','eeee0000-5eed-5eed-5eed-00000000000e','H-401','Suite',2,'LIBRE','4');

-- EST15 (Bermejo Tipo A, cap=7)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('efff0001-5eed-5eed-5eed-000000000001','efff0000-5eed-5eed-5eed-00000000000f','H-101','Individual',1,'LIBRE','1'),
  ('efff0002-5eed-5eed-5eed-000000000002','efff0000-5eed-5eed-5eed-00000000000f','H-102','Individual',1,'LIBRE','1'),
  ('efff0003-5eed-5eed-5eed-000000000003','efff0000-5eed-5eed-5eed-00000000000f','H-103','Individual',1,'LIBRE','1'),
  ('efff0004-5eed-5eed-5eed-000000000004','efff0000-5eed-5eed-5eed-00000000000f','H-201','Doble',2,'LIBRE','2'),
  ('efff0005-5eed-5eed-5eed-000000000005','efff0000-5eed-5eed-5eed-00000000000f','H-202','Doble',2,'LIBRE','2');

-- EST16 (Entre Rios Hostal 2★, cap=10)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f1f10001-5eed-5eed-5eed-000000000001','f1f10000-5eed-5eed-5eed-000000000010','H-101','Individual',1,'LIBRE','1'),
  ('f1f10002-5eed-5eed-5eed-000000000002','f1f10000-5eed-5eed-5eed-000000000010','H-102','Individual',1,'LIBRE','1'),
  ('f1f10003-5eed-5eed-5eed-000000000003','f1f10000-5eed-5eed-5eed-000000000010','H-103','Individual',1,'LIBRE','1'),
  ('f1f10004-5eed-5eed-5eed-000000000004','f1f10000-5eed-5eed-5eed-000000000010','H-201','Doble',2,'LIBRE','2'),
  ('f1f10005-5eed-5eed-5eed-000000000005','f1f10000-5eed-5eed-5eed-000000000010','H-202','Doble',2,'LIBRE','2'),
  ('f1f10006-5eed-5eed-5eed-000000000006','f1f10000-5eed-5eed-5eed-000000000010','H-301','Matrimonial',2,'LIBRE','3');

-- EST17 (Entre Rios Tipo A, cap=6)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f2f20001-5eed-5eed-5eed-000000000001','f2f20000-5eed-5eed-5eed-000000000011','H-101','Individual',1,'LIBRE','1'),
  ('f2f20002-5eed-5eed-5eed-000000000002','f2f20000-5eed-5eed-5eed-000000000011','H-102','Individual',1,'LIBRE','1'),
  ('f2f20003-5eed-5eed-5eed-000000000003','f2f20000-5eed-5eed-5eed-000000000011','H-201','Matrimonial',2,'LIBRE','2'),
  ('f2f20004-5eed-5eed-5eed-000000000004','f2f20000-5eed-5eed-5eed-000000000011','H-202','Matrimonial',2,'LIBRE','2');

-- EST18 (Villa Montes Hostal 2★, cap=11)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f3f30001-5eed-5eed-5eed-000000000001','f3f30000-5eed-5eed-5eed-000000000012','H-101','Individual',1,'LIBRE','1'),
  ('f3f30002-5eed-5eed-5eed-000000000002','f3f30000-5eed-5eed-5eed-000000000012','H-102','Individual',1,'LIBRE','1'),
  ('f3f30003-5eed-5eed-5eed-000000000003','f3f30000-5eed-5eed-5eed-000000000012','H-103','Individual',1,'LIBRE','1'),
  ('f3f30004-5eed-5eed-5eed-000000000004','f3f30000-5eed-5eed-5eed-000000000012','H-201','Doble',2,'LIBRE','2'),
  ('f3f30005-5eed-5eed-5eed-000000000005','f3f30000-5eed-5eed-5eed-000000000012','H-202','Doble',2,'LIBRE','2'),
  ('f3f30006-5eed-5eed-5eed-000000000006','f3f30000-5eed-5eed-5eed-000000000012','H-203','Doble',2,'LIBRE','2'),
  ('f3f30007-5eed-5eed-5eed-000000000007','f3f30000-5eed-5eed-5eed-000000000012','H-301','Matrimonial',2,'LIBRE','3');

-- EST19 (Villa Montes Tipo A, cap=8)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f4f40001-5eed-5eed-5eed-000000000001','f4f40000-5eed-5eed-5eed-000000000013','H-101','Individual',1,'LIBRE','1'),
  ('f4f40002-5eed-5eed-5eed-000000000002','f4f40000-5eed-5eed-5eed-000000000013','H-102','Individual',1,'LIBRE','1'),
  ('f4f40003-5eed-5eed-5eed-000000000003','f4f40000-5eed-5eed-5eed-000000000013','H-201','Doble',2,'LIBRE','2'),
  ('f4f40004-5eed-5eed-5eed-000000000004','f4f40000-5eed-5eed-5eed-000000000013','H-202','Doble',2,'LIBRE','2'),
  ('f4f40005-5eed-5eed-5eed-000000000005','f4f40000-5eed-5eed-5eed-000000000013','H-301','Matrimonial',2,'LIBRE','3');

-- EST20 (Uriondo Hostal 2★, cap=8)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f5f50001-5eed-5eed-5eed-000000000001','f5f50000-5eed-5eed-5eed-000000000014','H-101','Individual',1,'LIBRE','1'),
  ('f5f50002-5eed-5eed-5eed-000000000002','f5f50000-5eed-5eed-5eed-000000000014','H-102','Individual',1,'LIBRE','1'),
  ('f5f50003-5eed-5eed-5eed-000000000003','f5f50000-5eed-5eed-5eed-000000000014','H-201','Doble',2,'LIBRE','2'),
  ('f5f50004-5eed-5eed-5eed-000000000004','f5f50000-5eed-5eed-5eed-000000000014','H-202','Doble',2,'LIBRE','2'),
  ('f5f50005-5eed-5eed-5eed-000000000005','f5f50000-5eed-5eed-5eed-000000000014','H-301','Matrimonial',2,'LIBRE','3');

-- EST21 (Uriondo Tipo A, cap=6)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f6f60001-5eed-5eed-5eed-000000000001','f6f60000-5eed-5eed-5eed-000000000015','H-101','Individual',1,'LIBRE','1'),
  ('f6f60002-5eed-5eed-5eed-000000000002','f6f60000-5eed-5eed-5eed-000000000015','H-102','Individual',1,'LIBRE','1'),
  ('f6f60003-5eed-5eed-5eed-000000000003','f6f60000-5eed-5eed-5eed-000000000015','H-201','Matrimonial',2,'LIBRE','2'),
  ('f6f60004-5eed-5eed-5eed-000000000004','f6f60000-5eed-5eed-5eed-000000000015','H-202','Matrimonial',2,'LIBRE','2');

-- EST22 (Padcaya Hostal 2★, cap=9)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f7f70001-5eed-5eed-5eed-000000000001','f7f70000-5eed-5eed-5eed-000000000016','H-101','Individual',1,'LIBRE','1'),
  ('f7f70002-5eed-5eed-5eed-000000000002','f7f70000-5eed-5eed-5eed-000000000016','H-102','Individual',1,'LIBRE','1'),
  ('f7f70003-5eed-5eed-5eed-000000000003','f7f70000-5eed-5eed-5eed-000000000016','H-103','Individual',1,'LIBRE','1'),
  ('f7f70004-5eed-5eed-5eed-000000000004','f7f70000-5eed-5eed-5eed-000000000016','H-201','Doble',2,'LIBRE','2'),
  ('f7f70005-5eed-5eed-5eed-000000000005','f7f70000-5eed-5eed-5eed-000000000016','H-202','Doble',2,'LIBRE','2'),
  ('f7f70006-5eed-5eed-5eed-000000000006','f7f70000-5eed-5eed-5eed-000000000016','H-301','Matrimonial',2,'LIBRE','3');

-- EST23 (Padcaya Tipo A, cap=6)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f8f80001-5eed-5eed-5eed-000000000001','f8f80000-5eed-5eed-5eed-000000000017','H-101','Individual',1,'LIBRE','1'),
  ('f8f80002-5eed-5eed-5eed-000000000002','f8f80000-5eed-5eed-5eed-000000000017','H-102','Individual',1,'LIBRE','1'),
  ('f8f80003-5eed-5eed-5eed-000000000003','f8f80000-5eed-5eed-5eed-000000000017','H-201','Doble',2,'LIBRE','2'),
  ('f8f80004-5eed-5eed-5eed-000000000004','f8f80000-5eed-5eed-5eed-000000000017','H-202','Doble',2,'LIBRE','2');

-- EST24 (Carapari Hotel 3★, cap=13)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('f9f90001-5eed-5eed-5eed-000000000001','f9f90000-5eed-5eed-5eed-000000000018','H-101','Individual',1,'LIBRE','1'),
  ('f9f90002-5eed-5eed-5eed-000000000002','f9f90000-5eed-5eed-5eed-000000000018','H-102','Individual',1,'LIBRE','1'),
  ('f9f90003-5eed-5eed-5eed-000000000003','f9f90000-5eed-5eed-5eed-000000000018','H-201','Doble',2,'LIBRE','2'),
  ('f9f90004-5eed-5eed-5eed-000000000004','f9f90000-5eed-5eed-5eed-000000000018','H-202','Doble',2,'LIBRE','2'),
  ('f9f90005-5eed-5eed-5eed-000000000005','f9f90000-5eed-5eed-5eed-000000000018','H-203','Doble',2,'LIBRE','2'),
  ('f9f90006-5eed-5eed-5eed-000000000006','f9f90000-5eed-5eed-5eed-000000000018','H-301','Triple',3,'LIBRE','3'),
  ('f9f90007-5eed-5eed-5eed-000000000007','f9f90000-5eed-5eed-5eed-000000000018','H-401','Matrimonial',2,'LIBRE','4');

-- EST25 (Carapari Tipo A, cap=6)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('fafa0001-5eed-5eed-5eed-000000000001','fafa0000-5eed-5eed-5eed-000000000019','H-101','Individual',1,'LIBRE','1'),
  ('fafa0002-5eed-5eed-5eed-000000000002','fafa0000-5eed-5eed-5eed-000000000019','H-102','Individual',1,'LIBRE','1'),
  ('fafa0003-5eed-5eed-5eed-000000000003','fafa0000-5eed-5eed-5eed-000000000019','H-201','Doble',2,'LIBRE','2'),
  ('fafa0004-5eed-5eed-5eed-000000000004','fafa0000-5eed-5eed-5eed-000000000019','H-202','Doble',2,'LIBRE','2');

-- EST26 (El Puente Hostal 2★, cap=8)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('fbfb0001-5eed-5eed-5eed-000000000001','fbfb0000-5eed-5eed-5eed-00000000001a','H-101','Individual',1,'LIBRE','1'),
  ('fbfb0002-5eed-5eed-5eed-000000000002','fbfb0000-5eed-5eed-5eed-00000000001a','H-102','Individual',1,'LIBRE','1'),
  ('fbfb0003-5eed-5eed-5eed-000000000003','fbfb0000-5eed-5eed-5eed-00000000001a','H-201','Doble',2,'LIBRE','2'),
  ('fbfb0004-5eed-5eed-5eed-000000000004','fbfb0000-5eed-5eed-5eed-00000000001a','H-202','Doble',2,'LIBRE','2'),
  ('fbfb0005-5eed-5eed-5eed-000000000005','fbfb0000-5eed-5eed-5eed-00000000001a','H-301','Matrimonial',2,'LIBRE','3');

-- EST27 (El Puente Tipo A, cap=6)
INSERT INTO public.habitaciones_replica_cache (habitacion_id,establecimiento_id,nro_habitacion,tipo_habitacion,capacidad_calculada,estado_actual,piso) VALUES
  ('fcfc0001-5eed-5eed-5eed-000000000001','fcfc0000-5eed-5eed-5eed-00000000001b','H-101','Individual',1,'LIBRE','1'),
  ('fcfc0002-5eed-5eed-5eed-000000000002','fcfc0000-5eed-5eed-5eed-00000000001b','H-102','Individual',1,'LIBRE','1'),
  ('fcfc0003-5eed-5eed-5eed-000000000003','fcfc0000-5eed-5eed-5eed-00000000001b','H-201','Doble',2,'LIBRE','2'),
  ('fcfc0004-5eed-5eed-5eed-000000000004','fcfc0000-5eed-5eed-5eed-00000000001b','H-202','Doble',2,'LIBRE','2');

-- ----------------------------------------------------------
-- 2B. partes_diarios
--
-- Tecnica: generate_series(dias) x generate_series(N huespedes/dia)
-- day_idx = dias desde el inicio de la ventana (0..N)
-- total_days = CURRENT_DATE - '2026-01-01' (dinamico)
--
-- Las distribuciones de pais y motivo usan (day_idx * K + n * J) % 20
-- para un patron pseudo-variado pero determinista.
--
-- Pais (array 20 elem, 0-indexado via %20):
--   [0..8]  -> Bolivia (1)    45%
--   [9..12] -> Argentina (2)  20%
--   [13,14] -> Brasil (3)     10%
--   [15,16] -> Chile (4)      10%
--   [17]    -> Peru (8)        5%
--   [18]    -> Espana (12)     5%
--   [19]    -> USA (11)        5%
--
-- Motivo (array 20 elem):
--   [0..6]  -> Turismo (1)   35%
--   [7..11] -> Negocios (2)  25%
--   [12..15]-> Trabajo (3)   20%
--   [16,17] -> Familiar (6)  10%
--   [18]    -> Salud (4)      5%
--   [19]    -> Otro (10)      5%
--
-- salida_at: para fecha=AYER, algunos con salida=AYER (check-outs) y algunos NULL (hospedados)
--            para fechas antiguas: ingreso + 1-3 dias
--            para HOY: NULL (aun hospedados)
-- ----------------------------------------------------------

-- =========================================================
-- Macro: funcion auxiliar para generar partes de un establecimiento
-- La usamos para los 27 establecimientos con parametros distintos.
-- =========================================================

-- EST1: Hotel Victoria — Tarija, 8-20 huespedes/dia
-- Patron: pico carnaval (~Feb 20, dia 50), pico Semana Santa (~Apr 4, dia 93), pico invierno Jul
INSERT INTO public.partes_diarios
  (id, establecimiento_id, habitacion_id, persona_id,
   fecha_reporte, ingreso_at, salida_at,
   pais_procedencia_id, localidad_procedencia_id, motivo_viaje_id,
   keycloak_recepcionista_id,
   hab_nro_snapshot, hab_tipo_snapshot, estado_operativo)
SELECT
  gen_random_uuid(),
  'e1e10000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY[
    'e1e10001-5eed-5eed-5eed-000000000001'::uuid,'e1e10002-5eed-5eed-5eed-000000000002'::uuid,
    'e1e10003-5eed-5eed-5eed-000000000003'::uuid,'e1e10004-5eed-5eed-5eed-000000000004'::uuid,
    'e1e10005-5eed-5eed-5eed-000000000005'::uuid,'e1e10006-5eed-5eed-5eed-000000000006'::uuid,
    'e1e10007-5eed-5eed-5eed-000000000007'::uuid,'e1e10008-5eed-5eed-5eed-000000000008'::uuid,
    'e1e10009-5eed-5eed-5eed-000000000009'::uuid,'e1e10010-5eed-5eed-5eed-000000000010'::uuid,
    'e1e10011-5eed-5eed-5eed-000000000011'::uuid,'e1e10012-5eed-5eed-5eed-000000000012'::uuid,
    'e1e10013-5eed-5eed-5eed-000000000013'::uuid,'e1e10014-5eed-5eed-5eed-000000000014'::uuid,
    'e1e10015-5eed-5eed-5eed-000000000015'::uuid
  ])[(t.n - 1) % 15 + 1],
  NULL, t.fecha,
  t.fecha::timestamp + ((t.day_idx * 7 + t.n * 3) % 14 + 8 || ' hours')::interval,
  CASE
    WHEN t.fecha = CURRENT_DATE THEN NULL
    WHEN t.fecha = CURRENT_DATE - 1 AND t.n % 3 = 0 THEN NULL  -- 1/3 aun hospedados ayer
    WHEN t.fecha = CURRENT_DATE - 1 THEN
      t.fecha::timestamp + ((t.day_idx * 7 + t.n * 3) % 14 + 8 || ' hours')::interval
      + ((t.n % 2 + 1) || ' hours')::interval  -- check-out el mismo dia (ayer)
    ELSE LEAST(
      t.fecha::timestamp + ((t.day_idx * 7 + t.n * 3) % 14 + 8 || ' hours')::interval
      + ((t.n + t.day_idx) % 3 + 1 || ' days')::interval,
      CURRENT_TIMESTAMP)
  END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,12,11])[(t.day_idx*3+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,12,11])[(t.day_idx*3+t.n*7)%20+1]=1
    THEN (t.day_idx*5+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,6,6,4,10])[(t.day_idx*7+t.n*3)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-104','H-201','H-202','H-203','H-204','H-301','H-302','H-303','H-401','H-402','H-501','H-502'])[(t.n-1)%15+1],
  (ARRAY['Individual','Individual','Individual','Individual','Doble','Doble','Doble','Doble','Triple','Triple','Triple','Matrimonial','Matrimonial','Familiar','Familiar'])[(t.n-1)%15+1],
  'ACTIVO'
FROM (
  SELECT d::date AS fecha, (d::date-'2026-01-01'::date)::int AS day_idx, g.n,
    -- Onda compuesta: carnaval(dia50) + Semana Santa(dia93) + invierno(dia180) + boost ayer
    GREATEST(8, LEAST(20, (
      8 + round(6 * sin((d::date-'2026-01-01'::date)::float * pi() / 60 - pi()/3))
        + round(4 * CASE WHEN abs((d::date-'2026-01-01'::date)::int - 93) < 7 THEN 1.0 ELSE 0.0 END)
        + round(3 * sin((d::date-'2026-01-01'::date)::float * pi() / 180))
        + CASE WHEN d::date = CURRENT_DATE - 1 THEN 4 ELSE 0 END
    )))::int AS load
  FROM generate_series('2026-01-01'::date, CURRENT_DATE, '1 day'::interval) d
  CROSS JOIN generate_series(1, 20) g(n)
) t WHERE t.n <= t.load;

-- EST2: Hostal del Chaco — Yacuiba, 3-11 huespedes/dia
-- Patron: comercio fronterizo, picos inicio de mes (cada ~30 dias), tendencia decreciente
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e2e20000-5eed-5eed-5eed-000000000002'::uuid,
  (ARRAY['e2e20001-5eed-5eed-5eed-000000000001'::uuid,'e2e20002-5eed-5eed-5eed-000000000002'::uuid,'e2e20003-5eed-5eed-5eed-000000000003'::uuid,'e2e20004-5eed-5eed-5eed-000000000004'::uuid,'e2e20005-5eed-5eed-5eed-000000000005'::uuid,'e2e20006-5eed-5eed-5eed-000000000006'::uuid,'e2e20007-5eed-5eed-5eed-000000000007'::uuid,'e2e20008-5eed-5eed-5eed-000000000008'::uuid,'e2e20009-5eed-5eed-5eed-000000000009'::uuid,'e2e20010-5eed-5eed-5eed-000000000010'::uuid])[(t.n-1)%10+1],
  NULL, t.fecha,
  t.fecha::timestamp+((t.day_idx*5+t.n*11)%14+8||' hours')::interval,
  CASE
    WHEN t.fecha = CURRENT_DATE THEN NULL
    WHEN t.fecha = CURRENT_DATE-1 AND t.n%3=0 THEN NULL
    WHEN t.fecha = CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*5+t.n*11)%14+8||' hours')::interval+((t.n%3+2)||' hours')::interval
    ELSE t.fecha::timestamp+((t.day_idx*5+t.n*11)%14+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval
  END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,8,12,11])[(t.day_idx*11+t.n*5)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,8,12,11])[(t.day_idx*11+t.n*5)%20+1]=1 THEN (t.day_idx*7+t.n*13)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,3,3,6,6,4,10,10])[(t.day_idx*5+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-204','H-301','H-302','H-401'])[(t.n-1)%10+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Doble','Triple','Triple','Suite'])[(t.n-1)%10+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(3,LEAST(11,(3+round(4*(0.5+0.5*cos((d::date-'2026-01-01'::date)::float*pi()/15)))+round(4*CASE WHEN extract(day from d)<=5 THEN 1.0 ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 3 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,11) g(n)) t WHERE t.n<=t.load;

-- EST3: Alojamiento Las Flores — San Lorenzo, 2-8 huespedes/dia
-- Patron: oscilacion quincenal (turismo fin de semana/vinos), pico vendimia Mar
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e3e30000-5eed-5eed-5eed-000000000003'::uuid,
  (ARRAY['e3e30001-5eed-5eed-5eed-000000000001'::uuid,'e3e30002-5eed-5eed-5eed-000000000002'::uuid,'e3e30003-5eed-5eed-5eed-000000000003'::uuid,'e3e30004-5eed-5eed-5eed-000000000004'::uuid,'e3e30005-5eed-5eed-5eed-000000000005'::uuid,'e3e30006-5eed-5eed-5eed-000000000006'::uuid,'e3e30007-5eed-5eed-5eed-000000000007'::uuid,'e3e30008-5eed-5eed-5eed-000000000008'::uuid])[(t.n-1)%8+1],
  NULL, t.fecha,
  t.fecha::timestamp+((t.day_idx*13+t.n*5)%12+9||' hours')::interval,
  CASE
    WHEN t.fecha = CURRENT_DATE THEN NULL
    WHEN t.fecha = CURRENT_DATE-1 AND t.n%3=0 THEN NULL
    WHEN t.fecha = CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*13+t.n*5)%12+9||' hours')::interval+((t.n%2+3)||' hours')::interval
    ELSE t.fecha::timestamp+((t.day_idx*13+t.n*5)%12+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval
  END,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,12,11])[(t.day_idx*7+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,4,8,12,11])[(t.day_idx*7+t.n*13)%20+1]=1 THEN (t.day_idx*11+t.n*7)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,3,3,3,3,6,6,4,10,10,10])[(t.day_idx*13+t.n*7)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-301','H-302'])[(t.n-1)%8+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Matrimonial','Matrimonial'])[(t.n-1)%8+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(8,(2+round(3*abs(sin((d::date-'2026-01-01'::date)::float*pi()/15)))+round(3*CASE WHEN abs((d::date-'2026-01-01'::date)::int-75)<15 THEN sin(((d::date-'2026-01-01'::date)::int-60)::float*pi()/30) ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,8) g(n)) t WHERE t.n<=t.load;

-- EST4: Hostal del Sur — Bermejo, 3-8 huespedes/dia
-- Patron: frontera Argentina, tendencia creciente + pico carnaval dia 50
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e4e40000-5eed-5eed-5eed-000000000004'::uuid,
  (ARRAY['e4e40001-5eed-5eed-5eed-000000000001'::uuid,'e4e40002-5eed-5eed-5eed-000000000002'::uuid,'e4e40003-5eed-5eed-5eed-000000000003'::uuid,'e4e40004-5eed-5eed-5eed-000000000004'::uuid,'e4e40005-5eed-5eed-5eed-000000000005'::uuid,'e4e40006-5eed-5eed-5eed-000000000006'::uuid,'e4e40007-5eed-5eed-5eed-000000000007'::uuid,'e4e40008-5eed-5eed-5eed-000000000008'::uuid])[(t.n-1)%8+1],
  NULL, t.fecha,
  t.fecha::timestamp+((t.day_idx*9+t.n*7)%13+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*9+t.n*7)%13+8||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*9+t.n*7)%13+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,2,3,3,4,4,8,8,12,11])[(t.day_idx*9+t.n*11)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,2,2,2,2,2,2,3,3,4,4,8,8,12,11])[(t.day_idx*9+t.n*11)%20+1]=1 THEN (t.day_idx*5+t.n*9)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,2,2,2,2,2,3,3,3,3,3,6,6,4,4,10,10])[(t.day_idx*11+t.n*9)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-301','H-302'])[(t.n-1)%8+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Triple','Triple'])[(t.n-1)%8+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(3,LEAST(8,(3+round(3*(d::date-'2026-01-01'::date)::float/180)+round(2*CASE WHEN abs((d::date-'2026-01-01'::date)::int-50)<7 THEN 1.0 ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,8) g(n)) t WHERE t.n<=t.load;

-- EST5: Alojamiento El Valle — Entre Rios, 2-6 huespedes/dia
-- Patron: bimodal (turismo aventura), picos alrededor de dia 20 y dia 65
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e5e50000-5eed-5eed-5eed-000000000005'::uuid,
  (ARRAY['e5e50001-5eed-5eed-5eed-000000000001'::uuid,'e5e50002-5eed-5eed-5eed-000000000002'::uuid,'e5e50003-5eed-5eed-5eed-000000000003'::uuid,'e5e50004-5eed-5eed-5eed-000000000004'::uuid,'e5e50005-5eed-5eed-5eed-000000000005'::uuid,'e5e50006-5eed-5eed-5eed-000000000006'::uuid])[(t.n-1)%6+1],
  NULL, t.fecha,
  t.fecha::timestamp+((t.day_idx*7+t.n*11)%12+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*7+t.n*11)%12+9||' hours')::interval+((t.n%3+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*7+t.n*11)%12+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11])[(t.day_idx*13+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11])[(t.day_idx*13+t.n*7)%20+1]=1 THEN (t.day_idx*7+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,3,6,6,6,4,10,10])[(t.day_idx*7+t.n*13)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-301'])[(t.n-1)%6+1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Matrimonial'])[(t.n-1)%6+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(6,(2+round(4*abs(sin((d::date-'2026-01-01'::date)::float*pi()/40)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,6) g(n)) t WHERE t.n<=t.load;

-- EST6: Hotel Gran Villamontes — Villa Montes, 5-14 huespedes/dia
-- Patron: alto en verano (petrolero/calor), baja gradualmente en invierno
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e6e60000-5eed-5eed-5eed-000000000006'::uuid,
  (ARRAY['e6e60001-5eed-5eed-5eed-000000000001'::uuid,'e6e60002-5eed-5eed-5eed-000000000002'::uuid,'e6e60003-5eed-5eed-5eed-000000000003'::uuid,'e6e60004-5eed-5eed-5eed-000000000004'::uuid,'e6e60005-5eed-5eed-5eed-000000000005'::uuid,'e6e60006-5eed-5eed-5eed-000000000006'::uuid,'e6e60007-5eed-5eed-5eed-000000000007'::uuid,'e6e60008-5eed-5eed-5eed-000000000008'::uuid,'e6e60009-5eed-5eed-5eed-000000000009'::uuid,'e6e60010-5eed-5eed-5eed-000000000010'::uuid,'e6e60011-5eed-5eed-5eed-000000000011'::uuid])[(t.n-1)%11+1],
  NULL, t.fecha,
  t.fecha::timestamp+((t.day_idx*5+t.n*9)%14+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*5+t.n*9)%14+8||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*5+t.n*9)%14+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,8,12,11])[(t.day_idx*5+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,8,12,11])[(t.day_idx*5+t.n*13)%20+1]=1 THEN (t.day_idx*9+t.n*5)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,2,2,3,3,3,3,6,6,4,4,10,10,10])[(t.day_idx*9+t.n*5)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-204','H-301','H-302','H-401','H-402','H-501'])[(t.n-1)%11+1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Doble','Triple','Triple','Matrimonial','Matrimonial','Suite'])[(t.n-1)%11+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(5,LEAST(14,(5+round(5*(0.5+0.45*cos((d::date-'2026-01-01'::date)::float*pi()/180)))+round(4*sin((d::date-'2026-01-01'::date)::float*pi()/60))+CASE WHEN d::date=CURRENT_DATE-1 THEN 3 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,14) g(n)) t WHERE t.n<=t.load;

-- EST7: Posada Uriondo — Uriondo, 2-5 huespedes/dia
-- Patron: enoturismo, pico vendimia (Mar, dia 60-80), fin de semana
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e7e70000-5eed-5eed-5eed-000000000007'::uuid,
  (ARRAY['e7e70001-5eed-5eed-5eed-000000000001'::uuid,'e7e70002-5eed-5eed-5eed-000000000002'::uuid,'e7e70003-5eed-5eed-5eed-000000000003'::uuid,'e7e70004-5eed-5eed-5eed-000000000004'::uuid,'e7e70005-5eed-5eed-5eed-000000000005'::uuid])[(t.n-1)%5+1],
  NULL, t.fecha,
  t.fecha::timestamp+((t.day_idx*11+t.n*7)%11+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*11+t.n*7)%11+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*11+t.n*7)%11+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11])[(t.day_idx*11+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11])[(t.day_idx*11+t.n*7)%20+1]=1 THEN (t.day_idx*7+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,3,3,6,6,6,4,4,10,10,10])[(t.day_idx*7+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-301'])[(t.n-1)%5+1],
  (ARRAY['Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%5+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(5,(2+round(1.5*abs(sin((d::date-'2026-01-01'::date)::float*pi()/25)))+round(1.5*CASE WHEN (d::date-'2026-01-01'::date)::int BETWEEN 59 AND 89 THEN 1.0 ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,5) g(n)) t WHERE t.n<=t.load;

-- EST8: Hotel Tarija Plaza — Tarija, 6-14 huespedes/dia (complementa EST1 — valle inverso)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e8e80000-5eed-5eed-5eed-000000000008'::uuid,
  (ARRAY['e8e80001-5eed-5eed-5eed-000000000001'::uuid,'e8e80002-5eed-5eed-5eed-000000000002'::uuid,'e8e80003-5eed-5eed-5eed-000000000003'::uuid,'e8e80004-5eed-5eed-5eed-000000000004'::uuid,'e8e80005-5eed-5eed-5eed-000000000005'::uuid,'e8e80006-5eed-5eed-5eed-000000000006'::uuid,'e8e80007-5eed-5eed-5eed-000000000007'::uuid,'e8e80008-5eed-5eed-5eed-000000000008'::uuid,'e8e80009-5eed-5eed-5eed-000000000009'::uuid])[(t.n-1)%9+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*7+t.n*3)%14+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*7+t.n*3)%14+8||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*7+t.n*3)%14+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*3+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*3+t.n*7)%20+1]=1 THEN (t.day_idx*5+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,3,6,6,6,4,10,10])[(t.day_idx*7+t.n*3)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-301','H-302','H-401'])[(t.n-1)%9+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Triple','Triple','Familiar'])[(t.n-1)%9+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(6,LEAST(14,(6+round(4*(0.5+0.5*cos((d::date-'2026-01-01'::date)::float*pi()/60-pi()/3)))+round(4*sin((d::date-'2026-01-01'::date)::float*pi()/90))+CASE WHEN d::date=CURRENT_DATE-1 THEN 3 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,14) g(n)) t WHERE t.n<=t.load;

-- EST9: Hostal San Jacinto — Tarija, 4-9 huespedes/dia (pico carnaval)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'e9e90000-5eed-5eed-5eed-000000000009'::uuid,
  (ARRAY['e9e90001-5eed-5eed-5eed-000000000001'::uuid,'e9e90002-5eed-5eed-5eed-000000000002'::uuid,'e9e90003-5eed-5eed-5eed-000000000003'::uuid,'e9e90004-5eed-5eed-5eed-000000000004'::uuid,'e9e90005-5eed-5eed-5eed-000000000005'::uuid,'e9e90006-5eed-5eed-5eed-000000000006'::uuid,'e9e90007-5eed-5eed-5eed-000000000007'::uuid])[(t.n-1)%7+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*11+t.n*5)%13+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*11+t.n*5)%13+8||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*11+t.n*5)%13+8||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*5+t.n*9)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*5+t.n*9)%20+1]=1 THEN (t.day_idx*9+t.n*7)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,2,2,3,3,3,6,6,6,4,4,10,10,10])[(t.day_idx*9+t.n*5)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-301'])[(t.n-1)%7+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Matrimonial'])[(t.n-1)%7+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(4,LEAST(9,(4+round(3*(0.5+0.5*sin((d::date-'2026-01-01'::date)::float*pi()/60-pi()/3)))+round(2*CASE WHEN abs((d::date-'2026-01-01'::date)::int-50)<7 THEN 1.0 ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,9) g(n)) t WHERE t.n<=t.load;

-- EST10: Hotel Gran Yacuiba — Yacuiba, 5-12 huespedes/dia (alto en enero, oscilacion)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'eaaa0000-5eed-5eed-5eed-00000000000a'::uuid,
  (ARRAY['eaaa0001-5eed-5eed-5eed-000000000001'::uuid,'eaaa0002-5eed-5eed-5eed-000000000002'::uuid,'eaaa0003-5eed-5eed-5eed-000000000003'::uuid,'eaaa0004-5eed-5eed-5eed-000000000004'::uuid,'eaaa0005-5eed-5eed-5eed-000000000005'::uuid,'eaaa0006-5eed-5eed-5eed-000000000006'::uuid,'eaaa0007-5eed-5eed-5eed-000000000007'::uuid,'eaaa0008-5eed-5eed-5eed-000000000008'::uuid,'eaaa0009-5eed-5eed-5eed-000000000009'::uuid])[(t.n-1)%9+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*5+t.n*9)%14+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*5+t.n*9)%14+8||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*5+t.n*9)%14+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,4,4,4,8,8,12,11])[(t.day_idx*11+t.n*5)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,4,4,4,8,8,12,11])[(t.day_idx*11+t.n*5)%20+1]=1 THEN (t.day_idx*7+t.n*13)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,2,2,2,2,2,3,3,3,6,6,4,4,4,10,10,10])[(t.day_idx*5+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-204','H-301','H-302','H-401'])[(t.n-1)%9+1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Doble','Matrimonial','Matrimonial','Suite'])[(t.n-1)%9+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(5,LEAST(12,(5+round(4*(0.5+0.5*cos((d::date-'2026-01-01'::date)::float*pi()/180)))+round(3*abs(sin((d::date-'2026-01-01'::date)::float*pi()/45)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 3 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,12) g(n)) t WHERE t.n<=t.load;

-- EST11: Alojamiento Frontera Norte — Yacuiba, 2-5 huespedes/dia (bajo y estable)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'ebbb0000-5eed-5eed-5eed-00000000000b'::uuid,
  (ARRAY['ebbb0001-5eed-5eed-5eed-000000000001'::uuid,'ebbb0002-5eed-5eed-5eed-000000000002'::uuid,'ebbb0003-5eed-5eed-5eed-000000000003'::uuid,'ebbb0004-5eed-5eed-5eed-000000000004'::uuid,'ebbb0005-5eed-5eed-5eed-000000000005'::uuid])[(t.n-1)%5+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*9+t.n*7)%12+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*9+t.n*7)%12+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*9+t.n*7)%12+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*7+t.n*11)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,2,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*7+t.n*11)%20+1]=1 THEN (t.day_idx*11+t.n*5)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,2,2,2,2,3,3,3,3,6,6,4,4,10,10,10,10,10])[(t.day_idx*11+t.n*7)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203'])[(t.n-1)%5+1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble'])[(t.n-1)%5+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(5,(2+round(3*abs(sin((d::date-'2026-01-01'::date)::float*pi()/45)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,5) g(n)) t WHERE t.n<=t.load;

-- EST12: Hostal Colonial — San Lorenzo, 3-7 huespedes/dia (oscilacion quincenal)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'eccc0000-5eed-5eed-5eed-00000000000c'::uuid,
  (ARRAY['eccc0001-5eed-5eed-5eed-000000000001'::uuid,'eccc0002-5eed-5eed-5eed-000000000002'::uuid,'eccc0003-5eed-5eed-5eed-000000000003'::uuid,'eccc0004-5eed-5eed-5eed-000000000004'::uuid,'eccc0005-5eed-5eed-5eed-000000000005'::uuid,'eccc0006-5eed-5eed-5eed-000000000006'::uuid])[(t.n-1)%6+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*13+t.n*5)%11+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*13+t.n*5)%11+9||' hours')::interval+((t.n%2+3)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*13+t.n*5)%11+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*7+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*7+t.n*13)%20+1]=1 THEN (t.day_idx*11+t.n*7)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,2,3,3,3,6,6,4,4,10,10,10,10,10])[(t.day_idx*13+t.n*7)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-301'])[(t.n-1)%6+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%6+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(3,LEAST(7,(3+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/15)))+round(2*abs(cos((d::date-'2026-01-01'::date)::float*pi()/45)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,7) g(n)) t WHERE t.n<=t.load;

-- EST13: Alojamiento La Hacienda — San Lorenzo, 2-4 huespedes/dia (bajo, tendencia leve)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'eddd0000-5eed-5eed-5eed-00000000000d'::uuid,
  (ARRAY['eddd0001-5eed-5eed-5eed-000000000001'::uuid,'eddd0002-5eed-5eed-5eed-000000000002'::uuid,'eddd0003-5eed-5eed-5eed-000000000003'::uuid,'eddd0004-5eed-5eed-5eed-000000000004'::uuid])[(t.n-1)%4+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*7+t.n*11)%10+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*7+t.n*11)%10+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*7+t.n*11)%10+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*5+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*5+t.n*13)%20+1]=1 THEN (t.day_idx*13+t.n*5)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,2,2,2,3,3,3,6,6,6,4,4,10,10,10,10,10])[(t.day_idx*7+t.n*5)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202'])[(t.n-1)%4+1],
  (ARRAY['Individual','Individual','Doble','Doble'])[(t.n-1)%4+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*(d::date-'2026-01-01'::date)::float/180)+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- EST14: Hotel Bermejo Palace — Bermejo, 4-11 huespedes/dia (tendencia creciente)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'eeee0000-5eed-5eed-5eed-00000000000e'::uuid,
  (ARRAY['eeee0001-5eed-5eed-5eed-000000000001'::uuid,'eeee0002-5eed-5eed-5eed-000000000002'::uuid,'eeee0003-5eed-5eed-5eed-000000000003'::uuid,'eeee0004-5eed-5eed-5eed-000000000004'::uuid,'eeee0005-5eed-5eed-5eed-000000000005'::uuid,'eeee0006-5eed-5eed-5eed-000000000006'::uuid,'eeee0007-5eed-5eed-5eed-000000000007'::uuid,'eeee0008-5eed-5eed-5eed-000000000008'::uuid])[(t.n-1)%8+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*9+t.n*7)%13+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*9+t.n*7)%13+8||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*9+t.n*7)%13+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,2,2,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*9+t.n*11)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,2,2,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*9+t.n*11)%20+1]=1 THEN (t.day_idx*5+t.n*9)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,2,2,2,2,2,3,3,3,6,6,4,4,10,10,10,10,10])[(t.day_idx*11+t.n*9)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-301','H-302','H-401'])[(t.n-1)%8+1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Triple','Triple','Suite'])[(t.n-1)%8+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(4,LEAST(11,(4+round(4*(d::date-'2026-01-01'::date)::float/180)+round(3*abs(sin((d::date-'2026-01-01'::date)::float*pi()/50)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 3 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,11) g(n)) t WHERE t.n<=t.load;

-- EST15-EST21: pequenos establecimientos (misma estructura compacta)
-- EST15: Alojamiento La Ceiba — Bermejo, 2-4
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'efff0000-5eed-5eed-5eed-00000000000f'::uuid,
  (ARRAY['efff0001-5eed-5eed-5eed-000000000001'::uuid,'efff0002-5eed-5eed-5eed-000000000002'::uuid,'efff0003-5eed-5eed-5eed-000000000003'::uuid,'efff0004-5eed-5eed-5eed-000000000004'::uuid,'efff0005-5eed-5eed-5eed-000000000005'::uuid])[(t.n-1)%5+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*11+t.n*7)%12+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*11+t.n*7)%12+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*11+t.n*7)%12+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,2,2,2,2,2,3,3,4,4,4,8,8,12,11,11])[(t.day_idx*5+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,2,2,2,2,2,3,3,4,4,4,8,8,12,11,11])[(t.day_idx*5+t.n*13)%20+1]=1 THEN (t.day_idx*7+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,2,2,2,3,3,3,3,6,6,6,4,4,10,10,10,10,10])[(t.day_idx*13+t.n*5)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202'])[(t.n-1)%5+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble'])[(t.n-1)%5+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/30)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- EST16: Hostal El Rio Verde — Entre Rios, 3-7 (bimodal complementario)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f1f10000-5eed-5eed-5eed-000000000010'::uuid,
  (ARRAY['f1f10001-5eed-5eed-5eed-000000000001'::uuid,'f1f10002-5eed-5eed-5eed-000000000002'::uuid,'f1f10003-5eed-5eed-5eed-000000000003'::uuid,'f1f10004-5eed-5eed-5eed-000000000004'::uuid,'f1f10005-5eed-5eed-5eed-000000000005'::uuid,'f1f10006-5eed-5eed-5eed-000000000006'::uuid])[(t.n-1)%6+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*7+t.n*11)%12+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*7+t.n*11)%12+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*7+t.n*11)%12+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*13+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*13+t.n*7)%20+1]=1 THEN (t.day_idx*7+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,2,3,3,3,6,6,6,4,4,10,10,10,10])[(t.day_idx*7+t.n*13)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-301'])[(t.n-1)%6+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%6+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(3,LEAST(7,(3+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/45+pi()/2)))+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/90)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,7) g(n)) t WHERE t.n<=t.load;

-- EST17: Posada La Selva — Entre Rios, 2-4
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f2f20000-5eed-5eed-5eed-000000000011'::uuid,
  (ARRAY['f2f20001-5eed-5eed-5eed-000000000001'::uuid,'f2f20002-5eed-5eed-5eed-000000000002'::uuid,'f2f20003-5eed-5eed-5eed-000000000003'::uuid,'f2f20004-5eed-5eed-5eed-000000000004'::uuid])[(t.n-1)%4+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*13+t.n*7)%10+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*13+t.n*7)%10+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*13+t.n*7)%10+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*5+t.n*9)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*5+t.n*9)%20+1]=1 THEN (t.day_idx*9+t.n*5)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,2,2,2,3,3,6,6,6,4,4,10,10,10,10,10,10,10])[(t.day_idx*9+t.n*13)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202'])[(t.n-1)%4+1],
  (ARRAY['Individual','Individual','Matrimonial','Matrimonial'])[(t.n-1)%4+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*abs(cos((d::date-'2026-01-01'::date)::float*pi()/40)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- EST18: Hostal El Petrolero — Villa Montes, 4-9 (alto verano, complemento EST6)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f3f30000-5eed-5eed-5eed-000000000012'::uuid,
  (ARRAY['f3f30001-5eed-5eed-5eed-000000000001'::uuid,'f3f30002-5eed-5eed-5eed-000000000002'::uuid,'f3f30003-5eed-5eed-5eed-000000000003'::uuid,'f3f30004-5eed-5eed-5eed-000000000004'::uuid,'f3f30005-5eed-5eed-5eed-000000000005'::uuid,'f3f30006-5eed-5eed-5eed-000000000006'::uuid,'f3f30007-5eed-5eed-5eed-000000000007'::uuid])[(t.n-1)%7+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*5+t.n*9)%13+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*5+t.n*9)%13+8||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*5+t.n*9)%13+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,8,12,11,11])[(t.day_idx*5+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,8,12,11,11])[(t.day_idx*5+t.n*13)%20+1]=1 THEN (t.day_idx*9+t.n*5)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,2,2,2,3,3,3,6,6,4,4,4,10,10,10,10,10])[(t.day_idx*9+t.n*5)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-203','H-301'])[(t.n-1)%7+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Doble','Matrimonial'])[(t.n-1)%7+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(4,LEAST(9,(4+round(3*(0.5+0.45*cos((d::date-'2026-01-01'::date)::float*pi()/180)))+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/35)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,9) g(n)) t WHERE t.n<=t.load;

-- EST19: Alojamiento Chaco Boreal — Villa Montes, 2-5
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f4f40000-5eed-5eed-5eed-000000000013'::uuid,
  (ARRAY['f4f40001-5eed-5eed-5eed-000000000001'::uuid,'f4f40002-5eed-5eed-5eed-000000000002'::uuid,'f4f40003-5eed-5eed-5eed-000000000003'::uuid,'f4f40004-5eed-5eed-5eed-000000000004'::uuid,'f4f40005-5eed-5eed-5eed-000000000005'::uuid])[(t.n-1)%5+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*9+t.n*7)%11+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*9+t.n*7)%11+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*9+t.n*7)%11+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,8,12,11,11])[(t.day_idx*11+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,8,8,12,11,11])[(t.day_idx*11+t.n*7)%20+1]=1 THEN (t.day_idx*7+t.n*9)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,2,2,2,3,3,3,6,6,6,4,4,10,10,10,10,10,10])[(t.day_idx*7+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-301'])[(t.n-1)%5+1],
  (ARRAY['Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%5+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(5,(2+round(3*abs(sin((d::date-'2026-01-01'::date)::float*pi()/25+pi()/4)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,5) g(n)) t WHERE t.n<=t.load;

-- EST20: Hostal Los Vinedos — Uriondo, 3-6 (turismo vinedos, pico verano)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f5f50000-5eed-5eed-5eed-000000000014'::uuid,
  (ARRAY['f5f50001-5eed-5eed-5eed-000000000001'::uuid,'f5f50002-5eed-5eed-5eed-000000000002'::uuid,'f5f50003-5eed-5eed-5eed-000000000003'::uuid,'f5f50004-5eed-5eed-5eed-000000000004'::uuid,'f5f50005-5eed-5eed-5eed-000000000005'::uuid])[(t.n-1)%5+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*11+t.n*7)%11+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*11+t.n*7)%11+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*11+t.n*7)%11+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*11+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*11+t.n*7)%20+1]=1 THEN (t.day_idx*7+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,2,2,3,3,6,6,6,4,4,10,10,10,10,10])[(t.day_idx*7+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-301'])[(t.n-1)%5+1],
  (ARRAY['Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%5+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(3,LEAST(6,(3+round(1.5*(0.5+0.5*cos((d::date-'2026-01-01'::date)::float*pi()/180)))+round(1.5*abs(sin((d::date-'2026-01-01'::date)::float*pi()/20)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,6) g(n)) t WHERE t.n<=t.load;

-- EST21: Cabana Don Jose — Uriondo, 2-4
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f6f60000-5eed-5eed-5eed-000000000015'::uuid,
  (ARRAY['f6f60001-5eed-5eed-5eed-000000000001'::uuid,'f6f60002-5eed-5eed-5eed-000000000002'::uuid,'f6f60003-5eed-5eed-5eed-000000000003'::uuid,'f6f60004-5eed-5eed-5eed-000000000004'::uuid])[(t.n-1)%4+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*7+t.n*13)%10+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*7+t.n*13)%10+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*7+t.n*13)%10+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*7+t.n*11)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*7+t.n*11)%20+1]=1 THEN (t.day_idx*11+t.n*7)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,3,3,6,6,6,6,4,4,10,10,10,10,10])[(t.day_idx*13+t.n*7)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202'])[(t.n-1)%4+1],
  (ARRAY['Individual','Individual','Matrimonial','Matrimonial'])[(t.n-1)%4+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/30+pi()/6)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- =========================================================
-- NUEVOS MUNICIPIOS: Padcaya, Carapari, El Puente
-- =========================================================

-- EST22: Hostal La Frontera — Padcaya, 3-7 huespedes/dia
-- Patron: agro-turismo, oscilacion mensual, pico en epoca de cosecha (Abr-May)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f7f70000-5eed-5eed-5eed-000000000016'::uuid,
  (ARRAY['f7f70001-5eed-5eed-5eed-000000000001'::uuid,'f7f70002-5eed-5eed-5eed-000000000002'::uuid,'f7f70003-5eed-5eed-5eed-000000000003'::uuid,'f7f70004-5eed-5eed-5eed-000000000004'::uuid,'f7f70005-5eed-5eed-5eed-000000000005'::uuid,'f7f70006-5eed-5eed-5eed-000000000006'::uuid])[(t.n-1)%6+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*7+t.n*9)%12+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*7+t.n*9)%12+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*7+t.n*9)%12+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*9+t.n*7)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*9+t.n*7)%20+1]=1 THEN (t.day_idx*5+t.n*13)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,2,3,3,3,6,6,6,4,4,10,10,10,10])[(t.day_idx*7+t.n*9)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-103','H-201','H-202','H-301'])[(t.n-1)%6+1],
  (ARRAY['Individual','Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%6+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(3,LEAST(7,(3+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/30)))+round(2*CASE WHEN (d::date-'2026-01-01'::date)::int BETWEEN 90 AND 150 THEN sin(((d::date-'2026-01-01'::date)::int-90)::float*pi()/60) ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,7) g(n)) t WHERE t.n<=t.load;

-- EST23: Alojamiento San Jose — Padcaya, 2-4 (bajo, patron sencillo)
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f8f80000-5eed-5eed-5eed-000000000017'::uuid,
  (ARRAY['f8f80001-5eed-5eed-5eed-000000000001'::uuid,'f8f80002-5eed-5eed-5eed-000000000002'::uuid,'f8f80003-5eed-5eed-5eed-000000000003'::uuid,'f8f80004-5eed-5eed-5eed-000000000004'::uuid])[(t.n-1)%4+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*11+t.n*5)%10+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*11+t.n*5)%10+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*11+t.n*5)%10+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*13+t.n*5)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*13+t.n*5)%20+1]=1 THEN (t.day_idx*7+t.n*9)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,2,2,3,3,6,6,6,4,4,10,10,10,10,10,10,10])[(t.day_idx*5+t.n*13)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202'])[(t.n-1)%4+1],
  (ARRAY['Individual','Individual','Doble','Doble'])[(t.n-1)%4+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/35+pi()/3)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- EST24: Hotel Aguarague — Carapari, 4-9 huespedes/dia
-- Patron: petrolero/gas, picos de proyecto (oscilacion 50 dias), estable
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'f9f90000-5eed-5eed-5eed-000000000018'::uuid,
  (ARRAY['f9f90001-5eed-5eed-5eed-000000000001'::uuid,'f9f90002-5eed-5eed-5eed-000000000002'::uuid,'f9f90003-5eed-5eed-5eed-000000000003'::uuid,'f9f90004-5eed-5eed-5eed-000000000004'::uuid,'f9f90005-5eed-5eed-5eed-000000000005'::uuid,'f9f90006-5eed-5eed-5eed-000000000006'::uuid,'f9f90007-5eed-5eed-5eed-000000000007'::uuid])[(t.n-1)%7+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*5+t.n*11)%13+8||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*5+t.n*11)%13+8||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*5+t.n*11)%13+8||' hours')::interval+((t.n+t.day_idx)%3+1||' days')::interval,CURRENT_TIMESTAMP) END,
  -- Carapari: mas Bolivia y Argentina (trabajadores petroleros)
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,2,3,3,4,4,8,8,12,11])[(t.day_idx*7+t.n*9)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,2,3,3,4,4,8,8,12,11])[(t.day_idx*7+t.n*9)%20+1]=1 THEN (t.day_idx*9+t.n*7)%11+1 ELSE NULL END,
  -- Predomina Trabajo y Negocios
  (ARRAY[1,1,1,2,2,2,2,2,3,3,3,3,3,3,6,6,4,10,10,10])[(t.day_idx*9+t.n*7)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-203','H-301','H-401'])[(t.n-1)%7+1],
  (ARRAY['Individual','Individual','Doble','Doble','Doble','Triple','Matrimonial'])[(t.n-1)%7+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(4,LEAST(9,(4+round(3*abs(sin((d::date-'2026-01-01'::date)::float*pi()/50)))+round(2*abs(cos((d::date-'2026-01-01'::date)::float*pi()/120)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 2 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,9) g(n)) t WHERE t.n<=t.load;

-- EST25: Alojamiento El Gas — Carapari, 2-4
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'fafa0000-5eed-5eed-5eed-000000000019'::uuid,
  (ARRAY['fafa0001-5eed-5eed-5eed-000000000001'::uuid,'fafa0002-5eed-5eed-5eed-000000000002'::uuid,'fafa0003-5eed-5eed-5eed-000000000003'::uuid,'fafa0004-5eed-5eed-5eed-000000000004'::uuid])[(t.n-1)%4+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*9+t.n*13)%10+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*9+t.n*13)%10+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*9+t.n*13)%10+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*11+t.n*5)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,2,2,2,2,3,3,4,4,8,8,12,11,11])[(t.day_idx*11+t.n*5)%20+1]=1 THEN (t.day_idx*5+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,2,2,2,2,3,3,3,3,3,6,6,4,4,10,10,10,10,10])[(t.day_idx*5+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202'])[(t.n-1)%4+1],
  (ARRAY['Individual','Individual','Doble','Doble'])[(t.n-1)%4+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*abs(sin((d::date-'2026-01-01'::date)::float*pi()/40+pi()/5)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- EST26: Hostal El Puente — El Puente, 2-5 huespedes/dia
-- Patron: turismo rural, estacional con pico Semana Santa (dia 93), bajo invierno
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'fbfb0000-5eed-5eed-5eed-00000000001a'::uuid,
  (ARRAY['fbfb0001-5eed-5eed-5eed-000000000001'::uuid,'fbfb0002-5eed-5eed-5eed-000000000002'::uuid,'fbfb0003-5eed-5eed-5eed-000000000003'::uuid,'fbfb0004-5eed-5eed-5eed-000000000004'::uuid,'fbfb0005-5eed-5eed-5eed-000000000005'::uuid])[(t.n-1)%5+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*13+t.n*7)%11+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*13+t.n*7)%11+9||' hours')::interval+((t.n%2+2)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*13+t.n*7)%11+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*7+t.n*13)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,2,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*7+t.n*13)%20+1]=1 THEN (t.day_idx*13+t.n*7)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,1,2,2,3,3,6,6,6,6,4,4,10,10,10,10])[(t.day_idx*13+t.n*7)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202','H-301'])[(t.n-1)%5+1],
  (ARRAY['Individual','Individual','Doble','Doble','Matrimonial'])[(t.n-1)%5+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(5,(2+round(1.5*abs(sin((d::date-'2026-01-01'::date)::float*pi()/40)))+round(2*CASE WHEN abs((d::date-'2026-01-01'::date)::int-93)<7 THEN 1.0 ELSE 0.0 END)+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,5) g(n)) t WHERE t.n<=t.load;

-- EST27: Alojamiento Mendez — El Puente, 2-4
INSERT INTO public.partes_diarios (id,establecimiento_id,habitacion_id,persona_id,fecha_reporte,ingreso_at,salida_at,pais_procedencia_id,localidad_procedencia_id,motivo_viaje_id,keycloak_recepcionista_id,hab_nro_snapshot,hab_tipo_snapshot,estado_operativo)
SELECT gen_random_uuid(),'fcfc0000-5eed-5eed-5eed-00000000001b'::uuid,
  (ARRAY['fcfc0001-5eed-5eed-5eed-000000000001'::uuid,'fcfc0002-5eed-5eed-5eed-000000000002'::uuid,'fcfc0003-5eed-5eed-5eed-000000000003'::uuid,'fcfc0004-5eed-5eed-5eed-000000000004'::uuid])[(t.n-1)%4+1],
  NULL,t.fecha,t.fecha::timestamp+((t.day_idx*5+t.n*11)%10+9||' hours')::interval,
  CASE WHEN t.fecha=CURRENT_DATE THEN NULL WHEN t.fecha=CURRENT_DATE-1 AND t.n%3=0 THEN NULL WHEN t.fecha=CURRENT_DATE-1 THEN t.fecha::timestamp+((t.day_idx*5+t.n*11)%10+9||' hours')::interval+((t.n%2+1)||' hours')::interval ELSE LEAST(t.fecha::timestamp+((t.day_idx*5+t.n*11)%10+9||' hours')::interval+((t.n+t.day_idx)%2+1||' days')::interval,CURRENT_TIMESTAMP) END,
  (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*11+t.n*9)%20+1],
  CASE WHEN (ARRAY[1,1,1,1,1,1,1,1,1,1,2,2,3,3,4,4,8,12,11,11])[(t.day_idx*11+t.n*9)%20+1]=1 THEN (t.day_idx*9+t.n*11)%11+1 ELSE NULL END,
  (ARRAY[1,1,1,1,1,2,2,3,3,6,6,6,4,4,10,10,10,10,10,10])[(t.day_idx*9+t.n*11)%20+1],
  '00000000-5eed-5eed-5eed-000000000001'::uuid,
  (ARRAY['H-101','H-102','H-201','H-202'])[(t.n-1)%4+1],
  (ARRAY['Individual','Individual','Doble','Doble'])[(t.n-1)%4+1],
  'ACTIVO'
FROM (SELECT d::date AS fecha,(d::date-'2026-01-01'::date)::int AS day_idx,g.n,
  GREATEST(2,LEAST(4,(2+round(2*abs(cos((d::date-'2026-01-01'::date)::float*pi()/35+pi()/4)))+CASE WHEN d::date=CURRENT_DATE-1 THEN 1 ELSE 0 END)))::int AS load
  FROM generate_series('2026-01-01'::date,CURRENT_DATE,'1 day'::interval) d
  CROSS JOIN generate_series(1,4) g(n)) t WHERE t.n<=t.load;

-- Restaurar triggers
ALTER TABLE public.partes_diarios ENABLE TRIGGER tr_validar_capacidad_habitacion;
ALTER TABLE public.partes_diarios ENABLE TRIGGER tr_audit_partes;

COMMIT;
SQL
ok "Replica y partes diarios insertados"

# Esperar a que el CDC consumer termine de procesar los eventos de INSERT
# antes de corregir las capacidades (el CDC puede sobrescribir con valores duplicados)
info "Esperando 5s para que el CDC consumer procese los eventos..."
sleep 5

info "Corrigiendo capacidad_calculada en replica..."
psql_mov <<'SQL'
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
  'e7e70000-5eed-5eed-5eed-000000000007','e8e80000-5eed-5eed-5eed-000000000008',
  'e9e90000-5eed-5eed-5eed-000000000009','eaaa0000-5eed-5eed-5eed-00000000000a',
  'ebbb0000-5eed-5eed-5eed-00000000000b','eccc0000-5eed-5eed-5eed-00000000000c',
  'eddd0000-5eed-5eed-5eed-00000000000d','eeee0000-5eed-5eed-5eed-00000000000e',
  'efff0000-5eed-5eed-5eed-00000000000f','f1f10000-5eed-5eed-5eed-000000000010',
  'f2f20000-5eed-5eed-5eed-000000000011','f3f30000-5eed-5eed-5eed-000000000012',
  'f4f40000-5eed-5eed-5eed-000000000013','f5f50000-5eed-5eed-5eed-000000000014',
  'f6f60000-5eed-5eed-5eed-000000000015','f7f70000-5eed-5eed-5eed-000000000016',
  'f8f80000-5eed-5eed-5eed-000000000017','f9f90000-5eed-5eed-5eed-000000000018',
  'fafa0000-5eed-5eed-5eed-000000000019','fbfb0000-5eed-5eed-5eed-00000000001a',
  'fcfc0000-5eed-5eed-5eed-00000000001b'
);
-- Limpiar salidas futuras (por diferencia de zona horaria)
UPDATE public.partes_diarios
SET salida_at = NULL
WHERE salida_at IS NOT NULL AND DATE(salida_at) > CURRENT_DATE;
SQL
ok "Capacidades corregidas y salidas futuras limpiadas"

# ============================================================
# PASO 3 — RESUMEN
# ============================================================
echo
info "Resumen de datos de prueba:"
psql_mov -t <<'SQL'
SELECT
  '  Establecimientos (replica):' AS concepto,
  COUNT(DISTINCT establecimiento_id)::text AS valor
FROM public.habitaciones_replica_cache
WHERE establecimiento_id IN (
  'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
  'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
  'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
  'e7e70000-5eed-5eed-5eed-000000000007','e8e80000-5eed-5eed-5eed-000000000008',
  'e9e90000-5eed-5eed-5eed-000000000009','eaaa0000-5eed-5eed-5eed-00000000000a',
  'ebbb0000-5eed-5eed-5eed-00000000000b','eccc0000-5eed-5eed-5eed-00000000000c',
  'eddd0000-5eed-5eed-5eed-00000000000d','eeee0000-5eed-5eed-5eed-00000000000e',
  'efff0000-5eed-5eed-5eed-00000000000f','f1f10000-5eed-5eed-5eed-000000000010',
  'f2f20000-5eed-5eed-5eed-000000000011','f3f30000-5eed-5eed-5eed-000000000012',
  'f4f40000-5eed-5eed-5eed-000000000013','f5f50000-5eed-5eed-5eed-000000000014',
  'f6f60000-5eed-5eed-5eed-000000000015','f7f70000-5eed-5eed-5eed-000000000016',
  'f8f80000-5eed-5eed-5eed-000000000017','f9f90000-5eed-5eed-5eed-000000000018',
  'fafa0000-5eed-5eed-5eed-000000000019','fbfb0000-5eed-5eed-5eed-00000000001a',
  'fcfc0000-5eed-5eed-5eed-00000000001b'
)
UNION ALL
SELECT '  Habitaciones en cache:',
  COUNT(*)::text
  FROM public.habitaciones_replica_cache
  WHERE establecimiento_id IN (
    'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
    'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
    'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
    'e7e70000-5eed-5eed-5eed-000000000007','e8e80000-5eed-5eed-5eed-000000000008',
    'e9e90000-5eed-5eed-5eed-000000000009','eaaa0000-5eed-5eed-5eed-00000000000a',
    'ebbb0000-5eed-5eed-5eed-00000000000b','eccc0000-5eed-5eed-5eed-00000000000c',
    'eddd0000-5eed-5eed-5eed-00000000000d','eeee0000-5eed-5eed-5eed-00000000000e',
    'efff0000-5eed-5eed-5eed-00000000000f','f1f10000-5eed-5eed-5eed-000000000010',
    'f2f20000-5eed-5eed-5eed-000000000011','f3f30000-5eed-5eed-5eed-000000000012',
    'f4f40000-5eed-5eed-5eed-000000000013','f5f50000-5eed-5eed-5eed-000000000014',
    'f6f60000-5eed-5eed-5eed-000000000015','f7f70000-5eed-5eed-5eed-000000000016',
    'f8f80000-5eed-5eed-5eed-000000000017','f9f90000-5eed-5eed-5eed-000000000018',
    'fafa0000-5eed-5eed-5eed-000000000019','fbfb0000-5eed-5eed-5eed-00000000001a',
    'fcfc0000-5eed-5eed-5eed-00000000001b'
  )
UNION ALL
SELECT '  Capacidad total (camas):',
  SUM(capacidad_calculada)::text
  FROM public.habitaciones_replica_cache
  WHERE establecimiento_id IN (
    'e1e10000-5eed-5eed-5eed-000000000001','e2e20000-5eed-5eed-5eed-000000000002',
    'e3e30000-5eed-5eed-5eed-000000000003','e4e40000-5eed-5eed-5eed-000000000004',
    'e5e50000-5eed-5eed-5eed-000000000005','e6e60000-5eed-5eed-5eed-000000000006',
    'e7e70000-5eed-5eed-5eed-000000000007','e8e80000-5eed-5eed-5eed-000000000008',
    'e9e90000-5eed-5eed-5eed-000000000009','eaaa0000-5eed-5eed-5eed-00000000000a',
    'ebbb0000-5eed-5eed-5eed-00000000000b','eccc0000-5eed-5eed-5eed-00000000000c',
    'eddd0000-5eed-5eed-5eed-00000000000d','eeee0000-5eed-5eed-5eed-00000000000e',
    'efff0000-5eed-5eed-5eed-00000000000f','f1f10000-5eed-5eed-5eed-000000000010',
    'f2f20000-5eed-5eed-5eed-000000000011','f3f30000-5eed-5eed-5eed-000000000012',
    'f4f40000-5eed-5eed-5eed-000000000013','f5f50000-5eed-5eed-5eed-000000000014',
    'f6f60000-5eed-5eed-5eed-000000000015','f7f70000-5eed-5eed-5eed-000000000016',
    'f8f80000-5eed-5eed-5eed-000000000017','f9f90000-5eed-5eed-5eed-000000000018',
    'fafa0000-5eed-5eed-5eed-000000000019','fbfb0000-5eed-5eed-5eed-00000000001a',
    'fcfc0000-5eed-5eed-5eed-00000000001b'
  )
UNION ALL
SELECT '  Partes diarios insertados:',
  COUNT(*)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
UNION ALL
SELECT '  Rango de fechas:',
  MIN(fecha_reporte)::text || ' -> ' || MAX(fecha_reporte)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
UNION ALL
SELECT '  Paises distintos:',
  COUNT(DISTINCT pais_procedencia_id)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
UNION ALL
SELECT '  Partes de ayer (check-ins):',
  COUNT(*)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
    AND fecha_reporte = CURRENT_DATE - 1
UNION ALL
SELECT '  Check-outs de ayer (salida_at no nulo):',
  COUNT(*)::text
  FROM public.partes_diarios
  WHERE keycloak_recepcionista_id = '00000000-5eed-5eed-5eed-000000000001'
    AND fecha_reporte = CURRENT_DATE - 1
    AND salida_at IS NOT NULL;
SQL

echo
ok "${BOLD}Datos de prueba completados. 27 establecimientos (10 municipios) en Tarija.${NC}"
ok "${BOLD}Aparecen en el desplegable de Estadisticas filtrado por departamento Tarija.${NC}"
echo -e "  Para limpiar sin reinsertar: ${YELLOW}bash db_script_local/seed-estadisticas.sh --clean${NC}"
