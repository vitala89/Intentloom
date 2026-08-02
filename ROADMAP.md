# Roadmap

## Near-term release path

The milestones below are compatibility and evidence gates, not promised dates.
Intentloom remains alpha until the generated configuration, schemas, and
adoption workflow have been exercised in multiple real projects.

| Milestone                      | Focus                                                                     | Exit gate                                                                                                                             | Gate status                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `0.1.0-alpha.4`                | Documentation consistency and release hygiene                             | Architecture, release, versioning, and public-status documents agree with the repository and verified release evidence                | Historical gate; included in `0.1.0-beta.1`                                                     |
| `0.1.0-alpha.5`                | Fixture depth and adapter compatibility                                   | Expanded snapshot and packed-CLI coverage across supported adapters and representative project fixtures                               | Historical gate; included in `0.1.0-beta.1`                                                     |
| `0.1.0-beta.1`                 | Compatibility-freeze candidate                                            | Explicit API/schema/output compatibility statement, migration policy, and successful dogfooding evidence                              | Released 2026-07-23 as Git tag `v0.1.0-beta.1` and npm `intentloom@0.1.0-beta.1` under `next`   |
| `0.2.0-beta.1`                 | Connected project, evidence, MCP & conformance                            | Read-only inspection, local Git timeline, provider imports, release analysis, stdio MCP server, and release conformance               | Released 2026-07-24 as npm `intentloom@0.2.0-beta.1` under `next`                               |
| `0.3.0-beta.1`                 | Engineering conformance and extension governance                          | Engineering Conformance Engine and managed-extension schemas/governance                                                               | Released 2026-07-24 as npm `intentloom@0.3.0-beta.1` under `next`                               |
| `0.4.0-beta.1`                 | Controlled learning, memory/security, workspace, and Neutron foundations  | Candidates L1–L8, M1–M4, S1–S5, workspace modes, and local Neutron foundations                                                        | Released 2026-07-25 as Git tag `v0.4.0-beta.1` and npm `intentloom@0.4.0-beta.1` under `next`   |
| `v0.5.0-beta.1`                | Engineering Process Intelligence increment                                | Workflow variants, durations, conformance trends, repetition, and transition intervals                                                | Released 2026-07-27 as Git tag `v0.5.0-beta.1` and npm `intentloom@0.5.0-beta.1` under `next`   |
| `v0.6.0-beta.1`                | Desktop vertical slice and TUI parity                                     | Packaged Tauri 2 read-only project flow over daemon contracts, followed by TUI parity and cross-platform evidence                     | Implementation and readiness audit complete; release/tag authorization remains explicit         |
| `1.0.0`                        | Stable compatibility contract                                             | Stable release criteria, documented support policy, verified upgrade path, and maintained compatibility commitments                   | Released 2026-07-30 as Git tag `v1.0.0`; patch release `v1.0.2` published 2026-08-02            |
| `post-v1.0 read-only evidence` | Live provider, external MCP, and extension capability boundaries          | Provider isolation, explicit credentials/allowlists, untrusted evidence, and capability validation are implemented; hardening remains | Implementation slice merged in PR #160 (`3713b15`); hardening gate active                       |
| `post-v1.0 curated skills`     | Project-aware routing, discovery, verification, and external-skill review | First-party skills are provider-neutral and generated safely; structured routing and managed import require later evidence gates      | Initial catalog slice implemented; adapter dogfooding and managed import remain planned         |
| `post-v1.0 agentic harness`    | Reproducible agent evaluation, isolated execution, scoring, and replay    | Versioned scenarios, deterministic gates, executor conformance, durable traces, and adversarial corpus pass before mutation expansion | Architecture, specification, threat boundary, and phased plan accepted; runtime not implemented |

