# Changelog

All notable changes are documented here. This project follows Keep a Changelog principles and will version released framework artifacts independently where required.

## [Unreleased]

Changes listed here are merged after the current release-preparation scope and
are not included in the current npm artifact until a later release.

- Explicit adoption approval implemented:
  `intentloom.existing-project.adoption.approve.v1` binds a local-interactive
  approval receipt to one unexpired, revalidated prepared plan. No Apply.
- Prepared adoption plan security envelope implemented:
  `intentloom.existing-project.adoption.prepare.v1` and
  `intentloom.existing-project.adoption.revalidate.v1` bind preview identity,
  validated decisions, project fingerprint, digest, and expiry. No approval
  or Apply.
- Added Desktop adoption decision modeling: supported mapping choices for
  manual adoption items are validated read-only through
  `intentloom.existing-project.adoption.decisions.v1`. No Apply, mapping
  persistence, or project mutation.
  `.claude/skills/` (MIT, pinned by `skills-lock.json`) and turned `grilling`
  on as the decision gate for new design and ambiguous work on this
  repository. See `docs/governance/MATT_POCOCK_SKILLS_ADOPTION.md`.
  Documentation and agent-adapter copies only; no runtime or CLI change.
- Added a Desktop read-only existing-project adoption preview UI that renders
  the typed `existingProjectAdoptionPlan` result. No Apply, mapping save, or
  project mutation.
- Added the first Desktop Existing-Project Adoption shared contract:
  read-only `intentloom.existing-project.adoption.plan.v1`, reusing
  `adoptProject({ dryRun: true })`. No apply, no wizard UI.
- Recorded the first real Vii post-adoption development dogfood cycle
  (`docs/releases/dogfooding/2026-08-18-vii-first-development-cycle.md`).
  Documentation only; no runtime or CLI change.
- Added Phase E7 Knowledge-Provider & Adapter-Pack Boundaries
  (`queryKnowledgeProvider`, `validateKnowledgeProviderQuery`,
  `validateKnowledgeProviderQueryResult`, `verifyKnowledgeProviderCapability`, and
  `GraphifyKnowledgeAdapter`) with zero hard runtime dependencies, fallback
  behavior, capability gating, and test suite `tests/knowledge-provider.test.ts`.

- Added Phase E4 Extension Update Discovery & Migration Pipeline
  (`discoverExtensionUpdatePlans`, `discoverExtensionUpdates`,
  `applyExtensionUpdate`) with explicit update approval, capability/license/
  publisher/source/breaking-change reporting, SHA256 migration previews,
  isolated integrity and health checks, stale-lock and symlink protections, and
  byte-for-byte rollback coverage in `tests/extension-update.test.ts`.
- Added Phase E3 Transactional Extension Resolution & Lockfile Management
  (`resolveExtensionAdoptionProposal`, `applyExtensionAdoptionPlan`, `proposeExtensionAdoption`,
  `applyExtensionAdoption`) and test suite `tests/extension-resolution.test.ts`.
- Added Phase E2 Pre-Adoption Inspection & Capability Delta Engine
  (`inspectExtensionManifest`, `computeExtensionCapabilityDelta`,
  `evaluateExtensionCompatibility`, `auditExtensionLicense`) and suite
  `tests/extension-inspection.test.ts`.
- Added Managed Extension Lifecycle implementation plan (`docs/roadmap/MANAGED_EXTENSION_LIFECYCLE_PLAN.md`)
  detailing Phases E1-E7 for extension governance, pre-adoption inspection,
  capability delta computation, integrity locking, update discovery, and Graphify integration.
- Added deterministic Phase H9 Agentic Harness evidence contract test
  (`tests/harness-h9-evidence-contract.test.ts`) composing adoption gate,
  event replay, checkpoint purge, and rollback recovery terminal states.
- Added Agentic Harness adoption gate and fail-closed mutation enforcement contract
  (`evaluateHarnessAdoptionGate`) in `packages/protocol`, `packages/validator`, and `packages/application`
  verifying passing, non-stale scorecards and required governance approvals.
