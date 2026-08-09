# Engineering Quality Packs Q8 Implementation Plan

## Objective

Implement the first bounded checker execution slice after Q7: execute a
project-pinned ESLint binary through a provider-neutral, read-only execution
contract and return a bounded, truthful result that can be passed to the Q7
report ingester.

## Triage and route

- **Score:** 9/10 (blast radius 2, ambiguity 1, risk 2, verification 2,
  unknowns 2).
- **Route:** `implement`, with a security-focused design gate and fresh review.
- **Recommendation:** frontier/highest effort; no external delegation is
  required in this checkout because the dedicated security-review skill is not
  available. Perform the equivalent review against the roadmap, ADR-0012,
  ADR-0030, ADR-0052, and the harness specification.
- **Required checks:** focused protocol/validator/application/adapter tests,
  typecheck, lint, format, full `pnpm verify`, staged checks, and
  `git diff --cached --check`.
- **Stop condition:** do not claim Q8 complete if execution can install a
  dependency, inherit secrets, use a shell, write the project, silently use
  network access, exceed timeout/output bounds, or convert cancellation and
  process failures into success.

## Scope

### Included

1. Canonical protocol contracts for a single checker execution request,
   preview, bounded process result, failure/cancellation states, and explicit
   environment/network policy.
2. Validator-boundary checks for untrusted execution requests, including
   project-root binding, executable identity, argument allowlist, limits, and
   environment names.
3. Pure application resolution of a project-pinned executable candidate and a
   deterministic command preview. The application does not spawn processes.
4. A narrow `@intentloom/evidence-checker` adapter that resolves an executable
   only from project-local metadata and invokes it with `shell: false`, an
   explicit cwd, bounded timeout/output, and a minimal environment. It never
   installs dependencies or performs network/telemetry/publishing actions.
5. A first-party ESLint JSON execution path that feeds successful stdout into
   the existing Q7 ingestion operation. Non-zero checker exit remains a
   truthful checker failure while retaining bounded stdout/stderr evidence.
6. Focused contract, security-negative, cancellation, timeout, output-bound,
   and cross-platform path tests using injected process runners.

### Explicitly deferred

- TypeScript and other checker execution adapters.
- Container/OS sandbox implementation, remote execution, generic shell,
  arbitrary commands, dependency installation, external pack import, and
  marketplace executable support (Q9/Q10 or later).
- New CLI/MCP/daemon commands until the canonical application operation has
  a separately approved surface design.

## Architecture and seams

```text
protocol contracts
        ↓
validator (untrusted request boundary)
        ↓
application (pure candidate resolution + preview + result mapping)
        ↓ injected process runner seam
evidence-checker adapter (spawn, timeout, output, environment, cleanup)
        ↓
Q7 checker-report ingestion
```

- Canonical contracts live in `packages/protocol`.
- Validation lives in `packages/validator`; malformed or unsafe requests fail
  before adapter execution.
- Deterministic resolution and preview live in
  `packages/application/src/engineering-quality`.
- Process effects live in the new `@intentloom/evidence-checker` package,
  justified by the Q8 application consumer and the future CLI/CI consumer.
- Generated adapters remain untouched. No existing oversized entry file grows.

## Planned files and budgets

- `packages/protocol/src/engineering-quality/checker-execution.ts` (<250)
- `packages/validator/src/engineering-quality/checker-execution.ts` (<250)
- `packages/application/src/engineering-quality/checker-execution.ts` (<250)
- `packages/evidence-checker/package.json`, `tsconfig.json`, and `src/index.ts`
  (production implementation <250 lines)
- `tests/engineering-quality-checker-execution.test.ts` (<250)
- `tests/evidence-checker.test.ts` (<250)
- workspace/project references and required documentation only

If the adapter needs more responsibility than one file can safely carry, split
by cohesive responsibility rather than compressing code or creating a generic
helper module.

## Vertical test slices

1. Resolve a valid local ESLint candidate and produce a deterministic preview;
   run it through an injected runner and ingest bounded JSON output.
2. Reject candidates outside the project root, symlink escapes, shell syntax,
   unapproved arguments, malformed limits, and secret environment names.
3. Prove the default environment excludes inherited secrets and network-related
   package-manager settings; only explicitly safe variables are allowed.
4. Prove timeout, cancellation, output truncation, non-zero exit, spawn error,
   and cleanup are explicit terminal outcomes.
5. Prove deterministic ordering/digests and compatibility with Q7 ingestion.

## Verification and handoff

Before commit: inspect the staged diff, run staged checks, and run
`git diff --cached --check`. Before push: run full `pnpm verify`; host access
may be required for the known Unix-domain socket daemon tests. Update
`PROJECT_STATE.md`, `DUTY_WATCH.md`, and the roadmap status, then open a
separate draft PR only after all required checks pass.
