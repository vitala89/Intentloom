# Memory and Security Roadmap

Candidates M1–M4 and S1–S5 are implemented in `main` and included in the
published `0.4.0-beta.1` prerelease. This roadmap supplement records their
completed scope and the later expansions that remain future Intentloom product
directions:

1. persistent, project-scoped, vendor-neutral memory for AI engineering agents;
2. defensive project security analysis, finding verification, and reviewed remediation.

Later expansions remain future candidates behind the existing
application-operation, capability, evidence, approval, and transaction
boundaries. See the [release state](../releases/RELEASE_STATE.md) for the
current main-versus-npm boundary.

## Delivery principles

- local and read-only before networked or mutating;
- deterministic evidence before model interpretation;
- explicit project and data scope before collection or retrieval;
- provenance and trust classification for every memory item and security finding;
- no arbitrary shell, hidden hooks, implicit uploads, or silent background execution;
- no private project data used for training without explicit opt-in;
- proposed memory writes and security patches require review;
- model output never counts as approval or verified evidence;
- CLI, MCP, daemon, TUI, desktop, and Neutron reuse the same application operations.

## Completed Candidate M1: Bounded project context

Scope:

- define context-source and retrieval-result schemas;
- build a read-only operation over canonical intent, ADRs, documentation, ownership, and engineering evidence;
- enforce project root, excluded paths, item and token budgets, provenance, and trust labels;
- expose equivalent structured output through CLI and MCP.

Exit gate:

- repeated requests over unchanged state are deterministic before optional semantic ranking;
- excluded files and detected secrets never enter returned context;
- the operation is byte-for-byte read-only and cannot cross the selected root.

## Completed Candidate M2: Accepted persistent memory

Scope:

- define memory item, classification, acceptance, supersession, conflict, retention, deletion, and redaction schemas;
- support proposal, review, accept, supersede, export, import, and forget operations;
- keep canonical intent, verified evidence, accepted decisions, working context, and untrusted observations separate;
- store records project-locally with explicit ownership and transaction semantics.

Exit gate:

- untrusted content cannot become accepted memory without explicit approval;
- imports cannot mix projects or override canonical sources silently;
- users can inspect, export, supersede, and delete eligible records with audit evidence.

## Completed Candidate M3: Semantic retrieval and portable adapters

Scope:

- add a provider-neutral local index contract;
- treat indexes and embeddings as rebuildable derived state;
- support optional local semantic search and explicit external embedding providers;
- evaluate an Obsidian-compatible Markdown adapter;
- render bounded memory context for Claude Code, Codex, Gemini, Cursor, Copilot, MCP, desktop, and Neutron.

Exit gate:

- retrieval quality improves on a documented benchmark;
- provider, network, model-download, data-retention, and privacy behavior are visible;
- removal or rebuilding of an index does not destroy canonical memory.

## Completed Candidate M4: Agent session lifecycle

Scope:

- project-scoped session start and close operations;
- active-task, unresolved-question, decision, and outcome capture;
- pre-compaction export where supported;
- explicit session retention, deletion, and portability;
- memory poisoning, prompt injection, duplicate identity, and stale-context defenses.

Exit gate:

- session lifecycle is available without vendor-specific hooks;
- optional hooks call only reviewed typed operations or fixed commands;
- closing, cancelling, or compacting a session cannot silently mutate canonical intent.

## Completed Candidate S1: Security evidence and posture

Scope:

- define security finding, evidence, coverage, verification, dismissal, accepted-risk, and remediation schemas;
- import explicit SARIF and selected scanner exports;
- report declared language, framework, scanner, and finding-class coverage;
- preserve provider and ruleset provenance.

Exit gate:

- imported findings are bounded, redacted, project-isolated, and reproducible;
- unsupported coverage remains visible;
- malformed or malicious reports cannot escape the project or grant capabilities.

## Completed Candidate S2: Local deterministic security adapters

Scope:

- fixed read-only adapters for dependency, secret, configuration, source, extension, MCP, hook, and agentic-security checks;
- no repository install scripts, arbitrary builds, proof-of-concept exploits, or generic shell;
- versioned scanner identity, integrity, permissions, and data-handling metadata;
- correlation and deduplication across findings.

Exit gate:

- adapters execute only declared allowlisted operations;
- scans are byte-for-byte read-only;
- adversarial fixtures cover path escape, command construction, secret leakage, oversized input, and cross-project mixing.

## Completed Candidate S3: AI-assisted reasoning and verification

Scope:

- optional provider-neutral security reasoning over bounded evidence and source context;
- cross-file data-flow and business-logic analysis;
- independent adversarial verification pass;
- explicit confidence, verification, uncertainty, and disagreement states;
- local-model option where practical.

Exit gate:

- verified findings outperform the candidate-only pass on a curated benchmark without hiding false negatives;
- provider and model identity, network behavior, source scope, and data policy are displayed;
- model confidence is never presented as proof.

## Completed Candidate S4: Reviewed remediation

Scope:

- targeted remediation proposals;
- affected paths, exact diff, compatibility, tests, migration, policy, and rollback impact;
- explicit approval and stale-plan rejection;
- transactional apply through the existing Intentloom boundary;
- post-write validation and finding re-evaluation.

Exit gate:

- no patch is applied from a finding, model response, webhook, or schedule alone;
- changed root, state, digest, ownership, permission, or capability rejects the plan;
- failed changes roll back or report incomplete recovery explicitly.

## Completed Candidate S5: Security Center and workflow integration

Scope:

- TUI and desktop Security Center views;
- prioritized findings with coverage and verification state;
- trust-boundary and data-flow views;
- dependency and extension provenance;
- accepted-risk expiration and ownership;
- Markdown, JSON, and SARIF export;
- later CI, scheduled scans, notifications, and issue-tracker adapters.

Exit gate:

- UI results match the underlying structured operations;
- scheduled and CI analysis can create findings but cannot apply patches;
- retention, redaction, logs, artifacts, network destinations, and notification scopes are explicit.

## Shared threat-review requirements

Before either direction moves from documentation into implementation, add ADRs and threat models for:

- memory poisoning and stale or conflicting context;
- prompt injection through source, documentation, issues, reports, MCP, and imported memory;
- secrets in embeddings, indexes, transcripts, findings, exports, and provider requests;
- malicious lifecycle hooks and extension updates;
- external scanner and model supply-chain integrity;
- cross-project and cross-tenant isolation;
- approval confusion and replay;
- deletion, retention, backups, and model-provider retention;
- unsafe vulnerability details and authorized-use boundaries.

## Explicit non-goals

- unlimited or invisible memory;
- one global memory shared across all projects by default;
- autonomous exploitation;
- scanning repositories without authorization;
- complete-security claims;
- autonomous security patching;
- replacing established security tools or professional review;
- coupling Intentloom Core to Obsidian Mind, Obsidian, QMD, Claude Security, or any other vendor product.
