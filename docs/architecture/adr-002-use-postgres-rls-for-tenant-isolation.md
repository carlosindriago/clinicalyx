# ADR-002: Use PostgreSQL Row-Level Security for Tenant Isolation

## Status

Accepted

## Context

Clinicalyx is a multi-tenant clinical platform. A tenant isolation failure could expose protected health information across organizations.

Application-level `WHERE tenant_id = ...` filters are necessary but not sufficient. A missed filter, unsafe query, or future regression could become an IDOR-style data isolation vulnerability.

## Decision

Clinicalyx uses **PostgreSQL Row-Level Security (RLS)** as a database-enforced tenant isolation boundary.

Protected tables include `tenant_id` and enable RLS. Repository operations run inside a transaction and set the current tenant with:

```sql
SELECT set_config('app.current_tenant', $1, true);
```

RLS policies compare table rows against that transaction-local setting.

## Consequences

### Benefits

- Tenant isolation is enforced by the database engine, not only by application code.
- A missing application-level tenant filter is less likely to leak cross-tenant data.
- Integration tests can verify isolation against a real PostgreSQL engine.

### Tradeoffs

- Repository code must consistently use the tenant transaction helper.
- Tests require PostgreSQL, not only in-memory mocks.
- Operational roles must be configured carefully because superusers can bypass RLS.

## Enforcement

- The application must connect using a restricted database role, not a superuser.
- Every RLS-protected repository operation must execute through the tenant transaction helper.
- Integration tests must verify that Tenant B cannot read, update, or delete Tenant A data.
