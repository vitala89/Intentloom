# v0.1 Release Readiness Audit

> Historical AIF-era evidence record. It documents the audit performed on its
> stated date and is not the current Intentloom beta release record.

Initial audit date: 2026-07-13. Initial scope: repository state at `8709faa`
and the accepted v0.1 specification/ADRs. Release-preparation update:
2026-07-15 for local `0.1.0-alpha.1` metadata and package verification.

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
10. **Explicit-path Applye verification resolved.** The final read-only audit
    passed the writer gate, installed the 67-file `aif-core@0.1.0-alpha.0`
    tarball outside both repositories, and exercised positional `PROJECT_PATH`
    for adopt dry-run, doctor, diff, and sync dry-run. Two pre-command snapshots
    and every post-command/final snapshot were identical; repeated adoption and
    doctor output was deterministic. See
    `docs/audits/APPLYE_EXPLICIT_PATH_VERIFICATION.md`.

## Required before publication or stable 0.1.0

- Complete the npm authorization, package-owner, naming/trademark, and
  command-collision checks recorded in
  `docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md` before any publication.

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

The current local regression suite contains 522 passing tests and two
Windows-only command-shim tests skipped locally, with no failures. The packed
artifact exercises every adapter, all-adapter generation, no-op sync, doctor,
conflicts, spaces, Unicode, portable metadata, and stable version output.
Typecheck, lint, formatting, build, and `git diff --check` pass. The hosted
[Compatibility run 29374780862](https://github.com/vitala89/Intentloom/actions/runs/29374780862)
passed on Windows Node 22 and Node 24, as well as Linux and macOS.
The final external Applye verification is recorded separately in
`docs/audits/APPLYE_EXPLICIT_PATH_VERIFICATION.md`; it passed without modifying
the target checkout.

## Verdict

TECHNICALLY READY — `0.1.0-alpha.1` is prepared locally. Tagging and npm
publication remain separate, unperformed actions pending their authorization
gates.
