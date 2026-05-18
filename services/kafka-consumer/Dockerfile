# ============================================================
# SISPARDT - svc-kafka-consumer
# Consume cambios CDC de Kafka y actualiza replica_cache
# ============================================================

FROM golang:1.25-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/consumer ./cmd/consumer

FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=America/La_Paz

WORKDIR /app
COPY --from=builder /app/consumer .

RUN addgroup -S sispardt && adduser -S sispardt -G sispardt
USER sispardt

CMD ["./consumer"]
