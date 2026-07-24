# v0.3 Engineering Conformance Specification

Version: 0.3.0-candidate  
Status: Draft / Proposed  
Schema URN: `urn:aif:schema:workflow-policy:1`

## 1. Overview

Intentloom v0.3 introduces the **Engineering Conformance Engine**, enabling projects to compare observed engineering events (from local Git, GitHub/GitLab exports, and CI/CD pipelines) against declared canonical engineering policies.

The specification defines:

1. The machine-readable **Workflow Policy Schema** (`urn:aif:schema:workflow-policy:1`).
2. The **Conformance Evaluation Engine** operation and state transition rules.
3. The **Conformance Finding & Remediation Model**.
4. Security, privacy, and non-mutation invariants.

## 2. Product Boundary

```text
  Canonical Engineering Policies (workflow-policy.v1.json)
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│         evaluateEngineeringConformance Operation        │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │
        Observed Timeline Events & Evidence
       (Git commits, PR reviews, CI builds, releases)
```

The conformance engine is an observation layer. It does not replace canonical workflows, nor does it silently infer policy rules from undocumented repository practices.

## 3. Workflow Policy Schema (`urn:aif:schema:workflow-policy:1`)

A workflow policy file (`workflow-policy.v1.json` or `config.yaml` policy block) defines policy metadata and an array of engineering rules.

### Schema Definition (JSON Schema Structure)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:aif:schema:workflow-policy:1",
  "title": "Intentloom Workflow Policy Schema v1",
  "type": "object",
  "required": ["schemaVersion", "policyId", "rules"],
  "properties": {
    "schemaVersion": { "type": "string", "const": "1" },
    "policyId": { "type": "string" },
    "description": { "type": "string" },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["ruleId", "caseType", "severity", "title", "condition"],
        "properties": {
          "ruleId": { "type": "string" },
          "caseType": {
            "type": "string",
            "enum": [
              "pull-request",
              "release",
              "incident",
              "migration",
              "agent-task"
            ]
          },
          "severity": {
            "type": "string",
            "enum": ["error", "warning", "info"]
          },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "condition": {
            "type": "object",
            "required": ["type"],
            "properties": {
              "type": {
                "type": "string",
                "enum": [
                  "required-activity",
                  "forbidden-activity",
                  "ordered-sequence",
                  "evidence-presence",
                  "time-delta-threshold"
                ]
              },
              "activity": { "type": "string" },
              "sequence": {
                "type": "array",
                "items": { "type": "string" }
              },
              "evidenceType": { "type": "string" },
              "maxMinutes": { "type": "number" }
            }
          },
          "remediation": {
            "type": "object",
            "required": ["summary", "actionableSteps"],
            "properties": {
              "summary": { "type": "string" },
              "actionableSteps": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

## 4. Evaluator Operation & Finding Model

The core evaluation function signature:

```typescript
export function evaluateEngineeringConformance(
  timeline: WorkflowTimeline,
  policy: WorkflowPolicy,
): EngineeringConformanceReport;
```

### Finding Status Classification

Each rule evaluation yields exactly one status:

1. **`pass`**: Required activity, evidence, or sequence is verified in the timeline.
2. **`violation`**: Observed evidence explicitly demonstrates a policy breach (e.g. merge without review, commit direct to main).
3. **`missing-evidence`**: Evidence is incomplete or absent; cannot confirm policy compliance.
4. **`ambiguous-evidence`**: Contradictory evidence items exist (e.g. conflicting review states or missing timestamps).
5. **`unsupported`**: Timeline events cannot be evaluated by the rule engine.

### Report Output Structure

```json
{
  "schemaVersion": "1",
  "policyId": "policy:canonical-release-v1",
  "evaluatedAt": "2026-07-24T02:00:00Z",
  "caseType": "release",
  "caseId": "0.2.0-beta.1",
  "summary": {
    "totalRules": 5,
    "passed": 4,
    "violations": 0,
    "missingEvidence": 1,
    "ambiguousEvidence": 0,
    "unsupported": 0
  },
  "findings": [
    {
      "ruleId": "rule:verify-ci-build",
      "status": "pass",
      "severity": "error",
      "title": "CI Build Verification",
      "evidence": [
        {
          "source": "github-export",
          "sourceId": "check-run:104928",
          "timestamp": "2026-07-23T23:55:00Z"
        }
      ]
    },
    {
      "ruleId": "rule:migration-evidence",
      "status": "missing-evidence",
      "severity": "warning",
      "title": "Schema Migration Evidence",
      "remediation": {
        "summary": "No migration evidence was attached to this release case.",
        "actionableSteps": [
          "Include a migration record in docs/releases/ if database or schema changes occurred.",
          "Re-run intentloom release-analysis --case 0.2.0-beta.1 to verify."
        ]
      }
    }
  ]
}
```

## 5. Standard Rule Examples

### 1. `rule:require-code-review`

- **Case Type**: `pull-request`
- **Condition**: Activity `pull-request.reviewed` with `state: APPROVED` must precede `pull-request.merged`.
- **Severity**: `error`

### 2. `rule:verify-ci-build`

- **Case Type**: `release`
- **Condition**: Evidence `ci-build-passed` matching release commit hash must exist.
- **Severity**: `error`

### 3. `rule:changelog-update`

- **Case Type**: `release`
- **Condition**: Commit in timeline must modify `CHANGELOG.md` before release tag timestamp.
- **Severity**: `warning`

## 6. Safety & Invariants

1. **Read-Only Operation**: The evaluator function executes pure memory transformations without I/O or network requests.
2. **No Secret Leaks**: All reported file paths are repository-relative; identities use safe actor identifiers.
3. **Explicit Remediation**: Remediation steps provide clear guidance; no automated code mutation or git push occurs without explicit human approval.
