---
name: aif-feature-discovery
description: Turn an ambiguous product or engineering idea into a reviewable feature brief through a focused interview and alternatives analysis. Use before specification or planning when new behavior, constraints, or success criteria are unsettled.
metadata:
  aif-policy: "1"
---

# aif-feature-discovery

## Trigger

Use when a proposed feature has meaningful ambiguity, multiple plausible
approaches, or unresolved architecture and risk decisions. Do not trigger for a
small change with accepted behavior and testable acceptance criteria.

## Inputs

- product idea or requested behavior
- relevant project state, domain terms, specifications, and ADRs
- known users, constraints, risks, and compatibility expectations

## Procedure

1. Inspect the smallest relevant project context before asking questions.
2. Ask one high-value question at a time about the problem, users, constraints,
   failure modes, and success criteria. Prefer a recommended choice when options
   are known.
3. Present two or three materially different approaches with trade-offs and a
   recommendation. Remove scope that lacks a demonstrated need.
4. Check component boundaries, data flow, error and cancellation behavior,
   security and privacy impact, compatibility, rollback, and testing seams.
5. Summarize the proposed brief in reviewable sections and obtain user approval.
   Prepare documentation changes only when the user requested writes.

## Exact outputs

Return an approved or pending feature brief with problem, users, constraints,
non-goals, selected approach, alternatives, acceptance criteria, risks,
unknowns, and required follow-up decisions.

## Stop conditions

Stop when the brief is accepted, the idea is rejected or deferred, or one
material decision prevents an honest specification. Do not implement or commit
from this skill.
