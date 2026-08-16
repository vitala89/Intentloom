# Intentloom Project State

Last verified: 2026-08-16

This file records the durable current state of the project. It is not a
chronological log. Session history and handoff details belong in
`DUTY_WATCH.md`.

## Product identity

Intentloom is an independent, open-source, provider-neutral infrastructure
framework for reliable agentic engineering workflows. Applye is a separate
product consumer and is not part of Intentloom.

## Repository model

The selected direction is one public monorepo. The CLI, daemon, protocol, SDK,
MCP support, schemas, adapters, validator, memory contracts, security contracts,
and future official Desktop application are intended to evolve in the same
public repository unless a documented legal, operational, or lifecycle boundary
later justifies separation.

## Current phase

`v0.5.0-beta.1` is released through Git tag and npm `next`. The `v0.6.0-beta.1`
product milestone (Tauri 2 read-only Desktop application, WCAG 2.x a11y,
cancellation, Command Palette, Settings & Diagnostics, TUI parity, and
three-platform SEA sidecar CI verification) has completed implementation, testing,
and readiness auditing (`docs/desktop/V0_6_READINESS_AUDIT.md`). The v1.0
compatibility phases 1–5 are merged into `main` and the Phase 5 release gate is
signed off.

`v1.0.0` is tagged in Git, has a
[GitHub release](https://github.com/vitala89/Intentloom/releases/tag/v1.0.0), and
was published to npm on 2026-07-30 under the `next` dist-tag.

The registry still serves `1.0.2` as the stable release under `latest`, while
`next` remains at `1.0.0`. Re-verified with `npm view intentloom` on
2026-08-16. That published tarball is commit `192fd05`, not current `main`.
See [`RELEASE_STATE.md`](docs/releases/RELEASE_STATE.md) for the authoritative
split between implemented-in-main and released-on-npm.

The publication path for future releases is `.github/workflows/release.yml`,
using npm trusted publishing so the artifact carries provenance. The `1.0.2`
publish completed successfully through this path. It is dispatch-only, refuses
any ref other than `main` or a `v*` tag, runs in the protected `npm-publish`
environment, defaults to a dry run, and now fails if an npm auth token is
present. The trusted publisher and required environment reviewer are
configured; the environment currently has no secrets or variables. The npm
package-level **disallow tokens** setting still requires an authenticated
package-owner action and is not verified in this environment.

`1.0.0` itself was published manually before that workflow existed, so it carries
no provenance attestation and cannot gain one: npm does not allow a published
version to be replaced. A local build was verified to reproduce the published
tarball byte for byte, which establishes reproducibility but not provenance.

The project must avoid premature structural migration. New applications,
packages, and repository boundaries are introduced only when roadmap triggers
and real consumers justify them.

## Current implementation baseline

- Public package and CLI foundations exist from the earlier AIF stage.
- The prepared historical release line includes `0.1.0-alpha.1`.
- Core release-readiness work previously covered packaged CLI runtime,
  filesystem safety, ownership and synchronization, rollback handling, schema
  validation, adoption and doctor fixtures, adapters, cross-platform
  compatibility, and explicit-path read-only verification.
- The repository carries architecture and roadmap documents for project
  connection, evidence, MCP, interactive surfaces, Agent Workspace, Neutron,
  persistent memory, security analysis, engineering process intelligence,
  public monorepo evolution, controlled agent learning, and portable Duty Watch adoption.
- Engineering Quality Packs phases Q1–Q4 are implemented, verified, and merged
  into `main` through PR #257 (`1271ee1`):
  versioned quality contracts, deterministic artifact metrics, reviewed
  legacy-baseline preview and approval, non-growing ratchet comparison,
  stale/expired review flags, baseline reduction, task and pull-request
  integration with projected-growth evidence, affected-path policy resolution,
  acceptance criteria, final diff comparison, and PR evidence rendering. Phase
  Q5 is implemented and merged into `main` through PR #258 (`5fb3749`):
  read-only responsibility analysis, dependency and public API evidence,
  whole-responsibility decomposition options, migration steps, test
  preservation evidence, and the Windows Node 22 preparation-hook timeout
  remediation. Phase Q6 is merged into `main` through PR #259 (`f18d3d4`):
  canonical pack contracts, untrusted-data validation, pure deterministic
  resolution, and data-only first-party pack catalog are complete. Phase Q7
  Checker Report Ingestion is merged through PR #260 (`991a44b`): its
  implementation plan, protocol contracts, validator-boundary checks, pure
  ESLint/TypeScript/SARIF/Clippy normalization, bounded redaction,
  deterministic deduplication, and focused tests are complete. Phase Q8
  Bounded Checker Execution is merged through PR #261 (`330bcd4`): its
  project-pinned ESLint execution slice has explicit command, environment,
  timeout, cancellation, output, and truthful-failure controls. Phase Q9
  External Pack Import is merged through PR #262 (`52dd28c`): its
  caller-supplied data-only import, exact source pinning and digest
  verification, provenance/license/compatibility validation, deterministic
  normalization, and separate review/pin/activation decisions are complete.
  Phase Q10 Curated Catalog is merged through PR #263 (`b1d32d8`): its
  implementation plan, protocol schemas, validator boundary, pure application operations
  (search, entry inspection, SHA-256 quarantine digest verification, pack lock comparison,
  update diffing, revocation fail-closed enforcement), first-party catalog metadata, and
  test suite are complete. Phase Q11 Graph-Provider Contracts is merged through PR #264 (`9f8575d`):
  its implementation plan, versioned graph snapshot contracts, validator boundaries, TypeScript/workspace
  and Nx graph providers, architecture rule validation across provider fixtures, affected scope
  resolution, and test suite are complete. Phase Q12 Nx Graph and Boundary Integration is implemented on branch
  `feat/engineering-quality-q12-nx-graph-boundary-integration`: its implementation plan,
  versioned Nx metadata and boundary schemas, validator boundaries, read-only Nx workspace detection,
  multi-mode snapshot acquisition, Nx module boundary tag enforcement with dependency cause tracking,
  transitive affected project resolution, and test suite are complete and merged through PR #265 (`852ddf7`). Phase Q13 CLI and JSON Surface is merged through PR #266 (`b7e2e35`): its quality/standards/packs/checkers/graph CLI command handlers, deterministic `--json` machine-readable output, stable exit codes (0/1), non-mutation invariant, and test suite `tests/cli-engineering-quality.test.ts` (14 tests) are complete. Phase Q14 Desktop and TUI is merged through PR #267 (`e94b23b`): its viewmodels, accessible renderers, approval previews, CLI vs Viewmodel state equivalence validation, and test suite `tests/desktop-tui-engineering-quality.test.ts` (8 tests) are complete. Phase Q15 Daemon and MCP is merged into `main` through PR #274 (`96e4a47`): versioned read-only JSON-RPC contracts, daemon capability/handler dispatch, four configured-root MCP tools, shared graph snapshot loading, CLI/application parity fixtures, and root/argument boundary tests are complete. Phases Q16 (Assisted Remediation), Q17 (Organization Catalogs), and Q18 (Executable Marketplace Decision) are fully implemented, verified, and merged into `main` through PR #275 (`88ac3a2`): versioned remediation contracts (`QUALITY_REMEDIATION_PLAN_SCHEMA_URN`), organization catalog contracts (`QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN`), executable marketplace decision contracts (`QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN`), strict validator runtime boundaries, pure application engines (`prepareQualityRemediationPlan`, `registerOrganizationTrustRoot`, `evaluateExecutableMarketplacePolicy`), fail-closed security defaults, human approval token enforcement (`approved:<digest>`), and complete contract test suites (173 test files, 1,263 tests passing 100%). Specialized Engineering Packs Phase S1 (Canonical Disciplines and Role Composition) is merged into `main` through PR #277 (`4f1a7b5`), and Phase S2 (Specialized Pack Manifests and Trust States) is merged into `main` through PR #278 (`5e50117`). Phase S3 Discipline Aliases and Non-Duplicating Rule Resolution is merged into `main` through PR #280 (`d2008f3`): versioned alias contracts (`QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN`), strict validator runtime boundary, pure application engine (`registerDisciplineAlias`, `resolveDisciplineFromAlias`), non-duplicating rule resolution, and contract test suite `tests/engineering-quality-specialized-aliases.test.ts` (3 tests) are complete. Phase S4 Read-Only Detection and Compatibility Resolution is merged into `main` through PR #280 (`92596e2`): versioned detection rule/result/resolution contracts, strict validator runtime boundary, pure application engine (`registerSpecializedPackDetectionRule`, `detectSpecializedPacks`, `resolveSpecializedPackDetection`), bounded caller-supplied path scanning, confirmation-required candidates, and contract test suite `tests/engineering-quality-specialized-detection.test.ts` (4 tests) are complete. Phase S5 First-Party Specialized Pack Catalog and Fixtures is merged into `main` through PR #282 (`61a3d82`): first-party catalog entries in `catalog/packs/specialized-engineering/` (desktop Tauri, embedded firmware, cloud Terraform, game development), fixture profiles in `tests/fixtures/specialized-packs/project-path-profiles.json`, pure application operations `validateFirstPartySpecializedPackCatalog` and `resolveFirstPartySpecializedPackDetection`, and contract test suite `tests/engineering-quality-specialized-first-party-packs.test.ts` (5 tests) are complete. Phase S6 Client Surfaces is merged into `main` through PR #283 (`58c2746`): shared viewmodels/runtime bridge, CLI command `runSpecializedPacksCliCommand`, daemon RPC methods `intentloom.specialized-packs.catalog.v1` and `intentloom.specialized-packs.detect.v1`, MCP tools `intentloom_specialized_packs_catalog` and `intentloom_specialized_packs_detect`, and contract tests `tests/cli-specialized-packs.test.ts`, `tests/daemon-specialized-packs.test.ts`, `tests/mcp-specialized-packs.test.ts`, plus Desktop/TUI parity cases are complete. Phase S7 Deterministic Checks is merged into `main` through PR #284 (`cd4e6b8`): versioned check definition/result/report contracts (`QUALITY_SPECIALIZED_PACK_CHECK_*_SCHEMA_URN`), strict validator runtime boundary, pure application engine (`registerSpecializedPackCheckDefinition`, `runSpecializedPackDeterministicChecks`, `resolveFirstPartySpecializedPackChecks`), first-party check definitions for all four specialized packs, and contract test suite `tests/engineering-quality-specialized-deterministic-checks.test.ts` (7 tests) are complete. S7 client surfaces are implemented and verified as a separate read-only increment: CLI/application `checks`, daemon `intentloom.specialized-packs.checks.v1`, MCP `intentloom_specialized_packs_checks`, shared viewmodel, and Desktop/TUI parity/boundary tests are complete.

- Duty Watch governance contracts (Phase 1), proposal CLI `intentloom adopt --plan` (Phase 2), transactional apply & rollback engine `intentloom adopt --apply` (Phase 3), pack update 3-way migration `intentloom update` (Phase 4), conformance & security profiles `intentloom conformance` (Phase 5), provider synchronization `intentloom sync` / `intentloom diff` (Phase 6), Memory & Security Candidates M1–M4, S1–S5, Daemon Protocol Contracts for Second Clients, Read-Only Interactive Surfaces TUI, Agent Workspace Discuss & Inspect Modes, Agent Workspace Plan, Review & Apply Modes, Neutron Autonomous Subagent Orchestration & Local Workspace Sync Engine, and Evidence-Backed Engineering Assessments roadmap (Phases A1–A22: Envelope Protocol, Evidence References, Finding Projections, Architecture Slice, Technical Debt Map, Canonical Report Model, Application Operation, Quality Packs, Checker Adapters, Graph Providers, Performance Baseline Evidence, Monorepo/CI Assessment, AI Engineering Controls, Target-State Remediation Roadmap, Agent Workspace Conversational Explanation, Desktop/UI ViewModel Adapter, Historical Comparison, Incremental Assessment, Remediation Planning Integration, Report Renderers, and Public Contract Stabilization) are merged into `main`.
- v1.0 compatibility phases 1–4 are merged into `main`: ADR-0043 and contract tests, the v1 migration/protocol guide and upgrade tests, client-surface equivalence evidence and tests, and the security/supply-chain audit and tests.
- The bounded provider-evidence cache increment is merged into `main` through
  PR #177 (`112b4a4`). It persists only normalized redacted `available` results,
  enforces a maximum 15-minute TTL, and exposes provider/project-scoped purge;
  the `intentloom clean --cache` CLI adapter is merged through PR #182
  (`1904908`), and credential resolution now
  supports explicit invocation tokens and the documented GitHub/GitLab
  environment aliases. Cleared inputs are treated as locally revoked; remote
  provider token deletion and rotation remain out of scope.
- The merged read-only hardening increment adds deterministic adversarial
  external-MCP payload coverage and a CLI/MCP structured-result equivalence
  contract for release analysis. PR #188 adds the live-provider adversarial
  corpus as test-and-fixture coverage only. The current follow-up closes the
  existing CLI `evidence fetch` parser gap and verifies endpoint-wide pagination,
  rate-limit halting, and CLI/provider JSON equivalence without adding provider,
  network, authority, or mutation capability.
- `apps/desktop` carries an imported design system in `src/design/`: a token
  layer, six component groups, vendored Lucide glyphs, self-hosted fonts, and the
  vector logo masters (ADR-0044). Five design components (`Card`, `Tabs`,
  `Modal`, `EmptyState`, `StatusChip`) are now integrated across all seven
  Desktop view modules. Icons and fonts are local, so the zero-external-network
  invariant still holds and is now also true offline.
- The Desktop Extension Ecosystem roadmap's D2 through D5 declarative and
  sandboxed contribution surfaces are merged into `main` through PR #161
  (`e71a239`, 2026-08-01): Extension Host API and contribution types
  (ADR-0045), theme contribution and design-token bridge (ADR-0046), view
  sandbox and frame protocol (ADR-0047), command palette contribution and
  action registry (ADR-0048), provider UI and extension settings integration
  (ADR-0049), and renderer contribution and panel placement (ADR-0050). No
  arbitrary third-party code execution or project mutation is enabled by this
  work; each ADR documents its trust-level boundary. The originating
  `feature/post-v1-enhancements` branch predates the squash-merge and still
  exists with its unsquashed commit history; its content is a subset of what
  is now on `main` and it carries no unmerged work.
- Commit and quality governance is now versioned in `.githooks/`,
  `scripts/validate-*.mjs`, and `.github/workflows/governance.yml`. Hooks are
  explicitly enabled per checkout with `pnpm hooks:install`; CI independently
  validates commit structure, attribution, whitespace, and production-file
  budgets.
- `pnpm lint` now runs `oxlint` (config in `.oxlintrc.json`) instead of
  duplicating `pnpm typecheck`. `typescript-eslint` cannot parse this
  repository's TypeScript 7 toolchain yet (upstream tracking issue), so
  `oxlint` was adopted instead of a non-functional ESLint setup; `pnpm lint`
  is wired into `pnpm verify` and the Compatibility CI job. `correctness` and
  `suspicious` categories are errors; `react/react-in-jsx-scope` is off
  (the Desktop app uses the automatic JSX runtime); `unicorn/no-array-sort`,
  `unicorn/no-array-reverse`, and `vitest/require-mock-type-parameters` are
  warnings tracking pre-existing debt rather than new violations.
- Branch governance now requires new dedicated branches to use a change-type
  prefix such as `feat/`, `fix/`, `refactor/`, or `docs/`, with a short
  kebab-case description; actor, tool, model, and harness prefixes such as
  `codex/` are prohibited for new branches. Existing historical refs are not
  renamed by this documentation rule.
- The canonical catalog now includes project-aware task routing, focused feature
  discovery, fresh completion verification, and external-skill/plugin review.
  ADR-0051 keeps these as first-party provider-neutral procedures informed by
  pinned external method reviews; no external plugin, hook, telemetry, updater,
  or runtime dependency is bundled. Structured routing and managed external-skill
  import contracts are merged through PR #213; optional provider bridges remain
  deferred.
- ADR-0052 accepts a first-party provider-neutral Agentic Evaluation and
  Execution Harness architecture and phased plan. Phases H1-H9 and curated-
  skill phases C4-C6 are merged into `main` through PR #213 (`a173931`), PR
  #214 (`8a1ce50`), and PR #216 (`cec3f45`). The increment includes read-only
  CLI and MCP inspect/replay consumers, structured task routing, managed
  external-skill import normalization, fail-closed adoption enforcement, and
  deterministic fixture-backed evidence for replay, purge, and transactional
  rollback. PR #233 merged the remaining deterministic rollback evidence and
  the Windows Node 22 compatibility timeout correction; PR #234 merged the
  separate provider-neutral performance-benchmark specification; PR #235
  merged the post-merge reconciliation and platform-specific Node 22 timeout
  corrections; PR #237 merged the focused Windows Node 22 package-readiness
  timeout correction; PR #238 merged the documentation-only reconciliation
  of the post-merge state. Real
  provider/model/CLI-agent adapters, certification claims, benchmark runner,
  and effectful mutation remain deferred.

These statements must be revalidated against code, tags, CI, and Git history
before a new release or implementation milestone is declared complete.

## Recently fixed

- Selecting a project in the Desktop app deadlocked the whole window (main
  event-loop thread blocked on a native dialog call that itself needed that
  thread's event loop). Fixed by dispatching all six Tauri commands through
  `tauri::async_runtime::spawn_blocking`; merged in PR #161 (`e71a239`).
- The GitHub Pages "Documentation" workflow failed because Pages was never
  enabled for the repository, and once enabled, failed again on an invalid
  `pnpm/action-setup` pin (PR #162, `101026d`). Both are fixed;
  `https://vitala89.github.io/Intentloom/` serves the built VitePress site
  (verified 2026-08-01, HTTP 200).
- 4 of 5 open Dependabot alerts (vite/esbuild/launch-editor, all transitively
  pulled in by vitepress) are fixed for real via a `pnpm.overrides` entry
  forcing the patched `vite@8.1.5`/`esbuild@0.28.1` already used elsewhere in
  the workspace, rather than another documented exception (PR #163,
  `32b22bc`). Alert #2 (`glib`, Rust/Tauri) remains under its existing
  approved exception, expiring 2026-10-29. Alert #2 is GHSA-wrw7-89jp-8q8g:
  `glib::VariantStrIter` unsoundness. Cargo confirms that `glib 0.20.0` cannot
  satisfy the current `gtk 0.18.2` constraint used by Tauri 2.11.5, so no
  safe point update is available; no direct `glib` or `VariantStrIter` use
  exists in the Desktop source.
- All 4 open CodeQL `js/polynomial-redos` alerts are fixed: 3 in
  `parseSkillProgressive`'s markdown section extraction, 1 in the validator's
  markdown-link reference scanner, both replaced with linear-time manual
  scanners (`extractMarkdownSection`, `findMarkdownLinkTargets`) instead of
  the lookahead/unbounded-backtracking regexes CodeQL flagged (PR #164,
  `72f0d71`). The validator fix took two attempts; see `DUTY_WATCH.md`,
  2026-08-01, for why the first one still wasn't linear.
- Project Inception phases I1-I10 are merged through PR #167 (`cc2bf3c`). The
  package-name sanitizer now uses deterministic character mapping and manual
  prefix/hyphen trimming, with no regex-based processing of the blueprint name.
  PR #167's CodeQL, dependency, governance, and cross-platform compatibility
  checks passed.
- Provider evidence cache retention/deletion hardening is merged through PR
  #177 (`112b4a4`). Cache records are versioned, redacted-only, bounded to a
  15-minute maximum TTL, and purgeable by provider/project without mutating
  project-owned files. The final PR checks passed across CodeQL, policy, and
  Ubuntu/macOS/Windows Node 22/24 matrices.

## Active focus

1. Engineering Workspace **W0–W12** are complete on current `origin/main` at
   `89b6c1d` (N2 PR #318; N1 PR #317; P1 PR #316; P0 PR #315). The
   implementation plan ends at W12. Do not invent a W13.
2. **P3 S8** is on `feat/specialized-packs-s8-external-lifecycle`: reviewed
   external specialized packs through the existing extension adoption
   preview, with pin/digest and human activation. No auto-install. Do not
   start P4, N3, C7, or Desktop model calls from this focus.
3. The next **published** version is **undecided**. Maintainer options, not a
   pick: stay unpublished on npm until an explicit publish brief; later `1.0.x`
   metadata/docs release; `1.1.0` (or another minor) after a real release-gate
   brief. Do not tag `v0.6.0-beta.1` as the next action.
4. Keep bottleneck inference, remote ingestion, model-based judgments, and any
   autonomous mutation behind separate approved specifications and threat review.

## Architectural invariants

- Platform first, interfaces second.
- Desktop depends on public platform contracts. Platform code never depends on
  Desktop.
- All interactive surfaces use shared application operations rather than
  duplicating domain logic.
- Evidence precedes mutation.
- Potentially destructive actions require explicit human approval.
- Local-first and provider-neutral behavior are defaults.
- No hidden telemetry, network calls, hooks, or dependency installation.
- Protocols and schemas have one canonical source of truth.
- Backward compatibility and safe migration are explicit concerns.

## Current blockers and unknowns

- Any expansion to bottleneck, performance, causal, actor, repository-reading, persisted, remote, or model-assisted analysis requires a new ADR, specification, and threat review.
- Current `origin/main` is `64b40bb` (PR #314 post-W12 plan). That SHA is
  not a published npm release.
- Phase E5 doctor diagnostics, Phase E6 safe revocation and removal, and
  Phase E7 knowledge-provider & adapter-pack boundaries are merged to `main`.
- npm reports `latest=1.0.2` and `next=1.0.0`, re-verified 2026-08-16.
- Workspace packages are synchronized to `1.0.2`; Git tag `v1.0.2` and GitHub
  Release `v1.0.2` point at the verified `192fd05` release commit. The stable
  `1.0.2` artifact carries trusted-publishing provenance; historical `1.0.0`
  carries none because it was published manually before the release workflow.
- Published `1.0.0` tarball registry shasum is
  `434fcb624ddb3706502a29ad96b27aee36df675c`, reproduced byte for byte from
  source on 2026-07-31; the preceding `0.5.0-beta.1` shasum was
  `58b2e27eb66789f57c1e91cec46aea710a6fc241`. The current Desktop branch
  restored its locked dependencies and passes the local build and full test
  suite.
- PR #91 did not land the Desktop/TUI roadmap intent on `main`; PR #95
  recovered the Desktop design and execution baseline from clean `main` and
  merged it as commit `7025051`.
- PR #94 is merged as commit `7402687`; the resulting v1 compatibility plan is
  now active, with phases 1–4 completed and Phase 5 remaining.
- The v1.0 readiness audit and support policy are drafted in
  `docs/releases/V1_0_READINESS_AUDIT.md` and
  `docs/releases/SUPPORT_POLICY_V1.md`. Maintainer approval, release-candidate
  verification, refreshed/accepted v1 dogfooding evidence, and a green
  dependency-review workflow run remain open. The equivalent PR dependency
  review control is now defined in `.github/workflows/dependency-review.yml`;
  its release-gate result must be retained before the stable gate can close.
- PR #105 is merged as `86a1aee`; its Dependency Review, Compatibility, and
  Desktop SEA Feasibility checks passed. Dependabot alert #1 for
  `fast-uri@3.1.3` is closed after the lockfile remediation to `3.1.4`.
- PR #106 is merged as `b8f1e31`; its documentation-only Compatibility checks
  passed and reconciled the post-merge Phase 5 state.
- PR #107 is merged as `88d6f6b`; its documentation-only Compatibility checks
  passed and recorded the GTK/WebKit compatibility assessment.
- PR #108 is merged as `542633a`; its documentation-only Compatibility checks
  passed and recorded the upstream availability evidence.
- PR #109 is merged as `d191205`; its documentation-only Compatibility checks
  passed and recorded the proposed glib exception.
- PR #110 is merged as `ae63b7a`; it records the release-candidate verification
  and the Windows Node 22 process-test timeout correction. The post-merge
  Compatibility run `30409035485` passed all six Ubuntu, macOS, and Windows
  Node 22/24 jobs on that `main` commit.
- PR #111 is merged as `c21939e`; it reconciles the project and release records
  with PR #110. The post-merge Compatibility run `30409627721` passed all six
  Ubuntu, macOS, and Windows Node 22/24 jobs on that `main` commit.
- PR #112 is merged as `5d1af7c`; it completes the release-state reconciliation
  after PR #111. The post-merge Compatibility run `30410395631` passed all six
  Ubuntu, macOS, and Windows Node 22/24 jobs on that `main` commit.
- PR #113 is merged as `a0443b5`; it completes the final Phase 5 state
  reconciliation. The post-merge Compatibility run `30411096968` passed all
  six Ubuntu, macOS, and Windows Node 22/24 jobs on that `main` commit.
- PR #114 is merged as `d3da25d`; it adds the v1.0 release-gate packet and
  reconciles the release records after PR #113. The post-merge Compatibility
  run `30411737284` passed all six Ubuntu, macOS, and Windows Node 22/24 jobs
  on that `main` commit.
- PR #115 is merged as `3ee661d`; it adds current read-only self-dogfooding
  evidence and records the remaining external dogfooding follow-up. The
  post-merge Compatibility run `30446567214` passed all six Ubuntu, macOS, and
  Windows Node 22/24 jobs on that `main` commit.
- PR #116 is merged as `46a278c`; it reconciles the post-merge dogfooding state
  and records the remaining Phase 5 decisions. The post-merge Compatibility run
  `30451241803` passed all six Ubuntu, macOS, and Windows Node 22/24 jobs on
  that `main` commit, with only the known Node.js 20 action deprecation
  annotations.
- PR #117 is merged as `c20c245`; it carries the candidate release-state
  reconciliation and the bounded Windows packed-doctor test timeout. The
  post-merge Compatibility run `30456140463` passed all six Ubuntu, macOS, and
  Windows Node 22/24 jobs on that `main` commit, with only the known Node.js 20
  action deprecation annotations. The timeout change is test-only; no runtime,
  package, or dependency behavior changed.
- PR #118 is merged as `ec869e1`; it carries the final documentation-only
  reconciliation of the post-merge candidate state. The post-merge
  Compatibility run `30458387847` passed all six Ubuntu, macOS, and Windows
  Node 22/24 jobs, with only the known Node.js 20 action deprecation
  annotations. No runtime, package, or dependency behavior changed.
- PR #119 is merged as `c49bf793`; it carries the post-merge documentation
  reconciliation. Its post-merge Compatibility run `30459836027` failed only
  on Windows Node 24 because `tests/adapter-packed-process.test.ts:96` hit the
  default 5-second Vitest timeout; the other five matrix jobs passed. A
  test-only timeout extension was merged by PR #120.
- PR #120 is merged as `d076c037`; it adds the bounded test-only timeout for
  the packed all-adapter generation test. Its post-merge Compatibility run
  `30462153444` passed all six Ubuntu, macOS, and Windows Node 22/24 jobs, with
  only the known Node.js 20 action deprecation annotations. No runtime,
  package, or dependency behavior changed.
- PR #121 is merged as `83cefd3`; it reconciles the Phase 5 records after PR
  #120 and records cleanup of branches belonging to merged PRs. Its post-merge
  Compatibility run `30463844868` passed all six Ubuntu, macOS, and Windows
  Node 22/24 jobs, with only the known Node.js 20 action deprecation
  annotations. No runtime, package, or dependency behavior changed.
- PR #122 is merged as `96ba437`; it reconciles the Phase 5 records after PR
  #121 and records the final branch inventory cleanup. Its post-merge
  Compatibility run `30484088638` passed all six Ubuntu, macOS, and Windows
  Node 22/24 jobs, with only the known Node.js 20 action deprecation
  annotations. No runtime, package, or dependency behavior changed.
- PR #123 is merged as `840989a`; it reconciles the Phase 5 records after PR
  #122. Its post-merge Compatibility run `30485311670` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #124 is merged as `484fcb4`; it reconciles the Phase 5 records after PR
  #123. Its post-merge Compatibility run `30486706654` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #125 is merged as `d750acf`; it reconciles the Phase 5 records after PR
  #124. Its post-merge Compatibility run `30489057541` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #126 is merged as `9667b88`; it reconciles the Phase 5 records after PR
  #125. Its post-merge Compatibility run `30491209504` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #127 is merged as `c47eb0f`; it reconciles the Phase 5 records after PR
  #126. Its post-merge Compatibility run `30492745164` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #128 is merged as `2c7d4a4`; it reconciles the Phase 5 records after PR
  #127. Its post-merge Compatibility run `30495322242` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #129 is merged as `802da40`; it reconciles the Phase 5 records after PR
  #128. Its post-merge Compatibility run `30496928912` passed all six Ubuntu,
  macOS, and Windows Node 22/24 jobs, with only the known Node.js 20 action
  deprecation annotations. No runtime, package, or dependency behavior
  changed.
- PR #130 is merged as `3257bdf`; it carries the Phase 5 reconciliation and a
  bounded Windows-aware timeout for the existing CLI schema process test. Its
  post-merge Compatibility run `30498583852` passed all six Ubuntu, macOS, and
  Windows Node 22/24 jobs, with only the known Node.js 20 action deprecation
  annotations. No product runtime, package, or dependency behavior changed.
- PR #131 is merged as `5dc9313`; it adds `.github/dependabot.yml` for the
  root npm/pnpm lockfile and Desktop Cargo lockfile, plus `.github/workflows/codeql.yml`
  for JavaScript/TypeScript and GitHub Actions.
- PR #132 (`getrandom`), PR #133 (`@types/node`), PR #134 (`vite`), and PR #135 (`prettier`)
  are merged via Dependabot.
- PR #136 is merged as `350ad1e`; it adds `.prettierignore` to exclude generated
  lockfiles (`pnpm-lock.yaml`, `Cargo.lock`) from Prettier formatting checks, resolving
  the Dependabot CI lockfile failure.
- The latest candidate head on `main` (`46d3a2e`) passed post-merge Compatibility run
  `30527543027` (6/6 jobs) and CodeQL run `30527542998` (both Actions and JS/TS analyses).
- Exact-candidate supplemental clean-room, explicit-path, minimal, TypeScript,
  and sanitized existing-project evidence is recorded under
  `docs/releases/dogfooding/`; it does not replace real-project acceptance or
  authorize the v1.0 release.
- Dependabot alert #2 remains open at medium severity for `glib@0.18.5` in
  `apps/desktop/src-tauri/Cargo.lock`; GitHub reports `0.20.0` as the first
  patched version. A read-only Cargo tree assessment confirms it is shared by
  the GTK 0.18.x/WebKit 2.0.2 stack through Tauri/Wry; a direct `glib 0.20`
  override would leave the vulnerable 0.18 branch and is not acceptable. A
  read-only crates.io check reports the current published Tauri 2.11.5, Wry
  0.55.1, and WebKitGTK 2.0.2 versions already in the lockfile, so no
  compatible upstream point upgrade is currently available. A separate
  coordinated stack migration or explicit maintainer exception is required
  before the stable release gate can close. The recommended near-term path is
  a time-bounded scoped exception because the repository has no direct use of
  the affected `VariantStrIter` API; maintainer approval is still pending. The
  local release-candidate verification on `d191205` passed frozen reinstall,
  typecheck, build, full tests, and packed CLI smoke; support-policy approval,
  dogfooding disposition, and final release approval remain open.
- PR #160 is pushed at head `5afedd2` with the CodeQL repair and governance
  enforcement changes. The prior head `abed6a1` had two high-severity
  polynomial-regex alerts in `packages/evidence-provider/src/live.ts`; the
  repair is `a2b680d`. Hosted CodeQL and Governance reruns remain to be
  inspected. The three legacy oversized-file growths are documented as exact,
  expiring exceptions in `docs/governance/quality-exceptions.json`.
- ADR-0042 is accepted. The macOS arm64 SEA feasibility run and local Tauri
  `.app`/`.dmg` package smoke passed, including embedded sidecar hash and
  catalog-resource verification. The repository history records the
  three-platform GitHub Actions feasibility run as green in `57ff1d9`, and
  `V0_6_READINESS_AUDIT.md` records the resulting readiness claim. A private
  `apps/desktop` Tauri/React/Vite shell scaffold now exists with Unix native
  lifecycle, token ownership, canonical project selection, bounded IPC, and a
  Tokio Windows named-pipe source path; remaining work is follow-up hardening,
  not the closed v0.6 packaging gate.
- The post-merge Compatibility run for `main` at `9667b88` passed all six
  Ubuntu, macOS, and Windows Node 22/24 jobs. The historical `c49bf793`
  Windows Node 24 timeout is remediated by the test-only change in PR #120;
  GitHub still emits a Node.js 20 deprecation annotation for the current
  action versions.
- The accepted UI framework, Tauri boundary, daemon lifecycle, token ownership,
  and self-contained packaged daemon strategy are recorded in ADR-0042. The
  System Designer handoff is approved, Phase 1 contracts are validated, and
  the native bridge is connected to the fixed daemon launch/attach boundary;
  the webview now renders validated daemon information, Inspect identity,
  Doctor findings, and ProjectDiff changes in connected read-only Overview,
  Inspect, Doctor, and Diff Review views. Timeline and cross-platform transport
  remain follow-up work.
- Inspect and Doctor have application, protocol, and daemon paths. The
  `intentloom.daemon.info.v1` discovery contract now reports enabled methods,
  read-only/mutating classification, bounded limits, daemon version, and exact
  protocol compatibility. Project Diff and root-bound local Timeline now have
  typed protocol/client/daemon paths over existing read-only application
  operations, including bounded Timeline inputs and stale-root- Application-level transport cancellation delivered: `desktopClient` call() races
  `invoke()` against an `AbortSignal`, matching PHASE1_CONTRACTS.md. A compact
  `.cancel-button` renders in the topbar during any loading operation (`isConnecting`,
  `inspectStatus`, `diffStatus`, `timelineStatus`), calling `cancelOperation()`.
- Command Palette (`⌘K` / `Ctrl+K`) & Settings View delivered: global keyboard shortcut
  opens an accessible filterable command modal (`CommandPaletteModal`) with instant
  search, arrow navigation, and enter execution for all 6 views and primary actions.
  Settings & Diagnostics view renders theme settings, daemon IPC diagnostics,
  project data boundary declaration, and a keyboard shortcuts cheat sheet. All Phase 4
  items of `DESKTOP_V0_6_IMPLEMENTATION_PLAN.md` are complete. Full deterministic validation,
  legacy-handler root coverage, application-level cancellation/progress,
  complete project-operation error mapping, and Workspace RPC coverage still
  require implementation work.
- The System Designer handoff is approved by the maintainer on 2026-07-27;
  visual implementation may begin within ADR-0042 boundaries.
- The read-only Desktop shell now renders connected data across all five
  approved views: Overview, Inspect, Doctor, Diff Review, and Timeline. The
  Timeline view covers quality badges (complete/bounded/unavailable), findings
  chips, a keyboard-accessible event table (source/trust/timestamp/commit/paths),
  a detail panel per event, quality notice banners for bounded and unavailable
  results, and all nine lifecycle states. No apply, mutation, shell, or network
  access was added. Timeline state is cleared on root change to prevent stale
  data across views.
- Root Confirmation UX is implemented: a backdrop-blur overlay appears when
  the user attempts to switch the project root while any view holds loaded data.
  The overlay lists the views that will be cleared and offers "Change project" or
  "Keep current". The confirmation is skipped when no data is loaded (first
  selection). Reconnect Retry Depth is implemented: `connectDaemon` performs one
  automatic retry (1500ms delay) on transient `disconnected` errors, with a
  visible amber notice in the Overview. Protocol mismatch and root errors are not
  retried automatically.
- macOS SEA feasibility spike validated locally: SEA blob (392 kB) injected into
  a 105 MB `intentloomd-sea` executable via `postject@1.0.0-alpha.6`. Daemon
  started from the SEA binary, responded to a Doctor request (`protocolVersion:
1`, `exitCode: 3`, 5 findings), shut down gracefully, and removed its Unix
  socket. `pnpm desktop:prepare-sidecar` copied the SEA binary to
  `apps/desktop/src-tauri/resources/intentloomd` (105 MB, 0755). Tauri macOS
  `.app` with packaged sidecar produced at 114 MB with sidecar embedded at
  `Contents/Resources/resources/intentloomd`. The `desktop-sea-feasibility.yml`
  CI workflow expanded with Linux apt deps, Rust toolchain + cache, SEA
  assertion step, conditional Tauri bundle steps (Linux .deb / macOS .app),
  and artifact upload. Windows CI runs sidecar boundary verification only
  (no code signing available for full bundle).

## Current milestone

The v0.5 Engineering Process Intelligence increment, the v0.6 Desktop
implementation/readiness gates, the `1.0.0` stable compatibility release, and
the `1.0.2` Pages/npm metadata release are complete. GitHub release `v1.0.2`
now points at `main` commit `192fd05`. The post-v1 read-only evidence slice is
also merged through PR #160 (`3713b15`): live GitHub/GitLab reads, external MCP
evidence normalization, and managed-extension capability validation exist in
the source and are included in the published CLI baseline.

The read-only evidence hardening gate milestone is complete and closed (`docs/releases/READ_ONLY_EVIDENCE_HARDENING_AUDIT.md`). It verifies pagination, rate-limiting, secret/token redaction, provider cache retention/purge (`clean --cache`), local credential revocation, adversarial MCP payload filtering, and CLI/MCP/daemon structured equivalence under ADR-0022 and ADR-0023.

The next planned control-plane milestone after that gate is the Agentic
Evaluation and Execution Harness described by ADR-0052. Its H0 decision,
specification, source provenance, threat boundary, and phased roadmap are
The Agentic Evaluation and Execution Harness H9 Production-Hardening Audit is complete and closed (`docs/releases/H9_HARNESS_HARDENING_AUDIT.md`). It verifies fail-closed adoption gate enforcement, cross-project isolation, event replay, state purge, transactional rollback, and the non-gating `matrix-observation` benchmark profile merged through PR #244 (`44a3819`).

The Managed Extension Lifecycle roadmap plan (`docs/roadmap/MANAGED_EXTENSION_LIFECYCLE_PLAN.md`),
Phase E2 Pre-Adoption Inspection & Capability Delta Engine (`inspectExtensionManifest`,
`computeExtensionCapabilityDelta`, `evaluateExtensionCompatibility`, `auditExtensionLicense`),
Phase E3 Transactional Resolution & Lockfile Management (`resolveExtensionAdoptionProposal`,
`applyExtensionAdoptionPlan`, `proposeExtensionAdoption`, `applyExtensionAdoption`),
Phase E4 Update Discovery & Migration Pipeline (`discoverExtensionUpdatePlans`,
`discoverExtensionUpdates`, `applyExtensionUpdate`), Phase E5 Doctor Diagnostics
(`checkExtensionHealth`, `doctorProject`), Phase E6 Safe Removal (`removeExtension`),
and Phase E7 Knowledge-Provider Boundaries (`queryKnowledgeProvider`, `GraphifyKnowledgeAdapter`)
are merged into `main` through PR #218 (`6eac1ee`), PR #220 (`af7b6e5`), PR #222 (`649f7ae`),
PR #224 (`18b6b53`), PR #226 (`56bf4bd`), PR #227 (`d65e735`), and PR #229 (`8d4eed5`).

The current implementation increment, merged through PR #173 as `341984a`, adds
bounded GitHub/GitLab pagination and deterministic rate-limit diagnostics to the
live provider boundary. Its focused and full regression suites are green; the
remaining hardening areas stay explicitly unimplemented until their own
reviewed increments.

The next redaction increment is merged through PR #175 as `26ad22d`. It applies
a shared bounded deterministic scanner to provider export, live-provider, and
external-MCP normalized fields, removing known provider token forms and
pseudonymizing email identities. Raw provider payload retention and cache
deletion are covered by later read-only increments; credential resolution now
has deterministic local-revocation semantics, while remote token deletion and
rotation remain out of scope.

## Next platform milestone

W0–W12 are complete on `origin/main` at `6996df4`. Desktop v0.6 readiness
([V0_6_READINESS_AUDIT.md](docs/desktop/V0_6_READINESS_AUDIT.md)) is a
historical implementation gate only; it is not the next publish action.

The next published version is **undecided**. Do not tag `v0.6.0-beta.1`.
Maintainer options (pick later, in a publish brief):

- stay unpublished on npm until an explicit publish brief;
- later `1.0.x` metadata/docs release;
- `1.1.0` (or another minor) after a real release-gate brief.

P1 defers real workspace dogfood to the maintainer
([2026-08-16-workspace-public-gate.md](docs/releases/dogfooding/2026-08-16-workspace-public-gate.md)).
Named follow-ups after P1, not started here: Neutron N1 then N2 (P2), S8 (P3),
file-budget extracts (P4).

The Desktop discovery/error and Diff/Timeline slices remain recorded in
[PHASE1_CONTRACTS.md](docs/desktop/PHASE1_CONTRACTS.md).

## State update rules

Update this file only when durable project state changes, for example:

- a milestone is completed or activated;
- a product or architecture decision changes;
- a blocker is added or removed;
- a new release changes the implementation baseline;
- the active focus or next recommended milestone changes.

Do not add session-by-session details here. Do not erase uncertainty without
repository evidence.
