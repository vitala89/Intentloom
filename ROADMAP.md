# Roadmap

## Near-term release path

The milestones below are compatibility and evidence gates, not promised dates.
Intentloom remains alpha until the generated configuration, schemas, and
adoption workflow have been exercised in multiple real projects.

| Milestone       | Focus                                         | Exit gate                                                                                                              | Gate status                                                                                       |
| --------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `0.1.0-alpha.4` | Documentation consistency and release hygiene | Architecture, release, versioning, and public-status documents agree with the repository and verified release evidence | Met in unreleased `main`; no release has been cut                                                 |
| `0.1.0-alpha.5` | Fixture depth and adapter compatibility       | Expanded snapshot and packed-CLI coverage across supported adapters and representative project fixtures                | Met in unreleased `main`; adapter snapshot, packed CLI, and adoption fixture coverage is recorded |
| `0.1.0-beta.1`  | Compatibility-freeze candidate                | Explicit API/schema/output compatibility statement, migration policy, and successful dogfooding evidence               | TypeScript write-path evidence complete; Angular + Tauri mapping decisions remain pending         |
| `1.0.0`         | Stable compatibility contract                 | Stable release criteria, documented support policy, verified upgrade path, and maintained compatibility commitments    | Not started                                                                                       |

Before beta, Intentloom needs at least three real dogfooding scenarios: a
minimal project, a TypeScript project, and a sanitized existing-project example
such as Applye or an Angular + Tauri project. The goal is evidence that
configuration, schemas, and generated output are not changing accidentally.
Record each scenario with the
[dogfooding evidence template](docs/releases/DOGFOODING_EVIDENCE.md); fixture
coverage is necessary but does not replace a real project record.

The initial records are retained in
[`docs/releases/dogfooding/`](docs/releases/dogfooding/). They establish
read-only safety and generated-output behavior. A reviewed TypeScript adoption
is now complete; a beta compatibility freeze still needs resolution of the
manual ownership and mapping decisions in the Angular + Tauri scenario.

## v0.1 — Foundation

1. Define canonical policies, workflows, templates, schemas, and portable Agent Skills.
2. Define adapter contracts for Claude Code, Codex, Cursor, and Copilot.
3. Implement a small local CLI: `init`, `adopt`, `plan`, `diff`, `sync`, and `doctor`.
4. Implement validation, drift detection, fixtures, and an Applye dogfooding example.

Exit criteria: a project can preview and safely adopt a pinned Intentloom profile, generate supported adapters, and validate drift without network calls.

## v0.2 candidate — Workflow evidence

Intentloom should be able to describe not only how engineering work is expected to run, but also which verifiable evidence proves that the expected steps occurred.

Candidate scope:

- Define a vendor-neutral engineering event and evidence model for changes, pull requests, reviews, CI checks, releases, incidents, and agent tasks.
- Represent a workflow instance by an explicit case identifier, such as a pull request, change request, release, incident, or agent task.
- Import local Git history and explicitly supplied provider exports without hidden network access.
- Associate observed events with canonical workflows while preserving provenance, timestamps, actors, source identifiers, and uncertainty.
- Keep raw evidence project-local by default and avoid mandatory telemetry or hosted storage.

Exit criteria: Intentloom can construct a deterministic, reviewable event timeline for a supported workflow instance without claiming conformance or root cause.

## v0.3 candidate — Engineering conformance

Build deterministic conformance checks on top of the workflow evidence model.

Candidate scope:

- Compare observed engineering events with canonical Intentloom workflows and policies.
- Report missing, out-of-order, duplicated, skipped, or unverifiable steps.
- Support policy examples such as required review, verified CI, changelog updates, migration evidence, release approval, and tag-to-build provenance.
- Distinguish confirmed violations from missing evidence and ambiguous provider data.
- Produce machine-readable findings and human-readable remediation guidance.
- Extend `doctor` or introduce a separate read-only command only after the evidence and command boundaries are specified.

Exit criteria: Intentloom can explain why a workflow instance conforms, diverges, or cannot be verified, without automatically changing repository state.

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
- Explicit, opt-in provider import adapters for GitHub and other development systems.

## Explicitly not planned for v0.1

MCP, CodeGraph/Graphify, hosted services, telemetry, marketplace, LLM API integration, automatic agent execution, cloud sync, GUI, plugin runtime, autonomous merging, workflow-event ingestion, process discovery, conformance analytics, and process-mining dashboards.
