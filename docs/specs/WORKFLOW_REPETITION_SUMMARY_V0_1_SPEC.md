# Workflow Repetition Summary v0.1 Specification

Version: `0.1`
Status: Accepted

## 1. Purpose

This candidate reports repeated activity labels within explicitly supplied
workflow cases. It describes observable sequence repetition only; it does not
label repetition as rework, retry, delay, bottleneck, or failure.

## 2. Inputs and scope

The operation accepts at least two canonical `GenericTimeline` values.

- Every timeline must have the same `caseType`.
- Every `caseId` must be unique within the request.
- Event order is the supplied normalized order; the operation does not reorder
  events by timestamp.
- Only `caseType`, unique case identifiers, and ordered activity names affect
  the report.

The operation accepts no root path, credentials, provider configuration,
filesystem location, URL, raw source payload, actor, or model input.

## 3. Output

```json
{
  "operationVersion": 1,
  "caseType": "pull-request",
  "timelineCount": 3,
  "repeatedActivities": [
    {
      "activity": "checks.failed",
      "caseCount": 2,
      "occurrenceCount": 5,
      "maxOccurrencesPerCase": 3
    }
  ]
}
```

An activity contributes to `repeatedActivities` only for cases where it occurs
at least twice. `caseCount` is the number of such cases. `occurrenceCount` is
the sum of occurrences in those cases, and `maxOccurrencesPerCase` is the
largest per-case count. Activities with no repeated occurrence are omitted.

Results sort by descending `caseCount`, descending `occurrenceCount`, then
lexicographically by `activity`. Empty results are valid when no activity
repeats.

## 4. Validation and errors

The operation rejects:

- fewer than two timelines;
- mixed case types;
- duplicate case identifiers; and
- timelines that fail the existing canonical validator.

It does not silently discard timelines, merge cases, repair event order, or
guess relationships between cases.

## 5. Safety and privacy

- Pure in-memory transformation; no filesystem, network, subprocess, daemon,
  persistence, telemetry, or model call.
- Input remains untrusted until canonical protocol validation succeeds.
- Output contains no raw evidence payloads, actors, timestamps, commit
  identifiers, messages, paths, credentials, or provider identifiers.
- Repetition counts cannot change policy, trigger mutation, or certify process
  quality.

## 6. Non-goals

- rework, retry, queue-time, delay, bottleneck, or causal analysis;
- productivity, quality, compliance, or individual performance scoring;
- recommendations, thresholds, alerts, or automated remediation;
- cross-project aggregation, scheduled collection, remote ingestion, or model
  interpretation.

## 7. Required implementation evidence

Implementation evidence covers repeated and non-repeated
activities, sorting, empty output, mixed case-type rejection, duplicate case
rejection, invalid timelines, input-order independence, and read-only behavior.
Protocol, analysis, application, and daemon adapters must return equivalent
structured reports.
