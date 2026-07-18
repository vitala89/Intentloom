# Adapter and Cross-Platform Audit

Audit date: 2026-07-13. Fixed point: `c03728e`. Scope: adapter generation,
portable stored paths, packed runtime behavior, and the declared Node.js
engine. This audit precedes adapter or path implementation changes.

## Current generation path

`runCli()` resolves the configured profile and adapter list, `desired()` loads
the canonical catalog, and `generateAdapter()` converts catalog policies and
skills into provider derivatives. `plan()` checks destinations and ownership;
`synchronizeGeneratedFiles()` writes generated files transactionally, then
commits `.aif/manifest.lock.json` and `.aif/source-map.json`. Doctor compares
the selected adapters, adapter output version, desired destinations, ownership
records, and checksums without writing.

Canonical inputs are local `catalog/policies/*.md` and
`catalog/skills/*/SKILL.md`. Workflows and templates are loaded but are not
currently emitted by an adapter. Adapter output version is the
`adapterVersion` constant in `packages/adapters/src/index.ts`; framework
version comes from `packages/core/src/version.ts`.

## Normalized contract gap

All four adapters return `{ adapter, files, unsupported }`, but the interface
does not declare supported, shared-standard, experimental, or unsupported
capabilities; ownership, header support, validation, compatibility, and
migration notes are implicit. The switch is deterministic for one adapter,
but callers concatenate adapter results. Every adapter independently emits
`AGENTS.md`, producing duplicate destinations for multi-adapter configurations.

**Release blocker:** define one normalized adapter contract and one
multi-adapter resolver that deduplicates byte-identical shared outputs, rejects
non-identical duplicate destinations, sorts adapters and files, and retains
canonical-source provenance.

## Adapter inventory

### Claude Code

| Audit field             | Current state                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------- |
| Canonical inputs        | Selected policies and portable Agent Skills                                                        |
| Adapter version source  | `adapterVersion` in `packages/adapters/src/index.ts`                                               |
| Generated destinations  | `AGENTS.md`, `CLAUDE.md`, `.claude/skills/<name>/SKILL.md`                                         |
| Project-owned files     | Existing root instructions, skills, settings, hooks, permissions, and subagents                    |
| Official capabilities   | Root `CLAUDE.md`, file imports, project skills                                                     |
| Shared standard         | Agent Skills payload; `AGENTS.md` is imported through `CLAUDE.md`                                  |
| Experimental            | None emitted                                                                                       |
| Unsupported             | Hooks, permissions/settings, and subagents are not emitted                                         |
| Ownership               | All listed destinations are proposed as AIF-generated only when absent or already owned            |
| Path-specific files     | None                                                                                               |
| Skill destination       | `.claude/skills`                                                                                   |
| Header support          | Markdown header supported; present in generated instructions and skills                            |
| Fixture/packed coverage | One shared unit layout; no direct fixture or packed case                                           |
| Cross-platform risk     | Skill name interpolation relies on the generic stored-path validator                               |
| Duplicate risk          | `AGENTS.md` collides with every other adapter                                                      |
| Stale/migration         | Doctor can report stale version, drift, and orphan records; adapter removal is not directly tested |

**Release blocker:** add direct minimal/complete/conflict/drift/stale/removal,
idempotence, skill, unsupported-capability, and packed fixtures. Confirm that no
hook or permission file is generated.

### OpenAI Codex

| Audit field             | Current state                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Canonical inputs        | Selected policies and portable Agent Skills                                          |
| Adapter version source  | `adapterVersion` in `packages/adapters/src/index.ts`                                 |
| Generated destinations  | `AGENTS.md`, `.agents/skills/<name>/SKILL.md`                                        |
| Project-owned files     | Existing instructions, skills, and all user/project `.codex` configuration           |
| Official capabilities   | Repository and nested `AGENTS.md`; reusable skills                                   |
| Shared standard         | Agent Skills payload                                                                 |
| Experimental            | No experimental output emitted                                                       |
| Unsupported             | User/project `.codex/config.toml` is intentionally not generated                     |
| Ownership               | Generated destinations only; user-local configuration remains outside AIF ownership  |
| Path-specific files     | Root guidance only; nested hierarchy is not generated by the current profile model   |
| Skill destination       | `.agents/skills` compatibility location                                              |
| Header support          | Markdown header supported and present                                                |
| Fixture/packed coverage | One shared unit layout; no direct fixture or packed case                             |
| Cross-platform risk     | Same generic stored-path validator as other adapters                                 |
| Duplicate risk          | `AGENTS.md` collides with every other adapter; `.agents/skills` collides with Cursor |
| Stale/migration         | Generic doctor checks exist; no adapter-removal fixture                              |

