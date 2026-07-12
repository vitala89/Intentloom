---
name: aif-planning-review
description: Review a plan for scope, assumptions, risk, and verification gaps.
---

# aif-planning-review

## Trigger

Use only when the request matches this skill's stated purpose and has a proposed plan. Do not trigger to implement the plan.

## Inputs

- a proposed plan
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return review findings grouped by blocking and non-blocking gaps.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
