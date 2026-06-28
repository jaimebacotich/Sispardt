#!/bin/bash
# ============================================================
# SISPARDT - Keycloak Init Script
# Crea desde cero: realm, roles, atributos, scopes, clientes y usuarios.
# Es idempotente: puede ejecutarse múltiples veces sin duplicar datos.
#
# Variables requeridas (docker-compose las inyecta):
#   KC_HOST / KC_PORT         - hostname y puerto de Keycloak
#   KEYCLOAK_ADMIN            - usuario admin del realm master
#   KEYCLOAK_ADMIN_PASSWORD   - contraseña del admin
#   KEYCLOAK_REALM            - nombre del realm a crear
#   SISPARDT_USER_PASSWORD    - contraseña única para todos los usuarios
#   KC_SECRET_EST_SVC         - secret para sispardt-establecimientos-svc
#   KC_SECRET_MOV_SVC         - secret para sispardt-movimientos-svc
#   APP_HOST / APP_PORT       - para las redirectUris del cliente web
# ============================================================
set -e

KC_HOST="${KC_HOST:-keycloak}"
KC_PORT="${KC_PORT:-8080}"
KC_URL="http://${KC_HOST}:${KC_PORT}"
REALM="${KEYCLOAK_REALM:-sispardt}"
ADMIN_USER="${KEYCLOAK_ADMIN:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:?Variable KEYCLOAK_ADMIN_PASSWORD requerida}"
DEFAULT_PASS="${SISPARDT_USER_PASSWORD:?Variable SISPARDT_USER_PASSWORD requerida}"
KCADM="/opt/keycloak/bin/kcadm.sh"

log()  { echo "[KC-INIT] $*"; }
ok()   { echo "[KC-INIT] OK $*"; }
fail() { echo "[KC-INIT] FALLO: $*" >&2; exit 1; }

# ---- 1. Esperar Keycloak (TCP, sin curl) ----
log "Esperando Keycloak en ${KC_HOST}:${KC_PORT}..."
MAX_WAIT=180; WAITED=0
until bash -c "exec 3<>/dev/tcp/${KC_HOST}/${KC_PORT} 2>/dev/null"; do
    [ $WAITED -ge $MAX_WAIT ] && fail "Timeout esperando Keycloak en ${KC_HOST}:${KC_PORT}"
    sleep 3; WAITED=$((WAITED+3))
done
ok "Keycloak disponible"

# ---- 2. Autenticar ----
log "Autenticando como ${ADMIN_USER}..."
$KCADM config credentials \
    --server "$KC_URL" --realm master \
    --user "$ADMIN_USER" --password "$ADMIN_PASS" || fail "Autenticación fallida"
ok "Autenticado"

# ---- 3. Crear realm (idempotente) ----
if ! $KCADM get "realms/${REALM}" >/dev/null 2>&1; then
    log "Creando realm ${REALM}..."
    $KCADM create realms \
        -s realm="${REALM}" \
        -s enabled=true \
        -s displayName="SISPARDT" \
        -s loginWithEmailAllowed=true \
        -s registrationAllowed=false \
        -s resetPasswordAllowed=true \
        -s bruteForceProtected=true \
        -s failureFactor=5
    ok "Realm ${REALM} creado"
else
    ok "Realm ${REALM} ya existe"
fi

# ---- 4. Configuración del realm ----
log "Configurando accessTokenLifespan=1800 seg..."
$KCADM update "realms/${REALM}" -s accessTokenLifespan=1800 \
    && ok "accessTokenLifespan actualizado" \
    || log "ADVERTENCIA: no se pudo actualizar accessTokenLifespan"

# ---- 4b. Apariencia del login ----
log "Configurando apariencia del login (título, idioma, forgot-password)..."
$KCADM update "realms/${REALM}" \
    -s 'displayNameHtml=<strong style="text-transform:none">Bienvenido</strong><br/><span style="font-weight:400;font-size:.85em;text-transform:none">Sistema de Partes Diarios Tarija</span>' \
    -s internationalizationEnabled=true \
    -s 'supportedLocales=["es","en"]' \
    -s defaultLocale=es \
    -s resetPasswordAllowed=false \
    && ok "Apariencia del login configurada" \
    || log "ADVERTENCIA: no se pudo configurar apariencia del login"