Before the first beta, Intentloom needed at least three real dogfooding scenarios: a
minimal project, a TypeScript project, and a sanitized existing-project example
such as Applye or an Angular + Tauri project. The goal is evidence that
configuration, schemas, and generated output are not changing accidentally.
Record each scenario with the
[dogfooding evidence template](docs/releases/DOGFOODING_EVIDENCE.md); fixture
coverage is necessary but does not replace a real project record.

The initial records are retained in
[`docs/releases/dogfooding/`](docs/releases/dogfooding/). They establish
read-only safety and generated-output behavior. Reviewed TypeScript and the
Angular + Tauri adoptions are complete. The beta gate evidence was accepted for
the released `0.1.0-beta.1` candidate; later releases require their own explicit
compatibility and release review.

## v0.1 — Foundation

1. Define canonical policies, workflows, templates, schemas, and portable Agent Skills.
2. Define adapter contracts for Claude Code, Codex, Cursor, and Copilot.
3. Implement a small local CLI: `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor`.
4. Implement validation, drift detection, fixtures, and an Applye dogfooding example.

Exit criteria: a project can preview and safely adopt a pinned Intentloom profile, generate supported adapters, and validate drift without network calls.

## Post-v0.1 delivery principles

Future project connection, evidence, provider, MCP, interactive UI, desktop, and agent work must reuse the existing application-operation boundary. CLI, TUI, daemon, desktop, MCP, and agent integrations are adapters over the same operations, not independent implementations.

The sequencing rules are:

- local and read-only before remote or mutating;
- explicit project roots and capabilities before data collection;
- provider exports before live provider credentials;
- deterministic timelines before conformance claims;
- conformance before workflow variants or bottleneck analysis;
- local `stdio` MCP before HTTP transport;
- structured read-only operations before TUI and desktop orchestration;
- freeze the shared second-client contracts before building product pages;
- build the first Desktop read-only vertical slice before completing TUI
  product hardening over the same presentation contracts;
- provider-neutral agent runtime before custom model training;
- benchmark evidence before fine-tuning or reinforcement learning;
- deterministic harness contracts before model voting or isolated mutation;
- local read-only execution before container, remote, or provider-backed runs;
- prepare, preview, approve, and revalidate before any agent- or MCP-triggered mutation;
- no generic shell, arbitrary file access, hidden network access, mandatory telemetry, or implicit training-data collection.

The curated skill-routing direction is documented in
[ADR-0051](docs/decisions/ADR-0051-curated-skill-routing-and-external-method-adaptation.md),
the [Curated Skill Routing Specification](docs/specs/CURATED_SKILL_ROUTING_SPEC.md),
and the [implementation plan](docs/roadmap/CURATED_SKILL_ADAPTATION_PLAN.md).
Its initial catalog work is additive and does not displace the active read-only
evidence hardening gate. Structured routing operations, managed external skill
import, and optional provider-plugin bridges remain later reviewed phases.

The evaluation and execution direction is documented in
[ADR-0052](docs/decisions/ADR-0052-agentic-evaluation-and-execution-harness.md),
the [Agentic Harness Specification](docs/specs/AGENTIC_HARNESS_SPEC.md), the
[development plan](docs/roadmap/AGENTIC_HARNESS_PLAN.md), and the
[reference-source ledger](docs/reference/AGENTIC_HARNESS_SOURCES.md). It is a
planned post-hardening control plane, not an implemented runtime or sandbox.
Initial scenarios will reuse curated-skill C4 dogfooding evidence, and later
harness gates must precede managed external skill activation and broader
mutating MCP or agent capabilities.

The connected-project direction is documented in [Project Connection, Evidence, and MCP](docs/concepts/PROJECT_CONNECTION_EVIDENCE_AND_MCP.md). Interactive and agent surfaces are documented in [Interactive Surfaces and Agent Workspace](docs/concepts/INTERACTIVE_SURFACES_AND_AGENT_WORKSPACE.md). The model direction is documented in [Neutron Model Strategy](docs/concepts/NEUTRON_MODEL_STRATEGY.md).

## Completed v0.2 milestone — Connected project and workflow evidence

