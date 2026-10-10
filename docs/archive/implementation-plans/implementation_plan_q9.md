# Engineering Quality Packs — Q9 External Pack Import

## Objective

Implement the first bounded Q9 slice: accept an externally supplied,
data-only quality-pack payload; validate its untrusted contents; verify an
exact source pin and SHA-256 digest; normalize provenance, license, and
compatibility metadata; and produce separate review, pin, and activation
decisions. The import path must never execute imported content, install
dependencies, fetch from the network, mutate the project, or activate a pack
implicitly.

## Triage and route

- Score: 10/10 (blast radius 2, ambiguity 2, risk 2, verification 2,
  unknowns 2).
- Route: `plan` then `implement`, with a security/extension review and fresh
  verification gate.
- Model/effort recommendation: frontier model, highest effort.
- Required skills: `aif-task-router` for route selection, `aif-extension-review`
  for untrusted external-pack capability and provenance review, `tdd` for
  vertical contract slices, and `review` for standards/spec review.
- Required checks: focused protocol/validator/application tests, typecheck,
  lint, format, build, full `pnpm verify`, staged checks, and
  `git diff --cached --check` before commit; remote governance, CodeQL,
  dependency, and compatibility checks before handoff.
- Stop condition: stop if import can execute code, invoke a package manager or
  VCS client, perform hidden network access, write project state, activate
  without explicit approval, accept an unpinned or digest-mismatched source,
  trust malformed metadata, or produce non-deterministic resolution.

## Scope

### Included

- Canonical protocol contracts for source kinds: package, Git, local,
  organization registry, and documentation snapshot.
- Immutable source identity containing an exact locator, revision/version or
  snapshot identifier, SHA-256 digest, provenance, license, and compatibility
  metadata.
- Validator-boundary checks for untrusted payloads, including bounded text and
  entry counts, supported data-only schema, source-kind-specific pin shape,
  digest format, required provenance/license fields, and normalized rule
  meanings.
- Pure application import that accepts bytes/data supplied by a caller,
  computes the canonical digest, validates the payload, and returns a review
  record plus a separately gated pin and activation decision.
- Explicit activation approval that is bound to the imported pack digest and
  never executes imported code.
- Focused unit/contract tests covering every source kind, digest mismatch,
  missing provenance/license, malformed rules, duplicate/conflicting meanings,
  revoked/unapproved activation, deterministic repeatability, and the absence
  of process/network/install/mutation paths.
- `PROJECT_STATE.md` and `DUTY_WATCH.md` handoff updates.

### Deferred

- Network clients, registry APIs, Git commands, package-manager commands,
  archive extraction, documentation crawling, dependency installation,
  signature-service integration, catalog search/download/quarantine (Q10),
  and generated adapters.
- Automatic updates, publishing, activation persistence, project mutation,
  checker execution, and arbitrary executable extensions.
- New package or CLI/MCP surface without a concrete roadmap consumer.

## Architecture

```text
caller-supplied data/bytes
        |
        v
protocol canonical import contracts
        |
        v
validator: untrusted payload + pin/license/provenance boundary
        |
        v
application: pure digest, normalization, review, approval binding
        |
        +--> Q6 deterministic pack resolver (only after explicit activation)
```

- `protocol` owns the canonical import, review, pin, and activation contracts.
- `validator` owns all untrusted-data and source-identity validation.
- `application` owns pure deterministic digesting, normalization, and
  approval-state transitions.
- No adapter, process runner, network client, persistence, or generated output
  is introduced in Q9.
- New hand-written production files remain below 250 lines; existing oversized
  barrels are not expanded beyond the minimum export wiring.

## Acceptance criteria

1. A caller-supplied data-only pack from each declared source kind can be
   imported only when its exact pin, digest, provenance, license, and
   compatibility metadata validate.
2. Repeating import with identical bytes and metadata returns byte-for-byte
   equivalent normalized review/pin results.
3. Import, review, pin, and activation are separate states; activation requires
   explicit approval bound to the exact digest and source identity.
4. Invalid, conflicting, or unsupported content fails closed at the validator
   boundary.
5. Imported data is never treated as executable code and no network, process,
   dependency installation, filesystem mutation, telemetry, publishing, or
   hidden activation is reachable from the slice.
6. Existing Q1–Q8 behavior remains green under the full verification gate.

## Verification and handoff

- Use vertical tracer bullets: one public import contract test, then the
  smallest implementation; add source/pin validation, digest binding,
  approval separation, and adversarial rejection slices incrementally.
- Perform manual review against `aif-extension-review`: source/integrity,
  license/notice obligations, capability delta, conflicts, adaptations,
  evaluation plan, residual risk, and eligibility recommendation.
- Before commit: inspect staged diff, run staged checks, and run
  `git diff --cached --check`.
- Before push: run full `pnpm verify`.
- Publish a separate draft PR only after local checks pass; do not merge it in
  this task.
