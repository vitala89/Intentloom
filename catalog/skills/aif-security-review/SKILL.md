---
name: aif-security-review
description: Review a bounded change for the AIF threat model risks.
---

# aif-security-review

## Trigger

Use only when the request matches this skill's stated purpose and has diff, trust boundaries, and data flows. Do not trigger as a substitute for a full penetration test.

## Inputs

- diff, trust boundaries, and data flows
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return security findings, mitigations, and residual risk.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
