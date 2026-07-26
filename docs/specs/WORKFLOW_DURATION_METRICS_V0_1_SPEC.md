# Workflow Duration Metrics v0.1 Specification

Version: `0.1-draft`
Status: Draft / Proposed

## 1. Purpose

This candidate reports observed elapsed durations within explicitly supplied
workflow cases. It is an evidence-quality and interval summary, not a
performance, bottleneck, or causal analysis system.

## 2. Inputs

The operation accepts at least two canonical `GenericTimeline` values of one
case type. Each case identifier must be unique. No root path, filesystem
location, credential, provider configuration, actor, model input, or network
option is accepted.

For each case, timestamps are read only from validated timeline events. An
invalid timestamp is treated as unavailable evidence; the operation never
repairs it, guesses an ordering, or retrieves additional evidence.

## 3. Output

The proposed report contains a case type, timeline count, timestamp coverage,
and an aggregate over cases with at least two valid timestamps:

```json
{
  "operationVersion": 1,
  "caseType": "pull-request",
  "timelineCount": 3,
  "timestampCoverage": "partial",
  "observableCaseCount": 2,
  "elapsedMinutes": { "minimum": 18, "median": 42, "maximum": 66 }
}
```

`elapsedMinutes` is the difference between the earliest and latest valid event
timestamp in a case. It is absent when no case has two valid timestamps.
Median uses the middle value for odd counts and the arithmetic mean of the two
middle values for even counts. Values are non-negative and sort-independent.

## 4. Safety and non-goals

The operation is pure in-memory transformation. It does not persist reports,
read a project, call a provider, execute a subprocess, use a model, or return
raw timestamps or event content.

It must not infer or label bottlenecks, review latency, queue time, rework,
productivity, performance, causality, compliance, or required remediation. It
must not score or rank people, teams, repositories, or providers.

## 5. Required implementation evidence

Before implementation, add fixtures for complete, partial, unavailable, and
invalid timestamp coverage; duration statistics; mixed case-type and duplicate
case rejection; deterministic results under input reordering; and pure
read-only behavior across protocol, analysis, application, and daemon adapters.
