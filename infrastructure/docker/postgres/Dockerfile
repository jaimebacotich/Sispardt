# ============================================================
# SISPARDT - PostgreSQL 17.2 Alpine + pg_partman 5.x
# ============================================================

# --- Stage 1: Builder (compila pg_partman) ---
FROM postgres:17.2-alpine AS builder

ARG PGPARTMAN_VERSION=5.2.0

RUN apk add --no-cache curl make build-base \
    && curl -fsSL \
        "https://github.com/pgpartman/pg_partman/archive/v${PGPARTMAN_VERSION}.tar.gz" \
        | tar xz -C /tmp \
    && cd "/tmp/pg_partman-${PGPARTMAN_VERSION}" \
    && make NO_BGW=1 PG_CONFIG=/usr/local/bin/pg_config \
    && make install NO_BGW=1 PG_CONFIG=/usr/local/bin/pg_config \
    && mkdir -p /staging/ext /staging/lib \
    && cp /usr/local/share/postgresql/extension/pg_partman* /staging/ext/ \
    && (cp /usr/local/lib/postgresql/pg_partman* /staging/lib/ 2>/dev/null || true) \
    && rm -rf /tmp/pg_partman-*

# --- Stage 2: Imagen final ---
FROM postgres:17.2-alpine

LABEL maintainer="SISPARDT"
LABEL description="PostgreSQL 17.2 Alpine con pg_partman para SISPARDT"

# Extension pg_partman
COPY --from=builder /staging/ext/ /usr/local/share/postgresql/extension/
COPY --from=builder /staging/lib/ /usr/local/lib/postgresql/

# Wrapper de init: bakeado con LF para evitar el problema CRLF de Windows.
# Lee el script montado en /docker-entrypoint-scripts/do-init.sh,
# elimina \r y lo ejecuta con bash.
# Se crea con printf para garantizar LF independientemente del OS del host.
RUN printf '#!/bin/sh\nset -e\nbash <(sed "s/\\r//" /docker-entrypoint-scripts/do-init.sh)\n' \
    > /docker-entrypoint-initdb.d/00-init-wrapper.sh \
    && chmod +x /docker-entrypoint-initdb.d/00-init-wrapper.sh

EXPOSE 5432
