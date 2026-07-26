# Workflow Variant Summary v0.1 Specification

Version: `0.1-candidate`
Status: Accepted

## 1. Purpose

This specification defines a narrow, deterministic report over multiple
explicit workflow timelines. It answers only which ordered activity sequences
recur for one workflow case type. It does not assess people, process quality,
delay, bottlenecks, or causes.

## 2. Inputs and scope

The operation accepts a non-empty set of at least two canonical
`GenericTimeline` values.

- Every timeline must have the same `caseType`.
- Every `caseId` must be unique within the request.
- Event order is the input order already established by the upstream timeline
  normalizer. The report does not reorder events by timestamps.
- Only `caseType`, `caseId`, ordered `activity` names, and the presence of
  timestamps may affect the report.

The operation accepts no root path, credentials, provider configuration,
filesystem location, URL, raw source payload, actor, or model input.

## 3. Output

The proposed report contains:

```json
{
  "operationVersion": 1,
  "caseType": "pull-request",
  "timelineCount": 3,
  "timestampCoverage": "partial",
  "variants": [
    {
      "variantId": "variant:sha256:...",
      "activities": ["branch.created", "pull-request.merged"],
      "occurrenceCount": 2,
      "caseIds": ["pr:101", "pr:102"]
    }
  ]
}
```

Variants sort by descending occurrence count, then by their normalized activity
sequence. Case identifiers sort lexicographically. An implementation must use a
stable cryptographic digest of the normalized sequence for `variantId`; it must
not include project data outside activity names.

`timestampCoverage` is:

- `complete` when every event has a timestamp;
- `partial` when at least one but not every event has a timestamp; or
- `unavailable` when no event has a timestamp.

Timestamp coverage is a descriptive evidence-quality signal only. It must not
produce duration, latency, bottleneck, or causal claims.

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
- Input is caller-supplied and remains untrusted until it has passed canonical
  protocol validation.
- Output contains no raw evidence payloads, actors, commit identifiers,
  messages, paths, credentials, or provider identifiers.
- Reports are not canonical workflows and cannot change policy or trigger a
  mutation.

## 6. Non-goals

- process discovery outside explicitly supplied timelines;
- lead-time, queue-time, rework, bottleneck, productivity, or causal analysis;
- recommendations, scoring, ranking people, or automated remediation;
- cross-project aggregation, scheduled collection, remote ingestion, or model
  interpretation.

## 7. Required implementation evidence

Deterministic tests cover recurring variants, sorting, mixed case-type rejection,
duplicate case rejection, timestamp coverage, and read-only pure behavior. The
protocol, analysis, application, and daemon adapters return equivalent structured
reports.
