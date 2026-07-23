# ADR-0016: Read-only release analysis CLI boundary

- Status: Accepted
- Date: 2026-07-23

## Context

v0.2.4 provides a deterministic release evidence analysis operation, but it is
only callable as a package function. The next adoption step needs a local
entrypoint that can combine one explicit provider export with one local Git
timeline without introducing credentials, network calls, or project mutation.

## Decision

Expose `intentloom evidence analyze` with required `--provider`, `--file`, and
`--project-key` options and optional `--root`, `--case-id`, and `--json` options.
The command reuses the provider normalizer, local Git collector, release
timeline normalizer, and analysis package. It emits the resulting report only;
it does not persist imports or write to the project.

Exit code `3` denotes unavailable or conflicted evidence. Bounded evidence is a
successful, explicitly qualified result. The existing `evidence import`
command remains unchanged.

## Consequences

- Release analysis can be dogfooded locally with exported evidence files.
- The CLI remains offline, deterministic, and project-key isolated.
- MCP exposure remains a later adapter over the same package operation.
