---
name: aif-testing-strategy
description: Design proportionate tests and feedback loops for specified behavior, including red-green-refactor where it provides reliable evidence. Use when acceptance criteria and existing test conventions are known.
---

# aif-testing-strategy

## Trigger

Use when acceptance criteria and existing test conventions are known. Do not trigger
to run unrelated suites or impose test-first mechanics on generated,
declarative, or throwaway artifacts without a useful behavior seam.

## Inputs

- acceptance criteria and existing test conventions
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Identify observable behavior, trust boundaries, failure modes, and the
   smallest reliable test seam.
2. Choose unit, contract, integration, process, compatibility, security, or UI
   coverage in proportion to risk. Prefer real behavior over mock assertions.
3. For new behavior and bug fixes, define a red-green-refactor loop when the
   seam can fail for the intended reason. Record why a different sequence is
   safer when no honest red phase is possible.
4. Include edge cases, cancellation, rollback, stale state, and cross-platform
   coverage only when applicable.
5. Order fast focused checks before the required full verification gate.

## Exact outputs

Return prioritized cases, test seams, red/green evidence plan, commands, and
the final verification boundary.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
