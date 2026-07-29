# Intentloom dogfooding record: v1 candidate minimal project

**Date:** 2026-07-29
**Intentloom source tree:** `main` candidate `46a278c` (tree identical to the
working candidate before this documentation update)
**CLI artifact:** local `intentloom@0.5.0-beta.1` tarball from that tree
**Scenario:** minimal
**Project:** newly created isolated local empty project
**Profile and adapters:** generic; Claude Code, Codex, Cursor, Copilot
**Environment:** Node 22; macOS arm64

## Commands and evidence

- Clean-room npm installation with lifecycle scripts disabled: exit `0`; the
  installed CLI reported `0.5.0-beta.1` and rendered help.
- `intentloom init --root <project> --profile generic --adapters claude,codex,cursor,copilot`:
  exit `0`; generated the reviewed governance, metadata, and provider-visible
  paths in the temporary project.
- `intentloom doctor --root <project> --json`: exit `0`; no errors. Adapter
  capability warnings and informational unsupported-capability findings remained
  visible.
- `intentloom sync --root <project> --dry-run --json`: exit `0`; no creates or
  updates were planned and all generated paths were reported unchanged.

## Compatibility observations

- The packaged CLI worked from an unrelated runner directory and used only the
  explicit project root.
- Generic profile detection and all four adapter declarations remained stable.
- The project was not inspected through provider credentials or network calls.

## Conclusion

Pass as supplemental candidate evidence.

This is a newly created local scenario, not a claim about an external project.
It supports the minimal-project behavior on the current candidate but does not
replace maintainer acceptance or refresh of the historical real-project record.
