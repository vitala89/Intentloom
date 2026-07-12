---
name: aif-project-state-sync
description: Synchronize canonical project state documentation after verified changes.
---

# aif-project-state-sync

## Trigger

Use only when the request matches this skill's stated purpose and has changed scope and verification results. Do not trigger before changes are verified.

## Inputs

- changed scope and verification results
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return updated state summary or explicit no-change result.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
