---
name: aif-branch-finisher
description: Prepare a completed branch for human handoff without external publication.
---

# aif-branch-finisher

## Trigger

Use only when the request matches this skill's stated purpose and has verified checks and branch diff. Do not trigger while work is incomplete.

## Inputs

- verified checks and branch diff
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return handoff summary, remaining risks, and suggested commit.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
