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
5. **Adoption/doctor fixture blocker resolved.** Adoption now returns deterministic ownership-safe proposals, detects profiles from bounded file evidence, maps existing documentation without claiming it, and applies clean accepted proposals through transactional sync. Doctor returns sorted severity/category/remediation findings for partial, malformed, stale, conflicting, orphaned, drifted, and unsafe state. Sixteen reusable fixture groups, 22 existing-state doctor cases, immutable-state proofs, and ten packed-runtime cases cover the required matrix.
6. **Adapter fixture blocker resolved.** Normalized Claude Code, Codex, Cursor,
   and Copilot contracts drive deterministic single- and multi-adapter output,
   honest diagnostics, profile scopes, ownership conflicts, migration/removal,
   real-catalog fixtures, and installed-tarball tests.
7. **Cross-platform fixture and host-evidence sub-blocker resolved.** Thirty
   stored-path cases cover Windows prefixes, devices, separators, Unicode,
   collisions, unsafe names, spaces, and long paths. The complete Node 22/24
   suite passed on hosted Linux, macOS, and Windows runners.
8. **Runtime engine blocker resolved.** ADR-0005 sets Node 22 as the consistent
   workspace minimum and bundle target. Complete 512-test suites pass locally on
   Node 22.17.0 and checksum-verified Node 24.18.0.
9. **Release package naming is partially resolved.** `aif-core` is the planned
   public CLI package and `aif` its binary; the root workspace and `@aif/*`
   implementation packages remain private. Metadata, deterministic tarball,
   clean-room installs, and publish dry-run are recorded in
   `docs/audits/PACKAGE_PUBLISH_READINESS.md`. Actual npm identity/package-owner
   authorization, command-collision review, and documented legal/trademark
   review remain required before publication.
10. **Explicit-path Applye verification remains open.** The initial packed-CLI
    audit halted when the target's pre-existing Git state diverged. It exposed
    and corrected positional project-path parsing in AIF, but a clean stable
    baseline is still required before real-project immutability, adoption,
    doctor, diff, and sync dry-run evidence can be accepted. See
    `docs/audits/APPLYE_EXPLICIT_PATH_VERIFICATION.md`.

## Required before stable 0.1.0

- Resolve all remaining blockers and verify all four adapter fixtures from the real catalog.
- Execute an Applye dry-run only after an explicit repository path is supplied.

## Recommended

- Replace repeated generic guide text with command-specific content.
- Add a deterministic version synchronization check for lockstep packages.
- Remove unused CLI imports as modules are further separated.

## Later

- Actual package publication, release automation, and stable-1.0 compatibility commitments.

## Adapter status

| Adapter     | Supported output                         | Fixture tested                         | Limitation                                                  |
| ----------- | ---------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| Claude Code | `AGENTS.md`, `CLAUDE.md`, skills         | Direct, multi, snapshot, packed        | Hooks, permissions, and subagents intentionally omitted     |
| Codex       | `AGENTS.md`, skills                      | Direct, multi, snapshot, packed        | User configuration and custom agents intentionally omitted  |
| Cursor      | `AGENTS.md`, `.mdc` rules, shared skills | Direct, multi, scoped snapshot, packed | Skills experimental; legacy rules and ignore output omitted |
| Copilot     | repository/path instructions, skills     | Direct, multi, scoped snapshot, packed | Environment-specific custom agents intentionally omitted    |

## Verification observed

The complete suite contains 512 passing tests in 34 files with no failures or
skips on both Node 22.17.0 and checksum-verified Node 24.18.0. The packed
artifact exercises every adapter, all-adapter generation, no-op sync, doctor,
conflicts, spaces, Unicode, portable metadata, and stable version output.
Typecheck, lint, formatting, build, and `git diff --check` pass. The hosted
[Compatibility run 29374780862](https://github.com/vitala89/aif-core/actions/runs/29374780862)
passed on Windows Node 22 and Node 24, as well as Linux and macOS.
Applye dry-run was not run because it is outside this task and no explicit path
was provided.

## Verdict

NOT READY
