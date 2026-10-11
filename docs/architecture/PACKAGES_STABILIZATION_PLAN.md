# Packages architecture stabilization (P1–P6)

Status: **P1A audit and plan only.** Implementation has not started. P1 is not
complete. Undo U4 and Desktop Undo U5 are not started. Neutron's R4A topology
stays frozen.

This is the canonical plan for the packages stabilization program. It records
evidence from `main` at `f0b19c885d2aa95b041a4582e5218d2f3539f525`. It does not
add governance rules. File moves, export changes, and ratchet tests wait for
maintainer review of this plan.

## 1. Baseline

| Item                                  | Value                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Starting `main`                       | `f0b19c885d2aa95b041a4582e5218d2f3539f525`                                  |
| Commit subject                        | `refactor(repo): finalize architecture and documentation boundaries (#556)` |
| Prior program                         | Desktop R1–R3 and Backend R4A–R4D are merged. PR #556 is that commit.       |
| This increment                        | P1A documentation. No production source edits.                              |
| Application sources                   | 363 TypeScript files under `packages/application/src/`                      |
| Files directly under `src/`           | 153                                                                         |
| Application effective / physical SLOC | 47,292 / 50,555                                                             |

`DUTY_WATCH.md` and `PROJECT_STATE.md` previously described R4D as unmerged and
named Undo U4 as the next increment. Git is the source of truth: R4D is
merged. This plan is the next maintainer-authorized architecture program. U4
and U5 stay unauthorized.

### How the numbers were measured

- Effective and physical lines use `measureProductionSource` in
  `scripts/production-file-metrics.mjs`, the same counter as the production
  file budget.
- Static imports and `export … from` clauses were read with the TypeScript 7
  scanner. Relative `.js` specifiers were resolved to existing `.ts` files.
- File cycles are strongly connected components of that resolved graph
  (Tarjan). A component is reported when it has more than one file, or a
  self-import.
- `index.ts` declarations are the column-0 functions, classes, types,
  interfaces, and consts. That scan matches the 145 `function` keywords in the
  file.
- Consumer counts are static `from "…"` imports in `packages/`, `apps/`,
  `tests/`, and `scripts/`.
- This is not a type-checker call graph. Template strings inside
  `inception-workspace-scaffold-files.ts` contain example `import` text
  (`vitest`, scaffold package names). Those five tokens are scaffold text, not
  package dependencies, and are excluded from the dependency totals.

## 2. Canonical constraints

These documents govern the program. This plan links them. It does not restate
them as a second handbook.

| Concern                                       | Document                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Structure and dependency direction            | [ARCHITECTURE.md](ARCHITECTURE.md)                                                  |
| Domain language and context candidates        | [DOMAIN_MODELING.md](../governance/DOMAIN_MODELING.md)                              |
| Boundaries and safety                         | [ENGINEERING_PRINCIPLES.md](../governance/ENGINEERING_PRINCIPLES.md)                |
| File and function budgets                     | [CODE_QUALITY_STANDARDS.md](../governance/CODE_QUALITY_STANDARDS.md)                |
| Agent planning and handoff                    | [AI_AGENT_WORKFLOW.md](../governance/AI_AGENT_WORKFLOW.md)                          |
| Documentation index                           | [docs/README.md](../README.md)                                                      |
| Private application boundary                  | [ADR-0007](../decisions/ADR-0007-private-application-operation-boundary.md)         |
| Versioned local protocol                      | [ADR-0008](../decisions/ADR-0008-versioned-local-protocol.md)                       |
| Daemon lifecycle                              | [ADR-0009](../decisions/ADR-0009-local-daemon-security-and-lifecycle.md)            |
| Non-destructive adoption                      | [ADR-0003](../decisions/ADR-0003-non-destructive-project-adoption.md)               |
| Approved Apply                                | [ADR-0053](../decisions/ADR-0053-approved-apply-transaction-engine.md)              |
| Publishing model (no public programmatic API) | [ADR-0006](../decisions/ADR-0006-package-publishing-model.md)                       |
| Neutron application layout and cycle rules    | [ARCHITECTURE.md](ARCHITECTURE.md) and `tests/application-neutron-topology.test.ts` |

### Dependency direction

From [ARCHITECTURE.md](ARCHITECTURE.md):

```text
Presentation and process adapters (CLI, TUI, MCP, daemon)
        ↓
application use cases
        ↓
core / validator / protocol / adapters / evidence packages

Desktop → protocol → authenticated daemon → application use cases
```

`@intentloom/application` depends on `@intentloom/core`,
`@intentloom/validator`, `@intentloom/protocol`, `@intentloom/adapters`,
`@intentloom/evidence-analysis`, `@intentloom/evidence-checker`,
`@intentloom/evidence-git`, and `yaml`. Protocol and core do not depend on
application. Desktop does not depend on application. Application does not
depend on CLI, daemon, MCP, or Desktop.

ADR-0007 names core, validator, and adapters as the original application
dependencies and forbids a dependency on CLI or process globals. The later
protocol and evidence dependencies are the current architecture in
[ARCHITECTURE.md](ARCHITECTURE.md). They are existing structure, not a new
violation. ADR-0007 still owns the rule that application stays a private
use-case package and does not take over argument parsing, process exit
mapping, or a broad new I/O framework.

### Budgets that apply to later slices

From [CODE_QUALITY_STANDARDS.md](../governance/CODE_QUALITY_STANDARDS.md):

- Prefer production files at or below 250 effective lines.
- Review above 300 effective lines.
- New files stay at or below 400 effective lines and 700 physical lines.
- Prefer functions at or below 40 lines. Hard review threshold is 80 lines.
- Do not grow an oversized file. `index.ts` is grandfathered. Its recorded
  ceiling in `docs/governance/quality-exceptions.json` is 6,764 effective and
  7,151 physical lines. Current size is under that ceiling (section 4).
- A structural slice must not mix in a behavior change.

### Bounded contexts already named

[DOMAIN_MODELING.md](../governance/DOMAIN_MODELING.md) lists context
candidates: Project Adoption, Engineering Intent and Catalog,
Synchronization, Project Inspection and Evidence, Engineering Conformance
and Assessment, Agent Workspace, Agent Memory, Neutron Execution, Mutation
Governance, and Managed Extensions. A context is a vocabulary and invariant
boundary, not a folder. Promoting one, or changing transaction ownership or
dependency direction, needs an ADR. Moving files behind the existing barrel
does not by itself need an ADR.

Mutation invariants already fixed by that document and by
[ARCHITECTURE.md](ARCHITECTURE.md) stay in force: a proposal is not
authorization; approval is not Apply; status is not authority to Apply or
Undo; verification is not Apply; user Undo is not internal rollback of a
failed Apply and does not rewrite Apply history.

### Decisions this plan does not make

These stay open until a maintainer confirms them. P1A does not guess.

1. Whether `*-cli.ts` modules, text renderers, and exit-code helpers that
   live in application move to the CLI. ADR-0007 assigns human rendering and
   exit codes to the CLI. The code currently keeps shared viewmodels in
   application so daemon, MCP, and CLI can share them. Moving them changes
   ownership. It is not part of the first slices.
2. Whether relative imports of `packages/protocol/src/**` and
   `packages/validator/src/**` become package subpath imports. That is P2 and
   P3. Doing it inside an application file move can create new barrels and
   cycles.
3. Whether the legacy Neutron subagent helpers at the bottom of `index.ts`
   remain public. They are a different module from `src/neutron/`. P1A does
   not delete or merge them.
4. Whether grandfathered size ceilings should be lowered to today's measured
   sizes. That is a gate change, not part of this documentation PR.
5. The folder names in section 10 are a proposed topology. They are not a
   required template.

## 3. Application inventory

363 TypeScript files. 153 sit directly in `packages/application/src/`. The
rest already live in `neutron/`, `engineering-quality/`, or
`engineering-assessment/`.

The rows below partition the 363 files. The two one-line barrels
`engineering-quality.ts` and `engineering-assessment.ts` are counted with
their directories. The other 151 direct children of `src/` are the root row.
153 files are direct children of `src/` in total.

| Area                                                       |   Files |  Effective |   Physical |
| ---------------------------------------------------------- | ------: | ---------: | ---------: |
| Other direct children of `src/`, including `index.ts`      |     151 |     22,099 |     23,641 |
| `engineering-quality/` plus `engineering-quality.ts`       |      55 |      7,093 |      7,586 |
| `engineering-assessment/` plus `engineering-assessment.ts` |      10 |        659 |        721 |
| `neutron/`                                                 |     147 |     17,441 |     18,607 |
| **Total**                                                  | **363** | **47,292** | **50,555** |

Neutron breakdown (R4A layout, unchanged by this plan):

| Neutron area             | Files | Effective | Physical |
| ------------------------ | ----: | --------: | -------: |
| root entrypoints         |     5 |       545 |      559 |
| `session/`               |    17 |     2,005 |    2,134 |
| `context/`               |     8 |       996 |    1,071 |
| `graph/`                 |     5 |       599 |      629 |
| `scheduler/`             |    21 |     2,566 |    2,742 |
| `scheduler/node/`        |     6 |       712 |      758 |
| `tools/`                 |     8 |     1,140 |    1,204 |
| `mutation/proposal/`     |     2 |       203 |      219 |
| `mutation/review/`       |     9 |       643 |      680 |
| `mutation/approval/`     |     6 |       617 |      671 |
| `mutation/apply/`        |    26 |     2,853 |    3,024 |
| `mutation/status/`       |     4 |       479 |      519 |
| `mutation/verification/` |    10 |       783 |      840 |
| `mutation/undo/`         |    20 |     3,300 |    3,557 |

Filename prefixes are a hypothesis. They are wrong often enough that slices
must follow imports, not the prefix. Corrections already visible:

- `apply-extension-update.ts` and `discover-and-apply-extension-update.ts`
  belong with extension lifecycle, not with project init/sync.
- `approved-apply-*.ts` and `project-root-mutation-lock.ts` are the shared
  mutation transaction and in-process lock. Adoption and Neutron both use
  them.
- `inception.ts` (279 effective) and `harness.ts` (11 effective) are barrels
  for those families, not leftovers.
- `cli-quality-entry.ts`, `curated-catalog-entry.ts`, `graph-provider-entry.ts`,
  `engineering-quality-entry.ts`, `quality-viewmodel-entry.ts`, and
  `nx-graph-entry.ts` are one-line engineering-quality barrels.
- `existing-project-w9.ts` and `foundation-flow.ts` are small re-export
  barrels with high fan-out. The fan-out is the barrel, not a large module.
- `generated-file-sync-declared.ts` is transaction/sync code. It participates
  in the Approved Apply cycle. It is not an isolated adoption helper.
- `project-profile-detection.ts` and `project-scan-exclusions.ts` are shared
  by inspection, adoption, and `nodeFileSystem`.

### Files above the preferred 250 effective-line target

Only `index.ts` exceeds the 400 effective / 700 physical hard ceiling.

| Effective | Physical | File                                                               |
| --------: | -------: | ------------------------------------------------------------------ |
|     6,746 |    7,131 | `index.ts`                                                         |
|       302 |      317 | `generated-file-sync-declared.ts`                                  |
|       292 |      314 | `foundation-blueprint.ts`                                          |
|       279 |      309 | `inception.ts`                                                     |
|       278 |      297 | `neutron/session/neutron-session-runtime.ts`                       |
|       270 |      302 | `neutron/mutation/undo/neutron-mutation-undo-snapshot-manifest.ts` |
|       269 |      289 | `neutron/mutation/undo/neutron-mutation-undo-preflight.ts`         |
|       269 |      276 | `inception-workspace-scaffold-files.ts`                            |
|       258 |      265 | `existing-project-adoption-apply.ts`                               |
|       257 |      268 | `neutron/tools/neutron-tool-authorization.ts`                      |
|       255 |      265 | `neutron/scheduler/neutron-scheduler-recovery.ts`                  |
|       254 |      264 | `neutron/mutation/apply/neutron-mutation-apply-validate.ts`        |
|       251 |      266 | `neutron/scheduler/neutron-scheduler-lease-store.ts`               |
|       251 |      261 | `neutron/neutron-n2-loop.ts`                                       |

