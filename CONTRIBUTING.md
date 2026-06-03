# Contributing to Clinicalyx

Clinicalyx is developed as a security-first open core platform. Contributions must preserve architectural boundaries, test coverage, and maintainability.

## Development Workflow

We use **Trunk Based Development**.

1. Branch from the current trunk.
2. Keep branches small and short-lived.
3. Open focused pull requests.
4. Merge only after tests and review pass.

Recommended branch names:

```txt
feat/<short-scope>
fix/<short-scope>
docs/<short-scope>
chore/<short-scope>
```

## Commit Format

Use **Conventional Commits**:

```txt
feat(patient): add patient search by blind index
fix(auth): reject inactive users during login
docs(security): add initial threat model
test(postgres): verify tenant isolation with RLS
```

Do not add AI attribution or `Co-Authored-By` trailers.

## TDD Requirement

Clinicalyx follows strict TDD for critical behavior.

Before implementing business logic or security-sensitive changes:

1. Write a failing test.
2. Implement the smallest safe change.
3. Refactor while keeping tests green.
4. Add integration tests when behavior depends on PostgreSQL, RLS, crypto, or HTTP boundaries.

## Architecture Rules

The backend follows Hexagonal Architecture:

| Layer | Responsibility |
|-------|----------------|
| `internal/core/domain` | Pure domain model and value objects |
| `internal/core/usecases` | Application orchestration |
| `internal/core/ports` | Interfaces/contracts |
| `internal/adapters` | HTTP, PostgreSQL, crypto, and infrastructure |

Domain code must not depend on HTTP routers, database drivers, framework code, or external I/O.

## Pull Request Checklist

- [ ] The change is small and reviewable.
- [ ] Tests were added or updated first where applicable.
- [ ] `go test ./...` passes for backend changes.
- [ ] `npm run lint` and `npm run build` pass for frontend changes.
- [ ] Security-sensitive behavior is documented.
- [ ] No secrets, credentials, PHI, or production data are committed.
