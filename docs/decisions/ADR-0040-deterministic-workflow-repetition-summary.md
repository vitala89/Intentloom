# ADR-0040: Deterministic workflow repetition summary boundary

- **Status:** Accepted
- **Date:** 2026-07-26

## Context

Intentloom now provides deterministic summaries for workflow variants,
observed durations, and conformance trends. The next descriptive question
should expose repeated activity labels inside explicitly supplied cases without
claiming that repetition is rework, a retry, a delay, or a bottleneck.

## Decision

Define a pure `summarizeWorkflowRepetitions` operation over at least two
schema-validated `GenericTimeline` values of one case type with unique case
identifiers.

For each activity that occurs at least twice in a case, the operation returns
the activity name, the number of cases containing that repetition, the total
occurrences across those cases, and the maximum occurrences in one case. Results
are deterministic and sorted by case count, occurrence count, then activity.

The operation will not return timestamps, actors, source payloads, paths,
provider identifiers, recommendations, or interpretations. It will not infer
rework, retries, queue time, bottlenecks, quality, productivity, causality, or
remediation priority.

Mixed case types, duplicate case identifiers, fewer than two timelines, and
invalid canonical timelines are rejected. No filesystem, network, persistence,
subprocess, daemon, or model access is permitted.

## Consequences

- Repetition output remains a local, read-only derived view over caller-owned
  timelines.
- Activity labels are descriptive observations, not workflow correctness or
  performance judgments.
- Rework semantics, retry classification, thresholds, alerts, bottleneck
  analysis, remote ingestion, persistence, and model interpretation require a
  separate ADR, specification, and threat review.
- `@intentloom/protocol` remains the canonical contract source and
  `@intentloom/evidence-analysis` remains the pure algorithm boundary.