- Added managed external skill import normalization and safety proposal contract
  (`normalizeExternalSkill`, `proposeExternalSkillImport`) in `packages/protocol`, `packages/validator`,
  and `packages/application` with SHA256 checksumming, risk assessment, and inactive proposal creation.
- Added versioned `TaskRouteDecision` protocol schema and input/output validators in
  `packages/protocol` and `packages/validator` alongside canonical `routeTaskRequest`
  application operation in `packages/application` for provider-neutral task routing.
- Added versioned C4 curated skill dogfooding scenario seeds (`C4_MINIMAL_PROJECT_CASE`,
  `C4_TYPESCRIPT_PROJECT_CASE`, `C4_MATURE_PROJECT_CASE`) and fixture corpus
  (`createC4DogfoodingCorpus`) for evaluating skill routing, adapter evidence,
  and project-owned policy precedence in the Agentic Harness.
- Added read-only MCP parity tools `intentloom_harness_inspect` and
  `intentloom_harness_replay` in `packages/mcp-server` over canonical application
  harness operations. Scorecard files are bounded to the explicit project root and
  non-symlink roots; no process execution, transport, or mutation authority is included.
- Added canonical read-only harness inspect/replay application operations over
  existing scorecards. The summaries preserve status, score, diagnostics,
  event/artifact counts, and deterministic replay outcomes without exposing raw
  event payloads or repeating effects. Added the read-only CLI
  `intentloom harness inspect` and `intentloom harness replay` adapters; no
  provider execution, transport endpoint, or mutation authority is included.
- Added a bounded provider-neutral H7 harness scenario corpus seed with
  versioned positive, negative, regression, and adversarial cases for skill
  routing, external MCP, provider evidence, capability negotiation, approvals,
  memory, paths, and voting. Added fail-closed corpus validation and a pure
  scorecard evaluator; no model execution, public command, network access, or
  mutation authority is included.
- Added bounded provider-neutral harness voting contracts and deterministic
  aggregation for risk-triggered generator, critic, and judge reviews, including
  quorum, role coverage, independent-context, abstention, disagreement,
  false-consensus, and usage-budget outcomes. No model execution or provider
  integration is included.
- Added provider-neutral agent capability and request/result contracts for the
  agentic harness, fail-closed negotiation, normalized structured output, tool
  calls, usage, cancellation and errors, explicit adapter data policy, and a
  deterministic offline fake adapter. No provider SDK, credential, or network
  integration is included.
- Added read-only provider credential resolution for explicit invocation tokens
  and the documented GitHub/GitLab environment aliases, with deterministic
  no-credential behavior after environment clearing; remote token deletion and
  rotation remain outside the Intentloom boundary.
- Added deterministic adversarial external-MCP payload fixtures and a CLI/MCP
  structured-result equivalence contract for read-only release analysis.
- Added deterministic adversarial GitHub/GitLab live-provider fixtures covering
  redaction, unverified provenance, ordering, and rate-limit body isolation.
- Added the read-only CLI `evidence fetch` surface and contract coverage for
  CLI/provider JSON equivalence, all GitHub/GitLab endpoint groups, bounded
  pagination, and rate-limit halting.
- Added ADR-0022 (`ADR-0022-live-read-only-provider-connections.md`) and Live Read-Only Provider Connections Specification (`LIVE_PROVIDER_CONNECTIONS_SPEC.md`).
- Added JSON Schema files for Extension Manifest (`urn:aif:schema:extension-manifest:1`) and Extension Lock (`urn:aif:schema:extension-lock:1`) in `catalog/schemas/` with `@intentloom/validator` support.
- Added ADR-0023 (`ADR-0023-external-mcp-evidence-ingestion.md`) and External MCP Evidence Ingestion Specification (`EXTERNAL_MCP_EVIDENCE_INGESTION_SPEC.md`).
- Added first-party `aif-task-router`, `aif-feature-discovery`,
  `aif-verification-gate`, and `aif-extension-review` skills, plus ADR-0051 and
  the curated skill-routing specification and roadmap.
- Added ADR-0052, the Agentic Evaluation and Execution Harness specification,
  phased development plan, threat-model boundary, and pinned reference-source
  ledger. This documents future work without adding a runtime or sandbox.
