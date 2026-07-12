---
name: aif-technical-debt-sync
description: Record or retire explicit technical debt after a verified decision.
---

# aif-technical-debt-sync

## Trigger

Use only when the request matches this skill's stated purpose and has debt item and current evidence. Do not trigger for ordinary implementation details.

## Inputs

- debt item and current evidence
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return updated debt entry or retirement rationale.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
