# Engineering Workspace Capability Matrix

## Status

Evidence-backed W0 exit gate for the Project Design and Development Workspace.
Revalidated against verified `main` at `208f7c4` (2026-08-11).

This document distinguishes **implemented**, **partial**, **planned**, and
**blocked** surfaces using repository evidence — not roadmap checkboxes alone.
Synchronization states follow
[`CORE_CLIENT_PARALLEL_DEVELOPMENT_PROTOCOL.md`](../governance/CORE_CLIENT_PARALLEL_DEVELOPMENT_PROTOCOL.md).

## Verified baseline

| Item                    | Evidence                                     |
| ----------------------- | -------------------------------------------- |
| Verified `main`         | `31fe4b3` — W3 Core Neutron discovery (#292) |
| W1 Core + Client        | Merged through PR #286 + PR #287 (`2f63f99`) |
| W2 Core                 | Merged through PR #288 (`329dec3`)           |
| W2 Client               | Merged through PR #289 (`208f7c4`)           |
| Workspace planning docs | Merged through PR #285 (`10ff713`)           |
| Open PRs                | None at W2 Client merge time                 |
| Active branch on `main` | `main`                                       |

## Synchronization states (reference)

| State                          | Meaning                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `ready-now`                    | Core contract merged; clients may integrate now                 |
| `ready-against-frozen-fixture` | Contract/fixture frozen in review; parallel client work allowed |
| `core-first`                   | Semantics or schema not stable; Core must land first            |
| `integration-pending`          | Core exists; parity, transport, or docs incomplete              |
| `blocked`                      | Security, architecture, or release gate prevents work           |
| `future`                       | Intentionally outside current phase                             |

---

## 1. Existing-project flow

Canonical read-only path: **Open root → Inspect → Adoption readiness → Graph → Quality → Assessment → Findings → Remediation preview**.

| Capability                                    | Application | Protocol / schema                             | Validator | Daemon RPC                                              | CLI (`intentloom`)                       | Desktop                   | TUI                     | MCP                                   | Sync state            | Evidence                                                                                                                                                          |
| --------------------------------------------- | ----------- | --------------------------------------------- | --------- | ------------------------------------------------------- | ---------------------------------------- | ------------------------- | ----------------------- | ------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project inspect                               | implemented | `INSPECT_METHOD`                              | yes       | `intentloom.inspect.v1`                                 | `inspect`                                | Overview/Inspect views    | partial UX              | partial                               | `ready-now`           | `packages/application` `inspectProject`; `tests/cli-inspect.test.ts`                                                                                              |
| Doctor                                        | implemented | `DOCTOR_METHOD`                               | yes       | `intentloom.doctor.v1`                                  | `doctor`                                 | Doctor view               | partial UX              | partial                               | `ready-now`           | `doctorProject`; Desktop read-only Doctor                                                                                                                         |
| Diff                                          | implemented | `PROJECT_DIFF_METHOD`                         | yes       | `intentloom.project.diff.v1`                            | `diff`                                   | Diff Review               | implemented             | partial                               | `ready-now`           | `diffProject`; daemon + Desktop wired                                                                                                                             |
| Timeline                                      | implemented | `PROJECT_TIMELINE_METHOD`                     | yes       | `intentloom.project.timeline.v1`                        | `timeline`                               | Timeline view             | implemented             | partial                               | `ready-now`           | `tests/cli-timeline.test.ts`                                                                                                                                      |
| Adoption plan / apply                         | implemented | adoption contracts                            | yes       | partial (approved apply)                                | `adopt`, `update`                        | partial / review-oriented | partial                 | partial                               | `integration-pending` | `planProjectAdoption`, `applyProjectAdoption`; Desktop apply not full W9 flow                                                                                     |
| Conformance                                   | implemented | conformance types                             | yes       | `ENGINEERING_CONFORMANCE_METHOD`                        | `conformance`                            | not first-class W9 screen | partial                 | partial                               | `integration-pending` | `tests/cli-conformance.test.ts`                                                                                                                                   |
| Provider sync / diff                          | implemented | sync contracts                                | yes       | no dedicated RPC                                        | `sync`, `diff`                           | —                         | partial                 | partial                               | `integration-pending` | `tests/cli-provider-sync.test.ts`                                                                                                                                 |
| Engineering Quality (Q1–Q18)                  | implemented | versioned `QUALITY_*_SCHEMA_URN`              | yes       | `QUALITY_STANDARDS/CATALOG/CHECKERS/GRAPH` methods      | **not wired** to `packages/cli` binary   | viewmodels (Q14)          | viewmodels (Q14)        | implemented (Q15)                     | `integration-pending` | `runQualityCliCommand` et al. in `@intentloom/application`; `tests/cli-engineering-quality.test.ts` calls application directly; `usage.ts` omits quality commands |
| Specialized Packs catalog/detect (S1–S6)      | implemented | `QUALITY_SPECIALIZED_PACK_*`, RPC helpers     | yes       | `intentloom.specialized-packs.catalog.v1`, `.detect.v1` | **not wired** to binary                  | parity fixtures (Q14/S6)  | parity fixtures         | MCP tools                             | `integration-pending` | `runSpecializedPacksCliCommand`; `tests/cli-specialized-packs.test.ts`, `tests/daemon-specialized-packs.test.ts`                                                  |
| Specialized Packs deterministic checks (S7)   | implemented | `QUALITY_SPECIALIZED_PACK_CHECK_*_SCHEMA_URN` | yes       | `intentloom.specialized-packs.checks.v1`                | `runSpecializedPacksCliCommand checks`   | shared viewmodel/parity   | shared viewmodel/parity | `intentloom_specialized_packs_checks` | `ready-now`           | `specialized-pack-check-engine.ts`; `specialized-pack-handlers.ts`; `specialized-pack-tools.ts`; 34 focused client contract tests; `pnpm verify` green            |
| Engineering Assessments (A1–A22 app layer)    | implemented | `ASSESSMENT_*_SCHEMA_URN`                     | yes       | **no assessment RPC**                                   | **no assessment commands** in `usage.ts` | viewmodel direction       | viewmodel direction     | partial                               | `integration-pending` | `packages/application/src/engineering-assessment/`; extensive contract tests; no daemon/CLI transport                                                             |
| Agent Workspace (discuss/inspect/plan/review) | implemented | workspace conversation records                | yes       | `SESSION_GET_METHOD` (session slice)                    | `workspace`, `ui`                        | Agent Workspace modes     | partial                 | partial                               | `integration-pending` | Distinct from **Engineering Workspace** product concept (see §5)                                                                                                  |
| Evidence fetch / MCP equivalence              | implemented | evidence contracts                            | yes       | partial                                                 | `evidence`                               | —                         | —                       | implemented                           | `ready-now`           | Read-only evidence hardening gate closed                                                                                                                          |
| Approved apply / transactions                 | implemented | `APPROVED_APPLY_METHOD`                       | yes       | yes                                                     | via adoption/update apply paths          | gated apply UX            | partial                 | partial                               | `ready-now`           | Transaction boundary exists; W9 composes into one flow later                                                                                                      |

**Existing-project W9 gap (planned):** No single composed Desktop `Open Project` experience or CLI command family ties inspect → specialized detection → graph → quality → assessment → remediation into one workspace entry flow. Underlying engines exist; orchestration and client parity remain `future` until W9.

---

## 2. New-project flow — Project Inception I1–I10 vs Engineering Workspace W1–W7

### Project Inception phases (application evidence on `main`)

PR #167 merged I1–I10 **application operations and contract tests**. No
`schemaVersion` / protocol URNs exist for inception types. No CLI, daemon, or MCP
surfaces expose inception. No `tests/fixtures/inception/` tree.

| Inception phase              | Application ops                                                                                                | Tests                                  | Protocol URNs | CLI / daemon | Sync state                                 | Notes                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------- | ------------ | ------------------------------------------ | --------------------------------------------------------------------------- |
| I1 Read-only contracts       | `createInceptionSession`, `recordInceptionAnswer`, `summarizeInceptionState`, `exportInceptionSessionMarkdown` | `inception-contracts.test.ts`          | **none**      | **none**     | `integration-pending`                      | Validators in `packages/validator/src/inception-base.ts`                    |
| I2 Neutron discovery         | `generateAdaptiveInceptionQuestions`, `identifyInceptionConflicts`, `evaluateDiscoveryCompleteness`            | `inception-discovery.test.ts`          | **none**      | **none**     | `partial` / `core-first` for real provider | Deterministic adaptive questions only; **no live Neutron provider adapter** |
| I3 Blueprint resolver        | `proposeProjectBlueprints`, `compareProjectBlueprints`, `computeBlueprintDigest`                               | `inception-blueprint.test.ts`          | **none**      | **none**     | `integration-pending`                      |                                                                             |
| I4 Blueprint storage/review  | `approveBlueprint`, `revokeBlueprintApproval`, `exportBlueprintYaml`, `parseBlueprintYaml`                     | `inception-approval.test.ts`           | **none**      | **none**     | `integration-pending`                      |                                                                             |
| I5 Scaffold planner          | `prepareProjectScaffoldPlan`, `formatScaffoldPlanDryRun`, `diffScaffoldPlan`                                   | `inception-scaffold-planner.test.ts`   | **none**      | **none**     | `integration-pending`                      | Side-effect free in tests                                                   |
| I6 Transactional apply       | `applyProjectScaffold`, `rollbackProjectScaffold`                                                              | `inception-scaffold-apply.test.ts`     | **none**      | **none**     | `integration-pending`                      | Uses injectable `fileWriter`; not exposed via CLI                           |
| I7 Library workspace starter | workspace scaffold helpers                                                                                     | `inception-workspace-scaffold.test.ts` | **none**      | **none**     | `integration-pending`                      |                                                                             |
| I8 Dependency / Git plans    | `prepareDependencyInstallPlan`, `prepareGitInitPlan`                                                           | `inception-actions.test.ts`            | **none**      | **none**     | `integration-pending`                      | Plans only; no execution surface                                            |
| I9 Desktop/TUI product flow  | `initializeInceptionFlow`, `advanceInceptionFlow`, `generateFlowReviewCard`                                    | `inception-flow.test.ts`               | **none**      | **none**     | `core-first`                               | Flow state machine exists; **no client UI**                                 |
| I10 Third-party templates    | `registerStarterTemplate`, `resolveStarterTemplate`, `buildTemplateScaffoldPlan`                               | `inception-templates.test.ts`          | **none**      | **none**     | `future` for managed extensions            | Registry in application only                                                |

**Missing operations referenced by W1 / inception plan but absent from code:**

- `getInceptionSession` — no function; callers hold in-memory state only
- `listInceptionQuestions` — no function; questions embedded in session state
- Session persistence, retention, export-to-JSON, and delete lifecycle
- Versioned `INCEPTION_*_SCHEMA_URN` identifiers on protocol types

### Engineering Workspace phases (plan vs evidence)

| W phase | Plan intent                                                                                | Current evidence                                                    | Sync state                                                             |
| ------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **W0**  | Capability map + state reconciliation                                                      | **this document** + updated `PROJECT_STATE.md` / `DUTY_WATCH.md`    | **complete**                                                           |
| **W1**  | Versioned inception **session** contracts + daemon + CLI JSON + fixtures + client surfaces | Merged on `main` (`2f63f99`, PR #286 Core + PR #287 Client)         | **complete** — frozen fixtures + Desktop/TUI parity                    |
| **W2**  | Foundation Workshop typed state + readiness + client surfaces                              | Merged on `main` (`208f7c4`, PR #288 Core + PR #289 Client); see §3 | **complete** — frozen fixtures + Desktop/TUI parity                    |
| **W3**  | Neutron discovery integration for Foundation path                                          | Merged Core on `main` (`31fe4b3`, PR #292); Client on branch        | **Client in review** — Core complete; Desktop/TUI parity pending merge |
| **W4**  | Blueprint alternatives (workspace naming)                                                  | I3–I4 app ops exist                                                 | `integration-pending` after W3                                         |
| **W5**  | CLI/daemon/client parity freeze                                                            | Inception + foundation binary routing merged (#290)                 | **complete** for inception/foundation; blueprint deferred              |
| **W6**  | Minimal scaffold planner (workspace gate)                                                  | I5 app ops exist                                                    | `integration-pending` after W5                                         |
| **W7**  | Transactional empty-root creation                                                          | I6 app ops exist                                                    | `integration-pending`; gated on W5–W6                                  |

---

## 3. Foundation Workshop gap (W2)

| Surface                                                | Status                          | Evidence                                                                     |
| ------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------------- |
| Application operations (`createFoundationWorkshop`, …) | **implemented**                 | `packages/application/src/foundation-workshop.ts` + readiness/conflicts      |
| Protocol schemas / URNs                                | **implemented**                 | `foundation-workshop.ts`, `foundation-common.ts`, `foundation-daemon-rpc.ts` |
| Validator                                              | **implemented**                 | `packages/validator/src/foundation-base.ts`, `foundation-contracts.ts`       |
| Tests                                                  | **implemented**                 | `tests/foundation-*.test.ts`, `tests/daemon-foundation.test.ts`              |
| CLI app helper                                         | **implemented**                 | `runFoundationCliCommand` in `foundation-cli.ts`                             |
| Daemon RPC                                             | **implemented**                 | 9 read-only methods in `foundation-handlers.ts`                              |
| CLI binary / Desktop / TUI                             | **implemented (main + branch)** | Desktop/TUI on main; W5 inception/foundation binary routing on branch        |

**Sync state:** W2 complete on `main` — Core (PR #288) and Client (PR #289) with Desktop/TUI parity tests against six frozen fixture IDs.

Foundation Workshop is a **separate product layer** on top of inception session
semantics. W1 delivers session contracts only; W2 adds actors, workflows, domain
model, quality scenarios, readiness findings, and deterministic readiness rules.

---

## 4. Specialized Engineering Packs S1–S7

| Phase                       | Capability                     | Core / app                                                                                                                  | Protocol URNs                                               | Daemon                                                          | CLI app helper                         | CLI binary  | Desktop/TUI                               | MCP          | Sync state                   |
| --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------- | ----------- | ----------------------------------------- | ------------ | ---------------------------- |
| S1 Disciplines / roles      | implemented                    | yes                                                                                                                         | `QUALITY_DISCIPLINE_*`, `QUALITY_ROLE_*`                    | via quality graph path                                          | indirect                               | unwired     | viewmodels                                | partial      | `integration-pending`        |
| S2 Manifests / trust        | implemented                    | yes                                                                                                                         | `QUALITY_SPECIALIZED_PACK_*`                                | catalog path                                                    | indirect                               | unwired     | viewmodels                                | partial      | `integration-pending`        |
| S3 Aliases                  | implemented                    | yes                                                                                                                         | `QUALITY_DISCIPLINE_ALIAS_*`                                | —                                                               | —                                      | —           | —                                         | —            | `ready-now` (app only)       |
| S4 Detection                | implemented                    | yes                                                                                                                         | detection rule/result/resolution URNs                       | `.detect.v1`                                                    | `runSpecializedPacksCliCommand detect` | unwired     | parity tests                              | detect tool  | `integration-pending`        |
| S5 First-party catalog      | implemented                    | yes                                                                                                                         | catalog entries in `catalog/packs/specialized-engineering/` | `.catalog.v1`                                                   | `list`, `explain`                      | unwired     | parity tests                              | catalog tool | `integration-pending`        |
| S6 Client surfaces          | implemented for catalog/detect | viewmodels + bridge                                                                                                         | RPC helpers in `specialized-daemon-rpc.ts`                  | catalog + detect                                                | S6 commands                            | unwired     | `desktop-tui-engineering-quality.test.ts` | 2 tools      | `integration-pending`        |
| **S7 Deterministic checks** | **core-only**                  | `registerSpecializedPackCheckDefinition`, `runSpecializedPackDeterministicChecks`, `resolveFirstPartySpecializedPackChecks` | `QUALITY_SPECIALIZED_PACK_CHECK_*_SCHEMA_URN`               | **missing** `intentloom.specialized-packs.checks.v1` (proposed) | **missing** `check` subcommand         | **missing** | **missing**                               | **missing**  | **`core-first`** for clients |

**S7 note:** PR #284 merged Core checks with 7 contract tests. Client surfaces
were explicitly out of scope for S7. Next client slice is a separate atomic PR
(S7b or W5 parity increment), not W1.

First-party check definition IDs (stable for fixtures):

- Linked to manifests in `catalog/packs/specialized-engineering/` via `providedRuleIds`
- Validated in `tests/engineering-quality-specialized-deterministic-checks.test.ts`

---

## 5. Naming collisions and contract boundaries

Agents must not conflate these distinct identifiers:

| Name                      | Meaning today                                                                                                       | Collision risk                                      | Resolution for workspace work                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Engineering Workspace** | Product concept: new + existing project flows (`PROJECT_DESIGN_AND_DEVELOPMENT_WORKSPACE.md`)                       | vs **Agent Workspace** CLI (`intentloom workspace`) | Use full term _Engineering Workspace_ in roadmap/docs; Agent Workspace stays `AgentWorkspaceMode` / `.aif/workspace/` |
| **Agent Workspace**       | Discuss / inspect / plan / review conversations                                                                     | Same word "workspace"                               | Protocol: `WorkspaceConversationRecord`, paths under `.aif/workspace/conversations/`                                  |
| **`workspace.json`**      | Nx / monorepo manifest detection signal                                                                             | vs product "workspace"                              | Evidence adapter term only; not a session store                                                                       |
| **proposal**              | Skill proposal, adoption proposal, workspace proposal, quality remediation proposal, external skill import proposal | Overloaded                                          | Always qualify: `SkillProposal`, `AdoptionProposal`, `WorkspaceProposal`, `QualityRemediationProposal`                |
| **plan**                  | Adoption plan, scaffold plan, remediation plan, harness plan, decomposition plan                                    | Overloaded                                          | Use typed names in APIs; CLI uses `--plan` for adoption file path                                                     |
| **Foundation**            | Foundation Workshop (W2) vs foundation-first governance principles                                                  | vs `FOUNDATION_FIRST_DEVELOPMENT_PRINCIPLES.md`     | W2 ops must use `FoundationWorkshop` prefix per implementation plan                                                   |
| **Blueprint**             | Project inception blueprint (`ProjectBlueprint`)                                                                    | Stable                                              | Reuse existing inception types; do not fork for W4                                                                    |
| **Inception session**     | `InceptionSessionState` (in-memory tests)                                                                           | vs daemon `SESSION_GET_METHOD` (agent session)      | New RPC namespace: `intentloom.inception.*` not `intentloom.session.*`                                                |
| **Scaffold plan**         | `ScaffoldPlan` in inception                                                                                         | vs W6 workspace plan                                | Reuse `ScaffoldPlan`; W6 adds workspace packaging gate only                                                           |

**Capability discovery:** Future daemon `intentloom.daemon.info.v1` entries must
list inception methods separately from agent session, quality, and specialized
pack methods.

---

## 6. Gap map — I1–I10 application ops vs W1–W7 delivery

### What W1 requires (from `ENGINEERING_WORKSPACE_IMPLEMENTATION_PLAN.md`)

Versioned contracts for: inception session, problem statement, question/answer,
preference vs hard constraint, assumption, unresolved question, conflict,
session summary, retention state.

Candidate operations (plan): `createInceptionSession`, `getInceptionSession`,
`listInceptionQuestions`, `recordInceptionAnswer`, `summarizeInceptionState`,
`identifyInceptionConflicts`.

### Exact missing artifacts for W1 Core (evidence-backed)

#### Protocol schema URNs (none exist today)

Proposed initial set (names only — implementation PR freezes exact strings):

| Proposed URN constant                  | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `INCEPTION_SESSION_SCHEMA_URN`         | Session state envelope               |
| `INCEPTION_QUESTION_SCHEMA_URN`        | Question record                      |
| `INCEPTION_ANSWER_SCHEMA_URN`          | Answer record                        |
| `INCEPTION_CONFLICT_SCHEMA_URN`        | Conflict finding                     |
| `INCEPTION_SUMMARY_SCHEMA_URN`         | `summarizeInceptionState` result     |
| `INCEPTION_RETENTION_STATE_SCHEMA_URN` | Retention / export / delete metadata |

Existing types in `packages/protocol/src/inception.ts` lack `schemaVersion` fields.

#### Application operations

| Operation                                | Status                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `createInceptionSession`                 | **exists**                                         |
| `recordInceptionAnswer`                  | **exists**                                         |
| `summarizeInceptionState`                | **exists**                                         |
| `identifyInceptionConflicts`             | **exists**                                         |
| `getInceptionSession`                    | **missing**                                        |
| `listInceptionQuestions`                 | **missing** (derive from session + pending filter) |
| Session retention / delete / export JSON | **missing**                                        |

#### Daemon methods (none exist)

Proposed JSON-RPC methods for W1 Core PR:

| Proposed method                              | Maps to                      |
| -------------------------------------------- | ---------------------------- |
| `intentloom.inception.session.create.v1`     | `createInceptionSession`     |
| `intentloom.inception.session.get.v1`        | `getInceptionSession`        |
| `intentloom.inception.questions.list.v1`     | `listInceptionQuestions`     |
| `intentloom.inception.answer.record.v1`      | `recordInceptionAnswer`      |
| `intentloom.inception.state.summarize.v1`    | `summarizeInceptionState`    |
| `intentloom.inception.conflicts.identify.v1` | `identifyInceptionConflicts` |

All classified **read-only**; no project-root writes.

#### CLI commands (none in `usage.ts` or `packages/cli`)

Proposed application helper (mirror EQ pattern):

```text
runInceptionCliCommand(subcommand, { json, sessionId, root, idea, answer, ... })
```

Proposed subcommands for W1: `start`, `get`, `questions`, `answer`, `summarize`, `conflicts`, `export`, `delete`.

W1 Core PR may land application helper + tests first; wiring into
`packages/cli/src/command.ts` may follow W5 or ship in same PR if scoped.

#### Deterministic fixtures (none exist)

Proposed fixture file: `tests/fixtures/inception/session-states.v1.json`

Frozen fixture IDs for client parity (proposed — finalize in W1 PR):

| Fixture ID                              | State                                                |
| --------------------------------------- | ---------------------------------------------------- |
| `inception-fixture-empty-discovering`   | New session, zero answers                            |
| `inception-fixture-partial-discovering` | Some optional answers, required pending              |
| `inception-fixture-ready-blueprinting`  | All required answered, status `blueprinting`         |
| `inception-fixture-conflict-warning`    | Conflicting answers for `identifyInceptionConflicts` |
| `inception-fixture-cancelled`           | Cancelled session                                    |
| `inception-fixture-summary-complete`    | Stable summary counts for `summarizeInceptionState`  |

#### Tests to add in W1 Core PR

- `tests/inception-session-urns.test.ts` — schemaVersion + URN validation
- `tests/inception-cli.test.ts` — JSON surface via `runInceptionCliCommand`
- `tests/daemon-inception.test.ts` — RPC round-trip against fixtures
- Extend `inception-contracts.test.ts` for `getInceptionSession` / `listInceptionQuestions`

### W2–W7 deferral (explicit non-goals for W1)

| Phase | Defer                                                    |
| ----- | -------------------------------------------------------- |
| W2    | All `FoundationWorkshop*` operations                     |
| W3    | Live Neutron provider wiring                             |
| W4    | Blueprint CLI/daemon (reuse I3–I4 ops later)             |
| W5    | Full `intentloom inception                               | foundation | blueprint` binary routing |
| W6–W7 | Scaffold planner/apply CLI and empty-root transaction UX |

---

## 7. Minimal W1 Core slice proposal

**Branch name (suggested):** `feat/workspace-w1-inception-contracts`

**Goal:** Session lifecycle on Core with versioned URNs, in-memory or
user-scoped session store (not project-root mutation), daemon handlers, CLI
JSON helper, and frozen fixtures — **reusing** existing
`@intentloom/application` inception modules.

### In scope

1. Add `schemaVersion` + `INCEPTION_*_SCHEMA_URN` to protocol types and validator boundaries.
2. Implement `getInceptionSession`, `listInceptionQuestions`, and a bounded
   in-process session registry (or explicit caller-supplied store interface).
3. Add daemon handlers + protocol request/response types for the six methods above.
4. Add `runInceptionCliCommand` with `--json` and stable exit codes (0/1).
5. Add fixture file with six frozen IDs and parity tests (CLI + daemon).
6. Update daemon capability discovery for new methods.
7. Document URNs and fixture IDs in this matrix (frozen section).

### Out of scope

- Foundation Workshop (W2)
- Blueprint/scaffold/apply commands
- Desktop, TUI, React, Tauri changes
- Neutron live provider
- S7 specialized-pack check client surfaces
- Wiring all EQ commands into `intentloom` binary (separate parity PR)

### Exit gate (W1 Core PR) — **complete on `main` (`d82e6cb`, PR #286)**

- Session create → answer → summarize → export → delete without writing project files.
- CLI JSON and daemon return identical viewmodels for each fixture ID.
- `pnpm verify` green.
- Fixture IDs frozen in `tests/fixtures/inception/session-states.v1.json`.

### W1 Client slice — **complete on `main` (`2f63f99`, PR #287)**

**Delivered**

1. Shared inception session progress viewmodels and accessible TUI renderers.
2. Desktop `New project` shell and session-progress view (empty/loading/error/resume/delete).
3. Fixture parity tests (`tests/desktop-tui-inception.test.ts`, 5 tests).
4. Desktop Tauri bridge for inception daemon RPC methods.

**Deferred (non-goals for W1)**

- Foundation Workshop (W2)
- Wiring `intentloom inception ...` into binary command routing (W5)
- Neutron live provider

---

## 8. Client readiness summary (W2 checkpoint)

```text
Current Engineering Workspace phase: W3 Client in review (Neutron discovery Desktop/TUI); W1 + W2 + W5 + W3 Core complete on main
Verified main: 31fe4b3 (PR #292 W3 Core merged)

CORE
Current completed capability:
- W1 inception session URNs, store, daemon RPC, CLI JSON helper, frozen fixtures + client surfaces
- W2 foundation workshop typed state, URNs, readiness rules, daemon RPC, CLI helper, frozen fixtures + client surfaces
- W5 `intentloom inception` / `intentloom foundation` binary routing
- W3 foundation discovery URNs, adaptive questions, fake-adapter discovery turn, daemon RPC, CLI discover commands (main)

Next Core task:
- W4 Blueprint alternatives and resolver

CLIENTS: DESKTOP + CLI/TUI
Ready now:
- Inspect, Doctor, Diff, Timeline Desktop views (read-only)
- W1 New Project shell (Desktop) + TUI viewmodels against frozen inception fixtures
- W2 Foundation Workshop shell (Desktop) + TUI viewmodels, Tauri bridge, 6-test fixture parity
- W5 inception/foundation CLI binary commands

Integration pending:
- W3 Client Desktop/TUI Neutron discovery UX (branch ready for PR)
- EQ CLI helpers → `intentloom` binary
- Specialized packs CLI → binary
- W5 `intentloom blueprint ...` binary routing

Blocked / future:
- Full existing-project W9 composed flow
- W11 bounded coding-agent execution (harness gate)
- S8 external specialized packs

Next synchronization checkpoint:
- After W3 Client PR merges
- Before W4 Blueprint increment
```

---

## Maintenance

Update this matrix when:

- a Core contract PR merges;
- CLI binary wiring changes;
- a workspace W-phase completes;
- `PROJECT_STATE.md` active focus changes.

Do not mark a row `ready-now` without merged protocol + application + test
evidence on `main`.
