# Intentloom v1.0 Security & Supply Chain Audit

Status: official security and supply chain audit for `v1.0.0`.

Date: 2026-07-28.

Authors: Vitalii Kasap (Project Lead), Antigravity AI Agent.

## Executive Summary

This document performs the **Phase 4: Security and Supply Chain** audit for the `v1.0.0` release milestone.

Intentloom is an offline-first, local-first control layer. The platform executes entirely on the local user machine without remote telemetry, hosted service reliance, hidden network calls, or cloud token persistence.

## Security Audit Matrix

| Domain                    | Security Invariant                                                                      | Verification Status | Evidence                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| **Local-First Boundary**  | Zero telemetry, zero external network calls during normal operations                    | ✅ PASS             | `ADR-0008`, `THREAT_MODEL.md`                                                 |
| **Token Security**        | Session tokens held strictly in native process memory; never logged or stored on disk   | ✅ PASS             | `packages/daemon/src/index.ts`                                                |
| **IPC Access Control**    | Authenticated Unix socket / Named Pipe with strict RPC method whitelist                 | ✅ PASS             | `ADR-0009`, `ADR-0032`                                                        |
| **Read-Only Invariant**   | Inspection, doctor, diff, timeline, TUI, and MCP leave projects byte-for-byte unchanged | ✅ PASS             | `tests/interactive-ui.test.ts`, `tests/v1-client-surface-equivalence.test.ts` |
| **Dependency Governance** | pnpm lockfile reproducibility and dependency review for pull-request changes            | ✅ PASS             | `pnpm-lock.yaml`, `package.json`, `.github/workflows/dependency-review.yml`   |
| **Package Provenance**    | Signed npm releases and GitHub release provenance                                       | ✅ PASS             | `docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md`                            |
| **Incident Response**     | Rollback procedure via `.aif/migration-journal.json` and git tags                       | ✅ PASS             | `docs/releases/MIGRATION_GUIDE_V1.md`                                         |

## Vulnerability & Continuous Audit Policy

1. **Deterministic Local Audits**: `getSecurityAuditReport({ root })` validates project permission boundaries, sensitivity of instruction files, and file permission modes.
2. **Dependency Auditing**: GitHub Dependency Review runs on pull requests that
   change package manifests or the pnpm lockfile and fails on newly introduced
   high or critical vulnerabilities. This is a change-review control; the
   release candidate still requires a recorded green workflow run.
3. **Rollback & Recovery**: In the event of a security advisory, maintainers issue immediate patch releases (`1.0.x`) and document mitigation steps in `docs/security/`.
