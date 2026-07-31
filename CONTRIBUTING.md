# Contributing to Intentloom

Thank you for improving a vendor-neutral framework for AI-assisted engineering.

## Before proposing a change

- Check the v0.1 specification, architecture, and ADRs for the intended boundary.
- Read `docs/governance/CODE_QUALITY_STANDARDS.md` before changing
  implementation code.
- Propose an ADR when a change affects canonical ownership, compatibility,
  security posture, or adoption safety.
- Keep provider-specific syntax in adapters, never in the canonical catalog.
- Keep canonical core changes vendor-neutral and place provider syntax only in
  adapters.
- Do not add dependencies, hidden network access, telemetry, hooks, or automatic
  installation without an explicit product decision and documentation.

## Code quality

- Prefer hand-written production files at or below 250 formatted lines.
- Begin refactoring review above 300 lines.
- Do not create or substantially expand a production file beyond 400 lines
  without an approved exception recorded in the pull request.
- Prefer functions at or below 40 lines and do not exceed 80 lines without an
  approved exception.
- Existing oversized files must not grow by default. Extract a cohesive
  responsibility when meaningfully changing one, or record a concrete
  decomposition follow-up.
- Preserve dependency direction toward stable domain, application, and protocol
  contracts. Keep transport, UI, filesystem, provider, and framework details at
  the edges.
- Add tests for behavior changes and regression tests for bug fixes when safely
  expressible.
- Use SOLID and Clean Architecture to reduce coupling, not to introduce unused
  interfaces, layers, packages, or services.

Generated files, vendored code, lockfiles, snapshots, machine-produced schemas,
and declarative data tables follow the exemptions defined in the governance
document.

## Documentation standards

Use concise Markdown, state assumptions and unresolved choices explicitly, and
cite primary documentation for claims about provider or framework behavior.
Avoid duplicating canonical content: link to the owning document.

## Validation

Run the repository's relevant checks, then run `git diff --check`. Documentation
changes must pass the Markdown formatter when configured. Implementation pull
requests must add tests and fixtures appropriate to changed schemas or adapters.

Also review formatted file and function budgets, dependency direction, and any
applicable domain checks. Rust changes should run `cargo fmt`, relevant tests,
and selected Clippy checks. Tauri changes require an explicit review of
capabilities, permissions, scopes, IPC validation, and the native command
allowlist.

## Governance

Changes that alter supported tools, generated file ownership, security
boundaries, versioning, or the mandatory engineering baseline require maintainer
review and normally an ADR.

A code-quality exception must identify the rule, measured value, configured
limit, reason, scope, responsible area, and expiry or review trigger.

## Delivery workflow

1. Create a focused branch for each task.
2. Open a pull request with its scope, validation, architecture impact,
   decomposition evidence, exceptions, and changelog impact.
3. Update `CHANGELOG.md` in the same PR when the change is user-visible.
4. Merge only after required checks and review pass.
5. Verify the resulting `main` commit before beginning release work.

Commit and pull request text must not contain `Co-Authored-By` trailers,
generated-with footers, or other attribution for an assistant, model, agent,
tool, or bot.

Version changes, tags, and publication are release-only actions; see the
[release process](docs/releases/RELEASE_PROCESS.md) and
[versioning policy](docs/releases/VERSIONING.md).
