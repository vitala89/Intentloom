# ADR-0031: Continuous Security Audit and Verification

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate S5 introduces versioned continuous security audit report schemas (`.aif/security/audit-report.json`) to automate the verification of security invariants (Invariants 1–28) across repository state, persistent memory, session lifecycles, security policies, baselines, and agent sandboxes.

The continuous security audit engine (`runContinuousSecurityAudit`):

1. Evaluates all security invariants across active system components (memory, sessions, evidence, local adapters, policies, baselines, sandboxes).
2. Categorizes each invariant check as `passed`, `warning`, or `failed`.
3. Computes a quantitative security health score (0–100%) based on passed vs total invariant checks.
4. Generates a cryptographic SHA-256 digest (`auditHash`) over all invariant check outcomes to ensure audit trail tamper-evidence.
5. Saves the audit report under `.aif/security/audit-report.json`.

CLI subcommands expose continuous audit capabilities:

- `intentloom security audit`: Runs full invariant verification, prints health score breakdown, and saves audit report. Returns exit code 3 if health score < 80% or any critical invariant fails.
- `intentloom security verify`: Reads existing audit report or executes inline check, ensuring zero tamper evidence and exit code 0 on healthy posture.

## Consequences

1. Continuous automated verification confirms that security invariants remain satisfied across repository evolution.
2. Security posture regressions, unapproved policy bypasses, or sandbox violations trigger immediate audit failures (exit code 3).
3. Audit trails are tamper-evident via SHA-256 hashes, preventing manual log manipulation.
