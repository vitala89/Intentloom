# ADR-0037: Deterministic workflow variant summary boundary

- **Status:** Proposed
- **Date:** 2026-07-26

## Context

Intentloom can already normalize one explicit workflow timeline and evaluate it
against a declared policy. The next Engineering Process Intelligence candidate
must not turn those operations into surveillance, causal inference, a hidden
data collector, or a second catalog of engineering intent.

The smallest useful next question is descriptive:

> For explicitly supplied, compatible workflow timelines, which normalized
> activity sequences recur and how often?

## Decision

Define a pure, local `summarizeWorkflowVariants` operation over an explicitly
provided set of at least two `GenericTimeline` values of one case type.

The operation will:

1. validate every timeline through the canonical protocol contract;
2. reject mixed case types and duplicate case identifiers;
3. derive each variant solely from the ordered activity names in that timeline;
4. return deterministic variant identifiers, occurrence counts, and only the
   supplied case identifiers;
5. report incomplete timestamp coverage as a quality fact without inferring a
   delay, bottleneck, individual performance, or causality.

The operation will not read the working tree, Git history, provider APIs, or
stored timeline files. It will not persist input or output. It will not return
actors, commit messages, source payloads, repository paths, or raw evidence
content.

## Consequences

- Variant reports remain a read-only, provider-neutral derived view over
  caller-owned evidence.
- Identical inputs produce byte-for-byte equivalent variants apart from an
  explicit operation timestamp, if one is later added.
- Bottleneck claims, rankings, recommendations, remote ingestion, and
  model-assisted interpretation remain excluded until a separate decision and
  threat review approve them.
- `@intentloom/protocol` will own any resulting request, report, and validator
  contracts; `@intentloom/evidence-analysis` will own the pure algorithm.