# Deshabilitar update_user_locale para evitar pantalla "Actualizar información de cuenta"
$KCADM update authentication/required-actions/update_user_locale \
    -r "${REALM}" -s enabled=false 2>/dev/null \
    && ok "update_user_locale deshabilitado" \
    || log "ADVERTENCIA: no se pudo deshabilitar update_user_locale"

# ---- 5. Crear roles (idempotente) ----
log "Creando roles..."
for ROLE in admin_general responsable_registro tecnico_registro recepcionista estadistica_externa migraciones; do
    if ! $KCADM get "roles/${ROLE}" -r "${REALM}" >/dev/null 2>&1; then
        $KCADM create roles -r "${REALM}" -s name="${ROLE}"
        ok "  Rol creado: ${ROLE}"
    fi
done

# ---- 6. User Profile: declarar atributo establecimiento_id ----
log "Configurando User Profile (atributo establecimiento_id)..."
cat > /tmp/user_profile.json << 'UPEOF'
{
  "attributes": [
    {
      "name": "username",
      "displayName": "${username}",
      "validations": {
        "length": { "min": 3, "max": 255 },
        "username-prohibited-characters": {},
        "up-username-not-idn-homograph": {}
      },
      "permissions": { "view": ["admin","user"], "edit": ["admin","user"] },
      "multivalued": false
    },
    {
      "name": "email",
      "displayName": "${email}",
      "validations": { "email": {}, "length": { "max": 255 } },
      "permissions": { "view": ["admin","user"], "edit": ["admin","user"] },
      "multivalued": false
    },
    {
      "name": "firstName",
      "displayName": "${firstName}",
      "validations": { "length": { "max": 255 }, "person-name-prohibited-characters": {} },
      "permissions": { "view": ["admin","user"], "edit": ["admin","user"] },
      "multivalued": false
    },
    {
      "name": "lastName",
      "displayName": "${lastName}",
      "validations": { "length": { "max": 255 }, "person-name-prohibited-characters": {} },
      "permissions": { "view": ["admin","user"], "edit": ["admin","user"] },
      "multivalued": false
    },
    {
      "name": "establecimiento_id",
      "displayName": "ID del Establecimiento",
      "validations": { "length": { "max": 36 } },
      "annotations": { "inputType": "text" },
      "permissions": { "view": ["admin","user"], "edit": ["admin"] },
      "multivalued": false,
      "required": { "roles": [] }
    }
  ],
  "groups": [
    {
      "name": "user-metadata",
      "displayHeader": "User metadata",
      "displayDescription": "Attributes which refer to user metadata"
    }
  ]
}
UPEOF
$KCADM update "realms/${REALM}/users/profile" -f /tmp/user_profile.json 2>/dev/null \
    && ok "User Profile actualizado" \
    || log "ADVERTENCIA: no se pudo actualizar User Profile"

# ---- 7. Crear client scope sispardt-claims (idempotente) ----
log "Configurando client scope sispardt-claims..."

# Buscar scope existente
SCOPE_ID=$(
    $KCADM get client-scopes -r "${REALM}" 2>/dev/null \
    | grep -B3 '"sispardt-claims"' \
    | grep '"id"' \
    | cut -d'"' -f4 \
    | head -1
)

if [ -z "$SCOPE_ID" ]; then
    SCOPE_ID=$(
        $KCADM create client-scopes \
            -r "${REALM}" \
            -s name=sispardt-claims \
            -s protocol=openid-connect \
            -s 'attributes={"include.in.token.scope":"true","display.on.consent.screen":"false"}' \
            -i
    )
    ok "  Client scope creado: sispardt-claims (${SCOPE_ID})"
else
    ok "  Client scope ya existe: sispardt-claims (${SCOPE_ID})"
fi

# ---- 8. Mappers en sispardt-claims (idempotente) ----
# Usa ficheros JSON para evitar el bug de kcadm "Cannot parse the JSON"
# al usar la sintaxis -s config.*=valor con campos anidados.

