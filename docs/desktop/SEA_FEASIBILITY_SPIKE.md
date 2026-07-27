# Self-Contained Daemon SEA Feasibility Spike

Status: partial feasibility pass for the accepted Desktop v0.6 distribution
boundary.

Date: 2026-07-27

## Result

The existing bundled daemon can be injected into a Node single executable and
run on the current macOS arm64 host without invoking a separately installed
Node runtime at launch.

The macOS run completed this sequence:

```text
existing esbuild daemon bundle
→ Node SEA preparation blob
→ postject injection
→ ad-hoc code signing
→ direct executable launch
→ authenticated Doctor request
→ graceful daemon shutdown
→ owned Unix socket removed
```

Observed result:

| Check                     | Result                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| Host                      | macOS arm64                                                                                   |
| Build runtime             | Node `v22.17.0`                                                                               |
| Daemon bundle             | 392,068 bytes; SHA-256 `1c85f5cca8e91063daff4137df70017a057b4602d97e7c0a179f91928d76f3f7`     |
| SEA blob                  | 392,175 bytes                                                                                 |
| Injected executable       | 110,123,392 bytes; SHA-256 `7244085241dd073281ecb2b9813e43b45e6f726e9dfb69068112f8f47501247f` |
| Protocol version returned | `1`                                                                                           |
| Doctor result             | exit code `3`, five findings                                                                  |
| Shutdown                  | graceful; forced termination not used                                                         |
| Owned endpoint cleanup    | passed                                                                                        |

The Doctor exit code is expected for the repository fixture and is evidence
that the executable reached the real daemon/application path, not a synthetic
health response.

## Reproduction

The repeatable harness is
[`scripts/desktop/sea-feasibility.mjs`](../../scripts/desktop/sea-feasibility.mjs).
It expects the existing compiled artifact at
`packages/daemon/dist/intentloomd.cjs` and accepts:

- `POSTJECT_API` or `POSTJECT_BIN` for a temporary `postject` injector;
- `INTENTLOOM_SEA_OUTPUT_DIR` for an explicitly writable output directory.

The spike used `postject@1.0.0-alpha.6` in a temporary directory. It was not
added to repository dependencies.

The cross-platform runner is defined in
[`desktop-sea-feasibility.yml`](../../.github/workflows/desktop-sea-feasibility.yml).
It runs Node 22 on the three target operating-system families, builds the
daemon bundle, obtains the temporary injector, and executes this harness. A
green workflow run is required before the platform gate is closed.

The macOS executable must be signed after injection. An unsigned injected copy
was terminated by the host with `SIGKILL`; adding the documented ad-hoc
re-signing step produced the successful result above.

The prepared macOS executable was copied to the fixed Tauri resource path
`Contents/Resources/resources/intentloomd`. The Tauri packaging run produced an
arm64 `.app` and `.dmg`; the embedded resource hash matched the SEA executable
hash exactly. The catalog was also present at the deterministic Tauri resource
path `Contents/Resources/_up_/_up_/_up_/catalog`, which the release bridge
resolves explicitly. The default development Tauri config remains
bundle-disabled; packaging uses the explicit `tauri.packaging.conf.json`
override after sidecar preparation. DMG creation requires a host with working
Disk Arbitration access; the sandboxed local attempt returned `hdiutil: create
failed - Device not configured`, while the permitted system-mode package run
completed.

## Limitations and risks

- Windows and Linux were not executable from this macOS host. The result is
  not a three-platform packaging claim.
- Node SEA is still documented as active development. The exact Node runtime,
  `postject` version, binary injection flags, and signing process must be
  pinned per target in packaging CI.
- The spike used `useCodeCache: false` and `useSnapshot: false`, which is the
  safe baseline for cross-platform artifact generation. Target-native builds
  still require their own runners and smoke tests.
- Ad-hoc signing proves local execution only. It is not production signing,
  notarization, or release authorization.
- The current daemon binary exposes the existing daemon operations. Capability
  discovery, Diff, Timeline, structured client errors, cancellation, and
  progress remain Phase 1 contract work.

## Gate decision

The self-contained Node SEA/sidecar path is **feasible on macOS arm64** and
remains **open for Windows and Linux**. Do not call the Desktop distribution
ready until equivalent runs pass on all three target platform families.

The next packaging gate is native Windows and Linux SEA plus Tauri smoke
execution. Phase 2 must not claim cross-platform packaged readiness until those
runs produce equivalent startup, authentication, graceful shutdown, endpoint
cleanup, and embedded-resource evidence.

## Evidence

- [ADR-0042: Desktop Stack and Self-Contained Daemon Distribution](../decisions/ADR-0042-desktop-stack-and-daemon-distribution.md)
- [Node.js single executable applications](https://nodejs.org/download/release/latest-v22.x/docs/api/single-executable-applications.html)
- Temporary output directory: `/private/tmp/intentloom-sea-run`
