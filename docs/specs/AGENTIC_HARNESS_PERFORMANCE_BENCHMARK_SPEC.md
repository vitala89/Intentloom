# Agentic Harness Performance Benchmark Specification

## Status

A bounded implementation exists. The `calibration`, `local-repeat`, and
`matrix-observation` execution profiles are implemented as `intentloom harness benchmark`.
A non-release-gating, reporting-only CI workflow `.github/workflows/harness-benchmark.yml`
collects matrix observations across Linux, macOS, and Windows under Node 22/24. The runner
is fully offline, is never a release or Compatibility gate, and applies no thresholds. This
document remains the normative measurement contract; implementation details that diverge from it
should be treated as a bug, not a silent reinterpretation.

## Purpose

Define a reproducible, provider-neutral benchmark that can measure the cost of
the deterministic H9 evidence contract after its variance is understood. The
benchmark must consume the existing fixture contract without changing the
fixture's expected terminal states or turning hosted compatibility timing into
a product guarantee.

The first benchmark target is the composed H9 evidence flow represented by
fixture version `h9-evidence-drill@1`:

- passing adoption-gate scorecard;
- failing adoption-gate scorecard;
- deterministic replay;
- cross-project resume rejection;
- purged checkpoint; and
- completed transactional rollback.

## Non-goals

- certifying agent, model, provider, executor, or repository safety;
- setting a universal latency or throughput promise;
- making performance a required `pnpm verify` or compatibility-matrix gate;
- comparing providers or models before an adapter-specific review;
- collecting remote, hosted, or private repository data;
- optimizing production code before a measured bottleneck and consumer exist;
- introducing a generic benchmark framework or a new package without an
  approved implementation consumer.

## Design invariants

1. The benchmark is observational. It records measurements and diagnostics;
   it does not authorize effects or change the harness verdict.
2. Deterministic correctness remains authoritative. A fast invalid run is not
   a successful benchmark result.
3. Fixture, scenario, scorer, policy, and benchmark versions are explicit.
   Results from incompatible versions are reported as non-comparable.
4. Volatile fields such as timestamps, temporary paths, process identifiers,
   and host-specific locations are excluded from stable result digests.
5. Raw event payloads, source content, credentials, and private paths are not
   persisted by the benchmark result.
6. The initial benchmark remains local and offline. Any future process,
   container, provider, or remote profile requires a separate capability and
   threat review.
7. No threshold is a release gate until a reviewed variance report establishes
   that the threshold is meaningful for its declared environment profile.

## Benchmark unit

A benchmark case is the tuple:

```text
benchmarkVersion
scenarioId
fixtureVersion
policyVersion
scorerVersion
executionProfile
operationSequence
```

The initial `operationSequence` is fixed and names the H9 stages rather than
depending on private function names. Each stage emits a bounded measurement
record:

```json
{
  "stage": "rollback",
  "status": "completed",
  "elapsedMs": 0,
  "evidenceDigest": "sha256:..."
}
```

The exact numeric value is produced by the future runner. The specification
does not invent baseline numbers.

## Execution profiles

The runner must identify the profile that produced each sample:

| Profile              | Purpose                                                                                       | Release-gate status |
| -------------------- | --------------------------------------------------------------------------------------------- | ------------------- |
| `calibration`        | Discover warm-up, sample-count, and variance behavior on one declared environment.            | Never a gate.       |
| `local-repeat`       | Repeat deterministic H9 stages on a local checkout for regression investigation.              | Never a gate.       |
| `matrix-observation` | Collect comparable observations from declared CI environments after explicit workflow review. | Reporting only.     |

Profiles must declare runtime version, operating system label, architecture,
repository commit, benchmark version, fixture version, and whether the process
was cold or warm. A profile may be rejected as `inconclusive` when its
environment metadata is missing or incompatible.

The initial review should choose warm-up and measured-sample counts after a
calibration run. Until that decision is recorded, implementations must not
silently assume that one observed run is representative.

## Metrics and result states

The first implementation may measure only elapsed time for the named stages.
Optional resource metrics require their own reproducibility and privacy review.
Results should include:

- sample count and discarded-sample reasons;
- median, p90, p95, minimum, maximum, and a robust spread measure such as MAD
  or IQR;
- per-stage summaries and total duration;
- deterministic verdict and benchmark status;
- environment and version identity;
- comparable baseline identity when a comparison was requested.

Benchmark status is distinct from the harness verdict:

- `observed`: valid samples were collected without a release-gate judgment;
- `inconclusive`: required evidence or comparable environment metadata is
  missing;
