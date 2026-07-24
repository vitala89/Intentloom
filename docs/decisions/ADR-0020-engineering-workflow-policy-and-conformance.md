# ADR-0020: Engineering workflow policy contract and conformance engine

- Status: Proposed
- Date: 2026-07-24

## Context

Intentloom currently collects local Git history and provider export evidence into a vendor-neutral release timeline, and evaluates narrow release evidence availability (ADR-0019). The next milestone (v0.3 candidate) requires evaluating full engineering workflow conformance: comparing observed execution timelines against declared engineering policies (e.g. required pull request reviews, verified CI runs, changelog updates before release, and schema migration evidence).

No machine-readable contract for engineering workflow policies exists in Intentloom. Relying on prose or ad-hoc rule logic would compromise determinism, vendor independence, and testability.

## Decision

Define a machine-readable, schema-versioned workflow policy contract (`urn:aif:schema:workflow-policy:1`) and a pure evaluation operation `evaluateEngineeringConformance`.

### 1. Workflow Policy Contract (`urn:aif:schema:workflow-policy:1`)

A workflow policy file (`workflow-policy.v1.json` or YAML equivalent) explicitly declares required, optional, forbidden, and ordered engineering steps for specific case types (`pull-request`, `release`, `incident`, `migration`, `agent-task`).

Each policy rule declares:

- `ruleId`: Stable identifier (e.g., `rule:require-code-review`, `rule:verify-ci-build`, `rule:changelog-update-before-release`).
- `caseType`: Target case type to evaluate.
- `severity`: Finding severity (`error`, `warning`, `info`).
- `condition`: Deterministic matching criteria over timeline events and evidence metadata.
- `remediation`: Human-readable and machine-actionable guidance for resolving violations.

### 2. Pure Evaluator Operation (`evaluateEngineeringConformance`)

Add a pure `evaluateEngineeringConformance` function to `@intentloom/evidence-analysis`. It accepts:

- a normalized `WorkflowTimeline` (from `@intentloom/evidence-git` or `@intentloom/evidence-provider`);
- an explicitly provided `WorkflowPolicy` instance; and
- zero filesystem options, shell commands, or network parameters.

Each evaluated rule produces a deterministic finding with one of the following statuses:

- `pass`: Observed evidence confirms compliance with the rule.
- `violation`: Observed evidence explicitly contradicts the rule requirement.
- `missing-evidence`: Required evidence is absent from the timeline; cannot confirm compliance.
- `ambiguous-evidence`: Multiple conflicting or incomplete evidence items exist for the rule.
- `unsupported`: The timeline contains event types or sources not covered by the rule.

### 3. Isolation & Non-Mutation Invariants

- Evaluation remains 100% read-only, local, and vendor-neutral.
- Remediation guidance describes required fixes, but the evaluator never mutates repository files or triggers automated git actions.
- Any subsequent remediation execution must pass through Intentloom's transactional write boundary with explicit human approval.

## Consequences

- Engineering policies become reviewable, versioned artifacts stored within the repository or Intentloom catalog.
- Conformance results are deterministic and reproducible across CLI, daemon, and MCP adapters.
- Missing evidence is strictly distinguished from a confirmed policy violation.
- Future MCP tools can safely expose `evaluate_engineering_conformance` over the existing stdio application boundary.
