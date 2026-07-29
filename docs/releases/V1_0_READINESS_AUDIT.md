# Intentloom v1.0 Readiness Audit

Status: draft; release gate open. This audit is evidence for review and does
not authorize a tag, npm publication, or release announcement.

Date: 2026-07-29.

Candidate baseline under review: `c21939e` (`main` and `origin/main` after PR
#111 merge). The documentation updates in this branch still require review
before a final release commit is selected.

## Decision summary

The Phase 1–4 implementation evidence and the release-candidate Compatibility
matrix are present in `main`. The v1.0 release gate remains **open** because
support-policy approval, continuous dependency-audit evidence, final
dogfooding/release records, and maintainer approval are not yet complete.

No v1.0 tag or npm artifact is claimed by this document.

## Phase evidence

| Phase                             | Evidence                                                                                                                                                                        | Assessment                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1 — Stable compatibility contract | [ADR-0043](../decisions/ADR-0043-v1-stable-compatibility-contract-and-deprecation-policy.md), `tests/v1-compatibility-contract.test.ts`                                         | Evidence present; contract approval recorded in ADR                                                             |
| 2 — Upgrade and protocol path     | [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md), `tests/v1-upgrade-migration-path.test.ts`                                                                                       | Local release-candidate verification passed; clean-room and final release-commit evidence remain required       |
| 3 — Client-surface readiness      | [CLIENT_SURFACE_EQUIVALENCE.md](../compatibility/CLIENT_SURFACE_EQUIVALENCE.md), `tests/v1-client-surface-equivalence.test.ts`                                                  | Evidence present; no domain duplication found in the documented boundary                                        |
| 4 — Security and supply chain     | [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md), `tests/v1-security-supply-chain.test.ts`, `.github/workflows/dependency-review.yml` | Control merged in `86a1aee`; high fast-uri alert closed; proposed glib exception is pending maintainer approval |
| 5 — Stable release gate           | This document, [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md), release and dogfooding records                                                                                     | Open; maintainer approval pending                                                                               |

## Stable-release checklist

| Requirement                                                  | Status              | Evidence or remaining action                                                                                                                                                                                                               |
| ------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public CLI and package compatibility promise                 | PASS                | [COMPATIBILITY_POLICY.md](COMPATIBILITY_POLICY.md), ADR-0043; workspace libraries remain private                                                                                                                                           |
| Supported Node/host/provider matrix                          | PASS                | [COMPATIBILITY_MATRIX.md](../compatibility/COMPATIBILITY_MATRIX.md); post-merge Compatibility run [30409035485](https://github.com/vitala89/Intentloom/actions/runs/30409035485) passed all six Ubuntu, macOS, and Windows Node 22/24 jobs |
| Deprecation and support policy                               | PENDING             | Deprecation is defined in ADR-0043; [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md) needs maintainer approval                                                                                                                                 |
| Upgrade, migration, and rollback path                        | PASS with recheck   | [MIGRATION_GUIDE_V1.md](MIGRATION_GUIDE_V1.md), migration tests, and `.aif/migration-journal.json` contract; clean-install release verification remains                                                                                    |
| Daemon/MCP/client compatibility and discovery                | PASS                | Protocol/client tests and the typed v1 method contracts                                                                                                                                                                                    |
| Desktop/TUI read-only equivalence and cancellation           | PASS with recheck   | [CLIENT_SURFACE_EQUIVALENCE.md](../compatibility/CLIENT_SURFACE_EQUIVALENCE.md), Desktop readiness audit, and `tests/interactive-ui.test.ts`                                                                                               |
| Threat model, permissions, provenance, and incident response | PENDING             | PR #105 merged with green Dependency Review and closed high alert #1; alert #2 has no safe point update in the current GTK/WebKit graph and requires a coordinated upgrade or approved exception                                           |
| Dogfooding evidence                                          | PASS with follow-up | Three required scenario records exist under `docs/releases/dogfooding/`; records predate v1.0 and must be explicitly accepted or refreshed for the stable candidate                                                                        |
| Final readiness audit and maintainer approval                | OPEN                | Approve this audit only after the remaining evidence is attached to one release commit                                                                                                                                                     |

## Release-state facts

- Current workspace version is `0.5.0-beta.1`.
- The published prerelease is `intentloom@0.5.0-beta.1` under npm `next`.
- `v1.0.0` has not been tagged or published.
- Current release-state details are maintained in [RELEASE_STATE.md](RELEASE_STATE.md).

- PR [#105](https://github.com/vitala89/Intentloom/pull/105) merged as
  `86a1aee`; the final Dependency Review, Compatibility, and Desktop SEA
  Feasibility checks passed. Dependabot alert #1 for `fast-uri@3.1.3` is
  closed after the `3.1.4` lockfile remediation.
- PR [#106](https://github.com/vitala89/Intentloom/pull/106) merged as
  `b8f1e31`; its documentation-only compatibility checks passed and reconciled
  the post-merge Phase 5 state.
- PR [#107](https://github.com/vitala89/Intentloom/pull/107) merged as
  `88d6f6b`; its documentation-only compatibility checks passed and recorded
  the upstream availability assessment.
- PR [#108](https://github.com/vitala89/Intentloom/pull/108) merged as
  `542633a`; its documentation-only compatibility checks passed and recorded
  the proposed exception path.
- PR [#109](https://github.com/vitala89/Intentloom/pull/109) merged as
  `d191205`; its documentation-only compatibility checks passed and recorded
  the proposed exception path.
- PR [#110](https://github.com/vitala89/Intentloom/pull/110) merged as
  `ae63b7a`; it recorded the release-candidate verification and Windows
  process-test correction. The post-merge Compatibility run [30409035485](https://github.com/vitala89/Intentloom/actions/runs/30409035485)
  passed all six jobs on `main`.
- PR [#111](https://github.com/vitala89/Intentloom/pull/111) merged as
  `c21939e`; it reconciled the release records after PR #110. The post-merge
  Compatibility run [30409627721](https://github.com/vitala89/Intentloom/actions/runs/30409627721)
  passed all six jobs on `main`.
- Dependabot alert [#2](https://github.com/vitala89/Intentloom/security/dependabot/2)
  remains open at medium severity for `glib@0.18.5` in
  `apps/desktop/src-tauri/Cargo.lock`; GitHub reports `0.20.0` as the first
  patched version. A read-only `cargo tree --invert glib@0.18.5` assessment
  shows the crate is shared by the GTK 0.18.x/WebKit 2.0.2 stack used through
  Tauri/Wry. The current `gtk 0.18.2` and `webkit2gtk 2.0.2` manifests require
  `glib 0.18`, so a direct `glib 0.20` lockfile override would not remove the
  vulnerable 0.18 branch and is not an acceptable remediation.

## Dependabot alert #2 assessment

The alert is technically understood but remains unresolved. The dependency
tree is:

```text
intentloom-desktop -> tauri 2.11.5 -> tauri-runtime-wry -> wry 0.55.1
                   -> gtk 0.18.2 / webkit2gtk 2.0.2 -> glib 0.18.5
```

The same `glib 0.18.5` node is also reached by `atk`, `cairo-rs`, `gdk`,
`gio`, `pango`, and the corresponding `*-sys` crates. The required patched
version `0.20.0` therefore requires a coordinated GTK/WebKit/Tauri-compatible
upgrade, not a hand-edited lockfile substitution. No dependency files were
changed during this assessment.

The current published crate versions are unchanged from the Desktop lockfile:
`tauri 2.11.5`, `wry 0.55.1`, and `webkit2gtk 2.0.2`. A read-only crates.io
check found no newer version in those package lines that could provide the
required coordinated lift. This leaves a scoped maintainer exception as the
near-term option unless a separate Desktop stack migration is approved.

The proposed exception is documented in
[V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md)
and remains pending maintainer approval.

## Release-candidate verification

Verified locally against `d191205` on 2026-07-29; the resulting candidate and
release-state reconciliation are merged in `main` as `c21939e`. Hosted
Compatibility verification for `c21939e` passed in [run 30409627721](https://github.com/vitala89/Intentloom/actions/runs/30409627721):

| Check                                                  | Result                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `CI=1 pnpm install --frozen-lockfile --ignore-scripts` | PASS; lockfile up to date, pnpm 10.12.4                                          |
| `pnpm typecheck`                                       | PASS                                                                             |
| `pnpm build`                                           | PASS                                                                             |
| `pnpm test`                                            | PASS with 87 files, 753 tests passed, 3 skipped                                  |
| `pnpm pack:cli`                                        | PASS; expected `intentloom@0.5.0-beta.1` tarball created and removed after smoke |
| `node packages/cli/dist/intentloom.cjs --help`         | PASS                                                                             |
| `pnpm format:check`                                    | PASS                                                                             |
| `git diff --check`                                     | PASS                                                                             |

The hosted run completed all six Ubuntu, macOS, and Windows Node 22/24 jobs;
GitHub emitted only the existing Node.js 20 action deprecation annotations.

The first sandbox attempts were not counted as results: npm DNS resolution was
blocked during reinstall and Unix-socket tests returned `EPERM`. The install
and full test suite were rerun with the required access and passed. This local
evidence does not authorize a tag, npm publication, or release announcement.

## Required actions before approval

1. Review and approve [SUPPORT_POLICY_V1.md](SUPPORT_POLICY_V1.md).
2. Review and explicitly approve or reject the proposed scoped exception in
   [V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md](../security/V1_SECURITY_AND_SUPPLY_CHAIN_AUDIT.md),
   or approve a separate coordinated GTK/WebKit/Tauri-compatible stack
   migration instead.
3. Local release-candidate install, build, packed CLI smoke, and full validation
   are recorded above, and the merged candidate has a green hosted matrix.
   Still run or retain clean-room installation evidence and complete the
   explicit-path dogfooding checks for the exact approved commit.
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
