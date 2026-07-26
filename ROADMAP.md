# Roadmap

## Near-term release path

The milestones below are compatibility and evidence gates, not promised dates.
Intentloom remains alpha until the generated configuration, schemas, and
adoption workflow have been exercised in multiple real projects.

| Milestone       | Focus                                                                    | Exit gate                                                                                                               | Gate status                                                                                   |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `0.1.0-alpha.4` | Documentation consistency and release hygiene                            | Architecture, release, versioning, and public-status documents agree with the repository and verified release evidence  | Historical gate; included in `0.1.0-beta.1`                                                   |
| `0.1.0-alpha.5` | Fixture depth and adapter compatibility                                  | Expanded snapshot and packed-CLI coverage across supported adapters and representative project fixtures                 | Historical gate; included in `0.1.0-beta.1`                                                   |
| `0.1.0-beta.1`  | Compatibility-freeze candidate                                           | Explicit API/schema/output compatibility statement, migration policy, and successful dogfooding evidence                | Released 2026-07-23 as Git tag `v0.1.0-beta.1` and npm `intentloom@0.1.0-beta.1` under `next` |
| `0.2.0-beta.1`  | Connected project, evidence, MCP & conformance                           | Read-only inspection, local Git timeline, provider imports, release analysis, stdio MCP server, and release conformance | Released 2026-07-24 as npm `intentloom@0.2.0-beta.1` under `next`                             |
| `0.3.0-beta.1`  | Engineering conformance and extension governance                         | Engineering Conformance Engine and managed-extension schemas/governance                                                 | Released 2026-07-24 as npm `intentloom@0.3.0-beta.1` under `next`                             |
| `0.4.0-beta.1`  | Controlled learning, memory/security, workspace, and Neutron foundations | Candidates L1–L8, M1–M4, S1–S5, workspace modes, and local Neutron foundations                                          | Released 2026-07-25 as Git tag `v0.4.0-beta.1` and npm `intentloom@0.4.0-beta.1` under `next` |
| `v0.5.0-beta.1` | Engineering Process Intelligence increment                               | Workflow variants, durations, conformance trends, repetition, and transition intervals                                  | Release preparation in progress; workspace synchronized, npm publication pending              |
| `v0.6.0-beta.1` | Desktop vertical slice and TUI parity                                    | One Tauri 2 desktop project flow over daemon contracts, followed by CLI/TUI/Desktop parity and cancellation evidence      | Planned; starts after the v0.5 publication decision and release-state closure                  |
| `1.0.0`         | Stable compatibility contract                                            | Stable release criteria, documented support policy, verified upgrade path, and maintained compatibility commitments     | Not started                                                                                   |

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
- close the current release decision and release-state handoff before opening a new product milestone;
- use the partial TUI as a contract probe, build the first Desktop vertical slice, then harden the TUI against the same stable presentation contracts;
- provider-neutral agent runtime before custom model training;
- benchmark evidence before fine-tuning or reinforcement learning;
- prepare, preview, approve, and revalidate before any agent- or MCP-triggered mutation;
- no generic shell, arbitrary file access, hidden network access, mandatory telemetry, or implicit training-data collection.

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

## Planned v0.6 milestone — Desktop vertical slice, then TUI parity

The next product milestone starts only after the v0.5 publication decision is
recorded and the related release-state pull requests are closed. That gate may
result in publication or an explicit decision to defer publication; it must not
remain ambiguous.

The partial TUI foundation is sufficient as a contract and presentation-model
probe. Full TUI hardening is intentionally sequenced after the first Desktop
vertical slice so both clients can converge on proven daemon, protocol, and
presentation contracts instead of evolving two product interfaces independently.

Implementation sequence:

1. **Release closure:** record the v0.5 tag/npm decision, synchronize
   `PROJECT_STATE.md`, `DUTY_WATCH.md`, and `docs/releases/RELEASE_STATE.md`, and
   begin v0.6 from a verified `main`.
2. **Client contract freeze:** inventory the daemon operations needed by the
   first slice, add only missing typed read-only operations, and define shared
   loading, empty, error, cancellation, and stale-state presentation contracts.
3. **Desktop read-only vertical slice:** create the official Tauri 2 client over
   the standalone daemon for one explicitly selected project:
   `Select project → Inspect → Doctor → Diff → Timeline`.
