# Intentloom dogfooding record: Vii Nx existing project

**Date:** 2026-08-17
**Finding source:** real inspect/adopt dry-run against the maintainer-owned
Vii Nx monorepo. This record describes the defects and the repository fix.
It does not apply Intentloom to Vii.

**Intentloom source tree:** `fix/existing-project-nx-dogfood` against then
current `main`
**Scenario:** existing-project dogfood
**Project:** Vii (Nx workspace). No Vii files were modified.

## Observed defects

1. `intentloom inspect --root <vii>` reported `Profile: nx`.
   `intentloom adopt --root <vii> --dry-run --json` then failed with
   `profile-unsupported` / `selected project profile is not available`.
   `--profile typescript` built a proposal, proving Nx was topology rather
   than a missing engineering profile.
2. `.nx/cache/**`, including `terminalOutputs/**`, appeared as many `skip`
   items and made the JSON proposal unbounded.
3. Nested README and documentation files were classified as `public-readme`
   and required a mass manual decision.

## Repository correction

- Selected inspect/adopt profile is always a supported engineering profile.
- Nx evidence is `workspaceTopology: nx`.
- Generated Nx directories are scan exclusions.
- Only root `README.md` is `public-readme`; `docs/README.md` is
  `documentation-index`; other nested README/docs stay project-owned without
  false public-readme ambiguity.

## Maintainer follow-up

Re-run inspect and adopt dry-run against Vii after this change lands. Do not
apply writes until the proposal is reviewed. See the pull request for the
exact commands.