- `invalid`: the deterministic scenario or result contract failed;
- `unsupported`: the declared execution profile lacks a required capability.

An `invalid` or `unsupported` result must not be converted into `observed` by
dropping the failed sample.

## Sampling and variance

The implementation must preserve enough bounded sample data to explain the
summary, while keeping retention local and size-limited. It must report:

- warm-up policy;
- sample-count policy;
- clock source and resolution;
- outlier policy, including whether samples are discarded or only annotated;
- interruptions, system-load warnings, and incomplete stages; and
- the exact command or application operation that produced the sample.

The first variance report should characterize distributions separately for each
execution profile and platform. It must not pool Windows, macOS, and Linux
measurements into one threshold without an explicit comparability argument.

## Baselines and comparisons

A baseline comparison is eligible only when all of these identities match:

- benchmark and scenario versions;
- fixture, policy, and scorer versions;
- execution profile and declared platform class; and
- compatible repository and runtime metadata.

Otherwise the result must list a non-comparable reason. A future comparison may
report an advisory regression or improvement, but it must preserve the raw
summary and variance context and must not fail the release or compatibility
workflow by default.

## CI boundary

The existing Compatibility workflow remains a correctness and compatibility
signal. The benchmark must not be inserted into that required path merely to
obtain timing data. A future `matrix-observation` workflow, if approved, should
be explicitly invoked or separately reported and must distinguish:

- correctness failure;
- benchmark collection failure; and
- observed performance change.

The benchmark result is not evidence that a hosted runner is stable, and a
green compatibility job is not evidence of a performance budget.

## Safety and retention

The benchmark consumes sanitized fixture identifiers and bounded stage records.
It must not persist:

- model prompts or responses;
- provider credentials or environment values;
- raw repository files or event payloads;
- arbitrary command output; or
- unbounded traces or artifacts.

Results are retained outside the target project by default, use explicit local
paths when implemented, and support targeted deletion. Any export must be
explicit and redacted before leaving local state.

## Acceptance criteria for a future implementation

Before implementation is considered complete, a reviewed consumer must show
that the benchmark:

1. consumes `h9-evidence-drill@1` without changing its expected terminal
   states;
2. produces stable normalized identifiers after volatile fields are removed;
3. distinguishes `observed`, `inconclusive`, `invalid`, and `unsupported`;
4. rejects incompatible baseline comparisons with an explicit reason;
5. reports stage and total summaries with bounded retention;
6. remains offline and provider-neutral in its initial profile;
7. does not alter `pnpm verify`, Compatibility, release, or mutation gates;
8. has focused contract tests for malformed metadata, missing evidence,
   incompatible baselines, retention limits, and redaction; and
9. records a variance report before any threshold proposal is reviewed.

## Open review decisions

- Which clock and resolution are portable enough for the first implementation?
  Resolved provisionally: `process.hrtime.bigint()`, a monotonic,
  sub-millisecond clock available on Linux, macOS, and Windows under Node
  22/24.
- What warm-up and sample-count policy does calibration support? Resolved
  provisionally: `local-repeat` defaults to 3 warm-up and 10 measured
  samples; `calibration` uses the same runner with caller-supplied counts to
  help decide whether those defaults are right. This is provisional pending a
  real variance report.
- Which resource metrics, if any, justify their privacy and portability cost?
  Resolved for the first implementation: none. Only elapsed time is measured.
- Should matrix observations be manual-dispatch, scheduled, or local-only?
  Resolved for initial CI integration: non-release-gating `workflow_dispatch`
  and PR-path reporting job in `.github/workflows/harness-benchmark.yml`.
- What is the smallest retained sample record that still supports diagnosis?
  Resolved provisionally: the raw per-stage `elapsedMs` array plus the
  aggregate summary (median, p90, p95, min, max, MAD spread), nothing else.
- Which owner reviews any future threshold, and when does it expire? Still
  open; no threshold is proposed by this implementation.

Until these decisions are accepted, the H9 evidence contract remains the
release-readiness evidence and this benchmark remains a design artifact.

## Related documents

- [ADR-0052: Agentic evaluation and execution harness](../decisions/ADR-0052-agentic-evaluation-and-execution-harness.md)
- [Agentic Harness Specification](AGENTIC_HARNESS_SPEC.md)
- [Agentic Harness Development Plan](../roadmap/AGENTIC_HARNESS_PLAN.md)
- [Agentic Harness H9 Hardening Audit](../roadmap/AGENTIC_HARNESS_H9_AUDIT.md)
