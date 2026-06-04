# Clinicalyx Community Edition v1.1 - Open Core Clinical Management

[![CI](https://github.com/carlosindriago/clinicalyx/actions/workflows/ci.yml/badge.svg)](https://github.com/carlosindriago/clinicalyx/actions/workflows/ci.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.25-00ADD8?logo=go)](backend/go.mod)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=nextdotjs)](frontend/package.json)

Clinicalyx is a security-first, open-core clinical management platform designed for clinics, medical centers, and engineering teams that demand high-quality software architecture and strict compliance standards.

Built as a modern monorepo, Clinicalyx combines a robust Go backend and a responsive Next.js frontend with enterprise-grade security primitives, PostgreSQL RLS, and a strict adherence to Hexagonal Architecture and TDD.

> [!IMPORTANT]
> Clinicalyx CE is currently **Alpha software**. While designed with a security-first architecture, it does **not** automatically guarantee HIPAA, SOC 2, GDPR, ISO 27001, or other regulatory compliance. Compliance depends on your specific deployment architecture, operational controls, auditing policies, and legal review.

---

## Technical Architecture & Design Pillars

### 1. Hexagonal Architecture (Ports & Adapters)
The Go backend is structured using Hexagonal Architecture. The core business rules and domain aggregates (`Patient`, `Appointment`, `User`, `Consultation`) are entirely isolated in `internal/core/domain` and `usecases`. They do not depend on HTTP frameworks, SQL drivers, or third-party crypto packages. All external boundaries are defined via abstract ports (`internal/core/ports`), allowing database drivers, HTTP routers (Chi), and cryptographic layers to be swapped or tested independently.

The frontend is built on **Next.js (App Router)** with TypeScript, leveraging server-side cookie-based JWT authorization, Server Components for secure pages, and Client Components for rich interactive clinical interfaces.

### 2. Multi-Tenant Isolation with PostgreSQL RLS
Clinicalyx enforces strict multi-tenancy at the database engine layer. Database queries execute under a restricted PostgreSQL user role (`clinicalyx_app_user`) and inject the active tenant ID into the transaction context using `ExecuteInTenantTx`. PostgreSQL RLS policies evaluate the active tenant for every query, preventing Cross-Tenant data leaks (IDOR attacks) at the engine level even if application-layer filters are omitted.

### 3. Application-Level Cryptography & Blind Indexing
To safeguard Protected Health Information (PHI) and meet privacy laws:
* **AES-256-GCM Encryption:** Free-text clinical notes, treatment records, and patient identifiers are encrypted in Go before write operations. A KMS manages key wrapping, and random nonces guarantee that ciphertext is non-deterministic.
* **HMAC-SHA256 Blind Indexing:** Encrypted fields cannot be searched using SQL `LIKE`. Clinicalyx normalizes patient identifiers (such as DNI/Passport) and emails, hashing them into a **Blind Index** (`idx_patients_document_blind`). This allows fast exact-match lookup in $O(1)$ without storing plaintext.

### 4. Role-Based Access Control (RBAC) & Privacy Wall
Sprint 1 implements role-based privacy walls across data routes:
* **Conditional DTO Projections:** Endpoints project data based on the caller's JWT role. If the caller is a `RECEPTIONIST`, the backend returns `PatientPublicDTO` (masking medical history, clinical notes, and metadata). Only `DOCTOR` or `SUPERADMIN` receive the complete `PatientClinicalDTO`.
* **Doctor-Patient Isolation:** Doctors are restricted to querying and viewing patients who have (or have had) an active appointment scheduled with them via an `INNER JOIN appointments` query in the patient repository.

### 5. Hardened 2FA / TOTP Authentication
Clinicalyx features mandatory two-factor authentication:
* Upon first login, users with `two_factor_enabled = false` are redirected to `/auth/mfa-setup`.
* The backend generates a secure TOTP secret, encrypts it with **AES-256-GCM** in the database, and exposes a QR code.
* To activate the flag permanently, users must verify a valid one-time code. A cryptographic recovery key protocol ensures emergency account retrieval.

---

## Ephemeral Demo Sandbox (Portfolio Mode)

Clinicalyx includes an **Ephemeral Demo Mode** designed for public showcase, portfolio hosting, and interactive visitor validation.

### How it Works
1. **Dynamic Sandbox Provisioning:** When a visitor clicks *"Try Interactive Demo"*, the system executes `POST /api/v1/demo/start`. The Go backend dynamically generates a temporary `TenantID`, registers it in the `tenants` table with an expiration timestamp of 2 hours, and runs a seed script.
2. **Mock Data Seeding:** The sandbox tenant is automatically populated with a mock clinic profile, staff accounts (`SUPERADMIN`, `DOCTOR`, `RECEPTIONIST`), 3 mock patients (complete with blind indexes), and 2 upcoming appointments.
3. **Auto-Login:** The handler issues a JWT token for the `DOCTOR` account and returns it, setting secure `HttpOnly`, `Secure`, and `SameSite=Strict` cookies in the visitor's browser.
4. **The Grim Reaper (Garbage Collector):** A background goroutine runs in the API server every 15 minutes. It executes:
   ```sql
   DELETE FROM tenants WHERE is_demo = true AND expires_at < NOW();
   ```
   Because all related tables (`users`, `patients`, `appointments`, `sessions`, `consultations`) have foreign keys configured with `ON DELETE CASCADE`, expired demo sandboxes and their clinical data are permanently purged in a single atomic transaction.

### Configuration & Activation
To activate the interactive demo sandbox, set the following environment variables:

* **Backend (`backend/.env`):**
  ```env
  ENABLE_EPHEMERAL_DEMO=true
  ```
  *(Activates the backend route `/api/v1/demo/start` protected by a strict IP-based rate limiter).*

* **Frontend (`frontend/.env.local`):**
  ```env
  NEXT_PUBLIC_ENABLE_EPHEMERAL_DEMO=true
  ```
  *(Instructs Next.js to render the visual divider and the "Try Interactive Demo" button on the Login screen).*

> [!CAUTION]
> **PRODUCTION WARNING & SECURITY HAZARD**
> The Ephemeral Demo Sandbox features database bypasses and auto-login mechanisms specifically tailored for portfolio showcases.
> **You MUST ensure that `ENABLE_EPHEMERAL_DEMO` and `NEXT_PUBLIC_ENABLE_EPHEMERAL_DEMO` are set to `false` in any real, production-ready, or shared-tenant deployment.** Leaving this feature enabled on a production instance will allow unauthorized users to register demo sandbox tenants on your server.

---

## Directory Structure

```text
clinicalyx/
├── backend/              # Go API Server
│   ├── cmd/api/          # Composition root & Server startup
│   ├── cmd/seed/         # Seeding commands for local development
│   ├── migrations/       # PostgreSQL schema migrations & RLS policies
│   └── internal/
│       ├── core/         # Core business logic (Domain, Usecases, Ports)
│       └── adapters/     # Inbound (HTTP controllers) & Outbound (Postgres repos, crypto)
├── frontend/             # Next.js Application
│   ├── app/              # App Router Pages & API Route Handlers
│   ├── components/       # UI Components (shadcn/ui, Tailwind CSS)
│   └── lib/              # Client-side utility functions
├── docs/                 # Architectural Decision Records (ADRs) & Threat Models
└── docker-compose.yml    # Development environment PostgreSQL configuration
```

---

## Quick Start

### Prerequisites
* Docker and Docker Compose
* Go 1.25+
* Node.js 20+

### 1. Clone & Setup Environment
```bash
git clone git@github.com:carlosindriago/clinicalyx.git
cd clinicalyx

# Configure local development environment variables
cp .env.example .env
cp .env.example backend/.env
```

### 2. Boot Local Services (Automated Dev Setup)
The project includes a `Makefile` to bootstrap development. Run:
```bash
make dev
```
This command will:
1. Spin up the PostgreSQL 16 container.
2. Wait for the database to accept connections.
3. Apply all database migrations and RLS policies in order.
4. Run the seed script to populate the default tenant and admin accounts.

### 3. Run the Backend API
```bash
cd backend
go run ./cmd/api
```
The API server starts on `http://localhost:8080`.

### 4. Run the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend application starts on `http://localhost:3000`.

---

## Testing & Verification

### Running Automated Tests
Clinicalyx runs integration tests using **Testcontainers** to boot up an ephemeral database, apply migrations, and run assertions:

```bash
# Run Go unit & integration tests
cd backend
go test -v ./...

# Verify Frontend TypeScript compilation
cd ../frontend
npx tsc --noEmit
```

---

## License & Security Reporting

* **License:** Distributed under the [AGPL-3.0 License](LICENSE).
* **Security Concerns:** Please do not disclose vulnerabilities via public issues. Report security concerns confidentially to [security@clinicalyx.com](mailto:security@clinicalyx.com).
