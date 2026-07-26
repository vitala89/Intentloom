# ADR-0041: Observed workflow transition interval boundary

- **Status:** Proposed
- **Date:** 2026-07-26

## Context

Intentloom now reports case-wide observed duration and repeated activity
patterns. A bounded next question is whether explicitly supplied timelines
contain observable elapsed intervals between adjacent activities. This can
describe evidence coverage without calling an interval queue time, latency,
performance, or a bottleneck.

## Decision

Define a pure `summarizeWorkflowTransitionIntervals` operation over at least
two schema-validated `GenericTimeline` values of one case type with unique case
identifiers.

For each adjacent event pair with valid, non-decreasing ISO timestamps, the
operation aggregates intervals by ordered `from` and `to` activity labels. Each
transition reports interval count, observable case count, and minimum, median,
and maximum elapsed minutes. Invalid, missing, or out-of-order timestamps are
excluded from interval statistics and reflected in aggregate timestamp
coverage; event order is never repaired.

The operation returns no raw timestamps, actors, source payloads, paths,
provider identifiers, recommendations, or interpretations. It does not infer
queue time, review latency, rework, bottlenecks, productivity, quality,
causality, or remediation priority.

Mixed case types, duplicate case identifiers, fewer than two timelines, and
invalid canonical timelines are rejected. No filesystem, network, persistence,
subprocess, daemon, or model access is permitted.

## Consequences

- Transition output remains a local, read-only derived view over caller-owned
  timelines.
- An observed interval is an evidence fact only; it is not a performance or
  process-quality judgment.
- Queue/rework semantics, thresholds, alerts, bottleneck analysis, remote
  ingestion, persistence, and model interpretation require a separate ADR,
  specification, and threat review.
- `@intentloom/protocol` remains the canonical contract source and
  `@intentloom/evidence-analysis` remains the pure algorithm boundary.