- Added change-type branch naming guidance for agents and contributors;
  new branches use prefixes such as `feat/`, `fix/`, `refactor/`, or `docs/`
  instead of actor or tool prefixes such as `codex/`.

### Fixed

- Existing-project inspect no longer selects unsupported `nx`, `sqlite`, or
  `security-sensitive` values as the adopt profile. Nx is reported as
  workspace topology and resolves to a supported engineering profile.
- Adoption scanning excludes Nx generated directories (`.nx/cache`,
  `.nx/workspace-data`, `.nx/installation`) so cache output cannot inflate
  proposals or affect detection.
- Nested README and documentation files no longer compete with the root
  public README for the same documentation concept.
- Specialized architecture, ADR/process, security, and RFC documents no
  longer compete for the generic architecture documentation concept.
- `intentloom diff` no longer treats JSON whitespace-only changes in
  `.aif/source-map.json` or `.aif/manifest.lock.json` as drift.
- `doctor` no longer treats GitHub governance files (workflows, issue
  templates, PR templates) as Copilot instruction roots when checking for
  project-owned instruction-root conflicts.

### Changed

- Bounded live GitHub/GitLab evidence pagination and added deterministic rate-limit diagnostics without introducing mutation or provider-specific authority.
- Redacted provider tokens and email identities from normalized export, live, and external-MCP evidence using bounded deterministic scanning.
- Added a bounded local provider-evidence cache with a maximum 15-minute TTL, redacted-only persistence, and provider/project-scoped purge operations.
- Added the read-only `intentloom clean --cache` adapter with complete-cache,
  provider, and provider/project scopes; it never touches project-owned files.
- Refined canonical debugging, testing, planning-review, code-review,
  idea-to-feature, and bug-fix procedures with project-first routing,
  proportionate discovery, and fresh verification gates.

## [1.0.2] - 2026-08-02

Documentation and package-metadata release. The published CLI also includes
the post-v1 read-only evidence implementation merged before this release; no
mutating provider, MCP, extension-installation, or dependency behavior was
introduced.

### Changed

- Made the GitHub Pages site the canonical public documentation destination in
  the repository and npm-facing READMEs.
- Updated the GitHub and npm project description to describe the local,
  vendor-neutral framework and CLI.
- Bumped the published CLI package metadata to `1.0.2` for the corrected npm
  README and metadata to reach npmjs.com.
- Included the bounded live-provider and external-MCP evidence boundaries from
  PR #160; their hardening gate remains active in the roadmap.

## [1.0.1] - 2026-07-31

Documentation and package-metadata release. No runtime, CLI surface, schema,
adapter, protocol, or dependency behavior changes. The `1.0.0` artifact remains
functionally identical.

### Changed

- Rewrote the npm-facing `packages/cli/README.md`, which ships inside the
  published tarball and is what npmjs.com renders. It described the package as
  beta, directed users to `@next`, pinned `0.4.0-beta.1`, stated that `latest`
  resolved to `0.1.0-alpha.3`, and used repository-relative links that resolve
  to nothing on npmjs.com.
- Rewrote the repository `README.md` for the stable 1.0 state: brand mark in the
  header, surface and distribution table separating the published CLI from the
  unpublished daemon, MCP server, TUI, and Desktop client, the full 26-command
  CLI surface, repository layout, and corrected install instructions.
- Refreshed the published package `description` and expanded `keywords` from 6
  to 12 in `packages/cli/package.json`.
- Reconciled the npm dist-tag records after `latest` was promoted to `1.0.0`:
  `RELEASE_STATE.md`, `PROJECT_STATE.md`, `SECURITY.md`, `PUBLISHING.md`,
  `docs/guides/GETTING_STARTED.md`, and `docs/reference/CLI.md` had all stated
  that `latest` still resolved to `0.1.0-alpha.3`.

### Fixed

- Corrected the `[1.0.0]` changelog entry and the `v1.0.0` GitHub release body,
  which listed the MCP server as `intentloom mcp serve --stdio`. No `mcp`
  command exists on the CLI; the server is the separate `intentloom-mcp` binary
  from `@intentloom/mcp-server`, and neither it nor `intentloomd` is published
  to npm.

