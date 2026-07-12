# Release Process

1. Complete the readiness audit and resolve blockers.
2. Run a clean lockfile install, full verification, all adapter fixtures, CLI smoke tests, and an explicit-path Applye dry-run.
3. Synchronize lockstep package metadata from the root framework version.
4. Move only verified Unreleased entries into the dated release section.
5. Obtain review approval; then create a release commit. Tagging and publishing are separate, explicit actions.