The v0.2.0-beta.1 capability set is implemented in `main` and published in
`intentloom@0.2.0-beta.1`. The subsections below preserve the historical scope
and exit criteria; they are not pending candidates. See the
[release state](docs/releases/RELEASE_STATE.md) for current surfaces.

Intentloom should be able to connect to one explicitly selected project, inspect it safely, and construct reviewable workflow evidence without changing project state.

### v0.2.1 candidate — Project connection and inspection

Candidate scope:

- Define a schema-versioned project-access capability model with an explicit root.
- Add a reusable read-only project-inspection application operation.
- Report project profile, adapter readiness, instruction files, documentation mappings, ownership state, and adoption readiness.
- Keep network, scripts, dependency installation, and project-file writes disabled by default.
- Distinguish Intentloom application restrictions from a complete operating-system sandbox.

Exit criteria: CLI inspection produces deterministic structured output, remains byte-for-byte read-only, and cannot access outside the explicit root.

### v0.2.2 candidate — Local Git evidence

Candidate scope:

- Define a vendor-neutral engineering event and evidence model for changes, reviews, CI checks, releases, incidents, migrations, and agent tasks.
- Represent each workflow instance with an explicit case type and case identifier.
- Collect local Git evidence through a fixed read-only command allowlist without a shell, hooks, configuration mutation, or network access.
- Preserve provenance, timestamps, safe actor identifiers, source identifiers, trust state, and uncertainty.
- Keep raw evidence project-local by default.

Exit criteria: Intentloom can construct a deterministic, reviewable release timeline from local Git evidence without claiming conformance or root cause.

### v0.2.3 candidate — Provider export adapters

Candidate scope:

- Import explicitly supplied GitHub and GitLab exports.
- Normalize pull or merge requests, reviews, CI or pipeline records, releases, and commit provenance into the common evidence model.
- Treat provider payloads as untrusted, bounded input.
- Redact secrets and sensitive identities, retain source provenance, and prevent cross-project mixing.
- Avoid credentials, live APIs, background polling, and hosted storage in the first provider milestone.

Exit criteria: equivalent GitHub and GitLab workflow records produce compatible vendor-neutral timelines with deterministic fixtures.

### v0.2.4 candidate — Timeline and release analysis

Candidate scope:

- Correlate local Git and explicit provider evidence for one release case.
- Report verified, missing, conflicting, ambiguous, and unsupported evidence.
- Produce machine-readable and human-readable local reports.
- Dogfood the timeline against Intentloom and a sanitized existing project.

Exit criteria: Intentloom can explain the observed release path and evidence quality without issuing compliance or causality claims.

### v0.2.5 candidate — Local MCP Server

Candidate scope:

- Add a local `intentloom mcp serve --stdio --root ...` adapter over `@intentloom/application`.
- Expose typed read-only tools for inspection, doctor, diff, adoption planning, Git summary, timeline, and release readiness as each underlying operation stabilizes.
- Expose bounded project, workflow, and finding resources rather than arbitrary files.
- Version tool input and output schemas, limits, error codes, and capability discovery.
- Prohibit arbitrary shell commands, unrestricted CLI invocation, arbitrary file reads, and generic file writes.

Exit criteria: an MCP client can discover and invoke read-only Intentloom tools, and CLI/MCP results are equivalent for the same operation and project state.

## Completed v0.3 milestone — Engineering conformance and managed extension lifecycle

The v0.3.0-beta.1 capability set is implemented in `main` and published in
`intentloom@0.3.0-beta.1`. The scope below is retained as historical milestone
documentation.

Build deterministic conformance checks on top of the workflow evidence model and govern external integrations. The architectural contracts and specifications are defined in [ADR-0020](docs/decisions/ADR-0020-engineering-workflow-policy-and-conformance.md), [ADR-0021](docs/decisions/ADR-0021-managed-extension-lifecycle-and-manifest.md), [v0.3 Engineering Conformance Specification](docs/specs/ENGINEERING_CONFORMANCE_V0_3_SPEC.md), and [Managed Extension Lifecycle Specification](docs/specs/MANAGED_EXTENSION_LIFECYCLE_V0_3_SPEC.md).

