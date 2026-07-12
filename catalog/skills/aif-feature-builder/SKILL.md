---
name: aif-feature-builder
description: Implement one approved, bounded feature slice.
---

# aif-feature-builder

## Trigger

Use only when the request matches this skill's stated purpose and has accepted brief, target paths, and verification commands. Do not trigger without acceptance criteria.

## Inputs

- accepted brief, target paths, and verification commands
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return implemented slice, test evidence, and remaining work.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