### Notes

- Published through `.github/workflows/release.yml` using npm trusted
  publishing, so this artifact carries a provenance attestation. `1.0.0` was
  published manually before that workflow existed and cannot gain one.

## [1.0.0] - 2026-07-30

### Added

- **First Stable Release of Intentloom**: Local-first, offline-first AI agent control layer and process intelligence platform.
- Full local protocol contract `v1` (`intentloom.doctor.v1`, `intentloom.inspect.v1`, `intentloom.diff.v1`, `intentloom.timeline.v1`).
- Multi-adapter merging and rule generation for Claude Code, Codex, Cursor, and Copilot.
- CLI (`intentloom`), published to npm. MCP `stdio` server (`intentloom-mcp`) and local daemon process (`intentloomd`), both built from source in this repository and not published as npm artifacts.
- Process intelligence suite: workflow variant summaries, duration metrics, conformance trends, repetition analysis, and transition interval tracking.
- Bounded security model: Security & Supply Chain Audit sign-off, Dependency Review controls, CodeQL static analysis, and automated Dependabot updates.

### Notes

- Official `v1.0.0` release, tagged in Git and published to npm on 2026-07-30
  under the `next` dist-tag. The `latest` dist-tag was promoted to `1.0.0` on
  2026-07-31, so an unqualified `npm install intentloom` now installs this
  release. See [`RELEASE_STATE.md`](docs/releases/RELEASE_STATE.md) for the
  authoritative published-artifact status.
- This artifact was published before the trusted-publishing release workflow
  existed and therefore carries no provenance attestation. Subsequent releases
  publish through `.github/workflows/release.yml`, which attaches provenance
  automatically.
- Verified compatibility across macOS, Linux, and Windows on Node.js 22 and 24.
- Corrected 2026-07-31: this entry originally listed the MCP server as
  `intentloom mcp serve --stdio`. No `mcp` command exists on the CLI. The MCP
  server is the separate `intentloom-mcp` binary built from
  `@intentloom/mcp-server`, which speaks `Content-Length`-framed JSON-RPC over
  stdio and takes an optional `--root`. Neither it nor `intentloomd` is
  published to npm. The dist-tag note was updated at the same time after
  `latest` was promoted. The release scope itself is unchanged.

## [0.5.0-beta.1] - 2026-07-27

### Added

- Added accepted ADR-0037 and Workflow Variant Summary v0.1 with the
  deterministic `intentloom.workflow.variants.summary.v1` protocol,
  application, analysis, and authenticated local daemon operation.
- Added accepted ADR-0038 and Workflow Duration Metrics v0.1 with the
  deterministic `intentloom.workflow.durations.summary.v1` protocol,
  application, analysis, and authenticated local daemon operation.
- Added accepted ADR-0039 and Conformance Trend Summary v0.1 with the
  deterministic `intentloom.conformance.trend.summary.v1` protocol,
  application, analysis, and authenticated local daemon operation.
- Added accepted ADR-0040 and Workflow Repetition Summary v0.1 with the
  deterministic `intentloom.workflow.repetitions.summary.v1` protocol,
  application, analysis, and authenticated local daemon operation.
- Added accepted ADR-0041 and Workflow Transition Intervals v0.1 with the
  deterministic `intentloom.workflow.transitions.intervals.v1` protocol,
  application, analysis, and authenticated local daemon operation.

### Notes

- Published `intentloom@0.5.0-beta.1` under npm dist-tag `next` and pushed Git
  tag `v0.5.0-beta.1`.
- CLI and MCP surfaces are intentionally not claimed for these operations.
- Waiting-time semantics, rework, bottleneck, causal, remote, persistent, and
  model-assisted analysis remain outside this candidate.

## [0.4.0-beta.1] - 2026-07-25

### Added

- Released the Controlled Agent Learning & Procedural Memory milestone
  (Candidates L1–L8), including task summaries, skill discovery and proposals,
  evaluation gates, memory operations, checkpoints, ranking, profiles, and
  delegation.
