# v1.0 Stable Compatibility Milestone Plan

Status: active release-gate plan. Phases 1–4 are merged and validated on
`main`; Phase 5 is open. Date: 2026-07-28.

Intentloom `v0.5.0-beta.1` is now published under npm `next`. The next
roadmap milestone is `v1.0.0`, whose purpose is a stable compatibility contract,
not a broad feature expansion. This document sequences the evidence and
decisions required before a stable release claim.

## Goal

Define and verify a supportable public contract for the local Intentloom
platform: supported runtimes and hosts, versioning and deprecation rules,
upgrade behavior, protocol/client compatibility, security posture, and the
release evidence needed for a stable `1.0.0`.

## Non-goals for the first planning increment

- No immediate Desktop rewrite or new package extraction.
- No hosted service, telemetry, model training, live provider, or external MCP
  ingestion commitment.
- No autonomous mutation or merge/release/publish authority for agents.
- No claim that an experimental surface becomes stable before its own evidence
  and threat review are complete.

## Ordered workstreams

| Phase | Workstream                    | Required outputs                                                                                                                                            | Exit gate                                                                                             | Status                        |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------- |
| 0     | Baseline and ownership        | Current release-state snapshot, supported-surface inventory, compatibility evidence owners                                                                  | Every public surface is classified as supported, experimental, or unsupported                         | Baseline retained             |
| 1     | Stable compatibility contract | ADR/spec for SemVer/API guarantees, Node/host matrix, deprecation window, support policy, and config/schema migration rules                                 | Maintainers approve the contract and its backward-compatibility test plan                             | Complete; merged in `f7d4830` |
| 2     | Upgrade and protocol path     | Verified upgrade fixtures from `0.5.0-beta.1`, migration guide, daemon protocol versioning, capability discovery, structured errors, and cancellation rules | Clean installs and upgrades are reproducible; incompatible clients fail explicitly                    | Complete; merged in `e5a20ed` |
| 3     | Client-surface readiness      | CLI/TUI equivalence evidence, MCP runtime stabilization, Desktop integration boundary over daemon/application operations                                    | Read-only operations produce equivalent typed results across supported clients; no domain duplication | Complete; merged in `3d8f938` |
| 4     | Security and supply chain     | Threat-model refresh, continuous security audit evidence, permission review, provenance/install evidence, and incident/rollback procedure                   | Critical findings are resolved or explicitly accepted by maintainers                                  | Complete; merged in `7e2d82a` |
| 5     | Stable release gate           | v1.0 readiness audit, compatibility matrix, support policy, migration notes, dogfooding records, and release approval                                       | All exit gates pass on one verified `main` commit before tag and publication                          | Active next step              |

## Dependency order

Phase 1 precedes any stable API promise. Phase 2 depends on the contract and
provides the upgrade evidence used by Phase 5. Phase 3 can proceed in parallel
with Phase 2 only through existing protocol/application boundaries. Phase 4
must review every new client, provider, credential, and mutation boundary before
Phase 5. No phase grants release or mutation authority by itself.

## Current implementation-ready step

Prepare the v1.0 readiness audit from the completed Phase 1–4 evidence. Start
with `docs/releases/COMPATIBILITY_POLICY.md`,
`docs/compatibility/COMPATIBILITY_MATRIX.md`,
`docs/releases/MIGRATION_GUIDE_V1.md`,
`docs/compatibility/CLIENT_SURFACE_EQUIVALENCE.md`, and
`docs/security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md`. Reconcile support and
dogfooding evidence, identify any unverified claim, and do not tag or publish
until maintainers approve the complete gate on one verified `main` commit.

## Stable-release evidence checklist

- [ ] Public package and CLI compatibility promise is explicit.
- [ ] Supported Node/host/provider matrix has current evidence.
- [ ] Deprecation, support-window, and security-advisory policy is documented.
- [ ] `0.5.0-beta.1` upgrade and rollback fixtures pass.
- [ ] Daemon/MCP/client protocol compatibility and capability discovery are tested.
- [ ] Desktop/TUI read-only equivalence and cancellation guarantees are verified.
- [ ] Threat model, continuous audit, permissions, provenance, and incident response are reviewed.
- [ ] v1.0 readiness audit and maintainer approval are recorded on one release commit.

Phases 1–4 are marked complete because their documents, tests, and merge
commits are present in the repository. Phase 5 remains open and requires its
own evidence, review, and release approval; no v1.0 tag or publication is
implied by the completed phases.