Neutron files in that list stay put while R4A is frozen. The non-Neutron
files are later extraction candidates inside their own slices. Do not grow
them in passing.

The full per-file table is Appendix A.

## 4. `packages/application/src/index.ts`

| Metric             | Measured at this baseline | Grandfathered ceiling |
| ------------------ | ------------------------: | --------------------: |
| Physical lines     |                     7,131 |                 7,151 |
| Effective lines    |                     6,746 |                 6,764 |
| Blank lines        |                       384 |                       |
| Comment-only lines |                         1 |                       |

`wc -l` is 7,131, the same as the governance counter. An earlier observation
of 7,132 physical lines does not match this tree. The file is 20 physical
lines and 18 effective lines under the grandfathered ceiling. Later slices
must not raise either number. The ceiling itself stays as recorded until a
maintainer tightens the gate.

The file is the public compatibility barrel and the remaining use-case
implementation. Both jobs are in one module. That is the primary
decomposition target.

### Declarations

Column-0 scan:

| Kind       |                                            Exported |                         Internal |
| ---------- | --------------------------------------------------: | -------------------------------: |
| function   |                                                 106 |                               39 |
| class      | 2 (`ProjectRootError`, `ArtifactValidationFailure`) | 1 (`PostWriteValidationFailure`) |
| interface  |                                                  29 |                                4 |
| type alias |                                                  10 |                                2 |
| const      |                                1 (`nodeFileSystem`) |                                9 |

There are also 29 `export … from` clauses. They re-export task routing,
external skill import, harness adoption gate, Approved Apply gate and
engine, YAML `parse`/`stringify`, project scan exclusions, destination
collisions, declared-path sync, the inception family, harness, extension
inspection and adoption, knowledge provider, Graphify, engineering
assessment, and engineering quality. Those re-exports are the stable
surface. The bodies behind them already live in other files.

`packages/cli/src/index.ts` is `export * from "@intentloom/application"`.
Every root export is therefore part of the internal CLI facade used by
tests. The published `intentloom` package exports only `./package.json`
and the `intentloom` bin (ADR-0006). There is no supported external
programmatic import.

### Cohesive groups inside the file

Line ranges are column-0 declaration spans on this baseline. Public names
stay exported from `index.ts` after any move.

| Lines     | Group                                                 | Public operations                                                                                                                                                                                                                          | Implementation still in this file                                                                                               | I/O and sensitivity                                                                                                            |
| --------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 192–229   | Conformance summaries                                 | `evaluateProjectEngineeringConformance`, `summarizeProjectWorkflowVariants`, `summarizeProjectWorkflowDurations`, `summarizeProjectConformanceTrend`, `summarizeProjectWorkflowRepetitions`, `summarizeProjectWorkflowTransitionIntervals` | Thin wrappers over `@intentloom/evidence-analysis`                                                                              | No filesystem. Leaf. First slice.                                                                                              |
| 230–331   | Protocol memory, skill, security, and workspace types | Re-exported protocol types and a block of `validate*` functions                                                                                                                                                                            | No local logic                                                                                                                  | Types only.                                                                                                                    |
| 333–707   | Project operation contracts                           | `Change`, `Plan`, `DoctorPlan`, `TransactionResult`, `FileSystem`, `InitOptions`, `AdoptionProposal`, `SyncOptions`, and neighboring types; `doctorExitCode`                                                                               | Contract types plus module constants (`.aif` paths, adapter id)                                                                 | `doctorExitCode` is exit-code mapping that ADR-0007 assigns to the CLI. Leave it until a maintainer accepts an ownership move. |
| 511–557   | Root canonicalization and timeline                    | `ProjectRootError`, `assertCanonicalProjectRoot`, `timelineProject`                                                                                                                                                                        | Symlink rejection, then `@intentloom/evidence-git`                                                                              | Host filesystem through the `FileSystem` port. Security-sensitive.                                                             |
| 708–865   | Inspection and path containment                       | `inspectProject`; re-exports of destination collisions and declared-path sync                                                                                                                                                              | `secretLikePath`, `inside`, `projectRelativePaths`                                                                              | `inside` is the path-traversal check. `secretLikePath` drops secret-like paths from inspection. Do not change the checks.      |
| 866–1938  | Generated-file transaction                            | `synchronizeGeneratedFiles`, `ArtifactValidationFailure`                                                                                                                                                                                   | `collisionPlan`, `noncanonicalPathPlan`, `validateCommittedOwnershipState`, `plan`, `apply`, metadata and post-write validation | Filesystem writes, ownership, rollback inputs. Highest sensitivity.                                                            |
| 1939–2992 | Project lifecycle orchestration                       | `initProject`, `syncProject`, `diffProject`, `doctorProject`, `adoptProject`, `planFeature`                                                                                                                                                | `doctorProject` is 589 lines (2020–2608). `adoptProject` is 304 lines (2622–2925).                                              | Orchestration over the transaction group.                                                                                      |
| 2993–3109 | Host filesystem port                                  | `createMemoryFileSystem`, `nodeFileSystem`                                                                                                                                                                                                 | In-memory map and Node implementation: symlink skip, binary skip, depth 32, 10,000 file cap, scan exclusions                    | Direct `node:fs/promises`. Legitimate port. Second slice.                                                                      |
| 3111–3440 | Governance adoption apply                             | `planProjectAdoption`, `applyProjectAdoption`                                                                                                                                                                                              | Options types                                                                                                                   | Filesystem plus catalog adoption. Sensitive.                                                                                   |
| 3448–5101 | Skills, checkpoints, delegation, bounded context      | Skill proposal, evaluation, procedural memory, profiles, `delegateTaskRole`, `getBoundedProjectContext`, task pause/resume                                                                                                                 | Large parsers, including `parseSkillProgressive` (136 lines)                                                                    | Durable project files through `FileSystem`.                                                                                    |
| 5102–5452 | Persistent memory                                     | propose, accept, supersede, forget, import, export, search, render                                                                                                                                                                         | Path helpers and redaction                                                                                                      | Durable memory files.                                                                                                          |
| 5453–5625 | Agent session                                         | start, get, list, close, delete, export                                                                                                                                                                                                    | Session file layout                                                                                                             | Durable session files.                                                                                                         |
| 5626–6663 | Security operations                                   | SARIF import, coverage, local adapters, policy, baseline, sandbox evaluation, `runContinuousSecurityAudit`                                                                                                                                 | `runLocalSecurityAdapters` is 200 lines. `runContinuousSecurityAudit` is 215 lines.                                             | Security invariants. Strong tests before any move.                                                                             |
| 6664–6987 | Interactive workspace                                 | `getInteractiveWorkspaceState`, conversation and proposal review, `applyWorkspaceProposal`                                                                                                                                                 | Read model plus a mutating apply                                                                                                | `applyWorkspaceProposal` is a mutation path. Split the read model from apply only in a dedicated slice.                        |
| 6988–7131 | Legacy Neutron subagent and local sync                | `spawnNeutronSubagentTask`, `getNeutronSubagentTask`, `listNeutronSubagentTasks`, `syncLocalWorkspaceState`                                                                                                                                | Task records stored through `FileSystem`                                                                                        | Not the `src/neutron/` runtime. Do not merge the two.                                                                          |

### Functions whose span exceeds 80 lines

These spans are declaration-to-next-declaration, so they include the body.
They are the functions that most need a later cohesive split. P1A does not
split them.

| Span | Lines     | Name                                                                                                                                                   |
| ---: | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
|  589 | 2020–2608 | `doctorProject`                                                                                                                                        |
|  304 | 2622–2925 | `adoptProject`                                                                                                                                         |
|  258 | 1135–1392 | `validateCommittedOwnershipState`                                                                                                                      |
|  215 | 6449–6663 | `runContinuousSecurityAudit`                                                                                                                           |
|  200 | 5922–6121 | `runLocalSecurityAdapters`                                                                                                                             |
|  186 | 1393–1578 | `synchronizeGeneratedFiles`                                                                                                                            |
|  166 | 3120–3285 | `planProjectAdoption`                                                                                                                                  |
|  163 | 3796–3958 | `discoverSkills`                                                                                                                                       |
|  139 | 3302–3440 | `applyProjectAdoption`                                                                                                                                 |
|  136 | 3660–3795 | `parseSkillProgressive`                                                                                                                                |
|  134 | 1646–1779 | `desired`                                                                                                                                              |
|  120 | 719–838   | `inspectProject`                                                                                                                                       |
|  118 | 5738–5855 | `importSarifSecurityReport`                                                                                                                            |
|  117 | 4985–5101 | `getBoundedProjectContext`                                                                                                                             |
|  109 | 225–333   | `summarizeProjectWorkflowTransitionIntervals` (body is 225–229; the span includes the following export-type block until the next column-0 declaration) |
|   88 | 4757–4844 | `rankProceduralMemory`                                                                                                                                 |
|   86 | 6345–6430 | `evaluateProposalAgainstSandbox`                                                                                                                       |
|   84 | 1828–1911 | `plan`                                                                                                                                                 |
|   84 | 6212–6295 | `checkSecurityPolicyAndBaseline`                                                                                                                       |

### Public API versus implementation ownership

- **Public API ownership** is the root barrel `src/index.ts` plus the
  `exports` map in `packages/application/package.json`. Callers must be able
  to keep importing those names.
- **Implementation ownership** is the module that holds the body. Today the
  body of the groups above is the barrel itself. That is the debt.
- Internal helpers (`inside`, `plan`, `apply`, `desired`,
  `validateCommittedOwnershipState`, and the other 39 functions) have no
  callers outside this file. They move with the group that calls them.
- Shared utilities with real cross-feature callers are not those private
  helpers. They are `FileSystem`, `nodeFileSystem`, `createMemoryFileSystem`,
  `project-root-mutation-lock.ts`, `project-scan-exclusions.ts`,
  `canonical-json.ts`, `skill-markdown.ts`, and
  `neutron/neutron-session-fingerprint.ts`.

## 5. Dependency graph

### Package dependencies

Incoming workspace dependencies, from package manifests:

| Package                                                             | Depends on `@intentloom/application` |
| ------------------------------------------------------------------- | ------------------------------------ |
| `intentloom` (CLI)                                                  | yes                                  |
| `@intentloom/daemon`                                                | yes                                  |
| `@intentloom/mcp-server`                                            | yes                                  |
| `@intentloom/desktop`                                               | no                                   |
| `@intentloom/protocol`, `@intentloom/core`, `@intentloom/validator` | no                                   |

Outgoing application dependencies are the manifest in section 2. Static
package-specifier imports inside application, excluding the five scaffold
template tokens:

| Specifier                       | Import sites |
| ------------------------------- | -----------: |
| `@intentloom/protocol`          |          181 |
| `@intentloom/validator`         |           84 |
| `@intentloom/core`              |           40 |
| `yaml`                          |            8 |
| `@intentloom/adapters`          |            2 |
| `@intentloom/evidence-git`      |            2 |
| `@intentloom/evidence-checker`  |            1 |
| `@intentloom/evidence-analysis` |            1 |

Evidence-analysis is also reached through the conformance wrappers, which
call the package's functions. The single `from "@intentloom/evidence-analysis"`
count is the import clause in `index.ts`.

### Relative imports that leave the package

126 application files import implementation files by relative path instead
of a package specifier:

