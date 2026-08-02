---
name: aif-code-review
description: Review a bounded diff independently against repository standards and the originating specification, then report correctness and verification gaps. Use for branch, pull-request, or work-in-progress review without modifying code.
---

# aif-code-review

## Trigger

Use when a fixed comparison point, non-empty diff, and relevant specification or
explicit statement that none exists are available. Do not trigger to modify code.

## Inputs

- fixed comparison point, diff, and relevant specification
- Any explicitly relevant canonical policy or workflow.

## Procedure

1. Verify the comparison point and inspect the complete bounded diff.
2. Review the standards axis against repository rules, architecture boundaries,
   code budgets, and maintainability. Treat general code smells as judgment,
   while explicit repository rules remain binding.
3. Review the specification axis independently for missing behavior, incorrect
   behavior, scope creep, and compatibility impact. State when no specification
   is available.
4. Review test and verification evidence. Route security or privacy-sensitive
   changes through their dedicated reviews rather than claiming coverage here.
5. Report only actionable findings with tight evidence and severity.

## Exact outputs

Return separate standards and specification findings, verification gaps, and a
one-line count and worst severity for each axis.

## Stop conditions

Stop when the output is complete, a required input is absent, or a decision outside the request is needed. State the blocker rather than guessing.
