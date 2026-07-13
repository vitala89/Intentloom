# Versioning

AIF uses Semantic Versioning. During v0.x, all workspace packages release in lockstep with the framework version; no package has an independent release version.

The root `package.json` is the framework-version source of truth. Package versions must be synchronized deterministically before any future publishable release; until package names and publish layout are approved, this is a release blocker.

Internal versions are distinct data concepts: framework version (root package), config schema version (`config.yaml`), manifest lock version (`manifest.lock.json`), and adapter output version (generated envelope). Their migrations are explicit and recorded in lock/source-map metadata, not independent package releases.

The current and only supported AIF artifact schema version is `1`. Config,
manifest, source map, feature brief, context pack, change request, and technical
debt documents must declare it. Missing versions and unsupported future versions
fail explicitly; v0.1 neither guesses nor automatically migrates them.

Framework version identifies the AIF release and follows SemVer. Schema version
identifies document structure. Adapter-output version identifies transformation
behavior. Manifest `lockVersion` identifies the installed lock lifecycle and is
not the config schema version. These values may evolve independently, and a
framework update does not silently rewrite any of them.

`0.1.0` was an untagged bootstrap placeholder, so the current development baseline is `0.1.0-alpha.0`; the first release candidate remains `0.1.0-alpha.1`. Patch releases are backward-compatible fixes; minor releases add backward-compatible functionality; stable major releases may break contracts after 1.0. Pre-1.0 breaking changes still require migration notes.
