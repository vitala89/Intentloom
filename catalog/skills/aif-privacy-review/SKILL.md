---
name: aif-privacy-review
description: Review data handling for collection, retention, exposure, and minimization concerns.
---

# aif-privacy-review

## Trigger

Use only when the request matches this skill's stated purpose and has data flow and changed artifacts. Do not trigger if no personal or sensitive data is in scope.

## Inputs

- data flow and changed artifacts
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return privacy findings and required decisions.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
