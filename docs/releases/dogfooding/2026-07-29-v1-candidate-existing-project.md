# Intentloom dogfooding record: v1 candidate sanitized existing project

**Date:** 2026-07-29
**Intentloom source tree:** `main` candidate `46a278c` (tree identical to the
working candidate before this documentation update)
**CLI artifact:** local `intentloom@0.5.0-beta.1` tarball from that tree
**Scenario:** existing-project
**Project:** isolated sanitized TypeScript project with project-owned
`AGENTS.md` and `README.md`; no external project identity or contents are
represented
**Profile and adapters:** TypeScript; existing project instructions preserved
**Environment:** Node 22; macOS arm64

## Commands and evidence

- `intentloom inspect --root <project> --json`: exit `0`; selected TypeScript,
  detected existing instruction paths, and reported `not-initialized`.
- `intentloom adopt --plan --root <project> --json`: exit `0`; mapped `AGENTS.md`
  as project-owned, proposed one review-required entrypoint create, and set
  `automaticApplyAllowed: false`.
- No apply command was run: the project-owned mapping and review-required create
  remained a preview requiring explicit project-owner approval.
- `intentloom doctor --root <project> --json`: exit `3`; missing `.aif` metadata
  was reported without writes.
- `intentloom sync --root <project> --dry-run --json`: exit `2`; correctly
  refused to run without initialization.

## Compatibility observations

- Existing `AGENTS.md` remained project-owned and was not silently claimed.
- Ambiguous or review-required adoption work remained visible in the plan.
- The temporary target's file inventory and SHA-256 hashes were unchanged by
  inspect, adopt-plan, doctor, and sync dry-run.

## Conclusion

Pass with follow-up as supplemental candidate evidence.

This is an isolated sanitized safety scenario, not a claim that a withheld
external project was refreshed. The historical real-project record still needs
explicit maintainer acceptance or a new authorized run.