4. **Desktop workspace slice:** expose Discuss, Inspect, Plan, and Review over
   project-scoped sessions. Plans remain reviewable artifacts and cannot grant
   mutation authority.
5. **TUI parity and hardening:** extend `intentloom ui` over the same stable
   contracts, then prove CLI/TUI/Desktop result parity, keyboard navigation,
   accessibility, cancellation, large-result handling, snapshots, and packaged
   runtime behavior.
6. **Approved apply slice:** only after the existing plan-identity, digest,
   expiry, root, ownership, capability, permission, current-state, transaction,
   and rollback gates are proven through the Desktop review UX. A model response
   never counts as approval.

The v0.6 milestone must not absorb live provider connections, external MCP
ingestion, managed extension installation, hosted services, custom model
training, or autonomous repository operations. Those remain separate roadmap
candidates.

Exit criteria: a clean installation can connect the Tauri 2 Desktop client to
the authenticated local daemon, select one project, complete the read-only
vertical slice, review a provenance-preserving plan, close or cancel without
changing project bytes, and reproduce the same structured results in the
hardened TUI. Any approved apply is explicit, revalidated, transactional, and
covered by rollback evidence.

## Partial implementation — Interactive terminal UI

The current `intentloom ui` command and read-only workspace state collector are
implemented and released in `0.4.0-beta.1`. A full keyboard-first terminal UI
with cancellation, accessibility, and snapshot guarantees remains a future
candidate.

Add an optional keyboard-first terminal application without replacing the normal CLI.

Candidate scope:

- Provide an entry point such as `intentloom ui`.
- Guide project selection, initialization, and adoption with explicit root confirmation.
- Visualize inspect, doctor, ownership, drift, diff, timeline, release analysis, conformance, and extension findings.
- Use structured application or protocol results rather than parsing human CLI output.
- Reuse the existing prepared-plan and transaction boundary for every future mutation.
- Keep the first milestone local, terminal-native, and free of embedded browser or hosted-service requirements.

Exit criteria: CLI and TUI results are equivalent for the same operation and state, cancellation leaves the project byte-for-byte unchanged, and packed-runtime, keyboard, accessibility, and snapshot coverage is recorded.

## Implemented agent-workspace foundation — Desktop application remains future

Agent Workspace discuss, inspect, plan, review, and apply modes are implemented
through the CLI/application boundary and released in `0.4.0-beta.1`. The first
full desktop presentation slice is the planned v0.6 product milestone above.

Build a local Tauri 2 presentation and orchestration layer over the standalone daemon and versioned application protocol. The desktop client does not replace the TypeScript-first core, CLI, MCP server, or daemon, and this milestone does not require a full Rust rewrite.

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

## Later candidate — Live read-only providers

Build explicit, least-privilege provider connections for GitHub and GitLab. The architectural contract and specification are defined in [ADR-0022](docs/decisions/ADR-0022-live-read-only-provider-connections.md) and [Live Read-Only Provider Connections Specification](docs/specs/LIVE_PROVIDER_CONNECTIONS_SPEC.md).

Candidate scope:

- Explicit, least-privilege, read-only GitHub and GitLab provider connections.
- Credentials stored outside project metadata and evidence.
- Rate-limit, pagination, caching, redaction, retention, deletion, and revocation contracts.

Exit criteria: provider access is explicit and revocable, records remain project-isolated and provenance-complete, and deterministic fixtures prove redaction, pagination, retention, deletion, and revocation behavior.

## Later candidate — External MCP evidence ingestion

Explicitly configured external MCP servers may provide untrusted evidence only. The architectural contract and specification are defined in [ADR-0023](docs/decisions/ADR-0023-external-mcp-evidence-ingestion.md) and [External MCP Evidence Ingestion Specification](docs/specs/EXTERNAL_MCP_EVIDENCE_INGESTION_SPEC.md).

Candidate scope:

- Explicitly configured external MCP servers may provide untrusted evidence only.
- Every result requires validation, redaction, provenance, trust classification, and an explicit capability allowlist.
- External MCP servers cannot directly trigger adoption, sync, merge, release, or project mutation.

Exit criteria: adversarial fixtures prove bounded, project-isolated evidence ingestion and that external results cannot grant authority or cause mutation.

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
