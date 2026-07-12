# v0.1 Release Readiness Audit

Audit date: 2026-07-13. Scope: repository state at `8709faa` and the accepted v0.1 specification/ADRs.

## Blockers

1. **Clean CLI runtime is not verified and currently fails without workspace links.** Running built `packages/cli/dist/bin.js` failed to resolve `@aif/adapters`. Package exports point at TypeScript source while the CLI bin points at `dist`; package metadata does not yet define a publishable, self-consistent artifact layout.
2. **Generated ownership safety is incomplete.** `sync --force` classifies every changed destination as update and does not read `.aif/source-map.json` before replacement. This can overwrite a project-owned file, contrary to ADR-0003.
3. **Schema implementation is placeholder-level.** Six of seven schemas only require `schemaVersion`; the validator does not validate against catalog schemas, source maps, or locks comprehensively.
4. **Required CLI behavior and coverage are incomplete.** `adopt` does not inspect stack evidence, documents, duplication, or map existing files; `doctor` does not validate imports/capabilities/edited generated files; no persisted adapter fixtures, snapshots, partial-write, Windows-path, or real CLI smoke tests exist.
5. **Release package naming is unresolved.** Root package is private `aif-core`; workspace packages use provisional `@aif/*` names without repository, homepage, bugs, license, files, publishConfig, or publishability decision.

## Required before stable 0.1.0

- Resolve all blockers, add clean-install and packaged CLI smoke coverage, and verify all four adapter fixtures from the real catalog.
- Establish source-map-based ownership and rollback semantics; prove no project-owned file is overwritten.
- Complete JSON schemas and schema-driven validation; add migration tests.
- Execute an Applye dry-run only after an explicit repository path is supplied.

## Recommended

- Replace repeated generic guide text with command-specific content.
- Add a deterministic version synchronization check for lockstep packages.
- Remove unused CLI imports and add explicit CLI exit-code tests.

## Later

- Publishable package layout, registry naming, release automation, and stable-1.0 compatibility commitments.

## Adapter status

| Adapter     | Supported output                 | Fixture tested   | Limitation                                               |
| ----------- | -------------------------------- | ---------------- | -------------------------------------------------------- |
| Claude Code | `AGENTS.md`, `CLAUDE.md`, skills | Unit layout only | No real fixture/clean CLI test                           |
| Codex       | `AGENTS.md`, skills              | Unit layout only | No real fixture/clean CLI test                           |
| Cursor      | `AGENTS.md`, `.mdc` rule, skills | Unit layout only | `.cursorignore` profile output absent                    |
| Copilot     | instructions, skills             | Unit layout only | Environment-specific agent support intentionally omitted |

## Verification observed

Typecheck, lint, formatting, build, and eight unit tests passed in the workspace. A direct built-CLI smoke test failed because workspace package resolution was unavailable. Applye dry-run was not run: no explicit path was provided.

## Verdict

NOT READY
