# Versioning

Intentloom uses Semantic Versioning. During v0.x, all workspace packages release in lockstep with the framework version; no package has an independent release version.

The private root workspace `package.json` is the framework-version source of
truth. Package versions are synchronized deterministically before publication.
The public package is `intentloom`; its current prerelease is `0.4.0-beta.1`.
Beta publication, when explicitly authorized, uses the `next` dist-tag. npm requires
each package record to retain a `latest` tag, so the first prerelease also
remains the default installation until a verified stable release supersedes it.
After a stable release exists, prerelease publication must not move `latest`.
For the current registry state and the main-versus-npm boundary, see
[`RELEASE_STATE.md`](RELEASE_STATE.md).
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

## Release Strategy and Milestone-to-Version Mapping

Intentloom releases minor pre-release versions (`0.x.0-beta.1`) upon completing major roadmap candidate milestones. All workspace packages are published in lockstep under the framework version (`intentloom`).

| Framework Version                  | Release Trigger & Milestone Scope                                                                                                                                                                                                                                                                                                                                                                         | Status / Publication                                                                  |
| :--------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ |
| `v0.1.0-alpha.x` / `v0.1.0-beta.1` | Core platform foundation, adoption engine, CLI framework, basic adapters, provider synchronization (`sync`/`diff`).                                                                                                                                                                                                                                                                                       | Published (`npm next`; historical)                                                    |
| `v0.2.0-beta.1`                    | 3-way pack update migration (`update`), engineering conformance profiles, initial extension lifecycle ADRs.                                                                                                                                                                                                                                                                                               | Published (`npm next`; historical)                                                    |
| `v0.3.0-beta.1`                    | Engineering Conformance Engine (CLI/MCP), Managed Extension Lifecycle specification & schemas (`urn:aif:schema:extension-manifest:1`).                                                                                                                                                                                                                                                                    | Published (`npm next`; historical)                                                    |
| `v0.4.0-beta.1`                    | **Controlled Agent Learning & Procedural Memory Milestone (Candidates L1–L8 Complete)**: Task summaries (`summary`), skill discovery (`discover`), proposal lifecycle (`proposal`), evaluation regression gates (`evaluate`), memory inspection & mutation plans (`memory`), checkpoints & task control (`checkpoint`), semantic ranking (`rank`), profile isolation & delegation (`profile`/`delegate`). | **Published (`npm next`)**                                                            |
| `v0.5.0-beta.1`                    | **Engineering Process Intelligence increment**: Workflow variants, observed duration metrics, conformance trends, deterministic repetition summaries, and observed transition intervals.                                                                                                                                                                                                                  | Future Candidate Milestone; implementation is already in `main` after `v0.4.0-beta.1` |
| `v1.0.0`                           | Production release after full Desktop application integration, MCP agent runtime stabilization, and security audit.                                                                                                                                                                                                                                                                                       | Production Milestone                                                                  |

### Publication Criteria for Major Candidate Releases

1. **Complete Milestone Exit Gates:** All candidates belonging to the milestone scope must have 100% completed exit criteria merged into `main`.
2. **Readiness Audit:** A formal candidate readiness audit (`docs/audits/V0_X_RELEASE_READINESS.md`) must be conducted and merged.
3. **Deterministic Sync:** `scripts/sync-version.mjs` must synchronize root version across all workspace packages and `packages/core/src/version.ts`.
4. **Clean Verification Matrix:** 100% passing tests (`vitest`), typecheck (`tsc`), lint, prettier formatting, build artifacts, and GitHub CI matrix.
5. **Git Tagging & NPM Publish:** Tag `v0.X.0-beta.1` on `main` and publish `intentloom` to npm registry under `next` and `latest` dist-tags.
