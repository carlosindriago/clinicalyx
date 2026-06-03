# Initial Threat Model

Clinicalyx is designed as a security-first clinical management platform. This initial threat model documents current mitigations and known follow-up areas for public-readiness.

## Scope

This document covers the current open core backend architecture and its primary data protection controls:

- Application-level encryption for sensitive clinical identifiers.
- Blind indexes for exact search over encrypted fields.
- PostgreSQL Row-Level Security for tenant isolation.
- Password hashing and session-aware authentication foundations.

## Assets

| Asset | Why it matters |
|-------|----------------|
| Protected health information (PHI) | Unauthorized disclosure creates legal, ethical, and patient safety risk |
| Tenant data boundaries | Cross-tenant access is a critical SaaS isolation failure |
| Authentication credentials | Account compromise can expose clinical records |
| Encryption keys and salts | Loss compromises confidentiality and search privacy |
| Audit and operational logs | Needed for investigation and compliance workflows |

## Current Mitigations

### 1. Encryption at Rest for Sensitive Fields

Sensitive identifiers are encrypted in the application before persistence using **AES-256-GCM**.

Current properties:

- Non-deterministic encryption through random nonces.
- Authenticated encryption, detecting tampering during decryption.
- Ciphertext is stored instead of plaintext for selected sensitive fields.

Primary threat reduced:

- Direct database disclosure of encrypted sensitive identifiers.

Residual risk:

- Key management is currently environment-based and must evolve toward KMS or Vault-backed rotation for production-grade deployments.

### 2. Blind Search Indexes

Exact lookup over encrypted fields is supported with deterministic blind indexes using **HMAC-SHA256**.

Current properties:

- Searchable values are normalized before indexing.
- The database stores HMAC outputs instead of plaintext search fields.
- B-tree indexes support efficient exact lookup without deterministic encryption.

Primary threat reduced:

- Plaintext exposure in searchable identifiers such as email or document values.

Residual risk:

- Low-entropy identifiers may still be vulnerable to offline guessing if salts/secrets are compromised.
- Key separation and rotation policy must be formally documented.

### 3. Tenant Isolation with PostgreSQL RLS

Multi-tenant isolation is enforced with **PostgreSQL Row-Level Security**.

Current properties:

- Tables include `tenant_id`.
- RLS policies compare row tenant IDs with a transaction-local tenant setting.
- Repository operations use a transaction helper to set the active tenant.
- Tests are expected to verify that one tenant cannot access another tenant's rows.

Primary threat reduced:

- Cross-tenant data access caused by missing application-level filters.

Residual risk:

- The application must never connect as a superuser in production.
- Every repository touching protected tables must consistently use the tenant transaction helper.

### 4. Password Hashing

Passwords are hashed using **Argon2id** with per-password random salts.

Primary threat reduced:

- Credential recovery after database compromise.

Residual risk:

- Login rate limiting, lockout strategy, MFA enforcement, and credential stuffing defenses need production hardening.

## Threat Summary

| Threat | Current control | Remaining work |
|--------|-----------------|----------------|
| Database dump exposes PHI identifiers | AES-256-GCM | KMS/Vault, rotation, backup encryption policy |
| Need exact search over encrypted fields | HMAC-SHA256 blind indexes | Key separation and rotation design |
| Cross-tenant read/write | PostgreSQL RLS | CI integration tests and restricted production role verification |
| Password database compromise | Argon2id | Rate limiting and MFA enforcement |
| Token/session compromise | JWT plus revocable sessions foundation | Refresh rotation, CSRF strategy, cookie/domain hardening |
| Public repository secret leak | `.gitignore` and examples | Gitleaks/secret scanning in CI |

## Non-Goals for This Initial Version

This document is not a compliance certification. Clinicalyx is not automatically HIPAA, GDPR, SOC 2, or ISO 27001 compliant by virtue of this repository. Compliance depends on deployment, operations, legal agreements, access policies, monitoring, and organizational controls.

## Next Hardening Steps

- Add security headers, CSP, and request body limits.
- Add rate limiting for authentication endpoints.
- Add refresh token rotation and session lifecycle documentation.
- Add audit logging design for PHI access.
- Add CI security scanning with secret detection and dependency checks.
- Document production key management with KMS or Vault.
