# Tool Adapters

Intentloom generates deterministic provider derivatives from the local canonical
catalog. It does not install provider tools, edit user-level configuration, or
make network calls. Generated files are owned only when their path, checksum,
adapter output version, and canonical sources are recorded in Intentloom metadata.

## Generated destinations

| Adapter     | Repository guidance                                                                        | Skills                                           | Profile-scoped output                                |
| ----------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------------------------- |
| Claude Code | `AGENTS.md`, `CLAUDE.md`                                                                   | `.claude/skills/<skill>/SKILL.md`                | None                                                 |
| Codex       | `AGENTS.md`                                                                                | `.agents/skills/<skill>/SKILL.md`                | None                                                 |
| Cursor      | `AGENTS.md`, `.cursor/rules/intentloom.mdc`                                                | `.agents/skills/<skill>/SKILL.md` (experimental) | `.cursor/rules/aif-<profile>.mdc`                    |
| Copilot     | `AGENTS.md`, `.github/copilot-instructions.md`, `.github/instructions/aif.instructions.md` | `.github/skills/<skill>/SKILL.md`                | `.github/instructions/aif-<profile>.instructions.md` |

Profile scopes are generated for `typescript`, `angular`, `rust`, `tauri`, and
`angular-tauri`. Globs always use forward slashes and deterministic ordering.
The `generic` profile uses the global rules only.

Every text derivative contains the framework version, adapter output version,
canonical-source provenance, and a content checksum. Frontmatter stays at byte
zero where a provider requires it.

## Shared destinations

Multi-adapter generation sorts and deduplicates adapter selections. Identical
`AGENTS.md` and `.agents/skills` derivatives are emitted once. A duplicate path
with different content, checksums, or provenance is a stable conflict and
aborts all writes. Adapter order does not change output.

Project-owned files are never claimed or overwritten. Removing an adapter
reports its previously owned files as orphaned and requires an explicit reviewed
migration; Intentloom does not delete them automatically.

## Capability limits

Intentloom deliberately does not generate Claude hooks, permissions, or subagents;
Codex user configuration or custom agents; Cursor legacy `.cursorrules` or
`.cursorignore`; or environment-specific Copilot agents/capabilities. Doctor
reports experimental and unsupported selections from the same normalized
contract used by generation.

Start with `--dry-run`, inspect `intentloom diff`, and resolve conflicts explicitly.
