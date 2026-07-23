# ADR-0013: Deterministic release timeline normalization

## Status

Accepted

## Context

Local Git evidence is a bounded source of observed facts, not a conformance
claim. The next useful result is a reviewable release-case timeline that keeps
source provenance and clearly reports missing or bounded evidence.

## Decision

Add a pure `createReleaseTimeline` operation to `@intentloom/evidence-git`. It
accepts a release case identifier and a normalized `GitEvidenceResult`; it does
not invoke Git, read files, or infer approval, causality, or workflow
conformance. It emits commit events sorted by timestamp and commit ID, with
parents and changed project-relative paths copied from the source evidence.

Timeline quality is `complete`, `bounded`, or `unavailable`, derived solely
from the source status. Every event retains local-Git provenance and the
unverified trust state. Findings distinguish unavailable evidence from a
bounded limit; neither is a confirmed release violation.

## Consequences

The timeline is deterministic and safe to render in CLI or MCP adapters. Tag,
review, CI, provider, and approval events require later evidence sources and
are not synthesized from commits.