| Target                                           | Import sites |                                                Distinct files |
| ------------------------------------------------ | -----------: | ------------------------------------------------------------: |
| `packages/protocol/src/**`                       |          259 |                      48 targets across protocol and validator |
| `packages/validator/src/**`                      |           73 |                                            included in the 48 |
| `catalog/packs/specialized-engineering/index.js` |            1 | `engineering-quality/first-party-specialized-pack-runtime.ts` |

The hottest relative targets are Neutron protocol and validator modules, led
by `packages/protocol/src/neutron/runtime/neutron-runtime.ts` (69 sites).
Protocol's public subpaths (`neutron-runtime`, `neutron-mutation`,
`neutron-session`, `neutron-graph`) do not cover every file those imports
reach. This is existing R4 coupling, not a new cycle inside application.
P1 file moves must keep these relative paths valid or update them in the
same slice. P2/P3 decide whether a subpath can replace them. Do not add a
new `neutron/index.ts` barrel. Architecture already forbids that barrel.

No application file imports `@intentloom/cli`, `@intentloom/daemon`,
`@intentloom/mcp-server`, `apps/desktop`, React, or Tauri. Matches on
`react` and `@tauri-apps/` in this package are profile detection and
inception scaffold text, not dependencies.

### Area edges

With Neutron mutation stages kept as one area, and scheduler node kept
inside scheduler:

- `application-root` imports `engineering-quality` and
  `engineering-assessment` (the root barrels).
- `engineering-quality` imports `application-root` (`index.ts` for
  `FileSystem` / `nodeFileSystem`). That pair is a cycle.
- `engineering-assessment` does not import the root. The edge is one-way.
- Neutron areas import `application-root` for the filesystem port and a few
  shared helpers. The root does not import `neutron/`. Neutron's dependency
  on the god barrel is one-way.
- Among the six Neutron subfeatures (session, context, graph, scheduler,
  tools, mutation), session is a source, context and tools do not import
  other subfeatures, and the cross edges match the allowlist in
  `tests/application-neutron-topology.test.ts`. Collapsing mutation stages
  does not create a new subfeature cycle.
- Treating each mutation stage as its own area produces one large component
  because stages are allowed to import each other
  ([ARCHITECTURE.md](ARCHITECTURE.md)). That component is the existing
  mutation subfeature, not a new violation.

### Measured file cycles

Five components. These are measured. The Neutron one is the cycle the
topology test already allowlists. The other four are existing debt outside
that test.

1. **Approved Apply / sync / barrel.** `approved-apply-baseline.ts` →
   `index.ts` ← `approved-apply-engine.ts` → `generated-file-sync-declared.ts`
   → `approved-apply-baseline.ts`, and `index.ts` re-exports the engine and
   imports declared-path sync. Any slice that touches this set must keep the
   component from growing and must not change Apply behavior.
2. **Foundation workshop.** `foundation-discovery.ts`,
   `foundation-viewmodel.ts`, and `foundation-workshop.ts` import each other.
3. **Foundation scaffold viewmodels.**
   `foundation-scaffold-client-viewmodel.ts` and
   `foundation-scaffold-workspace-viewmodel.ts` import each other.
4. **Inception barrel.** `inception.ts` and `inception-viewmodel.ts` import
   each other.
5. **Recorded Neutron mutation cycle.**
   `neutron/mutation/apply/neutron-mutation-apply-durable-record.ts`,
   `neutron/mutation/apply/neutron-mutation-apply-store.ts`, and
   `neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts`.
   `tests/application-neutron-topology.test.ts` expects exactly this
   component. Leave it frozen.

No self-imports were found. Do not describe the graph as acyclic.

### Fan-in and fan-out

Internal importers (fan-in), top of the graph:

| Importers | Module                                                    |
| --------: | --------------------------------------------------------- |
|        70 | `index.ts`                                                |
|        19 | `neutron/mutation/apply/neutron-mutation-apply-store.ts`  |
|        15 | `neutron/scheduler/neutron-scheduler-stale.ts`            |
|        12 | `neutron/mutation/review/neutron-graph-mutation-store.ts` |
|        12 | `neutron/scheduler/neutron-scheduler-errors.ts`           |
|        12 | `neutron/scheduler/neutron-scheduler-sort.ts`             |
|        12 | `neutron/session/neutron-session-turn.ts`                 |
|        11 | `engineering-quality/cli-quality-standards.ts`            |
|        11 | `neutron/mutation/apply/neutron-mutation-containment.ts`  |
|        10 | `propose-and-apply-extension-adoption.ts`                 |

Internal imports (fan-out):

| Imports | Module                                                   |
| ------: | -------------------------------------------------------- |
|      39 | `engineering-quality/index.ts` (barrel)                  |
|      22 | `neutron/neutron-scheduler.ts` (composition barrel)      |
|      17 | `existing-project-w9.ts` (barrel)                        |
|      14 | `index.ts`                                               |
|      14 | `neutron/session/neutron-session-runtime.ts`             |
|      12 | `neutron/neutron-graph-mutation.ts` (composition barrel) |
|      12 | `neutron/session/neutron-session-graph.ts`               |

`index.ts` is the module with unrelated reasons to change: conformance,
filesystem, transactions, doctor, adoption, skills, memory, sessions,
security, workspace, and legacy Neutron tasks. Secondary hotspots:

- `engineering-quality/index.ts` re-exports every quality engine, CLI
  helper, and viewmodel. It changes when any quality slice changes.
- `foundation-workshop.ts` combines workshop flow, discovery, and viewmodels
  (cycle 2).
- `inception.ts` combines flow and viewmodels (cycle 4).
- `generated-file-sync-declared.ts` combines declared-path sync with the
  Apply cycle.

High fan-out on `existing-project-w9.ts`, `foundation-flow.ts`, and
`harness.ts` is barrel re-export, not a second god module.

## 6. Candidate ownership

These are ownership proposals grounded in the files that exist. They are not
a folder checklist. Shared contracts (`FileSystem`, `Plan`, protocol types)
stay shared. No new repository interfaces are required for the moves below.

### Project lifecycle and project operations

1. Responsibility: explicit-root init, diff, sync, doctor, inspect, and the
   generated-file transaction those operations share.
2. Public operations: `initProject`, `diffProject`, `syncProject`,
   `doctorProject`, `inspectProject`, `timelineProject`,
   `synchronizeGeneratedFiles`, `assertCanonicalProjectRoot`.
3. Internal implementation: the transaction helpers in `index.ts` lines
   866–1938, plus `resolve-project-doctor-init.ts`.
4. Shared contracts: `Plan`, `DoctorPlan`, `TransactionResult`, `FileSystem`,
   `ProjectRootError`.
5. Dependencies: core, adapters, validator, yaml, scan exclusions,
   destination collisions, declared-path sync, profile detection.
6. I/O: `FileSystem` port, with `nodeFileSystem` as the host adapter.
7. Transaction and security: path containment (`inside`), symlink rejection,
   collision and noncanonical-path plans, post-write validation,
   `validateCommittedOwnershipState`.
8. Tests: `tests/doctor*.test.ts`, `tests/project-inspection.test.ts`,
   CLI sync/init/doctor tests, daemon doctor paths.
9. Migration risk: high. This is the last application-index slice, after
   leaves exist, so the new module does not import `index.ts`.

### Foundation

1. Responsibility: foundation workshop, blueprint, discovery, readiness, and
   scaffold planning.
2. Public operations: the `foundation*` exports already re-exported through
   the root barrel (CLI and daemon import them from `@intentloom/application`).
3. Internal implementation: 33 `foundation*.ts` files. `foundation-flow.ts`
   and the `foundation-w*.ts` files are small barrels.
4. Shared contracts: protocol foundation types, `FileSystem`.
5. Dependencies: protocol, validator, and the root barrel for filesystem.
6. I/O: filesystem port; fixtures read JSON with `node:fs`.
7. Transaction and security: scaffold apply revalidation
   (`foundation-scaffold-apply-revalidation.ts`). Not Neutron Apply.
8. Tests: 14 `tests/foundation*` files plus daemon foundation tests.
9. Migration risk: medium. Two file cycles (workshop trio, scaffold
   viewmodel pair) must be broken by import direction, not by a new
   interface. `foundation-cli.ts` and viewmodel renderers stay until the
   rendering ownership decision.

### Inception

1. Responsibility: blueprint, approval, scaffold plan/apply, templates, and
   workspace scaffold generation.
2. Public operations: inception exports re-exported from `index.ts` via
   `inception*.ts`.
3. Internal implementation: `inception.ts` (279 effective) plus 17 sibling
   files.
4. Shared contracts: protocol inception types.
5. Dependencies: protocol, validator, filesystem port.
6. I/O: scaffold writers through `FileSystem`; `inception-fixtures.ts` reads
   fixture files.
7. Transaction and security: scaffold apply is a reviewed write path.
   Preserve it.
8. Tests: 14 `tests/inception*` files.
9. Migration risk: medium. `inception.ts` cycles with
   `inception-viewmodel.ts`. `inception-workspace-scaffold-files.ts` embeds
   example source in templates; do not treat those strings as imports.

### Existing-project adoption

1. Responsibility: preview, approval, prepared-plan digest and revalidation,
   and apply for an existing tree.
2. Public operations: `adoptProject` still in `index.ts`; the
   `existing-project-adoption-*` modules; `planProjectAdoption` and
   `applyProjectAdoption`.
3. Internal implementation: 25 files plus the adopt/apply functions in
   `index.ts`. `existing-project-w9.ts` is the barrel.
4. Shared contracts: `AdoptionProposal`, core adoption types, `FileSystem`,
   the project-root lock.
5. Dependencies: generated-file sync, Approved Apply modules, profile
   detection, instruction taxonomy.
6. I/O: filesystem port. Apply writes only through the existing transaction.
7. Transaction and security: approval gates, fingerprint, stale-plan
   rejection, health checks. ADR-0003 and ADR-0053 apply.
8. Tests: `tests/existing-project*` and adoption tests (filename search
   shows 16 existing-project tests and additional adoption tests).
9. Migration risk: high where it touches `synchronizeGeneratedFiles` or
   Approved Apply. Moving the already-split `existing-project-*` files into
   a directory is lower risk than moving `adoptProject`.

### Feature intent

1. Responsibility: feature scope, impact, plan, and workspace around an
   intent. `planFeature` in `index.ts` is the older entry.
2. Public operations: `planFeature`, plus `feature-intent-*` exports.
3. Internal implementation: 11 `feature-intent*` / `task-routing.ts` /
   `skill-markdown.ts` files. `skill-markdown.ts` is shared with
   `parseSkillProgressive`.
4. Shared contracts: protocol feature-intent types, `FileSystem`.
5. Dependencies: task routing, skill markdown, filesystem.
6. I/O: filesystem port; fixtures use `node:fs`.
7. Transaction and security: planning is read-only until a separate apply
   path is invoked. Do not fold it into Apply.
8. Tests: `tests/feature-intent*` (3) plus daemon feature-intent tests.
9. Migration risk: low for the existing directory-ready files. `planFeature`
   stays in the index until the lifecycle slice.

### Bounded execution

1. Responsibility: capability-bounded workspace preparation, task, verify,
   and apply gate. `mutationAllowed` stays an explicit result, not an
   implied grant.
2. Public operations: `bounded-execution-*` exports consumed by daemon and
   CLI from the root barrel.
3. Internal implementation: 9 files. `bounded-execution-w11.ts` is a barrel.
4. Shared contracts: protocol bounded-execution types, `FileSystem`,
   Approved Apply types where apply is requested.
5. Dependencies: Approved Apply gate, filesystem.
6. I/O: filesystem port; fixtures use `node:fs`.
7. Transaction and security: capability checks and approval tokens. Preserve
   fail-closed behavior.
8. Tests: `tests/bounded*` and `tests/daemon-bounded-execution.test.ts`.
9. Migration risk: medium because apply sits next to Approved Apply. A
   directory move of the nine files is safer than editing the gate.

