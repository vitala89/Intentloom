# Publishing Intentloom

The public package is `intentloom`; the command is `intentloom`. The package is
unscoped and public. No fallback name is authorized: any scoped fallback must
be a scope demonstrably controlled by the authenticated release account. Do
not publish, tag, reserve a name, or change a version as part of
package-readiness work.

Current registry evidence is recorded in [`RELEASE_STATE.md`](RELEASE_STATE.md):
`intentloom@1.0.2` is published under `latest`, while `next` remains at
`1.0.0`. GitHub releases `v1.0.0` and `v1.0.2` are published.

For every release, an authorized maintainer must confirm ownership of the npm
name and complete
[the authorization checklist](PUBLISH_AUTHORIZATION_CHECKLIST.md). Prereleases
use the `next` dist-tag. Only a stable release approved through the checklist
may take `latest`, because `latest` is what an unqualified `npm install`
resolves to.

Publication runs through
[the approved release workflow](#trusted-publishing). The manual commands below
remain documented as the fallback for a maintainer working outside CI, and for
verifying a candidate locally. The root workspace is private, so package
commands run from the public CLI package directory:

```sh
cd packages/cli
npm pack --dry-run --json
npm publish --dry-run --tag next --access public
npm publish --tag next --access public
```

Run `pnpm build` from the workspace root first. A real publish requires
explicit approval and npm permissions; it must not run from ordinary pushes or
pull requests.

## Trusted publishing

The approved automated publication path is
[`.github/workflows/release.yml`](../../.github/workflows/release.yml), which
publishes through [npm trusted publishing
(OIDC)](https://docs.npmjs.com/trusted-publishers/). It uses no npm token: the
run authenticates with its own short-lived OIDC identity, which npm verifies
against the trusted publisher configured for the package.

The workflow is dispatch-only. It cannot be triggered by a push or a pull
request, it refuses any ref other than `main` or a `v*` tag, and it runs in the
protected `npm-publish` environment so a publish requires an approval. `dry_run`
defaults to `true`, so the default action of the workflow is to verify, not to
publish.

### Requirements, verified for this repository

| Requirement                                            | Status                                                  |
| ------------------------------------------------------ | ------------------------------------------------------- |
| npm CLI 11.5.1+ and Node 22.14.0+                      | Workflow pins Node 24 and asserts both before building. |
| `id-token: write` permission                           | Set on the publish job only.                            |
| Public repository                                      | `vitala89/Intentloom` is public.                        |
| Public package                                         | `publishConfig.access` is `public`.                     |
| `repository.url` matches the GitHub repository exactly | `git+https://github.com/vitala89/Intentloom.git`.       |
| Cloud-hosted runner                                    | `ubuntu-latest`. Self-hosted runners are not supported. |

### One-time setup, performed by the package owner

Steps 1 and 2 are complete as of 2026-07-31. The first trusted publish
completed successfully on 2026-08-02. Step 3 is still a package-owner action;
the npm account setting cannot be changed from this repository. The repository
side is hardened: the workflow contains no npm secret, the protected
`npm-publish` environment has no secrets or variables, and the workflow fails
if `NODE_AUTH_TOKEN` or `NPM_TOKEN` is present.

1. On [npmjs.com](https://www.npmjs.com/package/intentloom), open the package
   settings and add a trusted publisher for GitHub Actions:
   - Organization or user: `vitala89`
   - Repository: `Intentloom`
   - Workflow filename: `release.yml` (filename only, with the extension, exact
     case)
   - Environment name: `npm-publish`
   - Allowed actions: `npm publish`
2. In this repository's settings, create the `npm-publish` environment and add
   a required reviewer. Without a reviewer the environment adds no control. The
   environment exists with `vitala89` as the required reviewer and deployment
   restricted to the `main` branch and `v*` tags.
3. After the first successful trusted publish, open the package settings and
   select **Require two-factor authentication and disallow tokens**. Then list
   active npm tokens and revoke only the standing automation/publish token that
   is confirmed to be obsolete. This is an npm account action and requires an
   authenticated package-owner session; do not revoke an unidentified token.

The current execution environment is not authenticated to npm (`npm whoami`
returns HTTP 401 and the npm package page opens signed out), so the package-level
policy and token inventory remain unverified and were not changed here.

npm does not validate a trusted publisher configuration when it is saved. A
mismatch in the repository name, the workflow filename, or the environment name
surfaces only as an `ENEEDAUTH` failure at publish time. Renaming
`release.yml` breaks publication until the trusted publisher is updated to
match.

### Provenance

npm generates provenance automatically for trusted publishing from a public
repository publishing a public package, so `release.yml` deliberately does not
pass `--provenance`. Provenance attests to the ref and commit of the workflow
run itself. The workflow therefore builds exactly the ref it was dispatched on
and refuses to build anything else: attesting to a commit that was not the one
built would be worse than shipping no provenance.

After publishing, confirm the provenance badge on the package page and record
the result with the release evidence.

### Running a release

1. Dispatch **Release** from the Actions tab with `dry_run` left at `true`.
   Confirm the tarball contents and integrity in the run summary.
2. Re-dispatch with `dry_run` set to `false` and approve the `npm-publish`
   environment.
3. Record the integrity value, the run URL, and the resulting dist-tags in the
   release evidence.

## Failure, rollback, and incident handling

The npm registry does not allow a published version to be replaced; unpublishing
is restricted by [npm's unpublish policy](https://docs.npmjs.com/policies/unpublish/).
If publication fails before a version is accepted, stop, preserve the command
outcome in the private release record, and fix the authorization, workflow, or
artifact issue before retrying. If it succeeds but the package is defective or
compromised:

1. Stop further publication and dist-tag changes; preserve relevant CI and npm
   audit evidence without credentials.
2. Assess affected versions, package integrity, provenance, and user impact;
   notify maintainers and users through the approved project channels.
3. Do not unpublish by default. Deprecate or move dist-tags only with explicit
   authorization and according to npm policy.
4. Publish a corrected later prerelease under `next` only after root cause,
   validation, and renewed release authorization are recorded.
5. Rotate or revoke compromised credentials and disable affected trusted
   publishing links through the owning npm/GitHub administrators; document the
   incident privately and add a sanitized public note when appropriate.

Use the following scenario-specific response in addition to those shared steps:

| Incident                              | Immediate response                                          | Follow-up                                                                           |
| ------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Incorrect tarball                     | Stop releases and preserve integrity/provenance evidence.   | Publish a corrected later prerelease under `next` after review.                     |
| Wrong dist-tag or accidental `latest` | Stop tag changes; record affected versions and users.       | Correct the tag only with explicit authorization and communicate impact.            |
| Wrong package name                    | Do not repeat publication under another name automatically. | Assess exposure and publish the intended package only after renewed approval.       |
| Ownership/access problem              | Stop and do not change owners, teams, or org settings.      | Escalate to the package owner/npm administrator and record the resolution.          |
| Partially failed multi-step release   | Stop the sequence and record completed versus failed steps. | Reconcile tags, artifacts, release notes, and provenance before a controlled retry. |