Candidate scope:

- Compare observed engineering events with canonical Intentloom workflows and policies.
- Report missing, out-of-order, duplicated, skipped, or unverifiable steps.
- Support policy examples such as required review, verified CI, changelog updates, migration evidence, release approval, and tag-to-build provenance.
- Distinguish confirmed violations from missing evidence and ambiguous provider data.
- Produce machine-readable findings and human-readable remediation guidance.
- Define `urn:aif:schema:extension-manifest:1` and `urn:aif:schema:extension-lock:1` for external skills, MCP servers, knowledge graph indexers (Graphify), and adapters.
- Keep recommendations separate from application and require the existing reviewed transaction boundary for every write.

Exit criteria: Intentloom can explain why a workflow instance conforms, diverges, or cannot be verified, and securely govern external extension manifests without automatically changing repository state.

## Completed v0.6 milestone: Desktop vertical slice, then TUI parity

The v0.5 release gate is complete, and the v0.6 implementation and readiness
audit are complete. The milestone made the existing local platform visible
through one coherent client before adding another major analysis, provider,
extension, or autonomous feature block.

The full implementation sequence, verified starting inventory, PR breakdown,
security boundaries, and exit gates are defined in the
[Desktop v0.6 implementation plan](docs/roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md).
The product and visual-system requirements are defined in the
[Desktop design brief](docs/desktop/DESIGN_BRIEF.md).

Implementation order:

1. Reconcile the roadmap and approve the Desktop stack and distribution ADR.
2. Inventory and freeze capability discovery, Inspect, Doctor, Diff, Timeline,
   cancellation, error, and compatibility contracts.
3. Create the Tauri 2 shell and secure daemon lifecycle boundary.
4. Implement the token-based design system and the read-only product flow:
   `Select project → Inspect → Doctor → Diff → Timeline`.
5. Add bounded Workspace review surfaces after the read-only slice is stable.
6. Complete keyboard-first TUI parity and packaged-runtime evidence over the
   same contracts.
7. Consider Approved Apply only through a separate threat-reviewed security
   gate.

The milestone does not include live provider connections, external MCP
ingestion, managed extension installation, hosted services, model training,
generic shell access, or autonomous repository operations.

Exit criteria: a clean packaged Desktop installation can connect to or start
the authenticated local daemon, confirm one canonical project root, complete
the read-only flow, recover explicitly from daemon and protocol failures, and
close without changing project bytes. The hardened TUI reproduces the same
structured results. Any later Apply action remains explicit, revalidated,
transactional, and separately approved.

## Completed v0.6 TUI parity

The current `intentloom ui` command and read-only workspace state collector are
implemented and released in `0.4.0-beta.1`. The v0.6 keyboard-first terminal UI
parity, cancellation, accessibility, snapshot guarantees, and Desktop parity
are now implemented over the shared contracts.

Add an optional keyboard-first terminal application without replacing the normal CLI.

Candidate scope:

- Provide an entry point such as `intentloom ui`.
- Guide project selection, initialization, and adoption with explicit root confirmation.
- Visualize inspect, doctor, ownership, drift, diff, timeline, release analysis, conformance, and extension findings.
- Use structured application or protocol results rather than parsing human CLI output.
- Reuse the existing prepared-plan and transaction boundary for every future mutation.
- Keep the first milestone local, terminal-native, and free of embedded browser or hosted-service requirements.

Exit criteria: CLI and TUI results are equivalent for the same operation and state, cancellation leaves the project byte-for-byte unchanged, and packed-runtime, keyboard, accessibility, and snapshot coverage is recorded.

## Implemented agent-workspace foundation — Desktop v0.6 presentation complete