create_attr_mapper() {
    local NAME="$1" USER_ATTR="$2" CLAIM="$3"
    if ! $KCADM get "client-scopes/${SCOPE_ID}/protocol-mappers/models" \
            -r "${REALM}" 2>/dev/null | grep -q "\"${NAME}\""; then
        cat > /tmp/mapper_attr.json << MAPEOF
{
  "name": "${NAME}",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "config": {
    "user.attribute": "${USER_ATTR}",
    "claim.name": "${CLAIM}",
    "access.token.claim": "true",
    "id.token.claim": "true",
    "userinfo.token.claim": "true",
    "jsonType.label": "String",
    "multivalued": "false"
  }
}
MAPEOF
        $KCADM create "client-scopes/${SCOPE_ID}/protocol-mappers/models" \
            -r "${REALM}" -f /tmp/mapper_attr.json \
            && ok "  Mapper creado: ${NAME}" || log "  WARN: mapper ${NAME}"
    else
        ok "  Mapper ya existe: ${NAME}"
    fi
}

create_roles_mapper() {
    local NAME="$1" CLAIM="$2"
    if ! $KCADM get "client-scopes/${SCOPE_ID}/protocol-mappers/models" \
            -r "${REALM}" 2>/dev/null | grep -q "\"${NAME}\""; then
        cat > /tmp/mapper_roles.json << MAPEOF
{
  "name": "${NAME}",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-realm-role-mapper",
  "config": {
    "claim.name": "${CLAIM}",
    "access.token.claim": "true",
    "id.token.claim": "true",
    "userinfo.token.claim": "true",
    "jsonType.label": "String",
    "multivalued": "true"
  }
}
MAPEOF
        $KCADM create "client-scopes/${SCOPE_ID}/protocol-mappers/models" \
            -r "${REALM}" -f /tmp/mapper_roles.json \
            && ok "  Mapper creado: ${NAME}" || log "  WARN: mapper ${NAME}"
    else
        ok "  Mapper ya existe: ${NAME}"
    fi
}

create_attr_mapper  "establecimiento_id" "establecimiento_id" "establecimiento_id"
create_roles_mapper "roles-flatlist"     "roles"

# ---- 9. Crear cliente sispardt-web (frontend público, idempotente) ----
log "Configurando cliente sispardt-web..."
APP_HOST="${APP_HOST:-localhost}"
APP_PORT="${APP_PORT:-3100}"

WEB_ID=$(
    $KCADM get clients -r "${REALM}" -q "clientId=sispardt-web" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)

REDIRECT_URIS="[\"http://localhost:3000/*\",\"http://localhost:3100/*\",\"http://${APP_HOST}:${APP_PORT}/*\",\"*\"]"

if [ -z "$WEB_ID" ]; then
    WEB_ID=$(
        $KCADM create clients \
            -r "${REALM}" \
            -s clientId=sispardt-web \
            -s enabled=true \
            -s protocol=openid-connect \
            -s publicClient=true \
            -s standardFlowEnabled=true \
            -s directAccessGrantsEnabled=false \
            -s serviceAccountsEnabled=false \
            -s "redirectUris=${REDIRECT_URIS}" \
            -s 'webOrigins=["+"]' \
            -s 'attributes={"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"+"}' \
            -i
    )
    ok "  sispardt-web creado (${WEB_ID})"
else
    $KCADM update "clients/${WEB_ID}" -r "${REALM}" \
        -s "redirectUris=${REDIRECT_URIS}" \
        -s 'webOrigins=["+"]' \
        -s 'attributes={"pkce.code.challenge.method":"S256","post.logout.redirect.uris":"+"}' 2>/dev/null \
        && ok "  sispardt-web redirectUris actualizados" || log "  WARN: redirectUris"
fi

# Asignar sispardt-claims como scope por defecto en sispardt-web
if [ -n "$WEB_ID" ] && [ -n "$SCOPE_ID" ]; then
    $KCADM update "clients/${WEB_ID}/default-client-scopes/${SCOPE_ID}" \
        -r "${REALM}" 2>/dev/null \
        && ok "  sispardt-claims asignado como scope default de sispardt-web" \
        || log "  WARN: asignación de scope a sispardt-web"
