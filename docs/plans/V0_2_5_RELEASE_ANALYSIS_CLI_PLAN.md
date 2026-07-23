# v0.2.5 Release Analysis CLI Plan

Expose the v0.2.4 release evidence analysis as a read-only CLI operation over
an explicit provider export and the local Git timeline.

## In scope

- `intentloom evidence analyze` with GitHub- or GitLab-shaped export input;
- explicit project-key and case-id isolation;
- deterministic JSON and human-readable output;
- bounded local Git and provider evidence through the existing package limits;
- exit code `3` for unavailable or conflicted evidence.

## Out of scope

- provider credentials, live APIs, polling, or network access;
- MCP exposure, hosted storage, or project writes;
- compliance, conformance, causality, or release-readiness claims.

## Exit evidence

The command must pass focused CLI tests, workspace typecheck and formatting,
and the full compatibility matrix where the host permits local daemon sockets.
