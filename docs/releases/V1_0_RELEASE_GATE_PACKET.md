# Intentloom v1.0 release-gate packet

Status: Approved by maintainer on 2026-07-30 for `v1.0.0` release baseline.

Date: 2026-07-30.

## Candidate under review

- Verified `main` commit: `46d3a2e`, merged by PR [#135](https://github.com/vitala89/Intentloom/pull/135) (PR [#134](https://github.com/vitala89/Intentloom/pull/134) merged as `4bad874`, PR [#133](https://github.com/vitala89/Intentloom/pull/133) merged as `cd31214`, PR [#136](https://github.com/vitala89/Intentloom/pull/136) merged as `350ad1e`, PR [#132](https://github.com/vitala89/Intentloom/pull/132) merged as `7165b5d`, PR [#131](https://github.com/vitala89/Intentloom/pull/131) merged as `5dc9313`).
- Post-merge Compatibility run: [30527543027](https://github.com/vitala89/Intentloom/actions/runs/30527543027) for `46d3a2e`, all six Ubuntu, macOS, and Windows Node 22/24 jobs passed. Post-merge CodeQL run: [30527542998](https://github.com/vitala89/Intentloom/actions/runs/30527542998), passed both Actions and JavaScript/TypeScript analyses.
- PR #117 through PR #130 carried Phase 5 reconciliations, test harness timeouts, and documentation updates. PR #131 added the free security baseline (`.github/dependabot.yml` and `.github/workflows/codeql.yml`); PR #132, PR #133, PR #134, PR #135 applied Dependabot updates (`getrandom`, `@types/node`, `vite`, `prettier`); PR #136 added `.prettierignore` to exclude generated lockfiles from Prettier checks.
- Dependency Review evidence: [run 30403512016](https://github.com/vitala89/Intentloom/actions/runs/30403512016), passed on PR #105.
- Existing workflow warning: GitHub reports the Node.js 20 action deprecation for the current action versions; this is not a product test failure.

## Maintainer decisions recorded

The following decisions were recorded by maintainer Vitalii (`vitala89`) on 2026-07-30:

1. **Support Policy Approved**: Approved [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md) governing the v1.0 support contract.
2. **Dogfooding Evidence Accepted**: Accepted clean-room, explicit-path, minimal, TypeScript, and existing-project dogfooding evidence under [`dogfooding/`](dogfooding/) as sufficient for baseline `46d3a2e`.
3. **Dependabot Alert #2 Exception Approved**: Approved temporary transitive exception for Dependabot alert #2 (`glib@0.18.5`) in `apps/desktop/src-tauri/Cargo.lock`, expiring on 2026-10-29 per GTK/Tauri Rust ecosystem update cycle.
4. **Clean-Room & Explicit-Path Evidence Approved**: Approved retained clean-room and explicit-path evidence as sufficient for approved commit `46d3a2e`.
5. **Release Commit Approved**: Approved exact release candidate commit `46d3a2e` for `v1.0.0` release sign-off.

## Security disposition

Dependabot alert [#2](https://github.com/vitala89/Intentloom/security/dependabot/2)
remains open at medium severity for transitive `glib@0.18.5` in
`apps/desktop/src-tauri/Cargo.lock`. Approved exception is active, visible, and
expires on 2026-10-29.

## Execution status

1. Maintainer decisions recorded in readiness audit, support policy, and security audit. [COMPLETE]
2. Exact clean-room and explicit-path evidence confirmed. [COMPLETE]
3. Release candidate `46d3a2e` approved and reconciled. [COMPLETE]
