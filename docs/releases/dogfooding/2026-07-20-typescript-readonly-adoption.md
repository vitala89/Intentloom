# Intentloom dogfooding record: TypeScript approved adoption

**Date:** 2026-07-20
**Intentloom version:** `0.1.0-alpha.3` development build at `890a4c6`
**Scenario:** typescript
**Project:** existing local TypeScript project; project identity and path withheld
**Profile and adapters:** typescript; Codex
**Environment:** Node `22.17.0`; macOS `26.5.2`

## Commands and evidence

- `intentloom adopt --dry-run --json`: exit `0`; proposed 22 creates: 18 safe
  generated candidates and 4 metadata or project-level creates. No manual
  decision was required.
- `intentloom adopt --json`: exit `0`; applied the same 22 creates. The
  transaction reported `success`, no failed stage, and no rollback attempt.
- `intentloom doctor --json`: exit `0`; there were no error findings. The
  expected informational findings were adapter capability limitations and
  `product-documentation-missing`.
- `intentloom sync --dry-run`: exit `0`; `Created: 0`, `Updated: 0`, and
  `Unchanged: 20`. The CLI confirmed that no files were changed.

## Compatibility observations

- Profile detection selected `typescript` without ambiguity.
- The proposal separated safe creates from existing project content instead of
  asserting ownership from a path or file name.
- The applied metadata, manifest lock, and source map are accepted by `doctor`.
- The optional product-documentation finding is not an ownership or transaction
  error.

## Conclusion

Pass

The project owner reviewed and approved the conflict-free proposal. The applied
transaction is healthy and an idempotent dry-run sync shows no drift.