### Continuous loop

1. Responsibility: compare and apply a continuous-loop workspace.
2. Public operations: `continuous-loop-*` exports.
3. Internal implementation: 7 files. `continuous-loop-w12.ts` is a barrel.
4. Shared contracts: protocol types, `FileSystem`.
5. Dependencies: filesystem, shared plan types.
6. I/O: filesystem port; fixtures use `node:fs`.
7. Transaction and security: `continuous-loop-apply.ts` is a write path.
8. Tests: `tests/continuous*` and daemon continuous-loop tests.
9. Migration risk: medium on the apply file, low on the read/compare files.

### Harness

1. Responsibility: scenario run, comparison, sandbox negotiation, state,
   benchmark, and adoption gate. Real provider adapters stay deferred.
2. Public operations: harness exports re-exported from `index.ts` and
   `harness.ts`.
3. Internal implementation: 15 `harness*.ts` files plus
   `external-skill-import.ts`.
4. Shared contracts: protocol harness types, `FileSystem`.
5. Dependencies: protocol, validator, adoption gate.
6. I/O: sandbox adapters are in-process fakes and local read-only
   descriptions. No `node:child_process` import was found in application.
7. Transaction and security: `harness-adoption-gate.ts` is fail-closed
   adoption enforcement.
8. Tests: 13 `tests/harness*` files plus MCP harness tests.
9. Migration risk: low for a directory grouping. Do not enable effectful
   mutation while moving files.

### Extension lifecycle

1. Responsibility: manifest inspection, adoption proposal/apply, update,
   removal preview, health, sandbox, and lock path.
2. Public operations: `inspectExtensionManifest`,
   `propose-and-apply-extension-adoption`, removal and update exports.
3. Internal implementation: 11 extension files plus
   `apply-extension-update.ts` and `discover-and-apply-extension-update.ts`.
4. Shared contracts: protocol extension types, `FileSystem`.
5. Dependencies: validator extension inspection, filesystem, project lock.
6. I/O: filesystem port. Update apply writes files.
7. Transaction and security: removal preview versus apply, lock path,
   sandbox limits.
8. Tests: 9 `tests/extension*` files.
9. Migration risk: medium on apply/update/remove. Inspection-only modules
   can move earlier.

### Engineering assessment

1. Responsibility: evidence-backed assessment operations already isolated
   under `engineering-assessment/`.
2. Public operations: `assessProject` and the assessment barrel. Package
   subpath `./engineering-assessment` points at
   `src/engineering-assessment.ts`, which re-exports the directory.
3. Internal implementation: 9 files in the directory plus the one-line root
   barrel.
4. Shared contracts: protocol assessment types.
5. Dependencies: protocol, validator. It does not import `index.ts`.
6. I/O: caller-supplied evidence. The application operation is not a second
   filesystem walker.
7. Transaction and security: read-only assessment. No Apply.
8. Tests: 12 `tests/engineering-assessment*` files.
9. Migration risk: low. The boundary already exists. Later work should only
   stop the root `index.ts` from being the only re-export path if a consumer
   needs the subpath. No consumer currently imports the subpath specifier
   (section 9).

### Engineering quality

1. Responsibility: quality packs, baselines, ratchets, checker ingestion,
   graph providers, remediation plans, and specialized packs.
2. Public operations: the quality barrel, already re-exported from
   `index.ts` through `engineering-quality-entry.ts`. Package subpath
   `./engineering-quality`.
3. Internal implementation: 54 files in `engineering-quality/` plus four
   one-line root barrels.
4. Shared contracts: protocol quality types, `FileSystem` from `index.ts`.
5. Dependencies: protocol, validator, core, and the application root.
6. I/O: mostly pure functions over caller-supplied documents.
   `cli-specialized-packs-external.ts` also calls `node:fs/promises`
   `readFile` for a manifest path. One runtime file reads
   `catalog/packs/specialized-engineering`.
7. Transaction and security: external pack activation and apply are
   separate reviewed decisions. Human approval tokens stay required.
8. Tests: 32 `tests/engineering-quality*` files.
9. Migration risk: medium. The directory is a real boundary. The cycle is
   the root barrel plus `FileSystem` imports. Break it by importing the
   filesystem leaf after P1C, not by a new quality interface. CLI text
   renderers and exit helpers inside this directory wait for the rendering
   ownership decision.

### Neutron

1. Responsibility: session runtime, context assembly, graph, scheduler and
   node execution, read-only tools, and mutation stages. Already laid out
   in [ARCHITECTURE.md](ARCHITECTURE.md).
2. Public operations: package subpaths `neutron-runtime`, `neutron-n2`,
   `neutron-context-assembly`, `neutron-n4`, `neutron-scheduler`,
   `neutron-graph-mutation`, `neutron-session`.
3. Internal implementation: 147 files under `src/neutron/`.
4. Shared contracts: protocol Neutron types, often imported by relative
   path; `FileSystem`; session fingerprint.
5. Dependencies: protocol, validator, and the application root. No CLI,
   daemon, Desktop, React, or Tauri imports (enforced by the topology test).
6. I/O: durable host files in apply, status, and undo modules via
   `node:fs/promises` (section 7). Session code receives the host directory;
   it does not invent a second store.
7. Transaction and security: Approved Apply, durable records, verification,
   and Undo U1–U3. See section 8.
8. Tests: 71 `tests/neutron*` files plus mutation durable tests.
9. Migration risk: do not move. R4A is the accepted topology. A defect
   inside it needs its own maintainer decision and its own PR.

### Modules that do not fit one candidate

- `model-adapter.ts` and `ollama-model-adapter.ts`: provider adapter used by
  Neutron. Daemon imports the Ollama adapter by source path. Leave the
  paths stable until a daemon import update is the point of the PR.
- `knowledge-provider.ts` and `graphify-adapter.ts`: extension/knowledge
  boundary, re-exported from the root.
- `canonical-json.ts`: shared deterministic JSON helper.
- Legacy Neutron task helpers in `index.ts`: Agent Workspace era storage,
  not `src/neutron/`.

## 7. Clean Architecture checks

Application does not import CLI, Desktop, Tauri, daemon transport, or MCP
transport. Desktop has no import of `@intentloom/application`. Daemon and
MCP call application; they are not dependencies of it.

Presentation-shaped code still lives inside application. That is existing
debt against ADR-0007's assignment of rendering and exit codes to the CLI:

- `foundation-cli.ts`, `foundation-scaffold-cli.ts`, `inception-cli.ts`
- `bounded-execution-workspace-cli.ts`, `continuous-loop-workspace-cli.ts`
- `existing-project-workspace-cli.ts`, `feature-intent-workspace-cli.ts`
- engineering-quality `cli-*.ts`, `viewmodel.ts`, `viewmodel-renderers.ts`,
  and specialized-pack viewmodel/text/exit helpers
- `doctorExitCode` in `index.ts`

They exist so CLI, daemon, and MCP can share one structured result. Moving
them is the open decision in section 2. P1 structural slices leave them in
application.

### Node.js imports

No `node:child_process`, `node:net`, `node:http`, or `node:https` imports
were found under `packages/application/src`.

