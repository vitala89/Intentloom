# Intentloom dogfooding record: Intentloom self-adoption read-only

**Date:** 2026-07-29
**Intentloom version:** current `main` at `d3da25d`
**Scenario:** existing-project
**Project:** Intentloom public TypeScript monorepo
**Profile and adapters:** typescript; Claude Code, Codex, Cursor, Copilot
**Environment:** Node `22.17.0`; macOS `26.5.2` arm64

## Commands and evidence

- `intentloom inspect --root <project> --json`: exit `0`; selected the
  `typescript` profile, detected all four adapters, reported
  `readiness: not-initialized`, and declared the operation read-only.
- `intentloom init --root <project> --dry-run`: exit `3`; proposed only
  preview creates and reported explicit conflicts for existing `AGENTS.md` and
  `CLAUDE.md`. No files were changed.
- `intentloom adopt --plan --root <project> --json`: exit `0`; returned
  `automaticApplyAllowed: false` because durable project-context and Claude
  instruction mappings are ambiguous. No files were changed.
- `intentloom doctor --root <project> --json`: exit `3`; reported missing
  `.aif/config.yaml`, `.aif/manifest.lock.json`, and `.aif/source-map.json`,
  plus an instruction-root conflict. The operation remained read-only.
- `intentloom sync --root <project> --dry-run --json`: exit `2`; correctly
  refused to run because the project is not initialized. No files were changed.

## Compatibility observations

- Profile detection identified the repository as TypeScript from `package.json`
  and `tsconfig.json`.
- All four supported provider adapters were detected without provider network
  access or credential use.
- Existing project-owned governance and provider instruction files were not
  silently claimed; ambiguous mappings stopped automatic adoption.
- The uninitialized state and exit codes are expected for a repository that has
  not approved an Intentloom adoption plan. This record is read-only evidence,
  not approval to apply changes to the project.

## Conclusion

Pass with follow-up

The current self-adoption run verifies deterministic profile/adapter detection,
preview behavior, conflict preservation, and no-mutation guarantees on a real
TypeScript project. It does not replace refreshed evidence from the required
minimal, TypeScript, and sanitized existing-project scenarios, and it does not
close the v1.0 release gate.
