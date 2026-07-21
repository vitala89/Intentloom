---
name: aif-project-adoption
description: Assess safe Intentloom adoption for an existing repository.
---

# aif-project-adoption

## Trigger

Use only when the request matches this skill's stated purpose and has project root and desired profile. Do not trigger for greenfield scaffolding.

## Inputs

- project root and desired profile
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return an inventory, conflict report, and non-mutating adoption plan.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
