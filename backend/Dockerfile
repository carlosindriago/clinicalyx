FROM golang:1.25-alpine AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=0
RUN go build -trimpath -ldflags="-s -w" -o /out/clinicalyx-api ./cmd/api

FROM alpine:3.20 AS runner

WORKDIR /app

RUN apk add --no-cache ca-certificates postgresql-client tzdata

COPY --from=builder /out/clinicalyx-api /app/clinicalyx-api
COPY migrations /app/migrations
COPY docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]
