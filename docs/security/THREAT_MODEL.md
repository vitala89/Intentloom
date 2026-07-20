# Threat Model

## Assets and trust boundaries

Assets include repository contents, developer secrets, project files, Intentloom catalog integrity, generated-file ownership records, human approval, future workflow evidence, provider credentials, and project-access grants. Inputs from repositories, Git history, provider exports, external MCP servers, templates, profiles, generated files, paths, and tool adapters are untrusted until validated. Intentloom is local-first and has no network or telemetry plane in v0.1.

## Threats and controls

| Threat                                               | Risk                                                    | Required controls                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious repository instructions / prompt injection | Agent is persuaded to bypass policy or leak data        | Treat repository prose as untrusted data; isolate instruction sources; show provenance; retain human confirmation for write plans.                          |
| Malicious Git or provider evidence                   | Commit messages, exports, or API payloads influence decisions or leak data | Parse as bounded untrusted data; preserve provenance; redact sensitive fields; never execute or treat prose as instructions.                                |
| External MCP server manipulation                     | A connected server returns forged evidence or requests unsafe actions | Capability allowlists, source identity, schema validation, provenance, trust classification, project isolation, and no direct mutation from external results. |
| Path traversal / symlink escape                      | Reads or writes escape the selected project root        | Canonicalize paths, bind capabilities to an explicit root, reject external symlinks, and revalidate destinations before writes.                             |
| Over-broad project access                            | Inspection reads unrelated, private, or secret files    | Explicit root and access scopes, bounded discovery, built-in exclusions, content-safe reporting, and a documented distinction from OS sandboxing.           |
| Arbitrary script or shell execution                  | Local code execution or credential theft                | No shell or project scripts during inspection/evidence collection; fixed Git read-only allowlist; no generic MCP command or CLI-execution tool.              |
| Secret leakage                                       | Secrets enter prompts, logs, evidence, locks, or generated files | Redact known secret patterns; prohibit credentials in project metadata, evidence bundles, source maps, examples, and diagnostics.                            |
| Excessive provider permissions                       | Provider token can modify or administer repositories    | Export-first delivery; later live access is explicit, least-privilege, preferably read-only, revocable, and stored outside project state.                    |
| Cross-project evidence mixing                        | Events from another repository create false findings    | Bind evidence bundles to provider identity, repository identity, explicit root, source IDs, and deterministic case correlation.                              |
| Forged, stale, or incomplete evidence                | Conformance findings are overstated                     | Trust states, timestamps, source provenance, cache freshness, conflict detection, and explicit missing/ambiguous/unsupported classifications.               |
| Unsafe hooks                                         | Silent lifecycle execution                              | Never install or enable hooks automatically; model hooks as explicit, reviewed future artifacts.                                                            |
| Template injection                                   | Untrusted values alter generated output                 | Use structured rendering with schema validation and escaping; forbid arbitrary expression evaluation.                                                       |
| Generated-file or ownership-metadata tampering       | Drift is hidden or malicious content is trusted         | Re-read committed generated and metadata bytes; validate identity, versions, paths, ownership, relationships, and checksums; roll back every inconsistency. |
| Dependency supply-chain risk                         | Compromised build/runtime dependency                    | v0.1 installs none; later dependencies require lockfiles, provenance review, and minimal surface.                                                           |
| Destructive overwrite                                | User content loss                                       | Dry-run, diff, conflict detection, and backup or explicit confirmation for every write.                                                                     |
| Stale instructions                                   | Obsolete policy drives unsafe behavior                  | Pin versions and checksums; `doctor` reports stale locks, unsupported adapters, and drift.                                                                  |
| Adoption ownership confusion                         | Existing project files are silently claimed             | Treat every unrecorded existing file as project-owned regardless of path, header, filename, equivalent source, or matching bytes.                           |
| Unbounded repository discovery                       | Heavy, ignored, binary, or external trees are traversed | Bound depth/file count; ignore dependencies, VCS, vendor/build/cache output and binaries; never traverse symlinked directories.                             |
| Local daemon endpoint exposure or peer impersonation | Another process reaches or controls the daemon          | IPC-only explicit endpoint, private runtime directory, one-use in-memory session token, strict framing/limits, no TCP fallback, and authenticated shutdown. |
| MCP mutation replay or stale approval                | An agent applies a changed or previously approved plan  | Short-lived root-bound plan ID, digest, expiry, exact path/diff preview, current-state revalidation, explicit human approval, and transactional apply.        |

## Non-goals

Intentloom does not sandbox a coding agent, enforce provider permissions, scan all repository content, or prevent a user from deliberately approving unsafe actions. Application-level access scopes are not represented as a complete operating-system sandbox. Intentloom makes provenance, differences, uncertainty, capabilities, and unsafe plans visible before mutation.

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
14. A future local daemon accepts only authenticated, versioned, bounded IPC requests and never treats local endpoint reachability as authorization.
15. Future project inspection, Git evidence collection, timelines, conformance, and MCP read-only tools remain bound to an explicit project root and cannot mutate project state.
16. Local Git collection uses fixed read-only commands without a shell, hooks, network access, checkout, configuration changes, or repository mutation.
17. Provider and external MCP results are untrusted evidence and cannot directly trigger adoption, sync, merge, release, or any project write.
18. MCP exposes named typed capabilities, never a generic shell, unrestricted CLI execution, arbitrary file reads, or generic writes.
19. Every MCP-triggered mutation requires a reviewed plan, explicit human approval, digest and expiry verification, root and current-state revalidation, and transactional rollback guarantees.
20. Credentials remain outside project configuration, generated output, evidence bundles, logs, source maps, and MCP tool results.
