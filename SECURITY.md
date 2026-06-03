# Security Policy

Clinicalyx handles clinical workflows and protected health information (PHI). Security reports must be handled privately and responsibly.

## Reporting a Vulnerability

Please do **not** open a public GitHub issue for suspected vulnerabilities.

Send a private report to:

- **Email:** security@clinicalyx.com

Include, when possible:

1. A clear description of the issue.
2. Steps to reproduce.
3. Affected version, commit, or deployment mode.
4. Potential impact.
5. Any suggested mitigation.

## Response Expectations

We aim to acknowledge valid reports within **5 business days**. Resolution timelines depend on severity, exploitability, and release impact.

| Severity | Examples | Target response |
|----------|----------|-----------------|
| Critical | PHI exposure, tenant isolation bypass, auth bypass | Immediate triage |
| High | Privilege escalation, token/session compromise | Priority fix |
| Medium | Misconfiguration risk, limited data exposure | Scheduled fix |
| Low | Defense-in-depth issue, hardening suggestion | Backlog review |

## Coordinated Disclosure

Please give maintainers reasonable time to investigate and publish a fix before disclosing details publicly.

## Compliance Notice

Clinicalyx is designed with healthcare security controls in mind, but this repository is not itself a certification of HIPAA, GDPR, SOC 2, or any other regulatory compliance. Compliance depends on deployment, operations, legal review, policies, and organizational controls.
