# ADR-0019: Release conformance boundary

- Status: Accepted
- Date: 2026-07-24

## Context

Intentloom can already produce a deterministic release evidence report from
bounded local Git and explicitly supplied provider-export evidence. The next
roadmap step is to compare observed evidence with declared release controls
without turning missing or incomplete evidence into an approval, compliance, or
causality claim.

No machine-readable canonical release workflow contract exists yet. Reading
repository prose as policy would be unsafe and non-deterministic.

## Decision

Add a pure `evaluateReleaseConformance` operation to
`@intentloom/evidence-analysis`. It accepts:

- one existing `ReleaseAnalysisReport`;
- a caller-supplied, schema-versioned release-control set; and
- no filesystem path, command, provider credential, or network option.

The first control set is intentionally narrow and maps only to existing
evidence-report facts:

- local release timeline availability;
- provider evidence availability; and
- provider commit provenance.

Each required control produces a deterministic, machine-readable finding with
one of `verified`, `missing`, `conflicting`, `ambiguous`, or `unsupported`.
A report-level result summarizes evidence quality; it must never be named or
rendered as compliant, approved, releasable, or authorized. Ordering rules,
timestamps, inferred workflow steps, and catalog-derived requirements are out
of scope until a versioned workflow-policy contract exists.

## Consequences

- Conformance is a read-only interpretation layer over explicit evidence, not a
  new evidence collector.
- Missing or bounded evidence remains distinguishable from a confirmed control
  failure.
- CLI and MCP exposure require separate versioned adapter decisions after the
  pure operation and fixtures are stable.
- A future canonical workflow-policy schema may replace the caller-supplied
  control set through a separate compatibility decision.
