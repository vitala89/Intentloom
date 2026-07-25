# ADR-0024: Accepted Persistent Memory Lifecycle

- **Status**: Accepted
- **Date**: 2026-07-26
- **Authors**: Intentloom Maintainers

## Context

Project-scoped memory can preserve useful engineering decisions between agent
sessions, but it also creates a durable prompt-injection and data-retention
surface. Repository text, imports, and model output must not become trusted
project knowledge merely because they were persisted.

## Decision

Candidate M2 stores versioned records only inside the selected project's
`.aif/memory/items/` root. Every record has a stable ID, classification, trust
class, lifecycle state, provenance, retention state, and audit trail.

- New and imported records are proposals, never accepted records.
- Accepting a record requires an explicit approval object with evidence; the
  operation revalidates the proposal before atomically replacing its record.
- Supersession retains the replaced record as history. Forgetting only marks
  eligible records deleted and retains a minimal audit action.
- Export is a versioned bundle. Import checks the project identity, rejects
  canonical classifications, redacts content, and creates new proposals rather
  than silently overriding existing records.

## Consequences

The first persistent-memory implementation is local, provider-neutral, and
auditable. It intentionally does not add semantic indexing, background
collection, shared-project memory, encryption services, or network transport.
