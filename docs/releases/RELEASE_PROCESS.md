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
