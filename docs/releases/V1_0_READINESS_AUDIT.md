# Intentloom v1.0 Readiness Audit

Status: draft; release gate open. This audit is evidence for review and does
not authorize a tag, npm publication, or release announcement.

Date: 2026-07-28.

Candidate baseline under review: `6d8bd4f` (`main` and `origin/main` at audit
start). The working-tree documentation changes associated with this audit are
not part of that commit and must be reviewed before a final release commit is
selected.

## Decision summary

The Phase 1–4 implementation evidence is present in `main`. The v1.0 release
gate remains **open** because support-policy approval, release-candidate
verification, continuous dependency-audit evidence, final dogfooding/release
records, and maintainer approval are not yet complete.

No v1.0 tag or npm artifact is claimed by this document.

## Phase evidence

| Phase                             | Evidence                                                                                                                                                                        | Assessment                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1 — Stable compatibility contract | [ADR-0043](../decisions/ADR-0043-v1-stable-compatibility-contract-and-deprecation-policy.md), `tests/v1-compatibility-contract.test.ts`                                         | Evidence present; contract approval recorded in ADR                                               |
| 2 — Upgrade and protocol path     | [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md), `tests/v1-upgrade-migration-path.test.ts`                                                                                       | Evidence present; release-candidate clean-install verification remains required                   |
| 3 — Client-surface readiness      | [CLIENT_SURFACE_EQUIVALENCE.md](../compatibility/CLIENT_SURFACE_EQUIVALENCE.md), `tests/v1-client-surface-equivalence.test.ts`                                                  | Evidence present; no domain duplication found in the documented boundary                          |
| 4 — Security and supply chain     | [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md), `tests/v1-security-supply-chain.test.ts`, `.github/workflows/dependency-review.yml` | Control present; focused PR run `30401862928` is green; release provenance checks remain required |
| 5 — Stable release gate           | This document, [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md), release and dogfooding records                                                                                     | Open; maintainer approval pending                                                                 |

## Stable-release checklist

| Requirement                                                  | Status              | Evidence or remaining action                                                                                                                                        |
| ------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public CLI and package compatibility promise                 | PASS                | [COMPATIBILITY_POLICY.md](COMPATIBILITY_POLICY.md), ADR-0043; workspace libraries remain private                                                                    |
| Supported Node/host/provider matrix                          | PASS with recheck   | [COMPATIBILITY_MATRIX.md](../compatibility/COMPATIBILITY_MATRIX.md); retain exact CI run evidence for the release candidate                                         |
| Deprecation and support policy                               | PENDING             | Deprecation is defined in ADR-0043; [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md) needs maintainer approval                                                          |
| Upgrade, migration, and rollback path                        | PASS with recheck   | [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md), migration tests, and `.aif/migration-journal.json` contract; clean-install release verification remains             |
| Daemon/MCP/client compatibility and discovery                | PASS                | Protocol/client tests and the typed v1 method contracts                                                                                                             |
| Desktop/TUI read-only equivalence and cancellation           | PASS with recheck   | [CLIENT_SURFACE_EQUIVALENCE.md](../compatibility/CLIENT_SURFACE_EQUIVALENCE.md), Desktop readiness audit, and `tests/interactive-ui.test.ts`                        |
| Threat model, permissions, provenance, and incident response | PENDING             | Dependency Review run `30401862928` is green on draft PR #105; publication authorization and remaining provenance evidence are outstanding                          |
| Dogfooding evidence                                          | PASS with follow-up | Three required scenario records exist under `docs/releases/dogfooding/`; records predate v1.0 and must be explicitly accepted or refreshed for the stable candidate |
| Final readiness audit and maintainer approval                | OPEN                | Approve this audit only after the remaining evidence is attached to one release commit                                                                              |

## Release-state facts

- Current workspace version is `0.5.0-beta.1`.
- The published prerelease is `intentloom@0.5.0-beta.1` under npm `next`.
- `v1.0.0` has not been tagged or published.
- Current release-state details are maintained in [RELEASE_STATE.md](RELEASE_STATE.md).

- Draft PR [#105](https://github.com/vitala89/Intentloom/pull/105) provides the
  focused dependency-review evidence. Run
  [30401862928](https://github.com/vitala89/Intentloom/actions/runs/30401862928)
  passed after Dependabot alerts were enabled; all PR compatibility matrix
  jobs passed as well.

## Required actions before approval

1. Review and approve [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md).
2. Run the new Dependency Review workflow on the release PR and retain its
   green result with the release evidence.
3. Run the release-candidate clean install, build, packed CLI smoke, full
   validation, security/path tests, and explicit-path dogfooding checks; retain
   exact commands and results.
4. Accept or refresh the existing dogfooding records against the stable
   candidate without including private project data.
5. Complete the applicable [publish authorization checklist](PUBLISH_AUTHORIZATION_CHECKLIST.md)
   and record maintainer approval for the exact release commit.
6. Only after approval, open the release PR; tag and publish from the verified
   merged commit under the repository release process.

## Approval record

- Maintainer decision: pending
- Approved release commit: pending
- Approval date: pending
- Tag/publication authorization: pending
