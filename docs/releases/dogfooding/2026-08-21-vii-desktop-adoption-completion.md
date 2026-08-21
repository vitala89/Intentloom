# Intentloom dogfooding record: Vii Desktop existing-project adoption completion

**Date:** 2026-08-21
**Scenario:** Final maintainer acceptance gate for Desktop Existing-Project Adoption
**Consumer repository source:** [kas-labs/vii](https://github.com/kas-labs/vii)
**Conclusion:** Pass — milestone complete

This record closes the completion gate opened by
[2026-08-19-vii-desktop-full-adoption.md](2026-08-19-vii-desktop-full-adoption.md).
It is documentation only. It does not modify the maintainer Vii checkout.

## Evidence classes

| Class                                          | Used                     |
| ---------------------------------------------- | ------------------------ |
| Automated test evidence (#337–#353)            | yes                      |
| Packaged Desktop / native window click-through | yes, maintainer verified |
| Real Vii-derived disposable consumer           | yes                      |
| CLI doctor/diff parity on adopted tree         | yes                      |

## Identity

- **Intentloom SHA verified:** `a9ad998731dc8b701122b048c5d4c51eff1107d` (`main` after PR #353)
- **Vii pre-adoption SHA:** `93e072c043a9d8718843d28901e5f9fd537bedf1`
- **Disposable adopted consumer:** `/Users/eugenekasap/WebstormProjects/intentloom-dogfood/vii-desktop-final`
- **Packaged Desktop build command:** `pnpm desktop:package`
- **Bundled daemon:** current self-contained SEA Mach-O sidecar (not the legacy Node-script resource)

## Implementation sequence verified on `main`

| PR   | Merge SHA | Scope                                            |
| ---- | --------- | ------------------------------------------------ |
| #337 | `f98122a` | read-only adoption plan contract                 |
| #339 | `75345ab` | Desktop read-only adoption preview UI            |
| #340 | `ad20ed2` | adoption decision modeling                       |
| #342 | `0da48de` | prepared-plan security envelope                  |
| #343 | `ecf09c8` | explicit approval                                |
| #344 | `dcf1c4e` | pre-Apply security review                        |
| #345 | `0385e63` | transactional Apply                              |
| #346 | `fa26b9f` | first full Vii Desktop adoption dogfood evidence |
| #347 | `6dbc571` | catalog-bound existing-project Apply             |
| #348 | `79afa86` | Apply on already-generated/drifted adopted trees |
| #349 | `24924c3` | Desktop Doctor/Diff canonical health parity      |
| #350 | `acb262d` | daemon leftover/stale endpoint recovery          |
| #351 | `e7fab31` | deterministic packaged SEA sidecar build         |
| #352 | `a2a4be4` | terminalize stale Cancel/loading lifecycle       |
| #353 | `a9ad998` | Tauri dev daemon launcher regression fix         |

## Prior adoption writer evidence (pre-runtime fixes)

Full native Desktop adoption on a disposable Vii clone at pre-adoption SHA
`93e072c` succeeded before the #347–#353 runtime/health fixes.

**First Apply**

- Status: `Ready`
- `Changes applied: 25`
- Included 21 Intentloom Codex skills under `.agents/skills/aif-*/SKILL.md`,
  `.aif/config.yaml`, `.aif/local.example.yaml`,
  `.cursor/rules/intentloom-core.mdc`,
  `.cursor/rules/intentloom-typescript.mdc`, and canonical metadata
  `.aif/manifest.lock.json`, `.aif/source-map.json`
- Canonical CLI Diff after Apply:

```json
{
  "changes": [],
  "diagnostics": []
}
```

- Canonical CLI Doctor after Apply: zero error-severity findings;
  `installation-healthy`

**Second Apply on unchanged adopted tree**

- Status: `Already applied`
- `Changes applied: 0`
- CLI Doctor and Diff remained healthy/clean

Idempotency/replay confirmed.

## Final maintainer packaged Desktop verification

Maintainer rebuilt and opened the current packaged `Intentloom.app` from
`pnpm desktop:package` against `vii-desktop-final`.

### Connection

Packaged Desktop connects to its bundled daemon. Previously observed blockers
are gone:

- `an existing daemon endpoint did not respond`
- `No such file or directory (os error 2)`
- `packaged daemon executable not found`

### Doctor

On `vii-desktop-final`:

- 0 errors
- 1 warning
- 6 info
- Exit code 0
- No blocking findings
- `installation-healthy`
- Resolved project profile: `typescript`

No false:

- `aif-config-missing`
- `manifest-lock-missing`
- `source-map-missing`
- `profile-mismatch`

Known warning: Cursor experimental capability warning. Info findings are
expected unsupported provider capabilities plus `installation-healthy`.
Canonical CLI Doctor on the same project agrees.

### Doctor Refresh

`Refresh Doctor` returns the same canonical healthy state. No stale
pre-adoption Doctor findings remain.

### Diff Review

Packaged Desktop Diff Review:

- 0 changes
- 0 conflicts
- 0 security errors

Canonical CLI Diff on the same unchanged adopted tree agrees:

```json
{
  "changes": [],
  "diagnostics": []
}
```

### Root switching

Maintainer verified:

1. open another disposable project
2. Doctor changes to that project's findings
3. switch back to `vii-desktop-final`
4. Doctor returns to the correct healthy Vii state

Root-scoped Doctor state invalidation confirmed.

### Cancel lifecycle

After #352/#353, packaged Desktop:

- initial Connect → Inspect → Doctor completes
- when Doctor is ready, global Cancel is hidden
- Refresh Doctor shows Cancel only while loading
- Cancel disappears when Refresh completes
- manual Cancel during an operation hides correctly
- subsequent Retry/Refresh works
- no stale Cancel leaks across root switching

### Tauri dev mode

Maintainer verified current dev mode after #353:

```bash
pnpm build
pnpm --filter @intentloom/desktop tauri dev
```

Dev Desktop connects using `node packages/daemon/dist/intentloomd.cjs` and no
longer applies packaged SEA preflight to `"node"`. Connect/Doctor/Diff work in
dev mode.

## Security invariants preserved

Completion does not remove or weaken:

- plan fingerprint binding
- prepared-plan digest binding
- approval binding
- expiry
- stale rejection
- 20 Apply gates
- per-root lock
- transactional Apply
- rollback
- zero-write denial semantics
- catalog-bound generation
- normal CLI sync safety
- local-only daemon authentication
- bounded IPC
- method allowlisting

## Residual risks (accepted follow-ups, not blockers)

These remain documented and are not claimed solved by this milestone:

- external-editor TOCTOU during Apply
- no crash-safe transaction journal
- leftover daemon process can remain after unlink/replacement in some recovery scenarios
- pre-existing multi-instance/spawn race where still documented

Portable adoption, migrations, future provider support, and enterprise flows
remain separate roadmap work.

## Completion gate

**Decision: Desktop Existing-Project Adoption: COMPLETE**

The following are implemented and evidence-backed through real dogfood and
maintainer verification:

- existing project selection
- Inspect
- Adoption Preview
- project-owned decisions
- Prepare
- Revalidate
- Approve
- Apply
- catalog-bound generation
- replay/idempotency
- Doctor
- Diff
- daemon lifecycle
- packaged sidecar
- root switching
- operation cancellation lifecycle
- dev-mode daemon launch
