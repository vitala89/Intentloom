---
name: aif-iteration-handoff
description: Write a compact handoff for the next bounded iteration.
---

# aif-iteration-handoff

## Trigger

Use only when the request matches this skill's stated purpose and has completed work, checks, and open decisions. Do not trigger for a finished task with no successor.

## Inputs

- completed work, checks, and open decisions
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return handoff with exact next action and stop conditions.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
