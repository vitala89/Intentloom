# Versioning

Intentloom uses Semantic Versioning. During v0.x, all workspace packages release in lockstep with the framework version; no package has an independent release version.

The private root workspace `package.json` is the framework-version source of
truth. Package versions are synchronized deterministically before publication.
The repository's `0.1.0-beta.1` package is `intentloom`. Beta publication, when
explicitly authorized, uses the `next` dist-tag. npm requires
each package record to retain a `latest` tag, so the first prerelease also
remains the default installation until a verified stable release supersedes it.
After a stable release exists, prerelease publication must not move `latest`.
Package availability must be confirmed from npm release evidence rather than
inferred from a source version.

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
unpublished historical AIF technical milestone. Release records, not this
policy, establish whether a particular prerelease was published. Patch releases
are backward-compatible fixes; minor releases add backward-compatible
functionality; stable major releases may break contracts after 1.0. Pre-1.0
breaking changes still require migration notes.