Agent Workspace discuss, inspect, plan, review, and apply modes are implemented
through the CLI/application boundary and released in `0.4.0-beta.1`. The v0.6
Desktop presentation milestone is complete; Workspace daemon coverage and
product UI remain explicitly scoped follow-up work after the read-only project
slice.

Build a local Tauri 2 presentation and orchestration layer over the standalone
daemon and versioned application protocol. The Desktop client does not replace
the TypeScript-first core, CLI, MCP server, or daemon, and it does not require a
full Rust rewrite.

Candidate scope:

- Add read-only project, health, diff, timeline, release, conformance, extension, and knowledge views.
- Store project-scoped local conversation and agent-session records with explicit export, retention, and deletion.
- Define provider-neutral model and agent-session contracts.
- Support bounded Discuss, Inspect, Plan, Review, and later Apply Approved Plan modes.
- Generate reviewable feature briefs, context packs, architecture proposals, task graphs, test plans, and exact change plans.
- Display selected root, provider, model, network state, tools, skills, policies, capabilities, permissions, and affected files.
- Keep prompts, model output, and external evidence separate from mutation approval.
- Add agent-triggered mutation only after plan identity, digest, expiry, root, ownership, capability, permission, and current-state revalidation are stable.

Exit criteria for the first agent milestone: one selected project can be discussed and inspected through an explicitly configured provider and read-only typed tools; generated plans preserve provenance; no model response can directly mutate files, execute arbitrary commands, merge, release, deploy, or publish; session data can be exported and deleted locally.

## Experimental Neutron foundation — Model strategy remains future

The local Neutron workspace-sync and autonomous-subagent orchestration
foundations are implemented and released in `0.4.0-beta.1`. Provider/model
runtime expansion, benchmarked tuning, and training remain future candidates.

Develop **Neutron** first as the provider-neutral engineering-agent runtime behind Intentloom, not as a foundation-model claim.

Candidate scope:

- Build project-context, policy, workflow, skill, tool, planning, evidence, conformance, capability, approval, session, and evaluation layers.
- Clearly display the underlying provider, model, version, network mode, data-handling mode, and permission grant.
- Create NeutronBench for project inspection, architecture adherence, policy compliance, tool selection, safe planning, evidence-grounded claims, patch quality, test success, conformance, rollback awareness, long-horizon tasks, and efficiency.
- Benchmark hosted and open-weight models through the same runtime.
- Add an experimental Neutron Local configuration using a compatible existing open-weight model without initially training new weights.
- Consider supervised fine-tuning, LoRA or QLoRA, preference optimization, distillation, and bounded reinforcement learning only after licensed data and reproducible benchmark evidence exist.
- Require explicit opt-in before any private user project, session, prompt, artifact, evidence, or telemetry can be considered for training contribution.
- Keep capability enforcement, validation, approval, and transaction safety outside model weights and prompts.

Exit criteria for a first tuned-model candidate: base-model rights and derivative attribution are verified, training-data provenance is documented, target NeutronBench categories improve measurably over the base model, safety and regression checks pass, and serving or local-use requirements are published.

Training a foundation model from scratch is not a current commitment and requires a separate business case, dataset-governance program, infrastructure plan, safety review, and sustained ML staffing.

## Post-v1.0 implementation slice — Live read-only providers

The first implementation slice is merged in PR #160. It provides bounded GitHub
and GitLab REST reads through `@intentloom/evidence-provider` and the CLI
`evidence fetch` operation. The architectural contract and specification are
defined in [ADR-0022](docs/decisions/ADR-0022-live-read-only-provider-connections.md)
and [Live Read-Only Provider Connections Specification](docs/specs/LIVE_PROVIDER_CONNECTIONS_SPEC.md).

Candidate scope:

- Explicit, least-privilege, read-only GitHub and GitLab provider connections.
- Credentials stored outside project metadata and evidence.
- Rate-limit, pagination, caching, redaction, retention, deletion, and revocation contracts.

