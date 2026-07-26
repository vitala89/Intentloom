# ADR-0029: Security Policies and Baselines

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate S3 introduces versioned security policy definitions (`.aif/security/policy.json`) and baseline finding snapshots (`.aif/security/baseline.json`) to enforce project-specific security standards and detect posture drift over time.

Security policies configure rules mapping finding categories or rule IDs to explicit enforcement levels:

1. `ignore`: Finding is recorded but generates no CLI warning or build failure.
2. `warn`: Finding triggers a maintainer warning in CLI output but permits normal execution (exit code 0).
3. `fail`: Unresolved finding triggers a deterministic build/CLI failure (non-zero exit code).

Security baselines record accepted historical findings and a cryptographic digest (`baselineHash`) of active findings. When checking security posture against a baseline (`checkSecurityPolicyAndBaseline`), the system calculates posture drift:

- `newFindings`: Findings present in current posture but missing from the baseline.
- `resolvedFindings`: Findings recorded in baseline that have been remediated or dismissed.
- `policyViolations`: Active findings exceeding configured policy enforcement thresholds.

Updating baseline snapshots (`updateSecurityBaseline`) requires explicit maintainer invocation via `intentloom security baseline update`, preventing unapproved baseline overrides during routine scans.

## Consequences

1. Security posture policy violations with `fail` enforcement level trigger deterministic non-zero exit codes.
2. Baseline updates require explicit maintainer confirmation, avoiding silent suppression of new vulnerabilities.
3. Posture drift (`newFindings`, `resolvedFindings`) is fully traceable across repository commits.
