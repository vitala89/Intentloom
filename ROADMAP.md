# Roadmap

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
