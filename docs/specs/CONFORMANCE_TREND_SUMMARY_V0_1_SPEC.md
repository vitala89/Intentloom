# Conformance Trend Summary v0.1 Specification

Version: `0.1-draft`
Status: Draft / Proposed

## 1. Purpose

This candidate aggregates existing conformance report statuses for one policy
and case type. It describes observed report classifications; it does not score
teams, certify compliance, infer bottlenecks, or explain causes.

## 2. Inputs

The operation accepts at least two canonical `EngineeringConformanceReport`
values. All reports must share one `caseType` and `policyId`. Reports are
caller-supplied in memory; no root, file path, provider, network, actor, model,
or persistence option is accepted.

## 3. Output

```json
{
  "operationVersion": 1,
  "caseType": "release",
  "policyId": "policy:release-v1",
  "reportCount": 3,
  "findingCount": 9,
  "statusCounts": {
    "pass": 6,
    "violation": 1,
    "missing-evidence": 2,
    "ambiguous-evidence": 0,
    "unsupported": 0
  },
  "severityCounts": { "error": 1, "warning": 2, "info": 6 }
}
```

Counts include every finding in every report. Output field ordering and status
enums are canonical. The output contains no raw finding evidence or report
timestamps.

## 4. Validation and safety

The operation rejects fewer than two reports, invalid report schemas, mixed
case types, and mixed policy identifiers. It is pure in-memory computation and
does not read, write, transmit, or execute anything.

Aggregate counts must not be presented as compliance certification, bottleneck
identification, team or actor ranking, root-cause analysis, or remediation
priority. Any such interpretation requires a separately approved contract.

## 5. Required implementation evidence

Fixtures must cover deterministic aggregation, mixed policy/case rejection,
status and severity counts, invalid reports, input-order independence, and
read-only behavior across protocol, analysis, application, and daemon adapters.
