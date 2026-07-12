---
name: aif-docs-sync
description: Synchronize documentation with a verified behavior or interface change.
---

# aif-docs-sync

## Trigger

Use only when the request matches this skill's stated purpose and has changed behavior and canonical documentation paths. Do not trigger before the underlying decision is settled.

## Inputs

- changed behavior and canonical documentation paths
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Read only the smallest relevant canonical sources.
2. Perform the bounded task directly; do not spawn subagents for this bounded work.
3. Keep stack-specific assumptions out of the result.

## Exact outputs

Return documentation updates or stale-documentation report.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
