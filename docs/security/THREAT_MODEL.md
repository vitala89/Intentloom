# Threat Model

## Assets and trust boundaries

Assets include repository contents, developer secrets, project files, AIF catalog integrity, generated-file ownership records, and human approval. Inputs from repositories, templates, profiles, generated files, paths, and tool adapters are untrusted until validated. AIF is local-first and has no network or telemetry plane in v0.1.

## Threats and controls

| Threat                                               | Risk                                                    | Required controls                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious repository instructions / prompt injection | Agent is persuaded to bypass policy or leak data        | Treat repository prose as untrusted data; isolate instruction sources; show provenance; retain human confirmation for write plans.                          |
| Path traversal / symlink escape                      | Writes outside project root                             | Canonicalize paths and resolve every existing destination parent against the explicit root before planning writes.                                          |
| Arbitrary script execution                           | Local code execution                                    | No scripts run during resolution/validation; future scripts require explicit command and approval.                                                          |
| Secret leakage                                       | Secrets enter prompts, logs, locks, or generated files  | Redact known secret patterns from diagnostics; prohibit secret values in catalog, lock, source map, and examples.                                           |
| Unsafe hooks                                         | Silent lifecycle execution                              | Never install or enable hooks automatically; model hooks as explicit, reviewed future artifacts.                                                            |
| Template injection                                   | Untrusted values alter generated output                 | Use structured rendering with schema validation and escaping; forbid arbitrary expression evaluation.                                                       |
| Generated-file or ownership-metadata tampering       | Drift is hidden or malicious content is trusted         | Re-read committed generated and metadata bytes; validate identity, versions, paths, ownership, relationships, and checksums; roll back every inconsistency. |
| Dependency supply-chain risk                         | Compromised build/runtime dependency                    | v0.1 installs none; later dependencies require lockfiles, provenance review, and minimal surface.                                                           |
| Destructive overwrite                                | User content loss                                       | Dry-run, diff, conflict detection, and backup or explicit confirmation for every write.                                                                     |
| Stale instructions                                   | Obsolete policy drives unsafe behavior                  | Pin versions and checksums; `doctor` reports stale locks, unsupported adapters, and drift.                                                                  |
| Adoption ownership confusion                         | Existing project files are silently claimed             | Treat every unrecorded existing file as project-owned regardless of path, header, filename, equivalent source, or matching bytes.                           |
| Unbounded repository discovery                       | Heavy, ignored, binary, or external trees are traversed | Bound depth/file count; ignore dependencies, VCS, vendor/build/cache output and binaries; never traverse symlinked directories.                             |

## Non-goals

AIF does not sandbox a coding agent, enforce provider permissions, scan all repository content, or prevent a user from deliberately approving unsafe actions. It makes provenance, differences, and unsafe plans visible before mutation.

## Security invariants

1. No network request or telemetry is implicit.
2. A pure validation path must exist for every mutating path.
3. Every generated artifact is traceable to canonical inputs and adapter version.
4. Human confirmation is required when an existing non-identical file would be replaced.
5. Security-sensitive provider behavior remains outside canonical core and is explicitly documented by an adapter.
6. Generated and metadata write paths reject symlinks, including internal and broken links, and are revalidated before replacement.
7. Symlink loops fail through the same stable path-security classification without recursive traversal.
8. Destination collisions abort before persistent writes and preserve project state byte-for-byte.
9. Transaction success requires the actual committed generated files, manifest, and source map to form one mutually consistent state and to match the planned bytes.
10. Every post-write corruption class has a stable code, fails at `post-write-consistency`, and triggers restoration or removal according to the transaction's initial state.
11. Post-write diagnostics contain only project-relative affected paths and safe identifiers, never private file contents or external absolute paths.
12. Adoption dry-run and doctor are byte-for-byte read-only and produce no `.aif`, backup, staging, Git, or external-path mutation.
13. Profile detection uses bounded file evidence, never project prose, dependency installation, scripts, network access, or external symlink traversal.
