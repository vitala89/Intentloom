# ADR-0039: Conformance trend summary boundary

- **Status:** Accepted
- **Date:** 2026-07-26

## Context

Intentloom now evaluates one canonical workflow timeline at a time. A bounded
next step is to summarize the statuses of already-produced conformance reports
over multiple explicitly supplied cases. This can make repeated missing
evidence or violations visible without collecting new provider data or making a
causal process claim.

## Decision

Define a pure `summarizeConformanceTrend` operation over at least two
schema-validated `EngineeringConformanceReport` values of one case type and
one policy identifier.

The operation returns only deterministic counts by conformance status and
severity, the number of reports, and the covered case type/policy. It will not
return raw evidence, case payloads, actor identities, paths, timestamps, or
recommendations.

Reports with mixed policy identifiers or case types are rejected. The operation
does not infer bottlenecks, causes, quality rankings, compliance certification,
or remediation priority from aggregate counts.

## Consequences

- Trend output is a local, read-only derived view over caller-owned reports.
- The same report set produces the same output and cannot mutate policy,
  evidence, memory, or project state.
- Bottleneck analysis, thresholds, alerts, remote ingestion, persistence,
  actor-level analysis, and model interpretation require a separate ADR,
  specification, and threat review.
- `@intentloom/protocol` remains the canonical contract source and
  `@intentloom/evidence-analysis` remains the pure algorithm boundary.
