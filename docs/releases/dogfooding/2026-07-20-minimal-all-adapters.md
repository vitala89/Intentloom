# Intentloom dogfooding record: minimal all-adapter project

**Date:** 2026-07-20
**Intentloom version:** `0.1.0-alpha.3` development build at `10fa2ef`
**Scenario:** minimal
**Project:** newly created local empty project
**Profile and adapters:** generic; Claude Code, Codex, Cursor, Copilot
**Environment:** Node `22.17.0`; macOS `26.5.2`

## Commands and evidence

- `intentloom init --profile generic --adapters claude,codex,cursor,copilot`:
  exit `0`; created the reviewed Intentloom metadata and provider-visible files.
- `intentloom doctor --json`: exit `0`; no error findings and no
  `instruction-files-conflicting` finding.
- `intentloom sync --dry-run`: exit `0`; `Created: 0`, `Updated: 0`,
  `Unchanged: 58`; the CLI confirmed that no files were changed.

## Compatibility observations

- Generated output covered shared instructions, adapter-specific instruction
  roots, skills, Cursor rules, and Copilot instructions.
- Config, manifest lock, and source map were accepted as schema version `1`.
- Adapter capability information remained visible as warnings or information;
  it did not conceal an error.
- An earlier doctor false positive for owned multi-adapter instruction roots was
  corrected before this final run.

## Conclusion

Pass

The fresh multi-adapter installation is healthy and idempotent after a dry-run
sync. It is evidence for the generated-output portion of the beta decision.
