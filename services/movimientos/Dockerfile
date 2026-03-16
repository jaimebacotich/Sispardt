# ============================================================
# SISPARDT - svc-movimientos
# Build: Go 1.22 Alpine → imagen final ~20MB
# ============================================================

FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata wget \
    && update-ca-certificates

ENV TZ=America/La_Paz

WORKDIR /app
COPY --from=builder /app/server .

RUN addgroup -S sispardt && adduser -S sispardt -G sispardt
USER sispardt

EXPOSE 8082

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:8082/health || exit 1

CMD ["./server"]
