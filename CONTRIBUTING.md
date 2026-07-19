# Contributing to Intentloom

Thank you for improving a vendor-neutral framework for AI-assisted engineering.

## Before proposing a change

- Check the v0.1 specification, architecture, and ADRs for the intended boundary.
- Propose an ADR when a change affects canonical ownership, compatibility, security posture, or adoption safety.
- Keep provider-specific syntax in adapters, never in the canonical catalog.
- Keep canonical core changes vendor-neutral and place provider syntax only in
  adapters.
- Do not add dependencies, hidden network access, telemetry, hooks, or automatic
  installation without an explicit product decision and documentation.

## Documentation standards

Use concise Markdown, state assumptions and unresolved choices explicitly, and cite primary documentation for claims about provider behavior. Avoid duplicating canonical content: link to the owning document.

## Validation

Run the repository's relevant checks, then run `git diff --check`. Documentation
changes must pass the Markdown formatter when configured. Implementation pull
requests must add tests and fixtures appropriate to changed schemas or adapters.

## Governance

Changes that alter supported tools, generated file ownership, security boundaries, or versioning require maintainer review and normally an ADR.

## Delivery workflow

1. Create a focused branch for each task.
2. Open a pull request with its scope, validation, and changelog impact.
3. Update `CHANGELOG.md` in the same PR when the change is user-visible.
4. Merge only after required checks and review pass.
5. Verify the resulting `main` commit before beginning release work.

Version changes, tags, and publication are release-only actions; see the
[release process](docs/releases/RELEASE_PROCESS.md) and
[versioning policy](docs/releases/VERSIONING.md).
