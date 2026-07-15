# Publish Authorization Checklist

Complete this checklist for the exact package, account, and release candidate.
It is a release-control record, not legal advice or trademark clearance. Do
not put tokens, one-time passwords, private account data, or screenshots with
private information in the repository.

## npm account and package authority

- [ ] npm username is confirmed through the maintainer's approved npm process.
- [ ] Registry is confirmed as `https://registry.npmjs.org/`, unless an
      approved exception is documented.
- [ ] Exact `intentloom` package state is confirmed, including the date and
      evidence-command classification.
- [ ] Package owner rights are confirmed, or the first-publication state is
      confirmed with its limits documented.
- [ ] 2FA/trusted-publishing policy is confirmed without copying private
      profile fields here.
- [ ] Package name is approved by a maintainer.
- [ ] Naming review is completed and recorded.
- [ ] Legal uncertainty is accepted by the maintainer or counsel review is
      completed; neither option means legal clearance.
- [ ] If using a fallback scoped name, use only a scope controlled by the
      authenticated account or organization. Do not infer control from a lookup or
      from the `@intentloom` spelling.
- [ ] Record the successful, authenticated equivalent of [`npm access list
packages`](https://docs.npmjs.com/cli/v11/commands/npm-access/) (the installed
      npm CLI does not support `npm access ls-packages`).
- [ ] Run `npm view intentloom --registry=https://registry.npmjs.org/` and retain
      the timestamped result with the release record. A 404 is only a point-in-time
      availability signal, not a reservation.

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
- [ ] `next` dist-tag is approved.
- [ ] Tarball hash is recorded in the private release record.
- [ ] Clean-room npm and pnpm installation is confirmed.
- [ ] Compatibility CI is green for the supported matrix.
- [ ] Release commit is approved.
- [ ] Changelog is approved.
- [ ] Release tag is approved; this does not authorize creating it early.
- [ ] Complete the publication safety and incident steps in
      [Publishing](PUBLISHING.md).
- [ ] Real npm publication requires a separate explicit human authorization.

Publication is blocked pending the unchecked gates above.
