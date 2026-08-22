# Intentloom dogfooding record: P3 S8 external specialized-pack completion

**Date:** 2026-08-22
**Scenario:** Final maintainer acceptance gate for P3 S8 External Specialized Pack Lifecycle
**Consumer:** disposable dogfood project, not the real Vii checkout
**Conclusion:** Pass — milestone complete

This record closes the Path 3 completion gate: S8a–S8e + S8f1 Desktop
preview/review + S8f2 Desktop human approval/activation + maintainer manual
acceptance. It is documentation only. It does not modify runtime code and does
not mutate a real Vii checkout.

## Evidence classes

| Class                                                       | Used                     |
| ----------------------------------------------------------- | ------------------------ |
| Automated test evidence (#319, #355–#357, #359, #361, #363) | yes                      |
| Desktop `tauri dev` click-through                           | yes, maintainer verified |
| Disposable local pack project                               | yes                      |
| Real Vii checkout                                           | no                       |

## Identity

- **Intentloom SHA verified:** `d1581b8ee7e60e74fdce2b3f83cdc784bc75ab56` (`main` after PR #363)
- **Disposable consumer:** `/Users/eugenekasap/WebstormProjects/intentloom-dogfood/s8f2-disposable`
- **Desktop command:** `tauri dev`
- **Pack used:** `pack-reviewed-org-mlops` `1.0.0` (publisher Example Org)
- **Source kind / locator / pin:** local / `./packs/mlops.json` / `local-v1`
- **Canonical digest:** `sha256:f0cf84ae7e9d78b2088867f93e492191b814c355b72665bfa239a7001eb54abe`

## Implementation sequence verified on `main`

| PR   | Merge SHA | Scope                                                     |
| ---- | --------- | --------------------------------------------------------- |
| #319 | `907e6ad` | S8a in-memory preview/activate, pin/digest, human confirm |
| #355 | `ef8d838` | S8b canonical digest and lock-entry preparation           |
| #356 | `da78b73` | S8c transactional apply to `.aif/extension-lock.json`     |
| #357 | `71d0876` | S8d CLI and daemon preview/activate surfaces              |
| #359 | `70e997d` | S8e Doctor diagnostics for active external pins           |
| #360 | `e9e83d2` | S8e state/docs follow-up                                  |
| #361 | `8581df6` | S8f1 Desktop read-only preview/review                     |
| #362 | `cbbc772` | S8f1 state/docs follow-up                                 |
| #363 | `d1581b8` | S8f2 Desktop human approval and activation                |

## Maintainer Desktop acceptance

### Valid external pack preview

PASS. Trust before approval: `untrusted-external`.

### Human approval

PASS. Desktop showed an explicit approval boundary. Reviewer `desktop-local`
approved a decision bound to canonical digest, source pin, source locator, and
the current reviewed preview.

### Activation

PASS. Desktop result: Applied. Changed path: `.aif/extension-lock.json`.

### Persisted lock verification

PASS. The resulting `.aif/extension-lock.json` contained:

- `extensionId`: `pack-reviewed-org-mlops`
- `category`: `policy-pack`
- `requestedVersion` / `resolvedVersion`: `1.0.0`
- `source.registry`: `local`
- `source.package`: `./packs/mlops.json`
- `source.resolved`: `local-v1`
- `integrity`: `sha256:f0cf84ae7e9d78b2088867f93e492191b814c355b72665bfa239a7001eb54abe`
- `manifestSchemaVersion`: `urn:intentloom:schema:quality-specialized-pack:1`
- `publisher.name`: Example Org
- `license.spdxId`: MIT
- `approvedBy`: `desktop-local`
- `installationType`: `referenced`

No pack bytes were copied into the project.

### Doctor after activation

PASS. Doctor opened successfully. The disposable project had unrelated baseline
findings because it was intentionally minimal:

- `aif-config-missing`
- `manifest-lock-missing`
- `source-map-missing`
- `product-documentation-missing`

No S8 external-pack health errors were observed:

- `specialized-pack-manifest-missing`
- `specialized-pack-manifest-digest-mismatch`
- `specialized-pack-manifest-identity-mismatch`
- `specialized-pack-pin-invalid`
- `specialized-pack-integrity-invalid`

The activated local specialized-pack pin itself was healthy.

### Idempotency

PASS. Second identical Preview → Approve → Activate returned Already applied.
No project files changed. Canonical diagnostic:
`specialized-pack-lock-already-applied`.

### Conflict handling

PASS. Changing only `local-v1` → `local-v2`, then Preview → Approve → Activate,
returned Conflict. Canonical diagnostic:
`specialized-pack-lock-update-required:pin`. The UI stated automatic
update/replace is not implemented. No Force / Replace / Upgrade path existed.

### Conflict persistence safety

PASS. After the `local-v2` conflict, `.aif/extension-lock.json` still contained
`source.resolved: local-v1`. No silent overwrite occurred.

### Stale approval protection

PASS. After Preview → Approve, changing reviewed input invalidated approval.
Desktop displayed: `Inputs changed since preview. Preview again before approval.`
The approval control became disabled. Old approval could not be reused.

### Root-switch protection

PASS. After Preview/Approve, switching project root cleared preview, approval,
and activation result. No reviewed state leaked across project roots.

### Unsafe capability rejection

PASS. Unsafe manifest `pack-unsafe-net` with `permissionsRequired:
network.connect` returned Rejected. Canonical diagnostic: external pack
permission `network.connect` would expand a safety capability.
Approval/activation was unavailable.

## Forbidden S8 scope confirmed absent

Maintainer acceptance also confirmed:

- no marketplace
- no network fetch
- no file picker requirement
- no automatic update
- no Force/Replace/Upgrade
- no MCP mutation
- no TUI activation
- no pack execution

## Residual deferred surfaces (not blockers)

These remain intentionally post-S8 and are not failed completion criteria:

- TUI interactive external-pack activation
- MCP external-pack mutation
- optional MCP read-only preview
- optional TUI read-only parity enhancements
- update/replace lifecycle
- deactivation
- revocation
- remote discovery
- network fetching
- marketplace browsing
- executable marketplace support

## Completion gate

**Decision: P3 S8 External Specialized Pack Lifecycle: COMPLETE**

S8a COMPLETE
S8b COMPLETE
S8c COMPLETE
S8d COMPLETE
S8e COMPLETE
S8f1 COMPLETE
S8f2 COMPLETE
Maintainer manual acceptance COMPLETE
