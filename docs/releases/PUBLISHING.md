# Publishing Intentloom

The planned alpha package is `intentloom`; the command is `intentloom`. The package is
unscoped and public. No fallback name is authorized: any scoped fallback must
be a scope demonstrably controlled by the authenticated release account. Do
not publish, tag, reserve a name, or change a version as part of
package-readiness work.

For the `0.1.0-alpha.3` release, an authorized maintainer must confirm
ownership of the chosen npm name, complete
[the authorization checklist](PUBLISH_AUTHORIZATION_CHECKLIST.md), use the
`next` dist-tag, and enable npm provenance only in the approved release
workflow. Run `pnpm build`, `npm pack
--dry-run --json`, and `npm publish --dry-run --tag next --access public` from
`packages/cli` first. A real publish requires explicit approval and npm
permissions; it must not run from ordinary pushes or pull requests.

## Trusted publishing

The release workflow should use [npm trusted publishing
(OIDC)](https://docs.npmjs.com/trusted-publishers/) where the npm organization
and repository workflow have been deliberately configured and reviewed. Bind
the trust policy to this repository and approved release workflow, use minimal
permissions, and keep it unavailable to pull-request and ordinary-push
workflows. Trusted publishing is not configured or implied by this document;
configuring it requires separate authorization. Do not add, print, or commit
npm tokens as a substitute for that review.

Before enabling it, establish npm package ownership, bind npm to the exact
GitHub repository and workflow, require a manual trigger or protected release
environment, and protect the release branch and tags. For eligible public
packages, npm documents automatic provenance with trusted publishing; verify
the resulting provenance for the published artifact. These controls must not be
activated while ownership is unresolved, because a workflow binding cannot prove
or create authority over an unclaimed name.

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