**Release blocker:** add direct hierarchy-policy, skill, conflict, drift, stale,
removal, idempotence, no-local-config, unsupported-capability, and packed
fixtures. Shared identical outputs must be generated once.

### Cursor

| Audit field             | Current state                                                                     |
| ----------------------- | --------------------------------------------------------------------------------- |
| Canonical inputs        | Selected policies and portable Agent Skills                                       |
| Adapter version source  | `adapterVersion` in `packages/adapters/src/index.ts`                              |
| Generated destinations  | `AGENTS.md`, `.cursor/rules/aif-core.mdc`, `.agents/skills/<name>/SKILL.md`       |
| Project-owned files     | Existing rules/skills and unrelated `.cursor` content                             |
| Official capabilities   | Root `AGENTS.md`; project `.cursor/rules/*.mdc`; always/path-scoped rule metadata |
| Shared standard         | Agent Skills compatibility through `.agents/skills`                               |
| Experimental            | Agent Skills compatibility must remain explicitly classified                      |
| Unsupported             | Legacy `.cursorrules`; generic `.cursorignore` output                             |
| Ownership               | Current rules and shared skills only when absent/already owned                    |
| Path-specific files     | Only one always-applied rule; no profile-scoped rule is emitted                   |
| Skill destination       | `.agents/skills`                                                                  |
| Header support          | Markdown/MDC comments supported; generated header present after frontmatter       |
| Fixture/packed coverage | One shared unit layout; no direct fixture or packed case                          |
| Cross-platform risk     | Future globs need `/` separators and deterministic ordering                       |
| Duplicate risk          | `AGENTS.md` collides globally; skills collide with Codex                          |
| Stale/migration         | Legacy format is not generated; removal/stale behavior is untested                |

**Release blocker:** add current-rule, path-scope, project-owned, drift, stale,
removal, idempotence, legacy rejection, experimental skills, and packed
fixtures. Do not add legacy or ignore output without a documented profile
contract.

### GitHub Copilot

| Audit field             | Current state                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Canonical inputs        | Selected policies and portable Agent Skills                                                                                  |
| Adapter version source  | `adapterVersion` in `packages/adapters/src/index.ts`                                                                         |
| Generated destinations  | `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/aif.instructions.md`, `.github/skills/<name>/SKILL.md` |
| Project-owned files     | Existing instructions/skills and unrelated `.github` content                                                                 |
| Official capabilities   | Repository instructions, path-specific `.instructions.md`, `AGENTS.md` in supported environments, Agent Skills               |
| Shared standard         | Agent Skills and `AGENTS.md`, with environment-dependent support                                                             |
| Experimental            | AIF skill/custom-agent compatibility must be reported per surface; no custom agent is emitted                                |
| Unsupported             | Environment-specific custom agents and capabilities are not fabricated                                                       |
| Ownership               | Only listed generated files; unrelated `.github` content remains project-owned                                               |
| Path-specific files     | One `applyTo: "**"` instruction; no profile-specific scopes                                                                  |
| Skill destination       | `.github/skills`                                                                                                             |
| Header support          | Markdown/frontmatter supported; headers present after frontmatter                                                            |
| Fixture/packed coverage | One shared unit layout; no direct fixture or packed case                                                                     |
| Cross-platform risk     | `applyTo` globs must use deterministic `/` syntax                                                                            |
| Duplicate risk          | `AGENTS.md` collides with every other adapter                                                                                |
| Stale/migration         | Generic doctor checks exist; environment and removal cases are untested                                                      |

**Release blocker:** add repository/path instruction, multiple scope, conflict,
drift, stale, removal, idempotence, experimental/unsupported, deterministic
frontmatter, unrelated `.github` preservation, and packed fixtures.

## Portable path audit

`normalizeOutputPath()` currently rejects backslashes, leading `/`, drive
prefixes, empty segments, `.` and `..`. `resolveWithin()` relies on the host
`node:path` implementation. `destinationCollisionKey()` lowercases and applies
Unicode NFC, but builds on the same incomplete validator.

