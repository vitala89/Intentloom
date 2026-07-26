# ADR-0025: Semantic Memory Retrieval and Portable Rendering

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate M3 provides deterministic local retrieval as the default memory experience. `.aif/memory/index.json` is rebuildable derived state containing only accepted record identifiers; clearing it never removes canonical records. Portable render targets consume the same bounded application operation and are not independent memory authorities.

External embedding or reranking providers remain disabled unless a future operation supplies explicit provider identity, network destination, model, retention policy, data scope, and user approval. M3 performs no network calls, model downloads, background indexing, or provider transmission.

## Consequences

The local baseline is portable, inspectable, and deterministic. Optional semantic providers require a separately reviewed adapter and disclosure flow.
