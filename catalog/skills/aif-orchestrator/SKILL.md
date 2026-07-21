---
name: aif-orchestrator
description: Coordinate a bounded Intentloom engineering iteration when the user asks to plan or sequence work.
---

# aif-orchestrator

## Trigger

Use only when the request matches this skill's stated purpose and has a concrete goal and repository context. Do not trigger for a single isolated edit.

## Inputs

- a concrete goal and repository context
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return a short ordered plan with owners, checks, and stop condition.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
