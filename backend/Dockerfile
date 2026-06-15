# Stage 1: Builder - Compilación optimizada
FROM golang:1.25-alpine AS builder

WORKDIR /src

# Copiar solo archivos de dependencias primero para mejor cache
COPY go.mod go.sum ./
RUN go mod download

# Copiar el resto del código
COPY . .

# Build optimizado para producción
ENV CGO_ENABLED=0
RUN go build \
    -trimpath \
    -ldflags="-s -w -extldflags '-static'" \
    -o /out/clinicalyx-api \
    ./cmd/api

# Stage 2: Runner - Imagen final ultra ligera
FROM alpine:3.20 AS runner

WORKDIR /app

# Instalar solo dependencias necesarias
RUN apk add --no-cache \
    ca-certificates \
    postgresql-client \
    tzdata \
    curl \
    && update-ca-certificates

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copiar binario y archivos necesarios
COPY --from=builder --chown=appuser:appgroup /out/clinicalyx-api /app/clinicalyx-api
COPY --chown=appuser:appgroup migrations /app/migrations
COPY --chown=appuser:appgroup docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

# Cambiar a usuario no-root
USER appuser

EXPOSE 3000

# Health check para Coolify (puerto 3000)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail --silent --max-time 2 http://localhost:3000/healthz > /dev/null || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
