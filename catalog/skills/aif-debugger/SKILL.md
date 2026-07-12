---
name: aif-debugger
description: Diagnose a reproducible failure without speculative fixes.
---

# aif-debugger

## Trigger

Use only when the request matches this skill's stated purpose and has reproduction, observed output, and expected behavior. Do not trigger for an unobserved concern.

## Inputs

- reproduction, observed output, and expected behavior
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return root-cause hypothesis, evidence, and safe next action.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
