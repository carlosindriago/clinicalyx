# Clinicalyx (Opencore Clinical Management Platform)

Clinicalyx is a modern, enterprise-ready, modular clinical management system designed for multi-specialty clinics.

## Architecture

This project is built using a clean, decoupled architecture:

- **Backend:** Go (Golang) implementing Hexagonal Architecture (Ports and Adapters) with a strict TDD approach.
- **Frontend:** Next.js (React/TypeScript) utilizing Tailwind CSS and Shadcn UI.
- **Database:** PostgreSQL with Row-Level Security (RLS) for multi-tenancy and JSONB columns for dynamic clinical records.

## Project Structure

```
clinicalyx/
├── backend/            # Go Backend
│   ├── cmd/
│   │   └── api/        # Application Entrypoint
│   └── internal/
│       ├── domain/     # Pure Enterprise Entities
│       ├── ports/      # Interfaces (Driving/Driven)
│       ├── usecases/   # Application Rules / Use cases
│       └── adapters/   # Infrastructure Code (HTTP, DB, etc.)
└── frontend/           # Next.js Frontend
```

## Methodology & Coding Practices

- **TDD (Test-Driven Development):** All business logic is protected by unit and integration tests.
- **Conventional Commits:** We enforce semantic and clean git history.
- **Git Flow / Trunk-Based:** Short-lived feature branches merged via PRs.