- Released the bounded Memory & Security milestone (Candidates M1–M4 and
  S1–S5), read-only interactive/workspace surfaces, and Neutron local workspace
  synchronization and orchestration foundations.

### Notes

- Published as `intentloom@0.4.0-beta.1` under npm `next`; npm `latest` remains
  `0.1.0-alpha.3`.
- The workflow-variant, duration, trend, repetition, and transition interval
  summaries are tracked in the unreleased `0.5.0-beta.1` candidate section.

## [0.3.0-beta.1] - 2026-07-24

### Added

- Added ADR-0020 and v0.3 Engineering Conformance Specification (`ENGINEERING_CONFORMANCE_V0_3_SPEC.md`).
- Added pure application operation `evaluateEngineeringConformance` in `@intentloom/evidence-analysis` with unit tests.
- Added `intentloom conformance` CLI command with `--policy`, `--timeline`, `--case-id`, `--case-type`, and `--json` flags.
- Added `intentloom_engineering_conformance` tool to `@intentloom/mcp-server`.
- Added ADR-0021 (`ADR-0021-managed-extension-lifecycle-and-manifest.md`) and Managed Extension Lifecycle Specification (`MANAGED_EXTENSION_LIFECYCLE_V0_3_SPEC.md`) defining `urn:aif:schema:extension-manifest:1` and `urn:aif:schema:extension-lock:1`.
- Added v0.3 candidate release readiness audit (`docs/audits/V0_3_RELEASE_READINESS.md`).

## [0.2.0-beta.1] - 2026-07-24

### Added

- Added project connection capability model and read-only `intentloom inspect` command (`v0.2.1`).
- Added restricted local Git evidence collection, timeline normalization, and `intentloom timeline` command (`v0.2.2`).
- Added vendor-neutral provider export adapters for GitHub and GitLab JSON exports and `intentloom import-provider` command (`v0.2.3`).
- Added release timeline analysis, evidence quality findings, and `intentloom release-analysis` command (`v0.2.4`).
- Added local `stdio` MCP server (`intentloom mcp serve --stdio`) exposing typed read-only tools for inspection, doctor, timeline, and release analysis (`v0.2.5`).
- Added release conformance evaluation engine (`evaluateReleaseConformance`) and recorded dogfooding evidence (`v0.2.8`).
- Added vendor-neutral managed extension lifecycle documentation for optional Agent Skills, MCP servers, knowledge providers, adapters, and external tool integrations.
- Recorded the `0.2.0-beta.1` technical release readiness audit in `docs/audits/V0_2_RELEASE_READINESS.md`.

## [0.1.0-beta.1] - 2026-07-23

### Added

- Documented a future Engineering Process Intelligence direction based on local workflow evidence, deterministic conformance checking, workflow variants, and bottleneck analysis.
- Added explicit privacy, provenance, scope, delivery-order, and non-goal boundaries so the direction does not imply a general enterprise process-mining platform or v0.1 implementation commitment.
- Added a staged post-v0.1 plan for explicit project connection, read-only inspection, local Git evidence, GitHub and GitLab export adapters, timeline analysis, and later live provider access.
- Documented a local-first Intentloom MCP Server direction with typed tools and resources over the existing application boundary, plus a later external MCP Client evidence path.
- Defined planned MCP safety boundaries: no generic shell or CLI execution, read-only `stdio` first, external results treated as untrusted evidence, and prepare-preview-approve-revalidate requirements before any mutation.
- Added the private Platform Foundation: a reusable application-operation
  boundary, versioned doctor protocol, local-IPC `intentloomd`, and an explicit
  doctor-only daemon client with a token-file boundary.
- Added a dogfooding evidence template for the minimal, TypeScript, and
  sanitized existing-project scenarios required before beta.
- Added sanitized records for a minimal multi-adapter installation and read-only
  TypeScript and Angular + Tauri adoption scenarios.
- Recorded the reviewed, applied TypeScript adoption transaction and its
  healthy, idempotent post-write verification.
- Added explicit, persisted adoption mappings for project-owned generated
  destinations and authoritative existing documentation.
- Recorded the reviewed, applied Angular + Tauri adoption transaction and its
  healthy, idempotent post-write verification.

