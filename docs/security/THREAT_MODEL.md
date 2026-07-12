# Threat Model

## Assets and trust boundaries

Assets include repository contents, developer secrets, project files, AIF catalog integrity, generated-file ownership records, and human approval. Inputs from repositories, templates, profiles, generated files, paths, and tool adapters are untrusted until validated. AIF is local-first and has no network or telemetry plane in v0.1.

## Threats and controls

| Threat | Risk | Required controls |
| --- | --- | --- |
| Malicious repository instructions / prompt injection | Agent is persuaded to bypass policy or leak data | Treat repository prose as untrusted data; isolate instruction sources; show provenance; retain human confirmation for write plans. |
| Path traversal | Writes outside project root | Canonicalize paths, reject absolute/escaping paths, and validate every planned path against project root. |
| Arbitrary script execution | Local code execution | No scripts run during resolution/validation; future scripts require explicit command and approval. |
| Secret leakage | Secrets enter prompts, logs, locks, or generated files | Redact known secret patterns from diagnostics; prohibit secret values in catalog, lock, source map, and examples. |
| Unsafe hooks | Silent lifecycle execution | Never install or enable hooks automatically; model hooks as explicit, reviewed future artifacts. |
| Template injection | Untrusted values alter generated output | Use structured rendering with schema validation and escaping; forbid arbitrary expression evaluation. |
| Generated-file tampering | Drift is hidden or malicious content is trusted | Record content hashes and source ownership; report mismatch; never overwrite automatically. |
| Dependency supply-chain risk | Compromised build/runtime dependency | v0.1 installs none; later dependencies require lockfiles, provenance review, and minimal surface. |
| Destructive overwrite | User content loss | Dry-run, diff, conflict detection, and backup or explicit confirmation for every write. |
| Stale instructions | Obsolete policy drives unsafe behavior | Pin versions and checksums; `doctor` reports stale locks, unsupported adapters, and drift. |

## Non-goals

AIF does not sandbox a coding agent, enforce provider permissions, scan all repository content, or prevent a user from deliberately approving unsafe actions. It makes provenance, differences, and unsafe plans visible before mutation.

## Security invariants

1. No network request or telemetry is implicit.
2. A pure validation path must exist for every mutating path.
3. Every generated artifact is traceable to canonical inputs and adapter version.
4. Human confirmation is required when an existing non-identical file would be replaced.
5. Security-sensitive provider behavior remains outside canonical core and is explicitly documented by an adapter.