fi

# ---- 10. Crear clientes de microservicios (idempotente) ----
log "Configurando clientes de microservicios..."

create_service_client() {
    local CLIENT_ID="$1"
    local SECRET="${2:?Secret requerido para $CLIENT_ID}"

    EXIST_COUNT=$(
        $KCADM get clients -r "${REALM}" -q "clientId=${CLIENT_ID}" --fields id 2>/dev/null \
        | grep '"id"' | wc -l
    )

    if [ "$EXIST_COUNT" -eq 0 ]; then
        $KCADM create clients \
            -r "${REALM}" \
            -s clientId="${CLIENT_ID}" \
            -s enabled=true \
            -s protocol=openid-connect \
            -s publicClient=false \
            -s serviceAccountsEnabled=true \
            -s directAccessGrantsEnabled=false \
            -s standardFlowEnabled=false \
            -s clientAuthenticatorType=client-secret \
            -s secret="${SECRET}"
        ok "  Cliente creado: ${CLIENT_ID}"
    else
        SVC_ID=$(
            $KCADM get clients -r "${REALM}" -q "clientId=${CLIENT_ID}" --fields id 2>/dev/null \
            | grep '"id"' | cut -d'"' -f4 | head -1
        )
        $KCADM update "clients/${SVC_ID}" -r "${REALM}" -s "secret=${SECRET}" 2>/dev/null \
            && ok "  Secret actualizado: ${CLIENT_ID}" \
            || log "  WARN: no se pudo actualizar secret de ${CLIENT_ID}"
    fi
}

create_service_client "sispardt-establecimientos-svc"   "${KC_SECRET_EST_SVC:?Variable KC_SECRET_EST_SVC requerida}"
create_service_client "sispardt-movimientos-svc"        "${KC_SECRET_MOV_SVC:?Variable KC_SECRET_MOV_SVC requerida}"
create_service_client "sispardt-sistema-svc"            "${KC_SECRET_SISTEMA_SVC:?Variable KC_SECRET_SISTEMA_SVC requerida}"
create_service_client "sispardt-auditoria-sesiones-svc" "${KC_SECRET_AUD_SVC:?Variable KC_SECRET_AUD_SVC requerida}"

# ---- 10b. Asignar manage-users al service account de sispardt-establecimientos-svc ----
log "Asignando manage-users a sispardt-establecimientos-svc..."

EST_SVC_ID=$(
    $KCADM get clients -r "${REALM}" -q "clientId=sispardt-establecimientos-svc" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)
EST_SVC_USER_ID=$(
    $KCADM get "clients/${EST_SVC_ID}/service-account-user" \
        -r "${REALM}" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)
REALM_MGMT_ID=$(
    $KCADM get clients -r "${REALM}" -q "clientId=realm-management" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)

if [ -n "$EST_SVC_USER_ID" ] && [ -n "$REALM_MGMT_ID" ]; then
    $KCADM add-roles -r "${REALM}" --uid "${EST_SVC_USER_ID}" \
        --cclientid realm-management \
        --rolename manage-users \
        --rolename view-users \
        --rolename view-realm 2>/dev/null \
        && ok "  manage-users, view-users y view-realm asignados a sispardt-establecimientos-svc" \
        || log "  WARN: no se pudo asignar roles KC admin (pueden ya estar asignados)"
else
    log "  WARN: no se pudo obtener service-account-user de sispardt-establecimientos-svc"
fi

# ---- 10b2. Asignar view-users y query-users al service account de sispardt-movimientos-svc ----
log "Asignando roles de auditoría a sispardt-movimientos-svc..."

MOV_SVC_ID=$(
    $KCADM get clients -r "${REALM}" -q "clientId=sispardt-movimientos-svc" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)
MOV_SVC_USER_ID=$(
    $KCADM get "clients/${MOV_SVC_ID}/service-account-user" \
        -r "${REALM}" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)

