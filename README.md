# Clinicalyx Community Edition - Open Core Clinical Management

[![CI](https://github.com/carlosindriago/Clinicalix/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosindriago/Clinicalix/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go)](backend/go.mod)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](frontend/package.json)

Clinicalyx Community Edition is a security-first, open-core clinical management platform for clinics, healthcare teams, and engineering teams that care about strong software architecture.

It is built as a modern monorepo with a Go backend, a Next.js frontend, PostgreSQL security primitives, and a strict engineering discipline around Hexagonal Architecture, TDD, and public-readiness.

> [!IMPORTANT]
> Clinicalyx CE is currently **Alpha software**. It is designed with a security-first architecture, but it does **not** automatically guarantee HIPAA, SOC 2, GDPR, ISO 27001, or any other regulatory compliance. Compliance depends on deployment architecture, operational controls, policies, audits, vendor management, and legal review.

## Why Clinicalyx?

Clinical systems handle sensitive operational and patient data. The default answer cannot be “just add an ORM and hope for the best.” Clinicalyx treats security and isolation as architectural foundations, not optional middleware.

## Features

| Area | Capability |
|------|------------|
| Multi-tenancy | PostgreSQL Row-Level Security (RLS) isolates tenant data at the database engine level. |
| Sensitive data protection | AES-256-GCM application-level encryption protects sensitive fields at rest. |
| Search over encrypted data | Blind Indexing with HMAC-SHA256 enables deterministic exact-match search without storing plaintext. |
| Architecture | Hexagonal Architecture separates domain logic from HTTP, persistence, crypto, and framework concerns. |
| Authentication | JWT-based authentication with HttpOnly cookies and session persistence. |
| Scheduling | Appointment scheduling with PostgreSQL exclusion constraints to prevent doctor availability overlaps. |
| Frontend | Next.js App Router with TypeScript, shadcn/ui, Tailwind CSS, and dark/light mode. |
| Testing | Go integration tests use Testcontainers with ephemeral PostgreSQL 16 and real migrations. |
| CI | GitHub Actions runs backend tests plus frontend lint and build checks. |
| Governance | AGPL-3.0 license, security policy, contribution guide, ADRs, threat model, and rollback migrations. |

## Architecture at a Glance

```text
clinicalyx/
├── backend/              # Go API
│   ├── cmd/api/          # Composition root
│   ├── migrations/       # PostgreSQL schema, RLS policies, rollbacks
│   └── internal/
│       ├── core/         # Domain, ports, and use cases
│       ├── adapters/     # HTTP, PostgreSQL, crypto adapters
│       └── config/       # Environment-driven configuration
├── frontend/             # Next.js application
│   ├── app/              # App Router routes and route handlers
│   └── components/       # UI and layout components
├── docs/                 # Architecture and security documentation
├── .github/workflows/    # CI pipeline
└── docker-compose.yml    # Local development services
```

## Security Model

Clinicalyx CE currently focuses on these foundational controls:

### PostgreSQL RLS for tenant isolation

Application queries run under a restricted database role and set the active tenant inside the transaction. RLS policies enforce tenant boundaries inside PostgreSQL, reducing reliance on application-layer filtering alone.

### AES-256-GCM encryption at rest

Sensitive fields are encrypted before persistence using authenticated encryption. Random nonces make ciphertext non-deterministic, protecting repeated values from direct correlation.

### Blind Indexing for exact lookup

Encrypted fields cannot be queried directly. Clinicalyx derives blind indexes using HMAC-SHA256 over normalized values so exact-match searches can remain efficient without exposing plaintext.

### Hexagonal Architecture

The domain model and use cases do not depend on HTTP frameworks, SQL drivers, or UI concerns. This keeps clinical business rules testable, portable, and easier to audit.

Read more:

- [Threat Model](docs/security/threat-model.md)
- [ADR-001: Use Hexagonal Architecture](docs/architecture/adr-001-use-hexagonal-architecture.md)
- [ADR-002: Use PostgreSQL RLS for Tenant Isolation](docs/architecture/adr-002-use-postgres-rls-for-tenant-isolation.md)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Go 1.25+
- Node.js 20+
- npm

### 1. Clone the repository

```bash
git clone git@github.com:carlosindriago/Clinicalix.git
cd Clinicalix
```

> If your intended repository name is `Clinicalyx`, update the clone URL and GitHub Actions badge before publishing. The command above uses the remote path provided for the first public push.

### 2. Create local environment variables

```bash
cp .env.example .env
cp .env.example backend/.env
```

The values in `.env.example` are development placeholders. The root `.env` is read by Docker Compose; `backend/.env` is read when running the Go API locally. Replace all secrets before any shared, staging, or production deployment.

### 3. Start local services

```bash
docker compose up -d postgres web
```

This starts PostgreSQL and the Next.js development container. The frontend is available at:

```text
http://localhost:3000
```

### 4. Apply database migrations

```bash
for migration in backend/migrations/*.up.sql; do
  docker exec -i clinicalyx_postgres psql -U clinicalyx -d clinicalyx < "$migration"
done
```

### 5. Run the Go API locally

In another terminal:

```bash
cd backend
go mod download
go run ./cmd/api
```

The API listens on:

```text
http://localhost:8080
```

### 6. Run verification checks

```bash
# Backend
cd backend
go test -v ./...

# Frontend
cd ../frontend
npm ci
npm run lint
npm run build
npm audit --audit-level=moderate
```

## Development Workflow

Clinicalyx follows a strict engineering workflow:

- **Trunk-Based Development** for small, reviewable changes.
- **Conventional Commits** for clean history and automation.
- **TDD-first discipline** for domain logic, persistence behavior, and security-critical flows.
- **No secrets in Git**. Use `.env` locally and environment injection in deployed environments.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide.

## Public-Readiness Checklist

Before publishing or opening external contributions:

- [ ] Run secret scanning against the working tree and full Git history.
- [ ] Confirm `.env`, `.env.*`, build outputs, caches, and local artifacts are ignored.
- [ ] Rotate any credential that has ever appeared in Git history.
- [ ] Verify CI is green on the public default branch.
- [ ] Review [SECURITY.md](SECURITY.md) and confirm the vulnerability reporting email is monitored.
- [ ] Keep the Alpha disclaimer visible for users and contributors.

## License

Clinicalyx Community Edition is released under the [GNU Affero General Public License v3.0](LICENSE).

Commercial/open-core modules may be distributed separately under different terms.

## Security Reporting

Please do not disclose vulnerabilities through public issues before coordinated review.

Report security concerns to:

```text
security@clinicalyx.com
```

See [SECURITY.md](SECURITY.md) for the coordinated disclosure policy.
