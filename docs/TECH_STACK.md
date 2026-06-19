# Clinicalyx — Tech Stack

> Fuente de verdad sobre las versiones y librerías utilizadas en el proyecto.
> Este documento debe actualizarse cuando se agreguen, eliminen o
> actualicen dependencias. Las versiones se mantienen sincronizadas con
> `backend/go.mod` y `frontend/package.json`.

## Lenguaje de programación

### Go

- **Versión**: 1.25.0
- **Módulo**: `clinicalyx/backend`
- **Documentación oficial**: <https://go.dev/doc/>
- **Standard library clave**:
  - [`net/http`](https://pkg.go.dev/net/http) — servidor HTTP, `MaxBytesReader`, `http.Cookie`
  - [`crypto/aes`](https://pkg.go.dev/crypto/aes), [`crypto/cipher`](https://pkg.go.dev/crypto/cipher) — cifrado AES-256-GCM
  - [`crypto/hmac`](https://pkg.go.dev/crypto/hmac), [`crypto/sha256`](https://pkg.go.dev/crypto/sha256) — Blind Index HMAC-SHA256
  - [`crypto/subtle`](https://pkg.go.dev/crypto/subtle) — `ConstantTimeCompare` para comparación de tokens

## Backend (Go)

### Framework HTTP — Chi v5

- **Versión**: `v5.3.0`
- **Repositorio**: <https://github.com/go-chi/chi>
- **Documentación**: <https://go-chi.io>
- **¿Por qué Chi?**: router idiomático compatible con `net/http` estándar, middlewares componibles, sin allocation-heavy magic, y excelente para arquitecturas hexagonales. No impone un framework opinionado.

Middlewares clave de Chi utilizados:

| Middleware | Propósito |
|------------|-----------|
| `middleware.RequestID` | Asigna X-Request-ID a cada request |
| `middleware.RealIP` | Resuelve la IP real respetando `X-Forwarded-For` (configurable) |
| `middleware.Logger` | Log estructurado de cada request |
| `middleware.Recoverer` | Captura panics y responde 500 |
| `middleware.Timeout` | Cancela el contexto tras N segundos |
| `middleware.AllowContentType` | Whitelist de Content-Type permitidos |
| `cors.Handler` (paquete `go-chi/cors`) | Política CORS con credenciales |

Paquete CORS: [`github.com/go-chi/cors`](https://github.com/go-chi/cors) v1.2.2.

### Autenticación — golang-jwt/v5

- **Versión**: `v5.3.1`
- **Repositorio**: <https://github.com/golang-jwt/jwt>
- **Documentación / Migration Guide v5**: <https://github.com/golang-jwt/jwt/blob/main/MIGRATION_GUIDE.md>
- **Algoritmo**: HMAC-SHA256
- **Patrones**:
  - Access tokens (corta duración, default 15 min)
  - Refresh tokens con rotación (larga duración, default 7 días)
  - Verificación de `alg != HS256` (defensa contra `alg=none`)

### Base de datos — PostgreSQL 16

- **Imagen Docker**: `postgres:16-alpine`
- **Documentación oficial**: <https://www.postgresql.org/docs/16/>
- **Driver Go**: [`github.com/lib/pq`](https://github.com/lib/pq) v1.12.3
- **Features usadas**:
  - **Row-Level Security (RLS)** con `FORCE` en todas las tablas multi-tenant
  - **Extensión `btree_gist`** para exclusiones de rango de citas (`tsrange WITH &&`)
  - **`pgcrypto`** para `gen_random_uuid()` (UUIDs v4)
  - **Transacciones explícitas** con `set_config('app.current_tenant', ..., true)` (RLS context)

Patrones de query importantes:

```sql
-- Aislamiento per-tenant en RLS
CREATE POLICY tenant_isolation_policy ON patients
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::UUID);

-- Anti-doble-booking médico
ALTER TABLE appointments
  ADD CONSTRAINT no_overlap
  EXCLUDE USING gist (doctor_id WITH =, time_range WITH &&);
```

### Tests de integración — Testcontainers

- **Versión**: `v0.42.0` (`testcontainers-go/modules/postgres`)
- **Documentación**: <https://golang.testcontainers.org/>
- **Propósito**: levantar un contenedor real de PostgreSQL 16 Alpine por test suite para validar migraciones, RLS, exclusiones y queries con datos reales (no mocks).

### Hashing de contraseñas — Argon2id

- **Paquete**: `golang.org/x/crypto/argon2`
- **Versión**: `v0.52.0` (parte de `golang.org/x/crypto`)
- **Parámetros** (alineados con OWASP Password Storage Cheat Sheet):
  - Memory: 64 MiB
  - Iterations: 3
  - Parallelism: 2
  - Salt length: 16 bytes (aleatorio con `crypto/rand`)
  - Key length: 32 bytes
- **Verificación**: `subtle.ConstantTimeCompare` para evitar timing attacks

### UUIDs

- **Paquete**: [`github.com/google/uuid`](https://github.com/google/uuid) v1.6.0
- **Versión generada**: UUID v4 (aleatorio)

### Variables de entorno

- [`github.com/joho/godotenv`](https://github.com/joho/godotenv) v1.5.1 — carga `.env` en desarrollo
- [`github.com/kelseyhightower/envconfig`](https://github.com/kelseyhightower/envconfig) v1.4.0 — parsing tipado y validación de env vars

### Almacenamiento de objetos — S3 / MinIO

- **AWS SDK Go v2**: `github.com/aws/aws-sdk-go-v2` v1.42.0
- **Compatible con**: AWS S3, MinIO (S3-compatible storage)
- **Caso de uso**: archivos médicos de pacientes (presigned URLs para upload/download directo)

## Frontend (Next.js)

### Framework — Next.js 16

- **Versión**: `16.2.6`
- **Documentación**: <https://nextjs.org/docs>
- **App Router**: activada (Server Components, Server Actions, Route Handlers)
- **Output mode**: `standalone` (build optimizado para Docker)
- **React Compiler**: habilitado experimentalmente (`reactCompiler: true` en `next.config.ts`)

### React

- **Versión**: `19.2.4`
- **Documentación**: <https://react.dev/>
- **Patrones usados**:
  - Server Components por defecto
  - Client Components con `"use client"` solo cuando se necesita estado/interactividad
  - `useTransition` para fetches cancelables (con `isCancelling` explícito)

### Lenguaje — TypeScript

- **Versión**: `^5`
- **Strict mode**: activado (`strict: true` en `tsconfig.json`)
- **Política**: zero `any` explícito en código de aplicación (excepción documentada para plantillas `shadcn/ui`)

### UI — shadcn/ui + Tailwind CSS 4

- **shadcn/ui**: componentes copy-paste en `components/ui/*`
- **Tailwind CSS**: `^4` (con `@tailwindcss/postcss`)
- **Iconos**: [`lucide-react`](https://lucide.dev/) `^1.17.0`
- **Animaciones**: [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) `^1.4.0`

### Formularios — react-hook-form + Zod 4

- **react-hook-form**: `^7.77.0` — performance y validación declarativa
- **zod**: `^4.4.3` — schema validation type-safe
- **@hookform/resolvers**: `^5.4.0` — adaptador Zod → RHF

### Visualización de datos — Recharts

- **Versión**: `^3.8.1`
- **Documentación**: <https://recharts.org/>
- **Uso**: dashboards clínicos (gráficos de actividad, ocupación)

### Fechas — date-fns

- **Versión**: `^4.4.0`
- **Documentación**: <https://date-fns.org/>
- **Patrón**: `format(date, "yyyy-MM-dd'T'HH:mm")` para inputs `<input type="datetime-local">`

### Helpers de estilo — class-variance-authority + tailwind-merge

- **CVA**: `^0.7.1` — variants type-safe
- **tailwind-merge**: `^3.6.0` — fusiona clases Tailwind sin conflictos
- **clsx**: `^2.1.1` — condicionales de className

### Theming — next-themes

- **Versión**: `^0.4.6`
- **Documentación**: <https://github.com/pacocoursey/next-themes>
- **Modos**: light / dark / system

### Date picker — react-day-picker

- **Versión**: `^10.0.1`
- **Documentación**: <https://react-day-picker.js.org/>

## DevOps

### Contenedores

- **Docker**: multi-stage builds
- **Imágenes base**:
  - Backend: `golang:1.25-alpine` (build) + `alpine` (runtime)
  - Frontend: `node:20-alpine` (build) + `node:20-alpine` (runtime)
  - Base de datos: `postgres:16-alpine`
  - Almacenamiento: `minio/minio` (S3-compatible local)

### CI/CD — GitHub Actions

- **Versión**: workflows en `.github/workflows/ci.yml`
- **Triggers**: `push` a `main`, `pull_request` a `main`
- **Jobs**:
  - `backend-test`: `go test ./...` con Testcontainers
  - `backend-build`: `go build ./...`
  - `frontend-lint`: `eslint`
  - `frontend-build`: `next build`

### Reverse proxy / Deploy

- **Coolify** (self-hosted PaaS) — ver `docs/deploy/coolify.md`
- **Cloudflare** como CDN y proxy externo

## Arquitectura

### Backend — Hexagonal (Ports & Adapters)

```
internal/
├── core/                    # Dominio puro, sin dependencias externas
│   ├── domain/              # Entidades, Value Objects, errores de negocio
│   ├── ports/               # Interfaces (repos, hasher, storage)
│   └── usecases/            # Orquestación de lógica de negocio
├── adapters/                # Implementaciones concretas de los ports
│   ├── crypto/              # AES-256-GCM, HMAC-SHA256, Argon2id, JWT
│   ├── inbound/http/        # Handlers Chi, middlewares, DTOs HTTP
│   └── outbound/            # Repos Postgres, storage S3
├── config/                  # Carga + validación tipada de env vars
└── cmd/api/                 # Entry point (composition root)
```

### Frontend — Feature-based + Atomic Design (parcial)

```
frontend/
├── app/                     # Next.js App Router (rutas)
│   ├── api/                 # Route Handlers (proxies al backend)
│   ├── dashboard/           # Rutas autenticadas
│   ├── demo/                # Sandbox demo efímero
│   └── login/               # Autenticación
├── components/
│   ├── ui/                  # shadcn primitives (button, input, card, ...)
│   ├── patients/            # Componentes de dominio pacientes
│   └── appointments/        # Componentes de dominio citas
├── lib/
│   ├── backend.ts           # Helpers de integración con el backend Go
│   └── utils.ts             # cn() helper (twMerge + clsx)
└── middleware.ts            # Auth guard a nivel de Next.js
```

## Cómo actualizar este documento

1. **Cambiaste una dependencia**: actualiza la versión aquí Y en `go.mod`/`package.json` en el mismo commit.
2. **Añadiste una nueva librería**: documenta el propósito, link oficial y un ejemplo de uso mínimo.
3. **Eliminaste una dependencia**: elimina la entrada y documenta el motivo en el commit.
4. **Versión de PostgreSQL/Node/Go cambió**: actualiza la sección de runtime y valida que el `Dockerfile`, `.github/workflows/ci.yml` y los linters de IDE estén alineados.

## Referencias oficiales consultadas

- [Go Documentation](https://go.dev/doc/)
- [Chi Router Documentation](https://go-chi.io)
- [golang-jwt v5 Migration Guide](https://github.com/golang-jwt/jwt/blob/main/MIGRATION_GUIDE.md)
- [PostgreSQL 16 Documentation](https://www.postgresql.org/docs/16/)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev/)
- [Testcontainers for Go](https://golang.testcontainers.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)

> Este documento se generó con verificación contra Context7 para asegurar
> que las versiones y APIs documentadas están alineadas con las fuentes
> oficiales. Si encuentras una discrepancia, abre un PR.
