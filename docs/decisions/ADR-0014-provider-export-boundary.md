# ADR-0014: Explicit Provider Export Boundary

- Status: Accepted
- Date: 2026-07-23

## Context

The v0.2.3 roadmap milestone needs GitHub and GitLab workflow evidence, but
provider credentials and live network access would expand the trust boundary
before the evidence model is stable.

## Decision

Provider evidence is imported only from caller-supplied payloads through a
private, bounded workspace package. The normalizer:

- accepts one explicit provider and one explicit project key;
- supports GitHub- and GitLab-shaped record collections without trusting the
  payload's provider or project claims;
- emits deterministic, source-provenance-preserving event identifiers;
- omits actor identities and arbitrary provider fields;
- caps records and string lengths, reports truncation, and marks all records as
  `provider-supplied-unverified`;
- performs no credentials lookup, network access, subprocess execution, or
  project-file write.

## Consequences

Export fixtures can be compared across providers without making provider
objects part of the canonical core. CLI and MCP adapters can reuse this
operation later, after the import contract has been dogfooded.