if [ -n "$MOV_SVC_USER_ID" ] && [ -n "$REALM_MGMT_ID" ]; then
    $KCADM add-roles -r "${REALM}" --uid "${MOV_SVC_USER_ID}" \
        --cclientid realm-management \
        --rolename query-users \
        --rolename view-users 2>/dev/null \
        && ok "  query-users y view-users asignados a sispardt-movimientos-svc" \
        || log "  WARN: no se pudo asignar roles KC admin (pueden ya estar asignados)"
else
    log "  WARN: no se pudo obtener service-account-user de sispardt-movimientos-svc"
fi

# ---- 10c. Asignar roles al service account de sispardt-auditoria-sesiones-svc ----
log "Asignando roles a sispardt-auditoria-sesiones-svc..."

AUD_SVC_ID=$(
    $KCADM get clients -r "${REALM}" -q "clientId=sispardt-auditoria-sesiones-svc" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)
AUD_SVC_USER_ID=$(
    $KCADM get "clients/${AUD_SVC_ID}/service-account-user" \
        -r "${REALM}" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)

if [ -n "$AUD_SVC_USER_ID" ] && [ -n "$REALM_MGMT_ID" ]; then
    $KCADM add-roles -r "${REALM}" --uid "${AUD_SVC_USER_ID}" \
        --cclientid realm-management \
        --rolename view-events \
        --rolename view-clients \
        --rolename query-users \
        --rolename view-users \
        --rolename manage-users 2>/dev/null \
        && ok "  view-events, view-clients, query-users, view-users, manage-users asignados a sispardt-auditoria-sesiones-svc" \
        || log "  WARN: no se pudo asignar roles KC admin (pueden ya estar asignados)"
else
    log "  WARN: no se pudo obtener service-account-user de sispardt-auditoria-sesiones-svc"
fi

# ---- 10e. Asignar roles al service account de sispardt-sistema-svc ----
# Roles requeridos:
#   view-events  → leer eventos de login/logout del realm
#   view-clients → consultar sesiones activas por cliente UUID
#   query-users  → resolver username desde userId
#   view-users   → obtener roles del usuario (para /conectados)
#   manage-users → crear/editar/eliminar usuarios del sistema
#   view-realm   → consultar realm para operaciones admin
log "Asignando roles a sispardt-sistema-svc..."

SISTEMA_SVC_ID=$(
    $KCADM get clients -r "${REALM}" -q "clientId=sispardt-sistema-svc" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)
SISTEMA_SVC_USER_ID=$(
    $KCADM get "clients/${SISTEMA_SVC_ID}/service-account-user" \
        -r "${REALM}" --fields id 2>/dev/null \
    | grep '"id"' | cut -d'"' -f4 | head -1
)

if [ -n "$SISTEMA_SVC_USER_ID" ] && [ -n "$REALM_MGMT_ID" ]; then
    $KCADM add-roles -r "${REALM}" --uid "${SISTEMA_SVC_USER_ID}" \
        --cclientid realm-management \
        --rolename view-events \
        --rolename view-clients \
        --rolename query-users \
        --rolename view-users \
        --rolename manage-users \
        --rolename view-realm 2>/dev/null \
        && ok "  view-events, view-clients, query-users, view-users, manage-users y view-realm asignados a sispardt-sistema-svc" \
        || log "  WARN: no se pudo asignar roles KC admin (pueden ya estar asignados)"
else
    log "  WARN: no se pudo obtener service-account-user de sispardt-sistema-svc"
fi

# ---- 10f. Habilitar registro de eventos en el realm (R-02) ----
# Sin esto el poller recibirá [] y no insertará nada sin reportar error.
# Verificar: curl -H "Authorization: Bearer $TOKEN" \
#   http://localhost:8080/admin/realms/sispardt | jq '.eventsEnabled,.enabledEventTypes'
log "Habilitando registro de eventos en el realm ${REALM}..."
$KCADM update "realms/${REALM}" \
    -s eventsEnabled=true \
    -s 'enabledEventTypes=["LOGIN","LOGOUT","LOGIN_ERROR"]' \
    -s eventsExpiration=604800 \
    -s adminEventsEnabled=true \
    -s adminEventsDetailsEnabled=true \
    && ok "  Eventos habilitados: LOGIN, LOGOUT, LOGIN_ERROR + admin events (retención 7 días en KC)" \
    || log "  WARN: no se pudo habilitar eventos en el realm"

