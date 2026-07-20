# Intentloom dogfooding record: TypeScript read-only adoption

**Date:** 2026-07-20
**Intentloom version:** `0.1.0-alpha.3` development build at `10fa2ef`
**Scenario:** typescript
**Project:** existing local TypeScript project; project identity and path withheld
**Profile and adapters:** typescript; Codex
**Environment:** Node `22.17.0`; macOS `26.5.2`

## Commands and evidence

- `intentloom adopt --dry-run --json`: exit `0`; proposed 22 creates: 18 safe
  generated candidates and 4 metadata or project-level creates. No manual
  decision was required.
- `intentloom doctor --json`: exit `3`; expected missing-state findings were
  `aif-config-missing`, `manifest-lock-missing`, `source-map-missing`, and
  `product-documentation-missing`.
- `intentloom sync --dry-run`: not run because the project has not accepted an
  adoption proposal and has no Intentloom metadata.
- Before/after checksums of every Intentloom-managed destination root were
  identical. The dry run made no change.

## Compatibility observations

- Profile detection selected `typescript` without ambiguity.
- The proposal separated safe creates from existing project content instead of
  asserting ownership from a path or file name.
- Missing metadata is correctly an error for `doctor`, rather than an implicit
  request to write it.

## Conclusion

Pass with follow-up

Read-only adoption was deterministic and non-destructive. A project owner must
review and explicitly approve the proposal before this scenario can provide
write-path adoption evidence.
