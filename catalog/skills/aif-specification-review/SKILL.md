---
name: aif-specification-review
description: Review a feature brief for testable behavior and missing decisions.
---

# aif-specification-review

## Trigger

Use only when the request matches this skill's stated purpose and has a feature brief. Do not trigger for free-form ideation.

## Inputs

- a feature brief
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return acceptance-criteria and ambiguity report.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