Missing host-independent Windows rules include UNC and extended prefixes,
root-relative and drive-relative paths, reserved device names (including names
with extensions), trailing spaces/dots, illegal colons, alternate separators,
drive-case normalization, and Windows-equivalent collisions. The current
validator also rejects rather than canonically converting safe backslash input,
so host paths and stored paths are not explicitly separated.

**Release blocker:** introduce a pure stored-path module whose interface
normalizes project-relative input to NFC and `/`, rejects absolute/external or
Windows-unsafe names, and returns a deterministic case-insensitive collision
key. Host filesystem resolution remains a separate operation and must never be
serialized.

**Required before stable 0.1.0:** execute the same repository gates in real
Windows CI. Simulated path semantics cannot be reported as real Windows
execution.

## Runtime engine audit

The root and CLI packages declare Node.js `>=24`; workspace library packages do
not declare an engine. Verification at the fixed point ran on Node 22.17 and
only produced an engine warning. Production code uses stable filesystem, path,
crypto, YAML, and ESM features available in Node 22. Installed dependency
requirements are: TypeScript `>=16.20`, Vitest `^20 || ^22 || >=24`, esbuild
`>=18`, and YAML `>=14.6`. No audited production API establishes a Node 24-only
requirement.

**Release blocker:** choose and document a minimum, align every published
workspace package, and test it directly. The evidence currently favors Node
`>=22`, provided Node 22 and Node 24 complete suites and packed runtimes pass.
If policy retains `>=24`, the exact policy/API requirement and an early runtime
failure must be documented and Node 24 must run locally or in CI.

Available local runtimes during audit: Node 22.17.0 and Node 26.3.1. Node 24 is
not installed, so no real Node 24 result is claimed.

## Classification summary

### Release blockers

- Normalized adapter capability contract and deterministic multi-adapter merge.
- Direct and packed fixtures for all four adapters and all-adapter output.
- Honest unsupported/experimental diagnostics and adapter-removal coverage.
- Portable stored-path normalization and comprehensive Windows semantics.
- Real Windows CI evidence.
- A documented engine decision with direct declared-minimum verification.

### Required before stable 0.1.0

- Profile-relevant snapshot trees and migration notes.
- Linux, macOS, and Windows CI at the supported Node minimum.
- Packed paths with spaces and Unicode on supported platforms.

### Recommended

- Keep fixture manifests concise and generate shared expected content once.
- Add a reusable adapter compatibility report formatter for future adapters.
- Test Node current in addition to the minimum without making it the contract.

### Later

- Provider-specific hooks, permissions, custom agents, user configuration,
  network integrations, and automatic migrations.

## External evidence basis

- Claude Code documentation: `CLAUDE.md`, imports, skills, hooks, and subagents.
- OpenAI Codex documentation: `AGENTS.md`, skills, and project configuration.
- Cursor documentation: project `.cursor/rules`, MDC scopes, root guidance, and
  deprecated `.cursorrules`.
- GitHub documentation: repository/path-specific Copilot instructions,
  environment support differences, Agent Skills, and custom agents.
- Node.js and installed dependency engine declarations for runtime support.

Provider capability claims are audit evidence, not canonical policy. AIF will
generate only the explicitly contracted subset and will not install hooks,
permissions, local user configuration, custom agents, or network behavior.

## Resolution evidence

The scoped implementation resolves the normalized contract, direct and packed
adapter fixtures, deterministic multi-adapter merge, profile-scoped rules,
adapter diagnostics/removal behavior, portable stored-path model, Node engine
decision, and direct Node 22/24 verification identified above.

The final local matrix contains 512 passing tests in 34 files on both Node
22.17.0 and checksum-verified Node 24.18.0. It includes 45 per-adapter fixture
cases, 34 multi-adapter cases, 10 committed profile snapshots, 12 packed adapter
process cases, and 30 independently reported stored-path cases. Typecheck,
lint, formatting, build, and `git diff --check` pass.

Compatibility CI runs the complete gates on Ubuntu, macOS, and Windows with
Node 22 and Node 24. The hosted
[Compatibility run 29374780862](https://github.com/vitala89/Intentloom/actions/runs/29374780862)
passed every job, including Windows Node 22 and Node 24. Cross-platform
compatibility is therefore **RESOLVED** for the audited matrix.
