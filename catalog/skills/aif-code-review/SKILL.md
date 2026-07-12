---
name: aif-code-review
description: Review a bounded diff for correctness, maintainability, and verification gaps.
---

# aif-code-review

## Trigger

Use only when the request matches this skill's stated purpose and has diff and relevant specification. Do not trigger to modify code.

## Inputs

- diff and relevant specification
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return actionable findings with severity and evidence.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
