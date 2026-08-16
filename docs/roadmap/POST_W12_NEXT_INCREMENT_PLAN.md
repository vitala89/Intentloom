# Post-W12 Next Increment Plan

## Status

P0 and P1 are merged (PR #315, PR #316). P2 N1 runtime contracts are in
progress on `feat/neutron-n1-runtime-contracts`. N2 and P3–P4 are not
started. This document still does not authorize a publish, tag, new
package, network capability, or a W13 workspace phase.

Verified against `origin/main` @ `85b8548` (PR #316 merged, 2026-08-16).

## Why this exists

`ENGINEERING_WORKSPACE_IMPLEMENTATION_PLAN.md` ends at W12. After W12 Client
and the handoff PRs merged, there is no next W-phase. Continuing “by week
number” would invent work the plan never defined.

The repository still has named, unfinished increments in other roadmaps. This
file picks an order among those existing increments. It does not add a new
product.

## What is already done

| Track                         | Evidence on main                      | Residual                                |
| ----------------------------- | ------------------------------------- | --------------------------------------- |
| Engineering Workspace W0–W12  | PR #286–#313                          | No W13                                  |
| Quality Packs Q1–Q18          | PR #257–#275                          | Marketplace stays fail-closed           |
| Specialized packs S1–S7       | PR #277–#284                          | S8 external packs                       |
| Managed extensions E1–E8      | PR #218–#248                          | No HTTP MCP install in npm `1.0.2`      |
| Assessments A1–A22            | PROJECT_STATE baseline                | Live `assessProject` still caller-owned |
| Harness H0–H9                 | PR #213–#244                          | Real adapters + runner deferred         |
| Skills C1–C6                  | catalog + ADR-0051                    | C7 future                               |
| Desktop v0.6 + W clients      | ADR-0042 + W1–W12 panels              | Not in published `1.0.2`                |
| Memory M1–M4 / Security S1–S5 | `0.4.0-beta.1` line                   | Later expansions need threat review     |
| Learning L1–L8                | `0.4.0-beta.1` line                   | Later candidates future                 |
| Neutron foundations           | CLI `neutron`, workspace sync records | N1–N9 runtime not executed              |

## Gaps that are not a new W-phase

1. **Release honesty.** Closed on PR #315. `RELEASE_STATE.md` snapshot
   2026-08-16 keeps Implemented-in-main separate from npm `1.0.2`. The next
   published version is undecided.
2. **Workspace public gate leftover.** Closed as deferred on P1. Real
   new-project and existing-project retrofit dogfood wait for an explicit
   maintainer brief. See
   `docs/releases/dogfooding/2026-08-16-workspace-public-gate.md`.
3. **Neutron N1–N2.** After Desktop v0.6, `NEUTRON_RUNTIME_ROADMAP.md`
   sequences N1 contracts then one real model adapter.
4. **S8.** Step 8 of `SPECIALIZED_ENGINEERING_PACKS_PLAN.md`: reviewed
   external packs through the managed extension lifecycle.
5. **Quality debt.** `CLI_COMMAND_TS_DECOMPOSITION.md` and oversized
   `daemon` / `evidence-analysis` / `mcp-server` files. Extract on the next
   meaningful touch.

## Recommended order

### P0 — Release honesty (docs + maintainer decision)

**Status:** complete on PR #315. `RELEASE_STATE.md` snapshot 2026-08-16
distinguishes Implemented in main from Released on npm (`1.0.2` @
`192fd05`). Next published version is undecided. Do not tag
`v0.6.0-beta.1`. Do not publish from this document.

Exit: a reviewer can tell what is in git versus what is on npm. Met on
PR #315.

### P1 — Workspace public-gate evidence

**Status:** complete on this branch. The two real-dogfood bullets are
deferred to the maintainer. Fixture and composed W1–W12 paths are recorded,
not treated as a live walkthrough. No new engine.

Exit: the gate is closed with evidence, or marked deferred with an owner.
Met as deferred in
`docs/releases/dogfooding/2026-08-16-workspace-public-gate.md`.

### P2 — Neutron N1, then N2

**N1 status:** complete on this branch. Versioned runtime session, adapter
capability, context bundle, tool envelope, task graph, subagent result,
usage/budget, and progress/cancellation/timeout/error contracts live in
`packages/protocol/src/neutron-runtime.ts`. No new package. No N2 adapter.

N2: ADR-0055 accepts Ollama on an explicit loopback URL. Implementation is
not in the N1 PR. Desktop must not call models in N2. Prepare stays
snapshot-driven until the adapter PR.

Exit: N1 contracts validate in fixtures. The “one configured provider”
clause is N2 and remains open.

### P3 — S8 external specialized packs

Reviewed external packs through existing E-lifecycle. Provenance, pin,
compatibility, and human confirmation. No auto-install, no new schema
family unless Core proves a missing field.

### P4 — File-budget extracts

Continue `command.ts` decomposition in the published order (`clean`, then
inspect/timeline/conformance). Do not grow oversized production files.

## Explicitly out of scope until a new ADR

- W13 or any new Engineering Workspace week
- live `assessProject` or model calls from Desktop
- autonomous commits, pushes, merges, releases
- C7 provider-plugin installation
- Harness real network / local-model / CLI-agent adapters
- Enterprise hosted coordination
- `glib` upgrade (wait for Tauri/gtk-rs)
- new monorepo, MFE, or second UI framework

## First authorized action

P0, P1, and P2-N1 are done on this branch. Do not start N2, P3 (S8), or P4
without a new maintainer brief and, for N2, a dedicated adapter ADR.

## Sources

- `docs/roadmap/ENGINEERING_WORKSPACE_IMPLEMENTATION_PLAN.md`
- `docs/roadmap/ENGINEERING_WORKSPACE_CAPABILITY_MATRIX.md`
- `docs/roadmap/NEUTRON_RUNTIME_ROADMAP.md`
- `docs/roadmap/SPECIALIZED_ENGINEERING_PACKS_PLAN.md`
- `docs/roadmap/CLI_COMMAND_TS_DECOMPOSITION.md`
- `docs/releases/RELEASE_STATE.md`
- `PROJECT_STATE.md`
- `DUTY_WATCH.md` current watch
