# Observed Workflow Transition Intervals v0.1 Specification

Version: `0.1`
Status: Accepted

## 1. Purpose

This candidate summarizes elapsed minutes observed between adjacent timestamped
activities in explicitly supplied workflow timelines. It reports evidence
coverage and descriptive intervals only; it does not identify queue time,
latency, rework, bottlenecks, performance, or causes.

## 2. Inputs and scope

The operation accepts at least two canonical `GenericTimeline` values.

- Every timeline must have the same `caseType`.
- Every `caseId` must be unique within the request.
- Adjacent pairs use the supplied event order; events are never reordered.
- An interval is observable only when both timestamps are valid ISO timestamps
  and the second timestamp is not earlier than the first.
- Only case type, activity labels, and timestamp values affect the report.

The operation accepts no root path, credentials, provider configuration,
filesystem location, URL, raw source payload, actor, or model input.

## 3. Output

```json
{
  "operationVersion": 1,
  "caseType": "release",
  "timelineCount": 3,
  "timestampCoverage": "partial",
  "observableIntervalCount": 4,
  "transitions": [
    {
      "from": "checks.started",
      "to": "checks.finished",
      "intervalCount": 2,
      "observableCaseCount": 2,
      "elapsedMinutes": {
        "minimum": 1,
        "median": 2,
        "maximum": 3
      }
    }
  ]
}
```

`timestampCoverage` is `complete` when every event has a valid timestamp,
`partial` when at least one but not every event has a valid timestamp, and
`unavailable` when no event has a valid timestamp. Out-of-order adjacent pairs
are unavailable evidence and do not contribute an interval.

Transitions sort by descending `intervalCount`, then `from`, then `to`.
`elapsedMinutes` is omitted when `intervalCount` is zero; all reported metrics
are finite non-negative numbers derived from observable intervals only. Raw
timestamps and per-case intervals are never returned.

## 4. Validation and errors

The operation rejects:

- fewer than two timelines;
- mixed case types;
- duplicate case identifiers; and
- timelines that fail the existing canonical validator.

It does not silently discard timelines, merge cases, repair timestamps, or
guess missing relationships between events.

## 5. Safety and privacy

- Pure in-memory transformation; no filesystem, network, subprocess, daemon,
  persistence, telemetry, or model call.
- Input remains untrusted until canonical protocol validation succeeds.
- Output contains no raw timestamps, evidence payloads, actors, commit
  identifiers, messages, paths, credentials, or provider identifiers.
- Observed intervals cannot change policy, trigger mutation, or certify process
  quality.

## 6. Non-goals

- queue-time, review-latency, rework, retry, bottleneck, or causal analysis;
- productivity, quality, compliance, or individual performance scoring;
- recommendations, thresholds, alerts, or automated remediation;
- cross-project aggregation, scheduled collection, remote ingestion, or model
  interpretation.

## 7. Required implementation evidence

Implementation evidence covers complete, partial, unavailable,
and out-of-order timestamp coverage; repeated transitions; median/minimum/
maximum calculations; sorting; mixed case-type rejection; duplicate case
rejection; invalid timelines; input-order independence; and read-only behavior.
Protocol, analysis, application, and daemon adapters must return equivalent
structured reports.