| Module                                                                                                        | Import                                         | Classification                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                                                                                                    | `node:fs/promises`, `node:path`, `node:crypto` | Host filesystem port (`nodeFileSystem`) plus hashing. Legitimate orchestration behind the existing `FileSystem` type. Direct `fs` use outside that object should move with the port in P1C and not spread. |
| `neutron/mutation/apply/neutron-mutation-apply-durable-fs.ts`                                                 | `node:fs/promises`                             | Crash-safe exclusive create, sync, and atomic rename for durable Apply state. Infrastructural host I/O. Already a focused module. Frozen with Neutron.                                                     |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-store.ts`                                               | `node:fs/promises`                             | Undo snapshot directory. Same classification. Frozen.                                                                                                                                                      |
| `neutron/mutation/status/neutron-mutation-status-index.ts`                                                    | `node:fs/promises` `mkdir`                     | Status index directory creation. Frozen.                                                                                                                                                                   |
| `engineering-quality/cli-specialized-packs-external.ts`                                                       | `node:fs/promises` `readFile`                  | Reads a manifest path in addition to the `FileSystem` port. Tightly coupled I/O. Extract only in a quality slice that preserves the read.                                                                  |
| `*-fixtures.ts` (bounded execution, continuous loop, existing project, feature intent, foundation, inception) | `node:fs` or `node:fs/promises`                | Load shipped fixture JSON, then project it onto `FileSystem`. Acceptable technical detail.                                                                                                                 |
| `project-root-mutation-lock.ts`                                                                               | `node:async_hooks`, `node:path`                | In-process lock (`AsyncLocalStorage` plus a promise tail). Legitimate host orchestration. ADR-0007 warns against a new I/O abstraction with one implementation. Leave the lock concrete.                   |
| 32 files                                                                                                      | `node:crypto`                                  | Hashes and ids. Acceptable technical detail.                                                                                                                                                               |
| 47 files                                                                                                      | `node:path`                                    | Path joins and containment. Acceptable when the safety rule stays explicit, as in `inside` and `neutron-mutation-containment.ts`.                                                                          |

Pure rules that are coupled to I/O today:

- Conformance summaries are already pure. They are the first extraction.
- `secretLikePath` and `inside` are pure functions of strings sitting inside
  the filesystem module. They can move as pure helpers without taking
  `node:fs` with them.
- `doctorProject`, `adoptProject`, and `synchronizeGeneratedFiles` mix
  policy, planning, and writes. Split only by cohesive behavior, and only
  after tests cover the current results. Do not invent ports for each call.

## 8. Safety and behavior preservation

Structural PRs do not change behavior. The tests below are the preservation
net. If a move would require editing an assertion, stop and split the change.

| Sensitive area                  | Where it lives                                                                                        | Preservation rule                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Approved Apply                  | `approved-apply-gate.ts`, `approved-apply-engine.ts`, `approved-apply-baseline.ts`, ADR-0053          | Do not retarget the engine until it can import leaves instead of `index.ts`. Keep the 4-file cycle from growing. |
| Host approval and authorization | Neutron `mutation/approval/`, `mutation/proposal/`, tool authorization                                | Frozen with Neutron. Approval is not Apply.                                                                      |
| Atomic transaction              | `synchronizeGeneratedFiles`, `validateCommittedOwnershipState`, `plan`, `apply` in `index.ts`         | Move as one unit, late. Keep step order visible.                                                                 |
| Project locks                   | `project-root-mutation-lock.ts`, Neutron durable lock                                                 | Do not replace `AsyncLocalStorage` with a new interface in a move PR.                                            |
| Durable state                   | Neutron apply durable record/store/fs, status index                                                   | Frozen.                                                                                                          |
| Path containment and symlinks   | `inside`, `assertCanonicalProjectRoot`, `neutron-mutation-containment.ts`, inspection symlink finding | Preserve the current checks, including symlink rejection at the root.                                            |
| Snapshots and rollback          | Neutron undo snapshot store, verification rollback evidence                                           | User Undo is not Apply-failure rollback. Frozen.                                                                 |
| Undo U1–U3                      | `neutron/mutation/undo/` (20 files)                                                                   | Merged behavior stays. U4 and U5 do not start.                                                                   |
| Neutron runtime and scheduler   | `neutron/session`, `neutron/scheduler`, `neutron/neutron-n2-loop.ts`                                  | Frozen.                                                                                                          |
| Security audit and sandbox      | `index.ts` lines 5626–6663                                                                            | Own slice, after filesystem leaf exists, with security tests unchanged.                                          |
| Workspace apply                 | `applyWorkspaceProposal`                                                                              | Do not move it with the read-only workspace view.                                                                |

`mutationAllowed` remains a literal result of the bounded and Neutron
contracts. A refactor must not turn it into a derived true.

## 9. Public API compatibility

### Package subpaths

From `packages/application/package.json`. No TypeScript file in this
repository imports `@intentloom/application/<subpath>`. Consumers use the
root barrel or a relative source/dist path. The subpath names are still the
R4A contract. A move may change the target file path and must keep the
subpath key and the symbol the topology test checks.

| Subpath                      | Current target                                    | Symbol the topology test requires       |
| ---------------------------- | ------------------------------------------------- | --------------------------------------- |
| `.`                          | `src/index.ts`                                    | root barrel                             |
| `./model-adapter`            | `src/model-adapter.ts`                            |                                         |
| `./ollama-model-adapter`     | `src/ollama-model-adapter.ts`                     |                                         |
| `./neutron-runtime`          | `src/neutron/neutron-runtime-contracts.ts`        | `prepareNeutronRuntimeContractSnapshot` |
| `./neutron-n2`               | `src/neutron/neutron-n2-loop.ts`                  | `runNeutronN2ReadOnlyLoop`              |
| `./neutron-context-assembly` | `src/neutron/context/neutron-context-assembly.ts` | `assembleNeutronContext`                |
| `./neutron-n4`               | `src/neutron/tools/neutron-tool-router.ts`        | `routeNeutronToolInvocation`            |
| `./neutron-scheduler`        | `src/neutron/neutron-scheduler.ts`                | `approveAndApplyNeutronGraphMutation`   |
| `./neutron-graph-mutation`   | `src/neutron/neutron-graph-mutation.ts`           | `applyApprovedNeutronGraphMutation`     |
| `./neutron-session`          | `src/neutron/session/neutron-session-runtime.ts`  | `createNeutronSessionRuntime`           |
| `./engineering-assessment`   | `src/engineering-assessment.ts`                   |                                         |
| `./engineering-quality`      | `src/engineering-quality.ts`                      |                                         |

### Who imports the root barrel

Named imports of `@intentloom/application` (distinct symbols):

| Consumer   | Files importing the root | Distinct symbols |
| ---------- | -----------------------: | ---------------: |
| CLI        |                       39 |              121 |
| Daemon     |                       20 |               74 |
| MCP server |                        6 |               32 |
| Tests      |                      156 |              356 |
| Desktop    |                        0 |                0 |

415 distinct symbols appear in those named imports. CLI
`src/index.ts` also star-re-exports the barrel for internal tests. Daemon
additionally imports built output and source paths:

- `packages/daemon/src/bin.ts` imports `../../application/dist/index.js`,
  `../../application/src/neutron/session/neutron-session-runtime.js`, and
  `../../application/src/ollama-model-adapter.js`
- `packages/daemon/src/project-health-handlers.ts` imports
  `../../application/dist/resolve-project-doctor-init.js`
- Neutron daemon handlers type-import `NeutronSessionRuntime` from
  `application/src/neutron/session/neutron-session-runtime.ts`

Tests deep-import application source (307 import sites, 69 specifiers).
The most common is `packages/application/src/index.js` (81 sites), then
`neutron/neutron-scheduler.js` (28) and
`neutron/neutron-session-fingerprint.js` (23).

### How moves keep the API

- New modules are imported by `index.ts` and re-exported. Existing
  `from "@intentloom/application"` sites stay valid.
- Do not add a second barrel that imports `index.ts`.
- Do not change package subpath keys.
- Deep source imports and the two `application/dist/*` imports are
  compatibility edges. A slice that changes one of those paths updates the
  daemon or test import in the same commit and says so.
- Neutron paths named above stay stable for the whole P1 program unless a
  separate maintainer decision unfreezes R4A.
- Star re-exports that already exist stay. New cycles of barrels are not
  introduced. `engineering-quality/index.ts` is already a wide barrel; do
  not add another one beside it.

## 10. Proposed target topology

A thin root barrel, feature directories for code that is already a family,
and shared leaves that more than one family calls. Create a directory only
in the slice that moves files into it.

```text
packages/application/src/
  index.ts                      compatibility barrel, re-exports only
  host-file-system.ts           FileSystem, nodeFileSystem, createMemoryFileSystem
  project-path.ts               inside, secretLikePath, and other pure path checks
  project-operations/           init, diff, sync, doctor, inspect, transaction
  adoption/                     existing-project adoption and governance adopt/apply
  foundation/
  inception/
  feature-intent/
  bounded-execution/
  continuous-loop/
  harness/
  extension/
  engineering-assessment/       already present
  engineering-quality/          already present
  neutron/                      frozen R4A layout
```

`model-adapter.ts` and `ollama-model-adapter.ts` stay at the paths the
package exports and the daemon imports, until a daemon-focused PR.

This picture is a proposal. A slice may keep a file at the `src/` root when
that is the smaller move. Empty directories are not part of P1A.

## 11. Ordered slices

Every slice: expected behavior change is none. Rollback is `git revert` of
that slice. The root barrel must still export the same names. The new module
must not import `index.ts`. Neutron files are not in any slice below.

Merge prerequisite for P1B and every later slice: maintainer acceptance of
this plan, or an explicit instruction to start that slice. This PR does not
implement them.

### P1B — conformance summary leaf (first)

|                      |                                                                                                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source               | `index.ts` lines 192–229: the six conformance and workflow summary functions                                                                                                                                                                                                                                               |
| Target               | `packages/application/src/project-conformance-summaries.ts`                                                                                                                                                                                                                                                                |
| Moved responsibility | Pure wrappers over `@intentloom/evidence-analysis`                                                                                                                                                                                                                                                                         |
| Edges                | New file imports `@intentloom/evidence-analysis` and the protocol types those signatures use. `index.ts` re-exports the six names. No edge to `index.ts` from the new file.                                                                                                                                                |
| Exports              | Same six root exports                                                                                                                                                                                                                                                                                                      |
| Tests                | `tests/engineering-conformance.test.ts`, `tests/conformance-trend-summary.test.ts`, `tests/workflow-duration-metrics.test.ts`, `tests/workflow-repetition-summary.test.ts`, `tests/workflow-variant-summary.test.ts`, `tests/workflow-transition-intervals.test.ts`, and the conformance section of `tests/daemon.test.ts` |
| Guards               | New file under 250 effective lines. `index.ts` effective and physical lines do not rise. Topology test still passes.                                                                                                                                                                                                       |
| SLOC                 | About 40 effective lines leave `index.ts`. New file is that body plus imports.                                                                                                                                                                                                                                             |
| Why first            | Leaf, no filesystem, no transaction, existing equality tests against evidence-analysis.                                                                                                                                                                                                                                    |

### P1C — host filesystem port

|                      |                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source               | `FileSystem` and the types that are only the port, plus `createMemoryFileSystem`, `memoryPath`, and `nodeFileSystem` (`index.ts` 472–482 and 2993–3109) |
| Target               | `packages/application/src/host-file-system.ts`                                                                                                          |
| Moved responsibility | The existing port and its two adapters                                                                                                                  |
| Edges                | Imports `node:fs/promises`, `node:path`, and `project-scan-exclusions.ts` (that module has no imports today). Does not import `index.ts`.               |
| Exports              | `FileSystem`, `nodeFileSystem`, `createMemoryFileSystem` remain on the root barrel                                                                      |
| Tests                | The large set that calls `createMemoryFileSystem` and `nodeFileSystem`. Run the adoption, doctor, and Approved Apply suites, not a new behavior test.   |
| Guards               | Preserve symlink skip, binary skip, depth 32, and the 10,000 file cap.                                                                                  |
| SLOC                 | About 120 lines leave `index.ts`.                                                                                                                       |
| Why second           | Unblocks later modules so they can take a filesystem without importing the barrel.                                                                      |

### P1D — pure path checks

|                      |                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Source               | `secretLikePath`, `inside`, and `projectRelativePaths`                                                        |
| Target               | `packages/application/src/project-path.ts`                                                                    |
| Moved responsibility | Path traversal rejection and secret-like path filtering                                                       |
| Edges                | `node:path` and the existing relative-path helper only                                                        |
| Exports              | Internal. `index.ts` imports them. Do not add new public names.                                               |
| Tests                | `tests/project-inspection.test.ts` and the adoption/sync tests that already cover traversal and symlink roots |
| Guards               | The check text and the thrown error string stay.                                                              |
| SLOC                 | Under 40 lines moved.                                                                                         |
| Risk                 | Security-sensitive but pure. Do not "improve" the prefix check in the same PR.                                |

### P1E — retarget `FileSystem` imports off the barrel, by family

One family per PR: engineering-quality, foundation, inception, adoption,
extension, harness, feature-intent, bounded-execution, continuous-loop.
Each PR changes import sites from `./index.js` to `./host-file-system.js`
only where the imported names are the port. This removes the
quality ↔ root cycle once quality no longer needs the barrel for
`FileSystem`. It does not move feature files yet.

### P1F — directory moves of families that are already split

Order, one family per PR, after P1E for that family: feature-intent,
harness, extension inspection (not apply), engineering-assessment (only if
a consumer change is actually needed; the directory already exists),
bounded-execution read side, continuous-loop read side, foundation files
that are outside the two cycles, inception files outside the viewmodel
cycle.

Each PR lists the exact files in its body. Expected import updates are the
family's own relative imports plus barrel re-exports. No behavior edits.

### P1G — break the small cycles by import direction

1. Inception: make the viewmodel import a types/module that `inception.ts`
   does not import back.
2. Foundation scaffold viewmodels: same pattern.
3. Foundation workshop / discovery / viewmodel: same pattern.

No new interfaces. Move a type or a pure function to a third file that both
sides may import.

### P1H — index groups that become leaves after P1C

One group per PR, in this order: persistent memory, agent session, skill
catalog and proposals, security findings and SARIF import, security policy
and sandbox, continuous security audit, interactive workspace **read**
model. Each new file imports `host-file-system.ts` and protocol/validator.
If the extraction would still import `index.ts`, the slice is not ready;
move the callee first.

`applyWorkspaceProposal`, `applyProjectAdoption`, `adoptProject`,
`doctorProject`, and `synchronizeGeneratedFiles` are not in this list.

### P1I — transaction and lifecycle

One PR for the generated-file transaction helpers and
`synchronizeGeneratedFiles`. A following PR for `initProject`,
`syncProject`, `diffProject`, `doctorProject`, and `inspectProject`. A
following PR for `adoptProject`, `planProjectAdoption`, and
`applyProjectAdoption`, together with the Approved Apply import retarget
that removes `index.ts` from cycle 1.

Prerequisites: P1C and P1D merged, Approved Apply tests green on `main`,
and a diff that contains no assertion edits.

### P1J — legacy Neutron helpers in the barrel

Only after an explicit maintainer decision that they stay, move, or are
removed. Default in this plan: leave them in the barrel until that
decision. Do not fold them into `src/neutron/`.

### What is intentionally not a single PR

Moving all 153 root files at once. Mixing any slice above with a product
change. Editing Neutron. Starting U4 or U5. Tightening grandfathered
baselines inside a move PR.

## 12. Architecture ratchets to add with P1B

Add these in the first implementation PR, not in this documentation PR.
They guard decisions. They do not freeze an allowlist of every future file.

| Ratchet                       | What it locks                                                                                                                                   | What it must not do                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Entrypoint no-growth          | `index.ts` effective lines stay ≤ 6,746 and physical lines stay ≤ 7,131, the measured baseline, which is tighter than the grandfathered ceiling | Do not raise the ceiling to make a slice fit                                              |
| File-cycle baseline           | The five components in section 5 remain the maximum. A new component fails.                                                                     | Do not rename files to escape the baseline                                                |
| Neutron topology              | Existing `tests/application-neutron-topology.test.ts` stays unchanged through P1                                                                | Do not copy it into a second Neutron test                                                 |
| Forbidden application imports | Fail on imports of CLI, daemon, MCP server, Desktop, React, or Tauri                                                                            | Do not flag `node:fs` or `node:path`                                                      |
| Public root exports           | The set of root export names is a superset of the names imported by CLI, daemon, and MCP today                                                  | Do not require a snapshot of every internal helper                                        |
| New-file budgets              | New application files use the existing 400 / 700 production budgets                                                                             | Do not add an exact-file allowlist that rejects a legitimate new module                   |
| Subpath keys                  | The twelve `package.json` export keys stay                                                                                                      | Targets may change only when the topology test's required symbols stay in the target file |

Cycle 5 stays as the recorded Neutron exception inside the topology test.
The no-growth ratchet should ignore that recorded component and fail if a
sixth component appears.

## 13. Other packages (not modified in P1A)

Reconciled with a fresh measurement of every `packages/*/src` tree on this
baseline. Application is 363 of the package source files and 47,292 of the
effective lines. The next largest trees are protocol and validator.

| Phase | Package                         | Files | Effective | Physical | Largest file (effective/physical)          | Follow-up after P1                                                                                                                                                                                        |
| ----- | ------------------------------- | ----: | --------: | -------: | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1    | `@intentloom/application`       |   363 |    47,292 |   50,555 | `src/index.ts` 6,746/7,131                 | This plan                                                                                                                                                                                                 |
| P2    | `@intentloom/protocol`          |   128 |    17,101 |   18,763 | `src/index.ts` 4,280/4,578                 | Barrel split. Subpaths for the 48 files application imports relatively. Neutron layout stays as R4B. No `neutron/index.ts`.                                                                               |
| P3    | `@intentloom/validator`         |   107 |    15,471 |   16,342 | `src/index.ts` 844/878                     | Same barrel problem, smaller. Neutron layout stays as R4C.                                                                                                                                                |
| P4    | `intentloom` CLI                |    66 |     8,490 |    8,990 | `engineering-workspace-command.ts` 334/357 | `src/command.ts` is 171 lines now. The grandfathered ceiling still says 3,243/3,307 and is stale. Star re-export of application stays until P1's barrel is thin. Rendering ownership decision lands here. |
| P5    | `@intentloom/daemon`            |    26 |     5,185 |    5,417 | `src/index.ts` 1,023/1,050                 | Ceiling in the exceptions file is 1,037/1,064, above the file. Replace `dist/` and deep `src/` imports with the root barrel or a stable subpath. `foundation-handlers.ts` is 497/518.                     |
| P5    | `@intentloom/mcp-server`        |     6 |     1,104 |    1,173 | `src/index.ts` 583/613                     | Follows the application barrel. No transport logic moves into application.                                                                                                                                |
| P6    | `@intentloom/core`              |     3 |       610 |      662 | `adoption.ts` 398/429                      | One adoption module. Split only when a second consumer needs a smaller import.                                                                                                                            |
| P6    | `@intentloom/adapters`          |     1 |       399 |      420 | `src/index.ts` 399/420                     | Single file, under the hard ceiling, over the 250 preference.                                                                                                                                             |
| P6    | `@intentloom/evidence-analysis` |     1 |       739 |      777 | `src/index.ts` 739/777                     | Over the hard ceiling. Natural split is the summary family P1B already wraps.                                                                                                                             |
| P6    | `@intentloom/evidence-git`      |     1 |       211 |      223 | `src/index.ts` 211/223                     | Within budget.                                                                                                                                                                                            |
| P6    | `@intentloom/evidence-checker`  |     3 |       266 |      274 | `runner.ts` 190/195                        | Within budget.                                                                                                                                                                                            |
| P6    | `@intentloom/evidence-provider` |    10 |     1,178 |    1,285 | `src/index.ts` 189/205                     | Within budget. Stays an adapter.                                                                                                                                                                          |

P2–P6 do not start in the P1 implementation PRs.

## 14. Completion criteria

**P1A (this PR)** is complete when the plan is on a branch, the inventory
matches this baseline, validation below has been recorded, and a maintainer
can review it. It does not complete P1.

**P1 implementation** is complete only when all of the following are true:

- `index.ts` is a re-export barrel at or below 400 effective lines and 700
  physical lines, or a maintainer-accepted exception names the specific
  declarations still left and why another slice is unsafe.
- The file-cycle ratchet shows no component beyond the baseline in section 5,
  and the Approved Apply component no longer includes `index.ts`.
- `tests/application-neutron-topology.test.ts` still passes without edits
  that widen its allowlists.
- CLI, daemon, and MCP still typecheck against the root barrel with no
  removed export they import.
- `pnpm verify` passes.
- U4 and U5 are still unstarted.
- No slice mixed a behavior change into a move.

## 15. What this PR does not do

- No production source move or edit.
- No ratchet test added yet (section 12 is the recommendation).
- No package publish, dependency install change, or hook change.
- No Neutron edit.
- No Undo U4 or Desktop Undo U5.
- No claim that P1 is finished.

## Appendix A. Per-file inventory

Effective and physical lines from `measureProductionSource`. Paths are
relative to `packages/application/src/`.

| File                                                                               | Effective | Physical |
| ---------------------------------------------------------------------------------- | --------: | -------: |
| `apply-extension-update.ts`                                                        |       232 |      246 |
| `approved-apply-baseline.ts`                                                       |       184 |      210 |
| `approved-apply-engine.ts`                                                         |       146 |      160 |
| `approved-apply-gate.ts`                                                           |        51 |       58 |
| `bounded-execution-apply.ts`                                                       |        58 |       59 |
| `bounded-execution-capability.ts`                                                  |        94 |      105 |
| `bounded-execution-fixtures.ts`                                                    |       109 |      118 |
| `bounded-execution-task.ts`                                                        |        83 |       84 |
| `bounded-execution-verify.ts`                                                      |        56 |       57 |
| `bounded-execution-w11.ts`                                                         |         8 |        8 |
| `bounded-execution-workspace-cli.ts`                                               |       111 |      115 |
| `bounded-execution-workspace-viewmodel.ts`                                         |        97 |      101 |
| `bounded-execution-workspace.ts`                                                   |       216 |      226 |
| `canonical-json.ts`                                                                |        36 |       39 |
| `cli-quality-entry.ts`                                                             |         1 |        1 |
| `continuous-loop-apply.ts`                                                         |        82 |       86 |
| `continuous-loop-compare.ts`                                                       |        52 |       55 |
| `continuous-loop-fixtures.ts`                                                      |        95 |      104 |
| `continuous-loop-w12.ts`                                                           |         6 |        6 |
| `continuous-loop-workspace-cli.ts`                                                 |        92 |       96 |
| `continuous-loop-workspace-viewmodel.ts`                                           |        75 |       79 |
| `continuous-loop-workspace.ts`                                                     |       141 |      146 |
| `curated-catalog-entry.ts`                                                         |         1 |        1 |
| `destination-collisions.ts`                                                        |        43 |       46 |
| `discover-and-apply-extension-update.ts`                                           |        32 |       35 |
| `document-concepts.ts`                                                             |        31 |       33 |
| `engineering-assessment.ts`                                                        |         1 |        1 |
| `engineering-assessment/assess-options.ts`                                         |        28 |       29 |
| `engineering-assessment/assess.ts`                                                 |       232 |      255 |
| `engineering-assessment/conversational.ts`                                         |        55 |       59 |
| `engineering-assessment/historical.ts`                                             |        43 |       50 |
| `engineering-assessment/incremental.ts`                                            |        58 |       70 |
| `engineering-assessment/index.ts`                                                  |         8 |        8 |
| `engineering-assessment/remediation.ts`                                            |        31 |       35 |
| `engineering-assessment/renderers.ts`                                              |        80 |       87 |
| `engineering-assessment/viewmodel.ts`                                              |       123 |      127 |
| `engineering-quality-entry.ts`                                                     |         1 |        1 |
| `engineering-quality.ts`                                                           |         1 |        1 |
| `engineering-quality/baseline-preview.ts`                                          |       124 |      132 |
| `engineering-quality/baseline-ratchet.ts`                                          |       174 |      182 |
| `engineering-quality/baseline-reduction.ts`                                        |        56 |       60 |
| `engineering-quality/check.ts`                                                     |        72 |       81 |
| `engineering-quality/checker-execution.ts`                                         |       107 |      114 |
| `engineering-quality/checker-report-common.ts`                                     |       186 |      198 |
| `engineering-quality/checker-report-ingestion.ts`                                  |       142 |      145 |
| `engineering-quality/classifier.ts`                                                |        80 |       93 |
| `engineering-quality/cli-checkers-graph.ts`                                        |       168 |      181 |
| `engineering-quality/cli-commands.ts`                                              |         3 |        3 |
| `engineering-quality/cli-quality-standards.ts`                                     |       232 |      248 |
| `engineering-quality/cli-specialized-packs-external.ts`                            |       205 |      217 |
| `engineering-quality/cli-specialized-packs.ts`                                     |       131 |      140 |
| `engineering-quality/clippy-report.ts`                                             |        63 |       64 |
| `engineering-quality/curated-catalog.ts`                                           |       240 |      256 |
| `engineering-quality/decomposition-options.ts`                                     |       210 |      219 |
| `engineering-quality/decomposition-planner.ts`                                     |       112 |      114 |
| `engineering-quality/eslint-report.ts`                                             |        76 |       77 |
| `engineering-quality/executable-marketplace-engine.ts`                             |       101 |      116 |
| `engineering-quality/external-pack-import.ts`                                      |       170 |      178 |
| `engineering-quality/first-party-specialized-pack-runtime.ts`                      |         5 |        6 |
| `engineering-quality/graph-provider.ts`                                            |       214 |      241 |
| `engineering-quality/index.ts`                                                     |        39 |       39 |
| `engineering-quality/metrics.ts`                                                   |        29 |       35 |
| `engineering-quality/nx-graph.ts`                                                  |       170 |      190 |
| `engineering-quality/organization-catalog-engine.ts`                               |       132 |      145 |
| `engineering-quality/pack-resolution.ts`                                           |       234 |      244 |
| `engineering-quality/plan-diff.ts`                                                 |       127 |      131 |
| `engineering-quality/plan-growth.ts`                                               |       204 |      211 |
| `engineering-quality/pull-request-evidence.ts`                                     |        66 |       68 |
| `engineering-quality/remediation-engine.ts`                                        |       142 |      157 |
| `engineering-quality/sarif-report.ts`                                              |       120 |      121 |
| `engineering-quality/semver-range.ts`                                              |        60 |       64 |
| `engineering-quality/specialized-aliases-engine.ts`                                |        54 |       62 |
| `engineering-quality/specialized-disciplines-engine.ts`                            |       100 |      110 |
| `engineering-quality/specialized-pack-catalog-engine.ts`                           |       140 |      152 |
| `engineering-quality/specialized-pack-check-engine.ts`                             |       237 |      263 |
| `engineering-quality/specialized-pack-detection-engine.ts`                         |       204 |      229 |
| `engineering-quality/specialized-pack-external-apply-plan.ts`                      |       167 |      177 |
| `engineering-quality/specialized-pack-external-apply.ts`                           |       218 |      235 |
| `engineering-quality/specialized-pack-external-health-findings.ts`                 |        45 |       50 |
| `engineering-quality/specialized-pack-external-health-local.ts`                    |       200 |      208 |
| `engineering-quality/specialized-pack-external-health-lock-fields.ts`              |       238 |      247 |
| `engineering-quality/specialized-pack-external-health-lock.ts`                     |        82 |       86 |
| `engineering-quality/specialized-pack-external-health.ts`                          |        75 |       79 |
| `engineering-quality/specialized-pack-external-lifecycle.ts`                       |       188 |      197 |
| `engineering-quality/specialized-pack-external-lock.ts`                            |       172 |      184 |
| `engineering-quality/specialized-pack-external-viewmodel.ts`                       |       145 |      153 |
| `engineering-quality/specialized-pack-manifest-engine.ts`                          |       124 |      133 |
| `engineering-quality/specialized-pack-viewmodel.ts`                                |       142 |      153 |
| `engineering-quality/surface.ts`                                                   |        78 |       83 |
| `engineering-quality/typescript-report.ts`                                         |        88 |       90 |
| `engineering-quality/viewmodel-renderers.ts`                                       |        57 |       63 |
| `engineering-quality/viewmodel.ts`                                                 |       144 |      161 |
| `existing-project-adoption-apply-gates.ts`                                         |       157 |      162 |
| `existing-project-adoption-apply-health.ts`                                        |        64 |       67 |
| `existing-project-adoption-apply.ts`                                               |       258 |      265 |
| `existing-project-adoption-approval.ts`                                            |       173 |      179 |
| `existing-project-adoption-decisions.ts`                                           |       197 |      203 |
| `existing-project-adoption-generation.ts`                                          |        38 |       41 |
| `existing-project-adoption-plan.ts`                                                |        83 |       86 |
| `existing-project-adoption-prepared-plan-digest.ts`                                |        79 |       85 |
| `existing-project-adoption-prepared-plan-revalidate.ts`                            |       140 |      143 |
| `existing-project-adoption-prepared-plan.ts`                                       |       239 |      246 |
| `existing-project-adoption-preview-identity.ts`                                    |        29 |       30 |
| `existing-project-adoption-project-fingerprint.ts`                                 |        58 |       61 |
| `existing-project-fixtures.ts`                                                     |       107 |      116 |
| `existing-project-w9.ts`                                                           |        17 |       17 |
| `existing-project-workspace-cli.ts`                                                |        74 |       79 |
| `existing-project-workspace-viewmodel.ts`                                          |        88 |       93 |
| `existing-project-workspace.ts`                                                    |       231 |      247 |
| `extension-health-evaluator.ts`                                                    |       106 |      112 |
| `extension-health-runtime.ts`                                                      |       199 |      206 |
| `extension-health.ts`                                                              |       155 |      163 |
| `extension-lock-path.ts`                                                           |        86 |       91 |
| `extension-removal-files.ts`                                                       |       140 |      148 |
| `extension-sandbox.ts`                                                             |       127 |      139 |
| `extension-update-files.ts`                                                        |       161 |      173 |
| `external-skill-import.ts`                                                         |       122 |      135 |
| `feature-intent-create.ts`                                                         |        54 |       58 |
| `feature-intent-fixtures.ts`                                                       |       102 |      111 |
| `feature-intent-impact.ts`                                                         |        61 |       63 |
| `feature-intent-plan.ts`                                                           |        79 |       81 |
| `feature-intent-scope.ts`                                                          |       127 |      136 |
| `feature-intent-w10.ts`                                                            |         8 |        8 |
| `feature-intent-workspace-cli.ts`                                                  |        89 |       93 |
| `feature-intent-workspace-viewmodel.ts`                                            |       116 |      122 |
| `feature-intent-workspace.ts`                                                      |        68 |       71 |
| `foundation-blueprint-client-viewmodel.ts`                                         |       107 |      116 |
| `foundation-blueprint-store.ts`                                                    |        19 |       24 |
| `foundation-blueprint-viewmodel-renderers.ts`                                      |        54 |       59 |
| `foundation-blueprint.ts`                                                          |       292 |      314 |
| `foundation-cli.ts`                                                                |       233 |      254 |
| `foundation-client-viewmodel.ts`                                                   |       179 |      193 |
| `foundation-discovery-client-viewmodel.ts`                                         |        99 |      107 |
| `foundation-discovery-turn.ts`                                                     |       125 |      134 |
| `foundation-discovery-viewmodel-renderers.ts`                                      |        51 |       56 |
| `foundation-discovery.ts`                                                          |       171 |      187 |
| `foundation-fixtures.ts`                                                           |        85 |       94 |
| `foundation-flow.ts`                                                               |        11 |       11 |
| `foundation-readiness.ts`                                                          |       191 |      206 |
| `foundation-scaffold-apply-revalidation.ts`                                        |       172 |      186 |
| `foundation-scaffold-apply-store.ts`                                               |        22 |       27 |
| `foundation-scaffold-apply.ts`                                                     |       118 |      129 |
| `foundation-scaffold-cli.ts`                                                       |       107 |      111 |
| `foundation-scaffold-client-viewmodel.ts`                                          |       178 |      191 |
| `foundation-scaffold-store.ts`                                                     |        29 |       35 |
| `foundation-scaffold-viewmodel-renderers.ts`                                       |       103 |      108 |
| `foundation-scaffold-workspace-viewmodel.ts`                                       |        55 |       64 |
| `foundation-scaffold.ts`                                                           |       230 |      243 |
| `foundation-viewmodel-renderers.ts`                                                |        52 |       57 |
| `foundation-viewmodel.ts`                                                          |       138 |      147 |
| `foundation-w2.ts`                                                                 |         6 |        6 |
| `foundation-w3.ts`                                                                 |         6 |        6 |
| `foundation-w4.ts`                                                                 |         4 |        4 |
| `foundation-w6.ts`                                                                 |         5 |        5 |
| `foundation-w7.ts`                                                                 |         3 |        3 |
| `foundation-w8.ts`                                                                 |         1 |        1 |
| `foundation-workshop-defaults.ts`                                                  |       160 |      165 |
| `foundation-workshop-store.ts`                                                     |        48 |       56 |
| `foundation-workshop.ts`                                                           |       245 |      266 |
| `generated-file-sync-declared.ts`                                                  |       302 |      317 |
| `generated-metadata-compare.ts`                                                    |       102 |      108 |
| `graph-provider-entry.ts`                                                          |         1 |        1 |
| `graphify-adapter.ts`                                                              |       164 |      178 |
| `harness-adoption-gate.ts`                                                         |        56 |       64 |
| `harness-agent-fake.ts`                                                            |        43 |       45 |
| `harness-agent-result.ts`                                                          |       135 |      142 |
| `harness-agent.ts`                                                                 |       139 |      145 |
| `harness-benchmark-fixtures.ts`                                                    |       111 |      122 |
| `harness-benchmark-sample.ts`                                                      |       192 |      211 |
| `harness-benchmark.ts`                                                             |       166 |      192 |
| `harness-comparison.ts`                                                            |        37 |       43 |
| `harness-runner.ts`                                                                |       196 |      213 |
| `harness-sandbox.ts`                                                               |       197 |      215 |
| `harness-scenarios.ts`                                                             |       129 |      139 |
| `harness-state.ts`                                                                 |       175 |      196 |
| `harness-surfaces.ts`                                                              |        48 |       51 |
| `harness-voting-metrics.ts`                                                        |        90 |       95 |
| `harness-voting.ts`                                                                |       184 |      195 |
| `harness.ts`                                                                       |        11 |       11 |
| `inception-actions.ts`                                                             |        72 |       82 |
| `inception-approval.ts`                                                            |        95 |      111 |
| `inception-blueprint.ts`                                                           |       108 |      125 |
| `inception-cli.ts`                                                                 |       128 |      142 |
| `inception-client-viewmodel.ts`                                                    |       137 |      148 |
| `inception-discovery.ts`                                                           |       106 |      121 |
| `inception-fixtures.ts`                                                            |        85 |       94 |
| `inception-flow.ts`                                                                |       201 |      227 |
| `inception-package-name.ts`                                                        |        26 |       30 |
| `inception-scaffold-apply.ts`                                                      |        98 |      115 |
| `inception-scaffold-planner.ts`                                                    |       154 |      165 |
| `inception-session-store.ts`                                                       |        48 |       56 |
| `inception-templates.ts`                                                           |        94 |      109 |
| `inception-viewmodel-renderers.ts`                                                 |        41 |       45 |
| `inception-viewmodel.ts`                                                           |       106 |      113 |
| `inception-w1.ts`                                                                  |         6 |        6 |
| `inception-workspace-scaffold-files.ts`                                            |       269 |      276 |
| `inception-workspace-scaffold-validation.ts`                                       |        51 |       59 |
| `inception.ts`                                                                     |       279 |      309 |
| `index.ts`                                                                         |      6746 |     7131 |
| `inspect-extension-manifest.ts`                                                    |        27 |       32 |
| `instruction-file-taxonomy.ts`                                                     |        52 |       58 |
| `knowledge-provider.ts`                                                            |        68 |       73 |
| `model-adapter.ts`                                                                 |        83 |       93 |
| `neutron/context/neutron-context-assembly.ts`                                      |       150 |      158 |
| `neutron/context/neutron-context-budget.ts`                                        |       103 |      112 |
| `neutron/context/neutron-context-collectors.ts`                                    |       211 |      229 |
| `neutron/context/neutron-context-secret-paths.ts`                                  |        35 |       38 |
| `neutron/context/neutron-context-state-collectors.ts`                              |       227 |      243 |
| `neutron/context/neutron-context-state-excerpts.ts`                                |        62 |       68 |
| `neutron/context/neutron-n2-context-hook.ts`                                       |       102 |      107 |
| `neutron/context/neutron-n3-prompt-context.ts`                                     |       106 |      116 |
| `neutron/graph/neutron-graph-mutation-attach.ts`                                   |        71 |       74 |
| `neutron/graph/neutron-graph-mutation-collect.ts`                                  |       138 |      145 |
| `neutron/graph/neutron-graph-mutation-identity.ts`                                 |        56 |       60 |
| `neutron/graph/neutron-graph-mutation-materialize.ts`                              |       133 |      136 |
| `neutron/graph/neutron-graph-projection.ts`                                        |       201 |      214 |
| `neutron/mutation/apply/neutron-graph-mutation-apply.ts`                           |       102 |      108 |
| `neutron/mutation/apply/neutron-graph-mutation-evidence.ts`                        |        81 |       84 |
| `neutron/mutation/apply/neutron-mutation-apply-after-claim.ts`                     |       197 |      203 |
| `neutron/mutation/apply/neutron-mutation-apply-codes.ts`                           |        49 |       51 |
| `neutron/mutation/apply/neutron-mutation-apply-durable-fs.ts`                      |        64 |       71 |
| `neutron/mutation/apply/neutron-mutation-apply-durable-lock.ts`                    |       120 |      128 |
| `neutron/mutation/apply/neutron-mutation-apply-durable-record.ts`                  |        81 |       88 |
| `neutron/mutation/apply/neutron-mutation-apply-durable-store.ts`                   |       105 |      109 |
| `neutron/mutation/apply/neutron-mutation-apply-execute.ts`                         |       164 |      172 |
| `neutron/mutation/apply/neutron-mutation-apply-lock.ts`                            |        40 |       46 |
| `neutron/mutation/apply/neutron-mutation-apply-parse.ts`                           |        70 |       73 |
| `neutron/mutation/apply/neutron-mutation-apply-persist.ts`                         |       165 |      175 |
| `neutron/mutation/apply/neutron-mutation-apply-result.ts`                          |        66 |       69 |
| `neutron/mutation/apply/neutron-mutation-apply-run.ts`                             |       166 |      171 |
| `neutron/mutation/apply/neutron-mutation-apply-store.ts`                           |       183 |      204 |
| `neutron/mutation/apply/neutron-mutation-apply-types.ts`                           |        37 |       39 |
| `neutron/mutation/apply/neutron-mutation-apply-validate.ts`                        |       254 |      264 |
| `neutron/mutation/apply/neutron-mutation-apply-verify.ts`                          |       250 |      256 |
| `neutron/mutation/apply/neutron-mutation-apply.ts`                                 |       129 |      136 |
| `neutron/mutation/apply/neutron-mutation-authorization.ts`                         |        67 |       72 |
| `neutron/mutation/apply/neutron-mutation-containment.ts`                           |        85 |       92 |
| `neutron/mutation/apply/neutron-mutation-diagnostics.ts`                           |        45 |       49 |
| `neutron/mutation/apply/neutron-mutation-lock.ts`                                  |        13 |       18 |
| `neutron/mutation/apply/neutron-mutation-preflight-parse.ts`                       |        82 |       89 |
| `neutron/mutation/apply/neutron-mutation-preflight.ts`                             |       222 |      235 |
| `neutron/mutation/apply/neutron-mutation-replay.ts`                                |        16 |       22 |
| `neutron/mutation/approval/neutron-mutation-approval-construct.ts`                 |        95 |      100 |
| `neutron/mutation/approval/neutron-mutation-approval-eligibility.ts`               |       193 |      208 |
| `neutron/mutation/approval/neutron-mutation-approval-issue-types.ts`               |        72 |       82 |
| `neutron/mutation/approval/neutron-mutation-approval-issue.ts`                     |        72 |       83 |
| `neutron/mutation/approval/neutron-mutation-approve-apply-public.ts`               |        93 |       99 |
| `neutron/mutation/approval/neutron-mutation-approve-apply.ts`                      |        92 |       99 |
| `neutron/mutation/proposal/neutron-mutation-bindings.ts`                           |       170 |      182 |
| `neutron/mutation/proposal/neutron-mutation-proposal-capability.ts`                |        33 |       37 |
| `neutron/mutation/review/neutron-graph-mutation-current.ts`                        |        26 |       29 |
| `neutron/mutation/review/neutron-graph-mutation-store.ts`                          |        42 |       45 |
| `neutron/mutation/review/neutron-mutation-review-bind.ts`                          |        50 |       53 |
| `neutron/mutation/review/neutron-mutation-review-current.ts`                       |        21 |       22 |
| `neutron/mutation/review/neutron-mutation-review-files.ts`                         |       154 |      159 |
| `neutron/mutation/review/neutron-mutation-review-leak.ts`                          |        20 |       22 |
| `neutron/mutation/review/neutron-mutation-review-payload.ts`                       |       116 |      128 |
| `neutron/mutation/review/neutron-mutation-review-project.ts`                       |       187 |      193 |
| `neutron/mutation/review/neutron-mutation-review-result.ts`                        |        27 |       29 |
| `neutron/mutation/status/neutron-mutation-status-index.ts`                         |       250 |      271 |
| `neutron/mutation/status/neutron-mutation-status-link.ts`                          |        69 |       72 |
| `neutron/mutation/status/neutron-mutation-status-public.ts`                        |        70 |       76 |
| `neutron/mutation/status/neutron-mutation-status-read.ts`                          |        90 |      100 |
| `neutron/mutation/undo/neutron-mutation-undo-approval.ts`                          |       134 |      148 |
| `neutron/mutation/undo/neutron-mutation-undo-commit.ts`                            |       157 |      163 |
| `neutron/mutation/undo/neutron-mutation-undo-current.ts`                           |        70 |       78 |
| `neutron/mutation/undo/neutron-mutation-undo-eligibility.ts`                       |       164 |      180 |
| `neutron/mutation/undo/neutron-mutation-undo-execute.ts`                           |       130 |      144 |
| `neutron/mutation/undo/neutron-mutation-undo-finish.ts`                            |       202 |      210 |
| `neutron/mutation/undo/neutron-mutation-undo-locate.ts`                            |        69 |       72 |
| `neutron/mutation/undo/neutron-mutation-undo-plan.ts`                              |       187 |      201 |
| `neutron/mutation/undo/neutron-mutation-undo-preflight.ts`                         |       269 |      289 |
| `neutron/mutation/undo/neutron-mutation-undo-preview.ts`                           |        83 |       86 |
| `neutron/mutation/undo/neutron-mutation-undo-public.ts`                            |       116 |      122 |
| `neutron/mutation/undo/neutron-mutation-undo-record.ts`                            |       180 |      200 |
| `neutron/mutation/undo/neutron-mutation-undo-run.ts`                               |       181 |      201 |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-apply.ts`                    |       128 |      136 |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-capture.ts`                  |       210 |      224 |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-files.ts`                    |       135 |      140 |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-manifest.ts`                 |       270 |      302 |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-store.ts`                    |       233 |      253 |
| `neutron/mutation/undo/neutron-mutation-undo-snapshot-validate.ts`                 |       210 |      224 |
| `neutron/mutation/undo/neutron-mutation-undo-store.ts`                             |       172 |      184 |
| `neutron/mutation/verification/neutron-mutation-verification-build.ts`             |       161 |      170 |
| `neutron/mutation/verification/neutron-mutation-verification-bytes.ts`             |        48 |       50 |
| `neutron/mutation/verification/neutron-mutation-verification-hidden.ts`            |        33 |       36 |
| `neutron/mutation/verification/neutron-mutation-verification-paths.ts`             |        65 |       68 |
| `neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts` |        19 |       28 |
| `neutron/mutation/verification/neutron-mutation-verification-retry-run.ts`         |       219 |      241 |
| `neutron/mutation/verification/neutron-mutation-verification-retry.ts`             |        42 |       44 |
| `neutron/mutation/verification/neutron-mutation-verification-rollback.ts`          |        36 |       37 |
| `neutron/mutation/verification/neutron-mutation-verification-state.ts`             |        47 |       49 |
| `neutron/mutation/verification/neutron-mutation-verification.ts`                   |       113 |      117 |
| `neutron/neutron-graph-mutation.ts`                                                |        56 |       56 |
| `neutron/neutron-n2-loop.ts`                                                       |       251 |      261 |
| `neutron/neutron-runtime-contracts.ts`                                             |        47 |       50 |
| `neutron/neutron-scheduler.ts`                                                     |       182 |      182 |
| `neutron/neutron-session-fingerprint.ts`                                           |         9 |       10 |
| `neutron/scheduler/neutron-scheduler-aggregate.ts`                                 |       175 |      182 |
| `neutron/scheduler/neutron-scheduler-attempt.ts`                                   |        90 |       95 |
| `neutron/scheduler/neutron-scheduler-batch.ts`                                     |       171 |      179 |
| `neutron/scheduler/neutron-scheduler-cancellation.ts`                              |        37 |       42 |
| `neutron/scheduler/neutron-scheduler-clock.ts`                                     |        32 |       35 |
| `neutron/scheduler/neutron-scheduler-errors.ts`                                    |        44 |       48 |
| `neutron/scheduler/neutron-scheduler-graph-result.ts`                              |       168 |      181 |
| `neutron/scheduler/neutron-scheduler-heartbeat.ts`                                 |        46 |       49 |
| `neutron/scheduler/neutron-scheduler-lease-store.ts`                               |       251 |      266 |
| `neutron/scheduler/neutron-scheduler-lease.ts`                                     |       140 |      154 |
| `neutron/scheduler/neutron-scheduler-provenance.ts`                                |       218 |      231 |
| `neutron/scheduler/neutron-scheduler-recovery.ts`                                  |       255 |      265 |
| `neutron/scheduler/neutron-scheduler-retry.ts`                                     |        85 |       93 |
| `neutron/scheduler/neutron-scheduler-run-attempt.ts`                               |       174 |      178 |
| `neutron/scheduler/neutron-scheduler-select.ts`                                    |       200 |      222 |
| `neutron/scheduler/neutron-scheduler-sort.ts`                                      |        10 |       11 |
| `neutron/scheduler/neutron-scheduler-stale.ts`                                     |       169 |      186 |
| `neutron/scheduler/neutron-scheduler-timeout.ts`                                   |        48 |       52 |
| `neutron/scheduler/neutron-scheduler-transitions.ts`                               |        44 |       49 |
| `neutron/scheduler/neutron-scheduler-validate.ts`                                  |       133 |      143 |
| `neutron/scheduler/neutron-scheduler-wave-types.ts`                                |        76 |       81 |
| `neutron/scheduler/node/neutron-node-capabilities.ts`                              |        82 |       89 |
| `neutron/scheduler/node/neutron-node-errors.ts`                                    |       121 |      131 |
| `neutron/scheduler/node/neutron-node-execution.ts`                                 |       174 |      185 |
| `neutron/scheduler/node/neutron-node-preflight.ts`                                 |       142 |      151 |
| `neutron/scheduler/node/neutron-node-result.ts`                                    |        80 |       86 |
| `neutron/scheduler/node/neutron-node-run.ts`                                       |       113 |      116 |
| `neutron/session/neutron-host-durable-state.ts`                                    |        23 |       25 |
| `neutron/session/neutron-session-activity.ts`                                      |       183 |      199 |
| `neutron/session/neutron-session-errors.ts`                                        |        22 |       26 |
| `neutron/session/neutron-session-graph-mutation.ts`                                |       155 |      160 |
| `neutron/session/neutron-session-graph.ts`                                         |       232 |      239 |
| `neutron/session/neutron-session-mutation-proposal.ts`                             |       118 |      127 |
| `neutron/session/neutron-session-review.ts`                                        |        77 |       81 |
| `neutron/session/neutron-session-runtime-approval.ts`                              |        97 |      108 |
| `neutron/session/neutron-session-runtime-approve-apply.ts`                         |       102 |      111 |
| `neutron/session/neutron-session-runtime-contract.ts`                              |        99 |      124 |
| `neutron/session/neutron-session-runtime-graph.ts`                                 |       176 |      181 |
| `neutron/session/neutron-session-runtime-helpers.ts`                               |        85 |       89 |
| `neutron/session/neutron-session-runtime-review.ts`                                |        52 |       53 |
| `neutron/session/neutron-session-runtime-status.ts`                                |        72 |       75 |
| `neutron/session/neutron-session-runtime-verification-retry.ts`                    |        37 |       38 |
| `neutron/session/neutron-session-runtime.ts`                                       |       278 |      297 |
| `neutron/session/neutron-session-turn.ts`                                          |       197 |      201 |
| `neutron/tools/neutron-tool-authorization.ts`                                      |       257 |      268 |
| `neutron/tools/neutron-tool-definitions-governance.ts`                             |       130 |      134 |
| `neutron/tools/neutron-tool-definitions-project.ts`                                |        71 |       75 |
| `neutron/tools/neutron-tool-dispatch.ts`                                           |       231 |      246 |
| `neutron/tools/neutron-tool-errors.ts`                                             |        74 |       80 |
| `neutron/tools/neutron-tool-input.ts`                                              |       180 |      191 |
| `neutron/tools/neutron-tool-registry.ts`                                           |        66 |       72 |
| `neutron/tools/neutron-tool-router.ts`                                             |       131 |      138 |
| `nx-graph-entry.ts`                                                                |         1 |        1 |
| `ollama-model-adapter.ts`                                                          |       203 |      214 |
| `preview-extension-removal.ts`                                                     |       124 |      129 |
| `project-profile-detection.ts`                                                     |       215 |      228 |
| `project-profile-evidence.ts`                                                      |        82 |       86 |
| `project-root-mutation-lock.ts`                                                    |        29 |       32 |
| `project-scan-exclusions.ts`                                                       |        71 |       76 |
| `propose-and-apply-extension-adoption.ts`                                          |       119 |      135 |
| `quality-viewmodel-entry.ts`                                                       |         2 |        2 |
| `remove-extension.ts`                                                              |       185 |      193 |
| `resolve-project-doctor-init.ts`                                                   |       101 |      109 |
| `skill-markdown.ts`                                                                |        18 |       32 |
| `task-routing.ts`                                                                  |       127 |      131 |

## Appendix B. Measurement command notes

Recompute lines with `measureProductionSource` from
`scripts/production-file-metrics.mjs`. Recompute cycles by resolving static
relative imports to `.ts` files and running a strong-component search. The
five components in section 5 are the expected result on
`f0b19c885d2aa95b041a4582e5218d2f3539f525`.
