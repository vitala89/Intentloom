# Release Process

1. Complete the readiness audit and resolve blockers on a focused branch.
2. Open a release pull request that states its version, compatibility impact,
   migration notes, and planned dist-tag.
3. Run a clean lockfile install, full verification, all adapter fixtures, CLI
   smoke tests, and an explicit-path Applye dry-run.
4. Synchronize lockstep package metadata from the root framework version.
5. Move only verified Unreleased entries into the dated release section and
   confirm they match the roadmap and release criteria.
6. Obtain review approval and required CI checks; then merge the release PR.
7. Verify the exact resulting `main` commit with the declared checks and retain
   the evidence with the release record.
8. Create a tag only for that verified `main` commit and only with explicit
   authorization.
9. Publish only from the verified tag, using the approved dist-tag and
   publication checklist.
10. Record the published version, artifact, tag, and any follow-up work. Do not
    change a version, tag, or dist-tag in an ordinary feature PR.

Merge of a development pull request does not make a release ready. The release
gate applies to the actual release candidate: the verified `main` commit that
will be tagged, and the installers or package artifacts built from it. A future
web or backend deployment must be checked in the environment that will serve
it, not only on a development branch.

Use the statuses in `docs/governance/ENGINEERING_LIFECYCLE.md`. A mandatory
check that is FAIL, BLOCKED, or PENDING prevents declaring the affected
functionality release-ready. Publishing remains the separate owner decision in
`PUBLISH_AUTHORIZATION_CHECKLIST.md`.

Select the checks that apply from `RELEASE_CHECKLIST.md`. For this repository
that includes the Desktop, Tauri, command-line, terminal, daemon, and package
compatibility evidence the candidate actually exercises. Do not claim a
platform was verified if its artifact was not run.

After publication, record the post-release evidence that applies: production
smoke tests, critical user journeys, installation and update compatibility,
migration and data integrity, error behavior, and recovery readiness. Do not
add telemetry or collect user data for that evidence without explicit
authorization. Local-first and privacy commitments stay in force.
