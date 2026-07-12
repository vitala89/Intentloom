# Contributing to AIF

Thank you for improving a vendor-neutral framework for AI-assisted engineering.

## Before proposing a change

- Check the v0.1 specification, architecture, and ADRs for the intended boundary.
- Propose an ADR when a change affects canonical ownership, compatibility, security posture, or adoption safety.
- Keep provider-specific syntax in adapters, never in the canonical catalog.
- Do not add runtime code, CLI code, dependencies, hooks, or agent configuration while v0.1 is documentation-only.

## Documentation standards

Use concise Markdown, state assumptions and unresolved choices explicitly, and cite primary documentation for claims about provider behavior. Avoid duplicating canonical content: link to the owning document.

## Validation

Run the repository's Markdown formatter if configured, then run `git diff --check`. Future implementation pull requests must add tests and fixtures appropriate to changed schemas or adapters.

## Governance

Changes that alter supported tools, generated file ownership, security boundaries, or versioning require maintainer review and normally an ADR.