Current status: implementation slice complete; the full candidate exit gate is
not yet met. The active hardening work must add deterministic coverage for
pagination, rate-limit headers, redaction, TTL cache retention, deletion, and
credential revocation before the provider milestone is declared complete.

## Post-v1.0 implementation slice — External MCP evidence ingestion

The first ingestion boundary is merged in PR #160. Explicitly configured
external MCP servers may provide untrusted evidence only. The architectural
contract and specification are defined in [ADR-0023](docs/decisions/ADR-0023-external-mcp-evidence-ingestion.md)
and [External MCP Evidence Ingestion Specification](docs/specs/EXTERNAL_MCP_EVIDENCE_INGESTION_SPEC.md).

Candidate scope:

- Explicitly configured external MCP servers may provide untrusted evidence only.
- Every result requires validation, redaction, provenance, trust classification, and an explicit capability allowlist.
- External MCP servers cannot directly trigger adoption, sync, merge, release, or project mutation.

Current status: allowlist, bounded records, schema-shaped normalization, and
`untrusted-external` classification are implemented. The active hardening gate
still requires adversarial fixtures proving project isolation, redaction, and
that external results cannot grant authority or cause mutation.

## Active next milestone — Read-only evidence hardening gate

Complete the provider and external-MCP implementation slices before activating
any mutating MCP or agent capability. The gate is intentionally read-only and
must cover pagination, rate limits, cache retention/deletion, secret and identity
redaction, revocation, adversarial payloads, provenance, and CLI/application
result equivalence. No token, endpoint reachability, external evidence, or model
output may authorize a write, release, merge, publish, or deployment.

Current increment complete: PR #177 adds bounded local provider-evidence cache
retention and provider/project-scoped deletion over already-redacted results;
PR #182 (`1904908`) adds the CLI `intentloom clean --cache` adapter. The
credential-revocation increment defines invocation-scoped credential resolution
across explicit tokens and supported environment aliases, deterministic behavior
after environment clearing, and the explicit boundary that remote token
deletion/rotation is not an Intentloom operation. The current hardening increment
adds deterministic adversarial external-MCP payload fixtures and the first
CLI/MCP structured-result equivalence contract for release analysis; the broader
exit gate remains open.

## Planned milestone — Agentic evaluation and execution harness

After the read-only evidence hardening gate, Intentloom will turn curated-skill
dogfooding and security invariants into versioned scenarios executed through a
provider-neutral harness. Delivery starts with protocol contracts and a
deterministic fake-adapter runner. Process isolation, durable state, model
adapters, adversarial roles, and product surfaces follow only through their own
evidence gates.

Required boundary:

```text
scenario + policy + budgets
→ deterministic preflight
→ capability negotiation
→ bounded executor and agent adapters
→ redacted events and artifacts
→ deterministic scoring
→ optional advisory/adversarial scoring
→ verdict, comparison, retention, or purge
```

The current application-level sandbox evaluator remains a proposal policy gate;
it is not relabeled as OS or container isolation. The harness does not authorize
mutation, install a third-party runtime, or change the active next increment.

## Later candidate — Safe MCP and agent mutation

Mutating MCP tools and agent operations may be considered only after read-only operations, conformance, and the reviewed plan protocol are stable.

Required boundary:

```text
prepare plan
→ show exact paths and diff
→ explicit human approval
→ verify plan identifier, digest, expiry, root, ownership, permissions, and current state
→ transactional apply or reject
```

External evidence, prompts, recommendations, model output, or endpoint reachability never count as approval.

Exit criteria: a prepared plan is rejected for changed root, ownership, state, digest, expiry, permission, or capability scope; approved applies use the existing transactional rollback guarantee; no other signal is accepted as approval.

## Later candidate — Managed external extensions

Intentloom should support optional Agent Skills, MCP servers, knowledge providers,
adapters, and other tool integrations through a shared vendor-neutral lifecycle.
External tools remain replaceable dependencies rather than becoming implicit
parts of the canonical core.