### Fixed

- Prevented `doctor` from reporting owned, current multi-adapter instruction
  roots as a project-owned instruction conflict.
- Prevented `doctor` from validating project-owned provider skills as
  Intentloom-generated Agent Skills.

### Changed

- Aligned architecture, roadmap, versioning, contribution, and release-process
  documentation with the implemented alpha repository and repeatable delivery
  workflow.
- Recorded that alpha.4 documentation/release-hygiene and alpha.5
  fixture/adapter-compatibility gates are met in unreleased `main`; no version
  or publication is implied.
- Aligned prerelease dist-tag policy with the npm requirement that an initial
  package record retains `latest` until a stable release supersedes it.
- Extended the future architecture and threat model for explicit project roots,
  access capabilities, evidence provenance, provider credentials, MCP trust,
  cross-project isolation, and replay-safe approved plans.

### Security

- Restricted the private daemon surface to authenticated, bounded local IPC and
  preserved read-only doctor semantics across direct and daemon CLI modes.
- Established future invariants for bounded local Git commands, least-privilege
  provider access, root-bound MCP capabilities, credential exclusion, and
  transactional approval for any MCP-triggered write.

### Notes

- Compatibility-freeze candidate: no intentional runtime, schema, lockfile, or
  generated-output contract changes; existing `.aif` and `urn:aif:*`
  identifiers remain unchanged.
- Published after the reviewed release commit was tagged `v0.1.0-beta.1`:
  `intentloom@0.1.0-beta.1` is available from npm under the `next` dist-tag.
  The prerelease does not move `latest`, which remains `0.1.0-alpha.3` until a
  verified stable release supersedes it.

## [0.1.0-alpha.3]

### Changed

- Publish canonical GitHub repository, homepage, and issue tracker metadata.
- Include the expanded public project README and actionable private security
  reporting policy.
- Include the cross-platform Windows adoption-path test fix and compatibility
  verification across Ubuntu, macOS, and Windows on Node 22 and 24.

### Notes

- No intentional runtime or schema changes; existing `.aif` and `urn:aif:*`
  compatibility identifiers remain unchanged.
- This remains an alpha release.

## [0.1.0-alpha.2] - 2026-07-15

### Changed

- Renamed AIF to Intentloom before the first public npm publication. The planned
  public package is now `intentloom` and its CLI command is `intentloom`.
- Renamed private workspace implementation packages from `@aif/*` to
  `@intentloom/*` and updated generated adapter-facing names.
- Retained `.aif`, `urn:aif:*`, ownership labels, and schema identifiers as
  compatibility-sensitive v0.1 persisted protocol values.

### Historical note

- `0.1.0-alpha.1` remains an unpublished AIF technical release-readiness
  milestone. Its `v0.1.0-alpha.1` tag is unchanged.

## [0.1.0-alpha.1] - 2026-07-15

### Added

- Canonical policies, workflows, templates, portable Agent Skills, schemas, profiles, adapters, validator, and local CLI implementation are present in the repository.
- Documentation guides, examples, and initial integration-style tests.
- Added versioned JSON Schemas for AIF configuration, ownership metadata, feature briefs, context packs, change requests, technical-debt entries, and Agent Skill metadata.
- Added reusable structural validation with stable machine-readable diagnostics and an additional AIF Agent Skill policy layer.
- Added deterministic adoption proposals for existing repositories.
- Added expanded doctor diagnostics for partial, stale, conflicting, and corrupted AIF installations.
- Added reusable adoption and doctor fixture matrices, including packed-runtime coverage.
- Added normalized Claude Code, Codex, Cursor, and Copilot adapter contracts,
  real-catalog fixtures, deterministic multi-adapter merging, profile-scoped
  rules, and installed-tarball coverage.
- Added host-independent stored-path normalization and Windows path/collision
  fixtures.
- Added a Linux/macOS/Windows compatibility workflow for Node 22 and Node 24.
- Added final alpha package metadata for the public `aif-core` CLI, deterministic
  tarball checks, clean-room npm/pnpm installation coverage, and publish dry-run
  validation without publication.
