# Publish Authorization Checklist

Complete this checklist for the exact package, account, and release candidate.
It is a release-control record, not legal advice or trademark clearance. Do
not put tokens, one-time passwords, private account data, or screenshots with
private information in the repository.

A checked box means the item was verified and the evidence is recorded, either
in this file or in the private release record. An unchecked box blocks
publication.

## Candidate under review

- Package: `intentloom`
- Version: `1.0.0`
- Dist-tag requested: `latest`
- Release commit: `db61be9`, tagged `v1.0.0`
- Verification date: 2026-07-30

`main` has advanced past the tag with documentation and CI changes only.
`git diff --name-only v1.0.0..main -- packages/ catalog/ profiles/ scripts/build-cli.mjs`
is empty, so the package payload built from `main` is identical to the payload
at the tag. This matters because provenance attests to the commit the release
workflow was dispatched on, and the workflow postdates the tag.

## npm account and package authority

- [ ] npm username is confirmed through the maintainer's approved npm process.
- [x] Registry is confirmed as `https://registry.npmjs.org/`. The release
      workflow sets it explicitly; no exception is in use.
- [x] Exact `intentloom` package state is confirmed. On 2026-07-30
      `npm view intentloom dist-tags` reported `latest=0.1.0-alpha.3` and
      `next=0.5.0-beta.1`. `1.0.0` is not published.
- [ ] Package owner rights are confirmed, or the first-publication state is
      confirmed with its limits documented.
- [ ] 2FA/trusted-publishing policy is confirmed without copying private
      profile fields here.
- [ ] Trusted publisher is configured on npmjs.com for `vitala89/Intentloom`,
      workflow filename `release.yml`, environment `npm-publish`, allowed action
      `npm publish`. See [Publishing](PUBLISHING.md#one-time-setup-performed-by-the-package-owner).
- [ ] The `npm-publish` GitHub environment exists and has at least one required
      reviewer. Without a reviewer the environment adds no control.
- [ ] Package name is approved by a maintainer.
- [ ] Naming review is completed and recorded.
- [ ] Legal uncertainty is accepted by the maintainer or counsel review is
      completed; neither option means legal clearance.
- [x] No fallback scoped name is in use. The package is unscoped and already
      exists under this account's control, so no scope needs to be claimed.
- [ ] Record the successful, authenticated equivalent of [`npm access list
packages`](https://docs.npmjs.com/cli/v11/commands/npm-access/) (the installed
      npm CLI does not support `npm access ls-packages`).
- [x] `npm view intentloom --registry=https://registry.npmjs.org/` was run on
      2026-07-30 and the result retained with the release record. A 404 is only
      a point-in-time availability signal, not a reservation; this package is
      not a 404, it is an existing package with published versions.

## Name and trademark diligence

- [ ] Check exact and similar names for `Intentloom`, `intentloom`, and
      `intentloom-cli` in npm, GitHub, and general web
      search. Record URLs, dates, and relevant software/category context.
- [ ] Search the official EUIPO/TMview, DPMAregister, WIPO Global Brand
      Database, and USPTO trademark systems for exact, visual/phonetic, and
      related-service matches. Record the queries, results, jurisdictions, and
      relevant Nice classes.
- [ ] Obtain legal review for any material result or before a production name
      decision. Registry and web searches are not legal clearance.
- [ ] Check `intentloom` command collisions in npm, Homebrew/Linux package indexes,
      PyPI, crates.io, and common shell-command usage. Decide whether the command
      remains usable and document any mitigation.

## Release authorization and record

- [ ] Version is approved.
- [ ] `latest` dist-tag is approved for this stable release. This is the tag an
      unqualified `npm install intentloom` resolves to, and it currently points
      at `0.1.0-alpha.3`.
- [ ] Tarball hash is recorded in the private release record. The release
      workflow prints the integrity value and file list in its run summary and
      uploads the pack manifest as an artifact, so a dry run produces this
      evidence without publishing.
- [ ] Clean-room npm and pnpm installation is confirmed.
- [x] Compatibility CI is green for the supported matrix. Run
      [30529498050](https://github.com/vitala89/Intentloom/actions/runs/30529498050)
      passed 6/6 on the release commit; run
      [30545417519](https://github.com/vitala89/Intentloom/actions/runs/30545417519)
      passed on the current `main`.
- [x] CodeQL is green. Run
      [30529497908](https://github.com/vitala89/Intentloom/actions/runs/30529497908)
      passed for both `actions` and `javascript-typescript`.
- [ ] Release commit is approved.
- [x] Changelog is written. `CHANGELOG.md` carries the `[1.0.0] - 2026-07-30`
      entry.
- [ ] Changelog is approved.
- [x] Release tag exists. `v1.0.0` is pushed to `origin` and points at
      `db61be9`.
- [x] A GitHub release exists for `v1.0.0`.
- [ ] Complete the publication safety and incident steps in
      [Publishing](PUBLISHING.md).
- [ ] A `dry_run` release workflow run has completed green and its tarball
      evidence is recorded.
- [ ] Real npm publication requires a separate explicit human authorization.

## Outstanding security disposition

- [x] Package provenance is available. Trusted publishing generates it
      automatically for this repository and package; the mechanism is in
      `.github/workflows/release.yml` and the preconditions are verified in
      [Publishing](PUBLISHING.md#requirements-verified-for-this-repository).
      This item was previously recorded as met when nothing produced provenance.
- [ ] Provenance is confirmed present on the published artifact after
      publication.
- [x] Dependabot alert #2 (`glib@0.18.5`, transitive, medium) carries an
      approved exception expiring 2026-10-29, recorded in
      [`V1_0_RELEASE_GATE_PACKET.md`](V1_0_RELEASE_GATE_PACKET.md).

Publication is blocked pending the unchecked gates above.
