# ADR-0038: Observed workflow duration metrics boundary

- **Status:** Proposed
- **Date:** 2026-07-26

## Context

The accepted workflow-variant summary describes recurring activity sequences but
intentionally makes no timing claim. Engineering Process Intelligence may later
need a bounded answer to a separate descriptive question:

> For explicitly supplied, timestamped timelines, what elapsed duration is
> observed between the first and last event of each case?

Calling an elapsed interval a bottleneck, delay, productivity measure, or cause
would exceed the available evidence and create privacy and interpretation risk.

## Decision

Define a pure `summarizeWorkflowDurations` operation over explicitly supplied,
same-type canonical timelines. It will:

1. validate every timeline through the canonical protocol contract;
2. require at least two unique case identifiers of one case type;
3. use only valid ISO timestamps from the already ordered events in each case;
4. report `complete`, `partial`, or `unavailable` timestamp coverage for each
   case and the aggregate; and
5. report elapsed minutes only when a case has at least two valid timestamps.

The result may include aggregate count, minimum, median, and maximum elapsed
minutes for cases with observable intervals. It must not expose actors, source
payloads, commit identifiers, event messages, repository paths, or raw
timestamps.

## Consequences

- The report is a local, caller-owned, read-only derivation.
- An observed interval is never labelled a bottleneck, queue time, review
  latency, rework, productivity, performance, or root cause.
- Trend comparison, recommendations, threshold alerts, cross-project
  aggregation, remote collection, persistence, and model interpretation require
  another ADR, specification, and threat review.
- `@intentloom/protocol` will own future contract types and
  `@intentloom/evidence-analysis` will own the pure algorithm.