- Added an npm publication-authorization checklist, trusted-publishing guardrails,
  and incident handling requirements; real publication remains blocked pending
  ownership and naming/trademark review.
- Added positional explicit-project-path support for `adopt`, `doctor`, `diff`,
  and `sync`, with a no-write regression test. The final Applye packed-CLI audit
  passed its writer, baseline-stability, determinism, and immutability checks.

### Fixed

- Fixed packaged CLI module resolution by shipping a self-contained bundled executable and runtime catalog.
- Verified packed CLI `--help` and `--version` outside the monorepo.
- Fixed adapter output dependence on selection order and duplicate shared
  destinations.
- Fixed stored-path handling for Windows separators, unsafe device names,
  Unicode/case collisions, and noncanonical traversal spellings.

### Changed

- Set the unreleased lockstep development baseline to `0.1.0-alpha.0`; `0.1.0` was an untagged bootstrap placeholder.
- Selected `aif-core` as the planned public package and retained `@aif/*`
  workspace libraries as private implementation details.
- `aif sync` now consumes the structured transaction result directly.
- Added distinct CLI exit codes for conflicts, restored transaction failures, and incomplete rollback.
- Sync output now reports consistency validation and rollback status explicitly.
- `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor` now use the shared schema-validation layer before semantic validation.
- Manifest locks now pin selected profiles, schema families, adapter versions, canonical source hashes, and generated-output hashes.
- Existing project documentation is mapped where possible instead of duplicated.
- Profile detection now reports deterministic file evidence and ambiguity explicitly.
- Set Node.js 22 as the documented and directly verified minimum across every
  workspace package and the packed CLI bundle target.

### Compatibility

- Claude Code, Codex, Cursor, and Copilot outputs are covered by direct,
  multi-adapter, profile snapshot, doctor, and packed CLI fixtures on hosted
  Linux, macOS, and Windows Node 22/24.

### Security

- Prevented sync from overwriting destinations without a verified source-map ownership record.
- Report manually modified generated files as conflicts and roll back newly created files after a recoverable write failure.
- Finalize manifest and source-map writes after generated destinations and roll back all created outputs after metadata-stage failure.
- Added resolved-path checks for existing destination parents and portable normalized collision analysis before writes.
- Added real-filesystem coverage for broken destination, parent-directory, nested adapter, and metadata symlink escapes.
- Defined deterministic collision normalization for separators, dot segments, Unicode NFC, and case-only path differences.
- Added direct manifest/source-map symlink rejection and commit-time destination revalidation against symlink substitution.
- Added explicit real-filesystem symlink-loop coverage and deterministic, provenance-complete collision reporting independent of input order.
- Added end-to-end collision-abort invariants proving generated, metadata, staging, and backup state remains byte-for-byte unchanged.
- Added structured transaction-stage results and independent rollback coverage for generated, manifest, source-map, consistency, and cleanup stages.
- Added explicit incomplete-rollback detection that preserves the original failed stage and reports all project-relative rollback failure paths.
- Added independently identifiable post-write corruption validation across generated files, manifest, and source map.
- Added full rollback for malformed, incomplete, unsafe, duplicated, or incompatible ownership metadata.
- Prevented sync transaction success when actual committed state differs from the planned transaction state.
- Prevented CLI output from presenting incomplete rollback as restored project state.
- Added safe, project-relative sync diagnostics without private generated-file contents.
- Added safe JSON/YAML parsing with duplicate-key, unsafe-tag, size, depth, BOM, Unicode, and alias protections.
- Prevented commands from writing when project metadata fails structural validation and prevented schema diagnostics from exposing private artifact contents.
- Proved that adoption dry-run and doctor never modify project files.
- Prevented adoption from inferring ownership from paths, headers, filenames, equivalent sources, or matching content.
- Added bounded project scanning that excludes heavy, binary, ignored, and external symlinked directories.

### Migration

- No migration is required for this prerelease.

## [0.1.0] - 2026-07-13

### Added

- Initial documentation-only architecture for AIF.
- Canonical-core, portable-skills, and non-destructive-adoption decisions.
- v0.1 scope, compatibility policy, threat model, and delivery roadmap.
