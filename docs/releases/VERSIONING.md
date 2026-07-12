# Versioning

AIF uses Semantic Versioning. During v0.x, all workspace packages release in lockstep with the framework version; no package has an independent release version.

The root `package.json` is the framework-version source of truth. Package versions must be synchronized deterministically before any future publishable release; until package names and publish layout are approved, this is a release blocker.

Internal versions are distinct data concepts: framework version (root package), config schema version (`config.yaml`), manifest lock version (`manifest.lock.json`), and adapter output version (generated envelope). Their migrations are explicit and recorded in lock/source-map metadata, not independent package releases.

`0.1.0` was an untagged bootstrap placeholder, so the current development baseline is `0.1.0-alpha.0`; the first release candidate remains `0.1.0-alpha.1`. Patch releases are backward-compatible fixes; minor releases add backward-compatible functionality; stable major releases may break contracts after 1.0. Pre-1.0 breaking changes still require migration notes.
