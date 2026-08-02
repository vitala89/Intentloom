---
name: aif-planning-review
description: Review an implementation plan for scope, dependencies, architecture, risk, rollback, and verification gaps. Use after feature discovery or specification and before implementation begins.
---

# aif-planning-review

## Trigger

Use only when the request matches this skill's stated purpose and has a proposed plan. Do not trigger to implement the plan.

## Inputs

- a proposed plan
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Compare the plan with the accepted brief, specifications, ADRs, and current
   repository evidence.
2. Check that each step is independently reviewable, names affected boundaries,
   has acceptance evidence, and does not silently broaden scope.
3. Identify ordering and blocking edges, migration or rollback needs, required
   approvals, test seams, and documentation updates.
4. Flag speculative abstractions, unsafe parallel work, hidden external side
   effects, and steps that cannot be verified.

## Exact outputs

Return blocking gaps, non-blocking improvements, assumptions, required
approvals, and the first executable step.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