# ---- 11. Crear/actualizar usuarios ----
# UUIDs deben coincidir con db_script_local/scripts/establecimientos/05-datos-prueba.sql
log "Creando/verificando usuarios..."

create_user() {
    local USERNAME="$1" FIRSTNAME="$2" LASTNAME="$3" ROLE="$4" EST_ID="$5"

    USER_ID=$(
        $KCADM get users -r "${REALM}" -q "username=${USERNAME}" --fields id 2>/dev/null \
        | grep '"id"' | cut -d'"' -f4 | head -1
    )

    if [ -z "$USER_ID" ]; then
        USER_ID=$(
            $KCADM create users \
                -r "${REALM}" \
                -s username="${USERNAME}" \
                -s enabled=true \
                -s firstName="${FIRSTNAME}" \
                -s lastName="${LASTNAME}" \
                -s "attributes.establecimiento_id=[\"${EST_ID}\"]" \
                -s 'requiredActions=["UPDATE_PASSWORD"]' \
                -i
        )
        $KCADM set-password -r "${REALM}" --userid "${USER_ID}" \
            --new-password "${DEFAULT_PASS}" --temporary
        $KCADM add-roles    -r "${REALM}" --uid "${USER_ID}" --rolename "${ROLE}"
        ok "  Creado: ${USERNAME} -> ${ROLE} (est: ${EST_ID})"
    else
        # Idempotente: asegurar atributo correcto (no resetear contraseña en updates)
        $KCADM update "users/${USER_ID}" -r "${REALM}" \
            -s "attributes.establecimiento_id=[\"${EST_ID}\"]" 2>/dev/null
        ok "  Actualizado: ${USERNAME} (est: ${EST_ID})"
    fi
}

# UUID institución (usuarios administrativos)
INST_UUID="11111111-1111-1111-1111-111111111111"

KC_ADMIN_USERNAME="${KC_ADMIN_USERNAME:-admin.sispardt}"
KC_RESP_USERNAME="${KC_RESP_USERNAME:-resp.registro}"
KC_TEC_USERNAME="${KC_TEC_USERNAME:-tec.registro}"

create_user "${KC_ADMIN_USERNAME}" \
    "${KC_ADMIN_NOMBRE:-Admin}"       "${KC_ADMIN_APELLIDO:-SISPARDT}" \
    "admin_general"        "${INST_UUID}"

create_user "${KC_RESP_USERNAME}" \
    "${KC_RESP_NOMBRE:-Responsable}"  "${KC_RESP_APELLIDO:-Registro}" \
    "responsable_registro" "${INST_UUID}"

create_user "${KC_TEC_USERNAME}" \
    "${KC_TEC_NOMBRE:-Tecnico}"       "${KC_TEC_APELLIDO:-Registro}" \
    "tecnico_registro"     "${INST_UUID}"

# ---- 12. Resumen ----
log ""
ok "========== Init de Keycloak completado =========="
log "  Realm:    ${REALM}"
log "  Usuarios:"
log "    ${KC_ADMIN_USERNAME} -> admin_general        (${INST_UUID})"
log "    ${KC_RESP_USERNAME}  -> responsable_registro (${INST_UUID})"
log "    ${KC_TEC_USERNAME}   -> tecnico_registro     (${INST_UUID})"
log "  Contraseña: ver variable SISPARDT_USER_PASSWORD en .env"
log "  Login: ${KC_URL}/realms/${REALM}/account"
log "  Clientes SA:"
log "    sispardt-establecimientos-svc    → manage-users, view-users, view-realm"
log "    sispardt-movimientos-svc         → query-users, view-users"
log "    sispardt-auditoria-sesiones-svc  → view-events, view-clients, query-users, view-users, manage-users"
log "    sispardt-sistema-svc             → view-events, view-clients, query-users, view-users, manage-users, view-realm"
log "  Eventos KC: LOGIN, LOGOUT, LOGIN_ERROR habilitados"
