# Intentloom rename notes

`0.1.0-alpha.2` renames the active product identity from AIF (Agentic
Engineering Framework) to Intentloom before its first public npm publication.
The historical `v0.1.0-alpha.1` AIF tag remains unchanged.

## Public surfaces

- Product: Intentloom
- npm package and CLI: `intentloom`
- Documentation proposal: `intentloom.vitaliikasap.com`
- GitHub description proposal: Vendor-neutral framework for defining,
  validating, and synchronizing engineering intent across Claude Code, Codex,
  Cursor, and GitHub Copilot.
- GitHub topics proposal: `ai`, `ai-agents`, `agentic-engineering`,
  `developer-tools`, `cli`, `codex`, `claude-code`, `cursor`,
  `github-copilot`, `typescript`, `automation`, `software-engineering`.

Repository metadata, visibility, DNS, and npm publication are not changed by
this repository update.

## Compatibility-sensitive identifiers

| Identifier                     | Current value                  | Proposed value  | Decision | Rationale and impact                                                                     |
| ------------------------------ | ------------------------------ | --------------- | -------- | ---------------------------------------------------------------------------------------- |
| Project metadata directory     | `.aif`                         | `.aif`          | Retained | Persisted v0.1 project state; renaming would require an on-disk migration.               |
| Schema and semantic IDs        | `urn:aif:*`                    | `urn:aif:*`     | Retained | Stable schema/protocol identifiers are not public package branding.                      |
| Ownership values               | `aif-owned-generated`, `aif-*` | unchanged       | Retained | Stored manifest/source-map values; changing them would invalidate ownership recognition. |
| Transaction adapter ID         | `aif:generated-files`          | unchanged       | Retained | Persisted metadata value with no user-facing installation role.                          |
| Catalog skill filenames        | `aif-*`                        | unchanged       | Retained | Canonical catalog source paths are stable inputs to generated state.                     |
| Generated adapter destinations | `aif-*` where product-facing   | `intentloom-*`  | Changed  | New, not-yet-published public adapter names should carry the approved brand.             |
| Workspace packages             | `@aif/*`                       | `@intentloom/*` | Changed  | Private implementation names now match the active identity.                              |

No automatic migration runs. Existing pre-publication development projects can
continue to use `.aif` metadata; the CLI recognizes it without a compatibility
alias.
