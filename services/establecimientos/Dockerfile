# ============================================================
# SISPARDT - svc-establecimientos
# Build: Go 1.22 Alpine → imagen final ~20MB
# ============================================================

# --- Etapa 1: Build ---
FROM golang:1.25-alpine AS builder

WORKDIR /app

# go mod tidy genera go.sum si no existe (primer build en repo limpio)
COPY go.mod ./
# Intentar copiar go.sum; si no existe, go mod tidy lo genera
COPY go.sum* ./

RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# --- Etapa 2: Runtime mínimo ---
FROM alpine:3.21

# ca-certificates: para llamadas HTTPS a Keycloak JWKS
# tzdata: para timezone America/La_Paz
# wget: para healthcheck
RUN apk add --no-cache ca-certificates tzdata wget \
    && update-ca-certificates

ENV TZ=America/La_Paz

WORKDIR /app
COPY --from=builder /app/server .

# Usuario no-root
RUN addgroup -S sispardt && adduser -S sispardt -G sispardt
USER sispardt

EXPOSE 8081

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8081/health || exit 1

CMD ["./server"]