Candidate scope:

- Define a versioned extension manifest for identity, publisher, source, type, compatibility, runtime requirements, requested capabilities, configuration, and update policy.
- Record the exact resolved version, source, integrity metadata, granted capabilities, configuration digest, and license or notice metadata in reproducible lock state.
- Distinguish externally installed, referenced, downloaded, bundled, modified, and redistributed artifacts because each has a different legal and maintenance boundary.
- Add pre-adoption checks for license identifiers, required notices, source and publisher changes, restrictive terms, and unknown legal metadata without presenting the result as legal advice.
- Separate update discovery from update approval and prohibit hidden installation, hidden network checks, self-updates, and automatic dependency changes.
- Preview version, capability, permission, publisher, source, integrity, license, configuration, migration, and generated-output changes before approval.
- Apply approved updates transactionally, run compatibility and health checks before committing lock state, and preserve explicit rollback or manual-recovery evidence.
- Detect stale, unavailable, revoked, compromised, incompatible, and locally modified extensions through `doctor`-style diagnostics.
- Support safe disablement and removal while preserving project-owned files, required notices, evidence, and explicit retained-data records.
- Introduce provider-specific adapters such as a future Graphify CLI or MCP adapter only after the shared lifecycle and knowledge-provider contract exist.

The planned lifecycle is documented in
[External Extension Lifecycle](docs/concepts/EXTENSION_LIFECYCLE.md).

Exit criteria: a fixture extension can be installed or referenced with explicit
approval, pinned reproducibly, checked for compatibility and legal metadata,
updated through a reviewed transaction, rolled back after a failed health check,
and removed without modifying project-owned files. A Graphify-style provider can
be supported without coupling the canonical core to that vendor or implying
redistribution rights.

## Implemented process-intelligence foundation — broader mining remains future

Workflow variants, observed duration metrics, conformance trends, repetition,
and transition intervals are implemented in `main` at `83941ab` but were merged
after the `0.4.0-beta.1` tag. They are not yet available from npm. Waiting-time,
rework, bottleneck, causal, and broader process-mining analysis remain future
candidates behind separate ADRs and threat review.

Intentloom may later apply selected process-mining principles to software delivery and AI-agent workflows. This is intentionally narrower than a general enterprise process-mining platform.

Possible capabilities:

- Discover common workflow variants across pull requests, releases, incidents, and agent tasks.
- Measure waiting time, rework loops, failed-check cycles, review latency, and release lead time.
- Detect recurring bottlenecks and correlate them with workflow variants and policy findings.
- Compare defined engineering intent with observed execution over time.
- Generate local reports that help teams improve workflows while preserving repository and contributor privacy.

This direction is documented in [Engineering Process Intelligence](docs/concepts/ENGINEERING_PROCESS_INTELLIGENCE.md).

Exit criteria: repeated, privacy-safe timelines produce deterministic workflow-variant and bottleneck reports without treating correlation as causation.

## Other later candidates

- More profiles and tool adapters.
- Policy and schema evolution tooling.
- Compatibility certification.
- Optional local web presentation only after a concrete accessibility or multi-process requirement and separate security review.
- Multi-agent delegation, background work, remote execution, and hosted agent services only as separately approved candidates.

## Final later candidate — Streamable HTTP MCP transport

HTTP transport requires a separate ADR and threat review covering authentication,
tenant and repository isolation, rate limits, auditability, retention, and
network exposure.

Exit criteria: the separate security decision is accepted and its isolation,
authentication, retention, and network-security tests pass; HTTP remains disabled
until then.

## Explicitly not planned for v0.1

MCP, CodeGraph/Graphify, hosted services, telemetry, marketplace, LLM API integration, automatic agent execution, cloud sync, GUI, TUI, desktop agent workspace, Neutron Runtime, custom model training, plugin runtime, autonomous merging, workflow-event ingestion, process discovery, conformance analytics, process-mining dashboards, and managed external-extension installation or updates.
