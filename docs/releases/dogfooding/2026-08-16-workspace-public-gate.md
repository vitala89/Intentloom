# Engineering Workspace public-gate evidence

**Date:** 2026-08-16
**Verified `origin/main`:** `6996df4` (P0 honesty PR #315)
**Increment:** P1 from `POST_W12_NEXT_INCREMENT_PLAN.md`
**Owner of deferred real dogfood:** maintainer (`vitala89`)

This record closes the two leftover dogfood bullets in
`ENGINEERING_WORKSPACE_IMPLEMENTATION_PLAN.md` § Initial public workspace
gate. It does not add an engine, run a live scaffold, install dependencies,
or claim a real-project walkthrough that was not performed.

## Gate checklist

| Requirement                                                    | Status       | Evidence                                                                                                                                                 |
| -------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One complete TypeScript new-project path                       | Met on main  | W1–W8 Core + Client (PR #286–#303). Fixture apply on empty root.                                                                                         |
| One complete existing-project read-only assessment path        | Met on main  | W9 composed Open Project flow (`0c948c3`, PR #304). Assessment remains caller-supplied snapshots.                                                        |
| Provider-neutral Inception/Foundation model contract           | Met on main  | W1–W2 contracts and Desktop/TUI surfaces. No live Neutron provider.                                                                                      |
| Blueprint review and approval                                  | Met on main  | W3–W4 Core + Client.                                                                                                                                     |
| Exact scaffold preview and transactional empty-root creation   | Met on main  | W7 apply/rollback + W8 workspace starter fixtures.                                                                                                       |
| CLI JSON and Desktop parity                                    | Met on main  | Per-phase Desktop/TUI/CLI parity tests through W12.                                                                                                      |
| No hidden install, network, Git/provider write, or publication | Met on main  | Non-goals in the workspace plan; W7/W8 records state no install/Git/remote.                                                                              |
| Cross-platform deterministic fixtures                          | Met on main  | Frozen fixture IDs through W12; Compatibility matrix remains the CI evidence.                                                                            |
| One real new-project dogfood                                   | **Deferred** | Fixture record [2026-08-12-workspace-starter-scaffold.md](2026-08-12-workspace-starter-scaffold.md) is not a real filesystem project. Owner: maintainer. |
| One existing-project retrofit dogfood                          | **Deferred** | July 2026 v1 CLI records are not W9–W12 retrofit. No post-W9 real-root walkthrough is on file. Owner: maintainer.                                        |
| Current capability and release documentation                   | Met on main  | Capability matrix §8 and `RELEASE_STATE.md` snapshot 2026-08-16 (Implemented in main vs npm `1.0.2`).                                                    |

Bounded coding-agent execution stays a later gate, as the plan already allows.

## What is not claimed

- A maintainer did not create a clean empty-root project, run scaffold apply
  outside fixtures, or `pnpm install` / build that tree.
- A maintainer did not open a real existing repository through Desktop/CLI
  W9–W12 and record inspect → assessment → remediation preview on that root.
- Historical v1 dogfood under `docs/releases/dogfooding/2026-07-29-*` remains
  v1 compatibility evidence. It does not close this workspace gate.

## Resume condition

An explicit dogfood brief from the maintainer. That brief must authorize the
real empty-root create and the real existing-root read-only walkthrough. Until
then the public workspace gate is **closed as deferred**, not as fully
dogfooded.
