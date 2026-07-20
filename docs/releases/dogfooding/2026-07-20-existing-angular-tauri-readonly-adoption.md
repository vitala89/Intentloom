# Intentloom dogfooding record: existing Angular + Tauri approved adoption

**Date:** 2026-07-20
**Intentloom version:** `0.1.0-alpha.3` development build after `4e13ca5`
**Scenario:** existing-project
**Project:** existing local Angular + Tauri application; identity and path withheld
**Profile and adapters:** angular-tauri; Codex
**Environment:** Node `22.17.0`; macOS `26.5.2`

## Commands and evidence

- `intentloom adopt --dry-run --json` with explicit self-mappings for
  `AGENTS.md`, `README.md`, `ROADMAP.md`, and `docs/architecture.md`: exit
  `0`; proposed 21 safe creates with no conflicts or manual decisions.
- `intentloom adopt --json` with the same mappings: exit `0`; applied all 21
  creates. The transaction reported `success`, no failed stage, and no rollback
  attempt.
- `intentloom doctor --json`: exit `0`; no error findings. Existing provider
  skills stayed project-owned and outside Intentloom's source-map ownership
  boundary. The remaining instruction-root finding is a warning.
- `intentloom sync --dry-run`: exit `0`; `Created: 0`, `Updated: 0`, and
  `Unchanged: 19`. The CLI confirmed that no files were changed.

## Compatibility observations

- Profile detection selected `angular-tauri` from project evidence.
- `AGENTS.md` remains project-owned through an explicit self-mapping and is not
  included in Intentloom ownership metadata.
- The root README, ROADMAP, and architecture document are explicit
  authoritative documentation mappings; other same-concept documents remain
  project-owned and unclaimed.
- Unmanaged provider skills are not treated as malformed Intentloom output.

## Conclusion

Pass

The project owner approved each mapping before the complete safe proposal was
applied. The resulting state is healthy and idempotent under a dry-run sync.
