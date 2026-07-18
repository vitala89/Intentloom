# Versioning

Intentloom uses Semantic Versioning. During v0.x, all workspace packages release in lockstep with the framework version; no package has an independent release version.

The private root workspace `package.json` is the framework-version source of
truth. Package versions are synchronized deterministically before publication.
The planned `0.1.0-alpha.3` package is `intentloom` with the `next` dist-tag.
It is not tagged or published by this preparation. It cannot be published until
the npm authorization and naming/trademark gates in
`docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md` are complete.

Internal versions are distinct data concepts: framework version (root package), config schema version (`config.yaml`), manifest lock version (`manifest.lock.json`), and adapter output version (generated envelope). Their migrations are explicit and recorded in lock/source-map metadata, not independent package releases.

The current and only supported Intentloom artifact schema version is `1`. Config,
manifest, source map, feature brief, context pack, change request, and technical
debt documents must declare it. Missing versions and unsupported future versions
fail explicitly; v0.1 neither guesses nor automatically migrates them.

Framework version identifies the Intentloom release and follows SemVer. Schema version
identifies document structure. Adapter-output version identifies transformation
behavior. Manifest `lockVersion` identifies the installed lock lifecycle and is
not the config schema version. These values may evolve independently, and a
framework update does not silently rewrite any of them.

`0.1.0` was an untagged bootstrap placeholder. `0.1.0-alpha.1` remains the
unpublished historical AIF technical milestone. `0.1.0-alpha.2` is the first
published Intentloom prerelease. `0.1.0-alpha.3` remains unpublished until
separately authorized. Patch releases are backward-compatible fixes; minor releases add
backward-compatible functionality; stable major releases may break contracts
after 1.0. Pre-1.0 breaking changes still require migration notes.
