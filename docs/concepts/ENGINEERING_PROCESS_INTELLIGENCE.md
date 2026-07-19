# Engineering Process Intelligence

## Purpose

Intentloom currently defines, validates, and synchronizes how engineering work is expected to be performed. Engineering Process Intelligence is a possible future capability for comparing that declared intent with verifiable evidence of how work was actually performed.

The direction borrows selected ideas from process mining, especially event timelines, workflow variants, conformance checking, and bottleneck analysis. It does not attempt to turn Intentloom into a general enterprise process-mining platform.

## Product boundary

Intentloom should remain the canonical, vendor-neutral source of engineering intent. Future process-intelligence capabilities may add an observation layer around that core:

```text
canonical workflows and policies
              ↓
       expected execution
              ↕ conformance
       observed evidence
              ↓
 variants, delays, rework, and findings
```

The observation layer must not become a second canonical catalog and must not silently infer that an undocumented practice is correct.

## Core concepts

### Workflow definition

A canonical Intentloom workflow or policy describes required, optional, forbidden, and ordered engineering steps.

Example:

```text
change request
→ branch
→ implementation
→ verification
→ pull request
→ review
→ merge
→ release evidence
```

### Workflow instance

A workflow instance is a concrete case being analyzed. A case identifier must be explicit and stable within the imported evidence.

Candidate case types include:

- change request;
- pull request;
- release;
- incident;
- migration;
- agent task.

Different case types must not be mixed into one timeline unless an explicit relationship model connects them.

### Engineering event

An engineering event records an observed activity with provenance. A future schema may include:

```json
{
  "schemaVersion": "1",
  "caseType": "release",
  "caseId": "0.2.0",
  "activity": "pull-request.merged",
  "timestamp": "2026-07-19T14:42:00Z",
  "actor": "maintainer-id",
  "source": "github-export",
  "sourceId": "pull-request:12",
  "evidence": {
    "commit": "abc123",
    "branch": "release/0.2.0"
  }
}
```

The final schema must define timestamp precision, actor privacy, provider identifiers, deduplication, ordering, incomplete evidence, and trust levels before implementation.

### Evidence

Evidence is the verifiable source behind an event or conformance finding. Examples include Git commits, signed tags, pull-request metadata, review records, CI results, changelog entries, release manifests, and local Intentloom transaction records.

A missing event is not automatically a confirmed violation. The system must distinguish:

- confirmed evidence;
- missing evidence;
- conflicting evidence;
- ambiguous evidence;
- unsupported evidence.

### Conformance finding

A conformance finding compares observed evidence with declared intent.

Examples:

- required review is verified;
- release tag has no verified build provenance;
- changelog update occurred after publication;
- schema changed but migration evidence is missing;
- the provider export cannot prove whether approval occurred.

Findings must be deterministic, read-only, machine-readable, and safe to display without leaking repository contents.

## Candidate analysis stages

### 1. Evidence collection

Start with local and explicitly supplied sources:

- local Git history;
- Intentloom-generated metadata;
- exported pull-request, review, CI, and release records;
- explicitly configured read-only provider adapters.

No hidden network access, mandatory telemetry, or automatic cloud upload should be introduced.

### 2. Timeline construction

Normalize supported evidence into a deterministic timeline for one workflow instance. Preserve source provenance and report ordering uncertainty rather than guessing.

### 3. Conformance checking

Compare the observed timeline with canonical workflow requirements. Initial implementation should use explicit rules or state-machine semantics instead of claiming generalized process discovery.

### 4. Variant and flow analysis

Only after the event and conformance models are stable, analyze repeated workflow instances to identify:

- common execution variants;
- review and queue waiting time;
- failed-check loops;
- repeated rework;
- skipped or late controls;
- release lead time;
- recurring bottlenecks.

Correlation must not be presented as causation. Root-cause claims require explicit supporting evidence and documented confidence.

## Privacy and security requirements

Any future implementation must preserve the existing local and offline-first safety model.

- Raw evidence remains local by default.
- Provider access is explicit, opt-in, least-privilege, and preferably read-only.
- Reports use project-relative paths and safe identifiers.
- Secrets, private file contents, commit messages, contributor identities, and provider payloads are not exposed unless required and explicitly requested.
- Data retention and deletion behavior are documented before provider ingestion is enabled.
- Generated reports clearly separate facts, interpretations, and recommendations.

## Non-goals

This direction does not initially include:

- a Celonis-compatible or general business process-mining platform;
- SAP, ERP, CRM, or arbitrary enterprise-system ingestion;
- hosted telemetry or mandatory centralized storage;
- autonomous remediation or merging;
- employee productivity scoring;
- opaque AI-generated compliance decisions;
- causal root-cause claims from correlation alone;
- real-time organization-wide surveillance.

## Suggested delivery order

1. Specify workflow case identifiers, event schema, evidence provenance, and trust semantics.
2. Add deterministic fixtures for Git, pull-request, CI, and release timelines.
3. Build a local read-only timeline command or report.
4. Add rule-based conformance checks for one narrow workflow, preferably release readiness.
5. Dogfood the model against Intentloom's own release history and a sanitized Applye example.
6. Add variant and bottleneck analysis only after evidence quality and privacy boundaries are proven.

## Initial success criteria

The first useful milestone should answer a narrow question reliably:

> Given a canonical release workflow and explicit local evidence, can Intentloom explain which required steps are verified, missing, ambiguous, or out of order?

It should not attempt broad process discovery until that question is answered deterministically and safely.