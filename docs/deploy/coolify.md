# Despliegue en Coolify (GitHub + PostgreSQL existente)

Objetivo: desplegar desde GitHub con auto-deploy, usando tu PostgreSQL ya creado en Coolify, publicando solo el frontend en `clinicalyx.carlosindriago.com`.

## Requisitos

- Un proyecto en Coolify
- Un recurso PostgreSQL ya creado en Coolify (con usuario admin)
- Un subdominio `clinicalyx.carlosindriago.com` apuntando a tu VPS en Cloudflare (registro A)
- HTTPS funcionando en Coolify para `clinicalyx.carlosindriago.com`

## Recursos en Coolify

### 1) Backend (privado)

- Source: GitHub repo
- Branch: `main`
- Base directory: `backend`
- Build: Dockerfile (`backend/Dockerfile`)
- Port: `8080`
- Domain: ninguno
- Healthcheck: `GET /healthz`

Variables mínimas:

- `PORT=8080`
- `ENV=production`
- `MIGRATIONS_DATABASE_URL=...` (usuario admin de Postgres)
- `CLINICALYX_APP_USER_PASSWORD=...` (password fuerte para `clinicalyx_app_user`)
- `DATABASE_URL=...` (usuario `clinicalyx_app_user` con el mismo password anterior)
- `ENCRYPTION_KEY=...` (32+ caracteres)
- `BLIND_INDEX_SALT=...` (32+ caracteres)
- `JWT_SECRET=...` (32+ caracteres)
- `CORS_ALLOWED_ORIGINS=https://clinicalyx.carlosindriago.com`
- `ENABLE_EPHEMERAL_DEMO=false`

Notas:

- En cada arranque, el contenedor espera a Postgres, ejecuta `backend/migrations/*.up.sql` y fuerza el password de `clinicalyx_app_user` según `CLINICALYX_APP_USER_PASSWORD`.

### 2) Frontend (público)

- Source: GitHub repo
- Branch: `main`
- Base directory: `frontend`
- Build: Dockerfile (`frontend/Dockerfile`)
- Port: `3000`
- Domain: `clinicalyx.carlosindriago.com`

Variables mínimas:

- `BACKEND_API_URL=http://<HOST_INTERNO_BACKEND>:8080/api/v1`
- `NEXT_PUBLIC_ENABLE_EPHEMERAL_DEMO=false`

## Cloudflare

- DNS: `A` record `clinicalyx` → IP pública del VPS.
- Para emitir el certificado sin fricción, usar `DNS only` durante el primer despliegue.
- Luego, si activas proxy naranja, configurar `SSL/TLS` a `Full (strict)`.

