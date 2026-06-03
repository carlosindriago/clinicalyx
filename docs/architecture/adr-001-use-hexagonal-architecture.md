# ADR-001: Use Hexagonal Architecture

## Status

Accepted

## Context

Clinicalyx is a clinical management platform that must keep business rules stable while infrastructure evolves. HTTP frameworks, databases, authentication mechanisms, and deployment targets may change over time, but patient, appointment, consultation, and tenant isolation rules must remain consistent.

A tightly coupled architecture would make security review, testing, and long-term maintenance harder.

## Decision

Clinicalyx uses **Hexagonal Architecture** for the backend.

The system is organized around a pure application core:

| Layer | Responsibility |
|-------|----------------|
| Domain | Entities, value objects, invariants, domain errors |
| Use cases | Application workflows and orchestration |
| Ports | Interfaces required by the core |
| Adapters | HTTP handlers, PostgreSQL repositories, cryptography, infrastructure |

Dependencies point inward. The domain does not depend on infrastructure.

## Consequences

### Benefits

- Business rules can be tested without external systems.
- PostgreSQL, HTTP, and cryptographic implementations can be replaced behind ports.
- Security-sensitive workflows are easier to audit.
- The open core boundary is clearer because premium integrations can implement ports without contaminating the core.

### Tradeoffs

- More files and interfaces than a simple CRUD architecture.
- Requires discipline to avoid leaking framework concepts into the domain.
- New contributors need onboarding documentation to understand the boundaries.

## Enforcement

- Domain code must not import HTTP routers, database drivers, or infrastructure libraries.
- Use cases communicate with external systems through ports.
- Adapters translate external inputs into use case DTOs and map application errors to protocol-specific responses.
