---
name: aif-context-pack
description: Assemble minimal cited context for a bounded engineering task.
---

# aif-context-pack

## Trigger

Use only when the request matches this skill's stated purpose and has task, relevant paths, and token budget. Do not trigger when the complete needed context is already supplied.

## Inputs

- task, relevant paths, and token budget
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return a compact context pack with provenance.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
