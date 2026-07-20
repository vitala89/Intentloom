# Intentloom dogfooding record: existing Angular + Tauri read-only adoption

**Date:** 2026-07-20
**Intentloom version:** `0.1.0-alpha.3` development build at `10fa2ef`
**Scenario:** existing-project
**Project:** existing local Angular + Tauri application; identity and path withheld
**Profile and adapters:** angular-tauri; Codex
**Environment:** Node `22.17.0`; macOS `26.5.2`

## Commands and evidence

- `intentloom adopt --dry-run --json`: exit `3`; proposed 21 safe creates and
  one conflict. The report retained 44 project-owned mappings, one compatible
  document mapping, and 20 manual decisions rather than overwriting them.
- `intentloom doctor --json`: exit `3`; expected missing-state findings were
  reported, together with `instruction-files-conflicting` and existing schema
  validation findings. No output was changed.
- `intentloom sync --dry-run`: not run because adoption has unresolved manual
  decisions and no approved Intentloom metadata.
- Before/after checksums of every Intentloom-managed destination root were
  identical. The dry run made no change.

## Compatibility observations

- Profile detection selected `angular-tauri` from project evidence.
- Existing instructions and documents stayed project-owned; the proposal did
  not infer ownership or overwrite them.
- The conflict and manual-decision exit correctly prevent a write until a human
  resolves ownership and mapping choices.

## Conclusion

Pass with follow-up

The existing-project safety boundary behaved as designed. A reviewed adoption
decision is still required before this project can count as write-path evidence
for a beta compatibility freeze.
