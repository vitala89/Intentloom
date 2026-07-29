# Intentloom dogfooding record: v1 candidate TypeScript project

**Date:** 2026-07-29
**Intentloom source tree:** `main` candidate `46a278c` (tree identical to the
working candidate before this documentation update)
**CLI artifact:** local `intentloom@0.5.0-beta.1` tarball from that tree
**Scenario:** typescript
**Project:** isolated sanitized TypeScript project created for the candidate
check; no external project identity or contents are represented
**Profile and adapters:** TypeScript; no provider credentials
**Environment:** Node 22; macOS arm64

## Commands and evidence

- `intentloom inspect --root <project> --json`: exit `0`; selected the
  `typescript` profile and reported `not-initialized` with a read-only finding.
- `intentloom adopt --plan --root <project> --json`: exit `0`; automatic apply
  was false and the proposal contained one review-required agent-entrypoint
  create.
- `intentloom adopt --apply <plan> --root <project> --json`: exit `0` after the
  temporary project approved its own preview; one file was created and a
  migration journal entry was recorded.
- `intentloom doctor --root <project> --json`: exit `3`; required `.aif` config,
  manifest, and source-map metadata remained absent after the narrow plan.
- `intentloom sync --root <project> --dry-run --json`: exit `2`; correctly
  refused to run without initialized `.aif/config.yaml`.

## Compatibility observations

- TypeScript detection was deterministic from `tsconfig.json`.
- The apply path was transactional and limited to the approved temporary
  proposal; no external project was modified.
- The result is not a healthy initialized adoption: the missing metadata is a
  documented follow-up rather than a hidden pass.

## Conclusion

Pass with follow-up as supplemental candidate evidence.

This isolated scenario exercises current plan/apply and refusal behavior. It
does not replace the historical real-project TypeScript record or maintainer
acceptance for the stable release.
