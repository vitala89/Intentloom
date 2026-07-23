# v0.2.3 Provider Export Adapters Plan

## Outcome

Import explicitly supplied GitHub and GitLab export payloads as bounded,
vendor-neutral evidence. The first increment has no credentials, network calls,
background polling, or project writes.

## In scope

- a versioned `@intentloom/evidence-provider` normalizer;
- GitHub- and GitLab-shaped record collections for pull/merge requests, reviews,
  checks/pipelines, releases, and commit provenance;
- explicit project isolation through a caller-supplied project key;
- deterministic ordering and identifiers;
- bounded record and string limits;
- untrusted-input trust state and diagnostics;
- fixtures proving redaction, invalid input, and bounded behavior.

## Out of scope

- provider credentials or live APIs;
- network access, polling, hosted storage, or cross-project discovery;
- conformance, causality, or release-readiness claims;
- automatic CLI ingestion or mutation.

## Exit evidence

The package must pass typecheck, formatting, deterministic fixture tests, and
the full workspace test matrix before it is exposed through a CLI command.
