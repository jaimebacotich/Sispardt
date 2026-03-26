#!/bin/bash
# ============================================================
# SISPARDT - Auto-registro de conectores Debezium (Contenedor)
# ============================================================
set -e

DEBEZIUM_URL="${DEBEZIUM_URL:-http://debezium:8083}"
MAX_RETRIES=20
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
# Función para registrar conector
# ---------------------------------------------------------------------------
register_connector() {
    local name="$1"
    local config_file="$2"
    local password="$3"

    echo ""
    echo "==> Procesando conector: $name"

    # Inyectar contraseña
    local config
    config=$(sed "s|\${file:/kafka/secrets/debezium.properties:db.password}|$password|g" "$config_file")

    # Verificar si ya existe
    local http_status
    http_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEBEZIUM_URL/connectors/$name")

    if [ "$http_status" -eq 200 ]; then
        echo "    Conector existe — actualizando configuración..."
        # Extraer solo el objeto "config" del JSON completo para el PUT
        local sub_config
        sub_config=$(echo "$config" | grep -o '{[^{]*"config"[^{]*{[^}]*}[^}]*}' | sed 's/.*"config": \({[^}]*}\).*/\1/')
        
        # Como no tenemos jq en alpine base a veces, usamos una aproximacion mas simple o python si esta disponible
        # Debezium acepta el JSON entero en el PUT de config si solo mandamos el contenido de la llave config.
        # Intentaremos el PUT directo con la parte config
        curl -s -X PUT \
            -H "Content-Type: application/json" \
            "$DEBEZIUM_URL/connectors/$name/config" \
            -d "$sub_config"
        echo "    Conector '$name' actualizado."
    else
        echo "    Registrando nuevo conector..."
        curl -s -X POST \
            -H "Content-Type: application/json" \
            "$DEBEZIUM_URL/connectors" \
            -d "$config"
        echo "    Conector '$name' registrado."
    fi
}

# ---------------------------------------------------------------------------
# Ejecucion
# ---------------------------------------------------------------------------
DEBEZIUM_PASSWORD="${APP_PASS_DEBEZIUM:?Variable APP_PASS_DEBEZIUM requerida}"

register_connector \
    "sispardt-establecimientos-source" \
    "/scripts/connector-establecimientos.json" \
    "$DEBEZIUM_PASSWORD"

echo "==> Registro de conectores completado."
