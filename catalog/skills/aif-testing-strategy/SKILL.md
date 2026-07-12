---
name: aif-testing-strategy
description: Design proportionate tests for a specified behavior.
---

# aif-testing-strategy

## Trigger

Use only when the request matches this skill's stated purpose and has acceptance criteria and existing test conventions. Do not trigger to run unrelated test suites.

## Inputs

- acceptance criteria and existing test conventions
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return test strategy with prioritized cases and stop condition.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
