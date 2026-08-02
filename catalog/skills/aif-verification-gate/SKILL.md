---
name: aif-verification-gate
description: Verify a completed change against its acceptance criteria and repository checks before any completion, commit, or pull-request claim. Use at the end of implementation, bug fixing, refactoring, or generated-output updates.
metadata:
  aif-policy: "1"
---

# aif-verification-gate

## Trigger

Use before claiming a change is complete, fixed, safe, or ready for commit or
review. Do not trigger when no repository or artifact change is being evaluated.

## Inputs

- accepted brief, plan, or defect reproduction
- final diff and affected architecture boundaries
- repository validation commands and documentation obligations

## Procedure

1. Map every acceptance criterion and claimed behavior to fresh evidence.
2. Run the strongest relevant focused checks, then the required repository-wide
   checks. Read exit codes and complete summaries; do not infer success from a
   partial check.
3. Inspect the final diff for scope creep, unsafe side effects, generated-file
   drift, dependency direction, code budgets, and missing tests or docs.
4. Re-run the original defect reproduction for bug fixes and record unavailable
   or failed checks without softening their status.
5. Confirm required state, roadmap, changelog, migration, and handoff records.

## Exact outputs

Return a criterion-by-criterion verdict, commands and outcomes, unresolved
findings, compatibility impact, and `ready`, `partial`, or `blocked` status.

## Stop conditions

Stop with `partial` or `blocked` when required evidence is missing or failing.
Never create a success claim, commit, push, or pull request from this skill.
