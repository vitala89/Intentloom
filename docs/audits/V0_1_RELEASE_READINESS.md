# v0.1 Release Readiness Audit

Audit date: 2026-07-13. Scope: repository state at `8709faa` and the accepted v0.1 specification/ADRs.

## CLI sync path finding

Before the transactional CLI integration, `bin.ts` called the legacy `syncProject` plan/apply path, printed raw plan changes, and never received `TransactionResult`. It therefore discarded the failed stage, consistency status, cleanup status, rollback completion, and rollback failure paths. Conflicts used exit `2`, caught exceptions used generic exit `1`, and security-error plans could be treated as successful because only `conflict` changes affected the exit code. It did not reconstruct success from a later filesystem check and normal catches printed messages rather than stacks, but rollback state was unavailable to the formatter.

The current path is `bin.ts → runCli() → syncProject() → synchronizeGeneratedFiles() → TransactionResult → CLI outcome mapper → human/JSON formatter → stable exit code`.

## Blockers

1. **Clean CLI runtime blocker resolved.** The CLI packs a self-contained `dist/aif.cjs` bundle and runtime catalog. Isolated tarball installation now executes successful sync, no-op sync, dry-run, help, and version outside the monorepo.
2. **Filesystem-security sub-blocker resolved.** Real symlink tests, commit-time revalidation, deterministic collision reporting, reversed-order execution, and byte-for-byte collision-abort snapshots pass.
3. **Ownership/sync blocker resolved.** The real CLI directly consumes the structured transaction result. Success, conflict, restored failure, and incomplete rollback use distinct stable exit codes; dry-run is write-free; diagnostics are content-safe; and 47 process-level cases cover human/JSON output, transaction faults, redaction, and packed runtime. The post-write validator retains its 34 corruption and 23 success cases.
4. **Schema-driven validation blocker resolved.** Eight locally bundled versioned schemas now drive runtime structural validation. Hardened JSON/YAML parsing, strict unknown fields, stable redacted diagnostics, pre-semantic/pre-write CLI integration, Agent Skill policy validation, doctor aggregation, and isolated packed-runtime schema validation are covered by dedicated tests.
5. **Required adoption/doctor behavior and fixture coverage are incomplete.** `adopt` does not inspect stack evidence, documents, duplication, or map existing files; `doctor` does not validate imports/capabilities/edited generated files; persisted all-adapter and Windows-path fixtures remain incomplete.
6. **Release package naming is unresolved.** Root package is private `aif-core`; workspace packages use provisional `@aif/*` names without repository, homepage, bugs, license, files, publishConfig, or publishability decision.

## Required before stable 0.1.0

- Resolve all remaining blockers and verify all four adapter fixtures from the real catalog.
- Expand adoption/doctor behavior and all-adapter/Windows fixtures without weakening schema gates.
- Execute an Applye dry-run only after an explicit repository path is supplied.

## Recommended

- Replace repeated generic guide text with command-specific content.
- Add a deterministic version synchronization check for lockstep packages.
- Remove unused CLI imports as modules are further separated.

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

The complete suite contains 294 passing tests with no failures or skips: the
171-test baseline plus 123 schema-validation tests. It includes 63 process-level
CLI cases and five packed-runtime cases. The schema-specific coverage comprises
95 schema/skill/semantic cases, 12 parser-security cases, and 16 built-CLI
process cases. The packed artifact performs schema-validated init/sync, no-op
sync, dry-run, help, and version outside the monorepo; a second build produces an
identical schema bundle, and tarball inspection excludes tests, fixtures, and
secret files. Typecheck, lint, formatting, build, and `git diff --check` pass.
Applye dry-run was not run because it is outside this task and no explicit path
was provided.

## Verdict

NOT READY
