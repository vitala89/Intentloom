# Roadmap

## Near-term release path

The milestones below are compatibility and evidence gates, not promised dates.
Intentloom remains alpha until the generated configuration, schemas, and
adoption workflow have been exercised in multiple real projects.

| Milestone       | Focus                                         | Exit gate                                                                                                              | Gate status                                                                                         |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `0.1.0-alpha.4` | Documentation consistency and release hygiene | Architecture, release, versioning, and public-status documents agree with the repository and verified release evidence | Met in unreleased `main`; no release has been cut                                                   |
| `0.1.0-alpha.5` | Fixture depth and adapter compatibility       | Expanded snapshot and packed-CLI coverage across supported adapters and representative project fixtures                | Met in unreleased `main`; adapter snapshot, packed CLI, and adoption fixture coverage is recorded   |
| `0.1.0-beta.1`  | Compatibility-freeze candidate                | Explicit API/schema/output compatibility statement, migration policy, and successful dogfooding evidence               | Evidence met in unreleased `main`; compatibility-freeze and release-candidate review remain pending |
| `1.0.0`         | Stable compatibility contract                 | Stable release criteria, documented support policy, verified upgrade path, and maintained compatibility commitments    | Not started                                                                                         |

Before beta, Intentloom needs at least three real dogfooding scenarios: a
minimal project, a TypeScript project, and a sanitized existing-project example
such as Applye or an Angular + Tauri project. The goal is evidence that
configuration, schemas, and generated output are not changing accidentally.
Record each scenario with the
[dogfooding evidence template](docs/releases/DOGFOODING_EVIDENCE.md); fixture
coverage is necessary but does not replace a real project record.

The initial records are retained in
[`docs/releases/dogfooding/`](docs/releases/dogfooding/). They establish
read-only safety and generated-output behavior. Reviewed TypeScript and the
Angular + Tauri adoptions are complete. The beta gate evidence is met, but no beta
release is implied: compatibility-freeze and release-candidate review remain
separate explicit decisions.

## v0.1 — Foundation

1. Define canonical policies, workflows, templates, schemas, and portable Agent Skills.
2. Define adapter contracts for Claude Code, Codex, Cursor, and Copilot.
3. Implement a small local CLI: `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor`.
4. Implement validation, drift detection, fixtures, and an Applye dogfooding example.

Exit criteria: a project can preview and safely adopt a pinned Intentloom profile, generate supported adapters, and validate drift without network calls.

## Post-v0.1 delivery principles

Future project connection, evidence, provider, and MCP work must reuse the existing application-operation boundary. CLI, daemon, desktop, and MCP integrations are adapters over the same operations, not independent implementations.

The sequencing rules are:

- local and read-only before remote or mutating;
- explicit project roots and capabilities before data collection;
- provider exports before live provider credentials;
- deterministic timelines before conformance claims;
- conformance before workflow variants or bottleneck analysis;
- local `stdio` MCP before HTTP transport;
- prepare, preview, approve, and revalidate before any MCP-triggered mutation;
- no generic shell, arbitrary file access, hidden network access, or mandatory telemetry.

The combined direction is documented in [Project Connection, Evidence, and MCP](docs/concepts/PROJECT_CONNECTION_EVIDENCE_AND_MCP.md).

## v0.2 candidate — Connected project and workflow evidence

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

### v0.2.4 candidate — Local MCP Server

Candidate scope:

- Add a local `intentloom mcp serve --stdio --root ...` adapter over `@intentloom/application`.
- Expose typed read-only tools for inspection, doctor, diff, adoption planning, Git summary, timeline, and release readiness as each underlying operation stabilizes.
- Expose bounded project, workflow, and finding resources rather than arbitrary files.
- Version tool input and output schemas, limits, error codes, and capability discovery.
- Prohibit arbitrary shell commands, unrestricted CLI invocation, arbitrary file reads, and generic file writes.

Exit criteria: an MCP client can discover and invoke read-only Intentloom tools, and CLI/MCP results are equivalent for the same operation and project state.

### v0.2.5 candidate — Timeline and release analysis

Candidate scope:

- Correlate local Git and explicit provider evidence for one release case.
- Report verified, missing, conflicting, ambiguous, and unsupported evidence.
- Produce machine-readable and human-readable local reports.
- Dogfood the timeline against Intentloom and a sanitized existing project.

Exit criteria: Intentloom can explain the observed release path and evidence quality without issuing compliance or causality claims.

## v0.3 candidate — Engineering conformance

Build deterministic conformance checks on top of the workflow evidence model.

Candidate scope:

- Compare observed engineering events with canonical Intentloom workflows and policies.
- Report missing, out-of-order, duplicated, skipped, or unverifiable steps.
- Support policy examples such as required review, verified CI, changelog updates, migration evidence, release approval, and tag-to-build provenance.
- Distinguish confirmed violations from missing evidence and ambiguous provider data.
- Produce machine-readable findings and human-readable remediation guidance.
- Keep recommendations separate from application and require the existing reviewed transaction boundary for every write.

Exit criteria: Intentloom can explain why a workflow instance conforms, diverges, or cannot be verified, without automatically changing repository state.

## Later candidate — Safe MCP mutation

Mutating MCP tools may be considered only after read-only operations and conformance are stable.

Required boundary:

```text
prepare plan
→ show exact paths and diff
→ explicit human approval
→ verify plan identifier, digest, expiry, root, ownership, and current state
→ transactional apply or reject
```

External evidence, prompts, recommendations, model output, or endpoint reachability never count as approval.

## Later candidate — Live providers and MCP Client

Possible capabilities:

- Explicit, least-privilege, read-only GitHub and GitLab provider connections.
- Credentials stored outside project metadata and evidence.
- Rate-limit, pagination, caching, redaction, retention, deletion, and revocation contracts.
- Optional ingestion of evidence from explicitly configured external MCP servers.
- Validation, provenance, trust classification, and capability allowlists for every external MCP result.

External MCP servers and provider adapters cannot directly trigger adoption, sync, merge, release, or project mutation.

## Later candidate — Engineering Process Intelligence

Intentloom may later apply selected process-mining principles to software delivery and AI-agent workflows. This is intentionally narrower than a general enterprise process-mining platform.

Possible capabilities:

- Discover common workflow variants across pull requests, releases, incidents, and agent tasks.
- Measure waiting time, rework loops, failed-check cycles, review latency, and release lead time.
- Detect recurring bottlenecks and correlate them with workflow variants and policy findings.
- Compare defined engineering intent with observed execution over time.
- Generate local reports that help teams improve workflows while preserving repository and contributor privacy.

This direction is documented in [Engineering Process Intelligence](docs/concepts/ENGINEERING_PROCESS_INTELLIGENCE.md).

## Other later candidates

- More profiles and tool adapters.
- Policy and schema evolution tooling.
- Compatibility certification.
- Desktop application over the standalone daemon, without replacing CLI or core.
- Streamable HTTP MCP transport only after a dedicated authentication, isolation, retention, and network-security review.

## Explicitly not planned for v0.1

MCP, CodeGraph/Graphify, hosted services, telemetry, marketplace, LLM API integration, automatic agent execution, cloud sync, GUI, plugin runtime, autonomous merging, workflow-event ingestion, process discovery, conformance analytics, and process-mining dashboards.
