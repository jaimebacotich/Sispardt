#!/bin/bash
# ============================================================
# SISPARDT - Registrar conectores Debezium
#
# Uso:
#   bash infrastructure/kafka/register-connectors.sh
#
# Windows (Git Bash):
#   MSYS_NO_PATHCONV=1 bash infrastructure/kafka/register-connectors.sh
# ============================================================
set -e

DEBEZIUM_URL="${DEBEZIUM_URL:-http://localhost:8083}"
MAX_RETRIES=12
RETRY_INTERVAL=10

echo "==> Esperando que Debezium esté listo en $DEBEZIUM_URL..."
for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$DEBEZIUM_URL/connectors" > /dev/null 2>&1; then
        echo "    Debezium disponible."
        break
    fi
    echo "    Intento $i/$MAX_RETRIES — esperando ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
    if [ "$i" -eq "$MAX_RETRIES" ]; then
        echo "ERROR: Debezium no respondió después de $((MAX_RETRIES * RETRY_INTERVAL))s"
        exit 1
    fi
done

# ---------------------------------------------------------------------------
# Función para registrar o actualizar un conector
# ---------------------------------------------------------------------------
register_connector() {
    local name="$1"
    local config_file="$2"
    local password="$3"

    echo ""
    echo "==> Procesando conector: $name"

    # Inyectar la contraseña en el JSON de configuración
    local config
    config=$(cat "$config_file" | sed "s|\${file:/kafka/secrets/debezium.properties:db.password}|$password|g")

    # Verificar si ya existe
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEBEZIUM_URL/connectors/$name")

    if [ "$http_status" -eq 200 ]; then
        echo "    Conector existe — actualizando configuración..."
        curl -s -X PUT \
            -H "Content-Type: application/json" \
            "$DEBEZIUM_URL/connectors/$name/config" \
            -d "$(echo "$config" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(json.dumps(d["config"]))')"
        echo ""
        echo "    Conector '$name' actualizado."
    else
        echo "    Registrando nuevo conector..."
        curl -s -X POST \
            -H "Content-Type: application/json" \
            "$DEBEZIUM_URL/connectors" \
            -d "$config"
        echo ""
        echo "    Conector '$name' registrado."
    fi
}

# ---------------------------------------------------------------------------
# Registrar conectores
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEBEZIUM_PASSWORD="${APP_PASS_DEBEZIUM:?Variable APP_PASS_DEBEZIUM requerida}"

register_connector \
    "sispardt-establecimientos-source" \
    "$SCRIPT_DIR/debezium/connector-establecimientos.json" \
    "$DEBEZIUM_PASSWORD"

# ---------------------------------------------------------------------------
# Verificar estado
# ---------------------------------------------------------------------------
echo ""
echo "==> Estado de los conectores:"
curl -s "$DEBEZIUM_URL/connectors?expand=status" | python3 -m json.tool 2>/dev/null || \
    curl -s "$DEBEZIUM_URL/connectors"

echo ""
echo "Done. Topics disponibles en kafka-ui: http://localhost:8091"
