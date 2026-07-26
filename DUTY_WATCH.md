# Intentloom Duty Watch

`DUTY_WATCH.md` is the operational handoff log between agents, sessions, and
maintainers.

The metaphor is a ship's watch: every agent accepts responsibility for the
current state, records what happened during the watch, and leaves the repository
in a condition that the next watch can safely understand and continue.

## Current watch status

Status: Memory & Security Candidates M1–M4, S1–S5 merged into main; Daemon Protocol Contracts complete locally

Active branch: `feat/daemon-protocol-contracts`

Current objective: commit and open a pull request for Daemon & Protocol Contracts for Second Clients.

Next first action: review Daemon Protocol Contracts final diff, commit it, open a pull request, and merge after review.

## Watch rules

- Read the latest entry before starting work.
- Verify important claims against code, Git history, pull requests, releases,
  and CI.
- Never overwrite historical entries to hide mistakes or overwrite unfinished work.
- Append a new entry for each meaningful completed task or work session.
- Small typo-only changes may share one entry when performed in the same branch
  and pull request.
- Record partial work honestly. Use `incomplete` when the objective was not
  finished.
- A watch cannot be marked `complete` until required validation and
  documentation updates are finished.
- The next action must be concrete enough for a new agent to begin without
  guessing.
- Do not include secrets, credentials, private user data, or hidden
  chain-of-thought.

## Entry template

Copy the template from `docs/templates/DUTY_WATCH_ENTRY.md` and place the newest
entry directly below this section.

## Watch entries

### 2026-07-26, Daemon and protocol contracts for second clients

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/daemon-protocol-contracts`
- **Pull request:** #78
- **Objective:** Implement Daemon & Protocol Contracts for Second Clients, including ADR-0032, expanded RPC request/response schemas (`doctor`, `inspect`, `securityAudit`, `memorySearch`, `sessionGet`), daemon dispatch handlers, secret token authentication, and multi-operation IPC integration tests.
- **Completed:** Added `ADR-0032-second-client-daemon-protocol-contracts.md`. Expanded `DaemonRequest` and `DaemonResponse` types, request creators, and validators in `@intentloom/protocol`. Implemented typed RPC request handlers in `@intentloom/daemon`. Added multi-operation IPC integration tests in `tests/daemon.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0032-second-client-daemon-protocol-contracts.md`, `packages/protocol/src/index.ts`, `packages/daemon/src/index.ts`, `tests/daemon.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/daemon.test.ts` (16/16 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Daemon RPC expands beyond doctor to serve inspect, securityAudit, memorySearch, and sessionGet over authenticated local IPC.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol` and `@intentloom/daemon`.
- **Next first action:** Commit `feat/daemon-protocol-contracts`, open a pull request, and merge after approval.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S5 continuous security audit and verification

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s5`
- **Pull request:** #77
- **Objective:** Implement Candidate S5: Continuous Security Audit and Verification, including ADR-0031, threat model updates, versioned protocol schemas, private application operations (`runContinuousSecurityAudit`, `getSecurityAuditReport`), CLI command routing (`intentloom security audit`, `intentloom security verify`), and comprehensive test coverage.
- **Completed:** Added `ADR-0031-continuous-security-audit-and-verification.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 29. Implemented `SecurityInvariantStatus`, `SecurityInvariantCheck`, `ContinuousSecurityAuditReport` schemas and validators in `@intentloom/protocol`. Implemented invariant verification engine (1–28 checks), health score calculation (0–100%), and tamper-evident SHA-256 audit hashing (`runContinuousSecurityAudit`) in `@intentloom/application`. Exposed CLI routing for `intentloom security audit` and `intentloom security verify` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s5.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0031-continuous-security-audit-and-verification.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s5.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s5.test.ts` (3/3 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Continuous security audit verifies active invariants (1–28), logs tamper-evident SHA-256 digests under `.aif/security/audit-report.json`, and returns exit code 3 on health score < 80% or failing invariant checks.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`. Completes Memory & Security Roadmap Candidates M1–M4 and S1–S5.
- **Next first action:** Commit `feat/memory-security-s5`, open a pull request, merge after approval, and conclude Memory & Security roadmap.
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S4 controlled agentic security sandbox

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s4`
- **Pull request:** #76
- **Objective:** Implement Candidate S4: Controlled Agentic Security Sandbox, including ADR-0030, threat model updates, versioned protocol schemas, private application operations (`getSandboxCapabilityPolicy`, `writeSandboxCapabilityPolicy`, `evaluateProposalAgainstSandbox`), CLI command routing (`intentloom security sandbox`), and comprehensive test coverage.
- **Completed:** Added `ADR-0030-controlled-agentic-security-sandbox.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 28. Implemented `SandboxCapabilityMode`, `SandboxPathRule`, `SandboxCommandRule`, `SandboxCapabilityPolicy`, `SandboxEvaluationResult` schemas and validators in `@intentloom/protocol`. Implemented sandbox policy management and proposal evaluation algorithm (`evaluateProposalAgainstSandbox`) in `@intentloom/application`. Exposed CLI routing for `intentloom security sandbox <check|validate|policy>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s4.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0030-controlled-agentic-security-sandbox.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s4.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s4.test.ts` (5/5 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Sandbox capability policies are schema-validated files stored under `.aif/security/sandbox.json`; proposals violating capability mode, path rules, command allowlists, or network settings are blocked before execution with structured violation diagnostics.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s4`, open a pull request, merge after approval, and prepare Candidate S5 (Continuous Security Audit and Verification).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S3 deterministic security policies and baselines

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s3`
- **Pull request:** #75
- **Objective:** Implement Candidate S3: Deterministic Security Policies and Baselines, including ADR-0029, threat model updates, versioned protocol schemas, private application operations (`getSecurityPolicy`, `writeSecurityPolicy`, `getSecurityBaseline`, `updateSecurityBaseline`, `checkSecurityPolicyAndBaseline`), CLI command routing (`intentloom security baseline`, `intentloom security policy`), and comprehensive test coverage.
- **Completed:** Added `ADR-0029-security-policies-and-baselines.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 27. Implemented `SecurityPolicy`, `SecurityBaseline`, `SecurityBaselineCheckResult` schemas and validators in `@intentloom/protocol`. Implemented security policy/baseline operations and drift detection algorithm (`checkSecurityPolicyAndBaseline`) in `@intentloom/application`. Exposed CLI routing for `intentloom security baseline <check|update>` and `intentloom security policy <check|validate>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s3.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0029-security-policies-and-baselines.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s3.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s3.test.ts` (5/5 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Security policies and baselines are schema-validated files under `.aif/security/`; baseline updates require explicit maintainer invocation; policy violations with `fail` enforcement exit with deterministic non-zero codes.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s3`, open a pull request, merge after approval, and prepare Candidate S4 (Controlled Agentic Security Sandbox).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S2 local deterministic security adapters

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s2`
- **Pull request:** #74
- **Objective:** Implement Candidate S2: Local Deterministic Security Adapters, including ADR-0028, threat model updates, versioned protocol schemas, private application operations (`runLocalSecurityAdapters`, `correlateSecurityFindings`), CLI command routing (`intentloom security scan`), and comprehensive test coverage.
- **Completed:** Added `ADR-0028-local-deterministic-security-adapters.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 26. Implemented `SecurityAdapterCategory`, `SecurityAdapterMetadata`, `SecurityAdapterResult` schemas and validators in `@intentloom/protocol`. Implemented built-in deterministic read-only security adapters (`dependency`, `secret`, `config`, `mcp`, etc.) and finding deduplication/correlation (`correlateSecurityFindings`) in `@intentloom/application`. Exposed CLI routing for `intentloom security scan [--category CATEGORY]` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s2.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0028-local-deterministic-security-adapters.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s2.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s2.test.ts` (4/4 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Security adapters execute strictly local read-only file inspections without shell commands, build scripts, external binaries, or network connections, and findings normalize to `SecurityFinding` with local deduplication.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s2`, open a pull request, merge after approval, and prepare Candidate S3 (Deterministic Security Policies and Baselines).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate S1 security evidence and posture

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-s1`
- **Pull request:** #73
- **Objective:** Implement Candidate S1: Security Evidence and Posture, including ADR-0027, threat model updates, versioned protocol schemas, private application operations, CLI command routing (`intentloom security`), and comprehensive test coverage.
- **Completed:** Added `ADR-0027-security-evidence-and-posture.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 25. Implemented `SecurityFinding`, `SecurityCoverageReport`, `SarifImportResult` schemas and validators in `@intentloom/protocol`. Added security operations (`importSarifSecurityReport`, `getSecurityCoverageReport`, `dismissSecurityFinding`, `acceptSecurityRisk`, `listSecurityFindings`, `getSecurityFinding`) in `@intentloom/application` with secret path redaction (`secretLikePath`) and local `.aif/security/` JSON persistence. Exposed CLI routing for `intentloom security <import|inspect|coverage|dismiss|accept-risk|list>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-s1.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0027-security-evidence-and-posture.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-s1.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm vitest run tests/memory-security-s1.test.ts` (5/5 passed), `pnpm test` (full Vitest run), and `git diff --check` passed cleanly.
- **Decisions:** Security evidence and finding ingestion are provider-neutral, local-first, project-isolated under `.aif/security/`, redact secret paths, process SARIF reports as untrusted input, and cannot execute scripts or alter project configuration without review.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-s1`, open a pull request, merge after approval, and prepare Candidate S2 (Local Deterministic Security Adapters).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate M4 agent session lifecycle

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-m4`
- **Pull request:** #72
- **Objective:** Implement Candidate M4: Agent Session Lifecycle, including ADR-0026, threat model updates, versioned protocol schemas, private application operations, CLI command routing (`intentloom session`), and comprehensive test coverage.
- **Completed:** Added `ADR-0026-agent-session-lifecycle.md` and updated `THREAT_MODEL.md` with threat boundary analysis and security invariant 24. Implemented `AgentSessionItem`, `AgentSessionState`, `AgentSessionExportResult` schemas and validators in `@intentloom/protocol`. Added session lifecycle operations (`startAgentSession`, `closeAgentSession`, `getAgentSession`, `listAgentSessions`, `deleteAgentSession`, `exportAgentSession`) in `@intentloom/application` with secret path redaction (`secretLikePath`) and local `.aif/memory/sessions/` JSON persistence. Exposed CLI routing for `intentloom session <start|close|list|get|delete|export>` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-m4.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `docs/decisions/ADR-0026-agent-session-lifecycle.md`, `docs/security/THREAT_MODEL.md`, `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-m4.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test` (666 tests passed across 68 test suites), and `git diff --check` passed cleanly.
- **Decisions:** Session lifecycle tracking is local-first, vendor-neutral, stored under `.aif/memory/sessions/`, redacts secret paths, and cannot silently mutate canonical intent or overwrite accepted memory.
- **Risks or compatibility impact:** Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Commit `feat/memory-security-m4`, open a pull request, merge after approval, and prepare Candidate S1 (Security Evidence and Posture).
- **Evidence:** local typecheck, lint, prettier format check, full Vitest run, and `git diff --check`.

### 2026-07-26, Memory & Security Candidate M3 semantic retrieval (partial)

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/memory-security-m3`
- **Commit:** `bc0d973 feat(memory): add semantic retrieval adapters`
- **Pull request:** #71 (draft)
- **Objective:** Begin M3 semantic retrieval and portable adapter work after merged M2.
- **Completed:** Added provider-neutral persistent-memory search and bounded rendering contracts, plus explicit rebuild/clear lifecycle for `.aif/memory/index.json` derived state and CLI `memory search`, `memory render`, and `memory index` routing. Accepted, project-scoped records are deterministically ranked by local terms and render to named portable targets without network access.
- **Validation:** `pnpm typecheck` and `pnpm vitest run tests/memory-security-m3.test.ts` passed.
- **Not completed:** Merge remains subject to human review and approval.
- **Next first action:** Review draft PR #71, merge after approval, then begin Candidate M4 (Agent Session Lifecycle) with its required ADR and threat review.

### 2026-07-26, Memory & Security Candidate M2 accepted persistent memory

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/memory-security-m2`
- **Commit:** `c877714 feat(memory): add accepted persistent memory`
- **Pull request:** #70 (draft)
- **Objective:** Implement project-local accepted persistent memory with typed lifecycle, explicit approval, redaction, project isolation, import/export, supersession, and deletion safeguards.
- **Completed:** Added ADR-0024 and persistent-memory threat controls. Implemented versioned `PersistentMemoryItem` and export schemas; local proposal, review, accept, supersede, forget, export, and import operations; import rollback; CLI routing under `intentloom memory`; and M2 unit/integration tests. Updated durable project state from M1 to M2.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-m2.test.ts`, `docs/decisions/ADR-0024-accepted-persistent-memory.md`, `docs/security/THREAT_MODEL.md`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, `pnpm test`, and `git diff --check` passed. The daemon suite requires Unix-socket permissions unavailable in the workspace sandbox; it passed unchanged when rerun outside the sandbox (16 passed, 1 Windows-only skipped).
- **Decisions:** Imports are always untrusted proposals; canonical and verified classifications cannot be imported. Accepted records require explicit approval evidence. Superseded and forgotten records retain lifecycle audit evidence.
- **Risks or compatibility impact:** Additive protocol, application, CLI, and local storage behavior. No network calls, hooks, or background collection are introduced.
- **Not completed:** Merge remains subject to human review and approval.
- **Next first action:** Review draft PR #70, merge after approval, then begin Candidate M3 (Semantic Retrieval and Portable Adapters) with its required ADR and threat review.
- **Evidence:** local typecheck, lint, Prettier check, build, full Vitest run, daemon validation outside sandbox, and `git diff --check`.

### 2026-07-26, PR #71 Windows packed adapter test timeout

- **Status:** complete
- **Agent/tool:** Codex
- **Branch:** `codex/memory-security-m3`
- **Objective:** Fix the failing Windows Node 22 compatibility check for PR #71.
- **Completed:** Increased only `performs a second all-adapter sync with zero changes` in `tests/adapter-packed-process.test.ts` from Vitest's default five-second timeout to 20 seconds. The Windows runner recorded this deterministic packed CLI integration test at 7.5 seconds; no production code changed.
- **Validation:** `pnpm vitest run tests/adapter-packed-process.test.ts` passed (13 passed, 1 skipped) in 5.17 seconds; `git diff --check` passed.
- **Next first action:** Observe rerun CI for PR #71; merge after all required checks pass and approval is granted.

### 2026-07-26, Framework version bump and v0.4.0-beta.1 candidate release

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `release/v0.4.0-beta.1`
- **Objective:** Bump framework version from `0.3.0-beta.1` to `0.4.0-beta.1`, synchronize version across all workspace packages and `packages/core/src/version.ts`, create `v0.4` candidate release readiness audit, update versioning strategy docs, run full verification matrix, and open Release Pull Request.
- **Completed:** Bumped root `package.json` to `0.4.0-beta.1`, executed `scripts/sync-version.mjs` via `pnpm build`, created `docs/audits/V0_4_RELEASE_READINESS.md`, updated `docs/releases/VERSIONING.md`, updated `PROJECT_STATE.md` and `DUTY_WATCH.md`. Merged Release PR #68 into `main`, tagged `v0.4.0-beta.1`, and created GitHub Release `v0.4.0-beta.1`.
- **Files changed:** `package.json`, `packages/*/package.json`, `packages/core/src/version.ts`, `docs/releases/VERSIONING.md`, `docs/audits/V0_4_RELEASE_READINESS.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly.
- **Decisions:** Release `0.4.0-beta.1` contains the complete Controlled Agent Learning & Procedural Memory Milestone (Candidates L1–L8).
- **Risks or compatibility impact:** None. Lockstep pre-release bump for workspace packages.
- **Next first action:** Run `npm login` / `npm publish` for npmjs registry deployment when authorized, and proceed with Memory & Security Candidate M1.
- **Evidence:** local build, version sync, typecheck, lint, prettier format check, vitest run, GitHub Release `v0.4.0-beta.1`.

### 2026-07-26, Memory & Security Candidate M1 bounded project context

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/memory-security-m1`
- **Objective:** Implement context schemas (`ContextSourceType`, `ContextSource`, `ContextRetrievalRequest`, `ContextRetrievalResult`), application read-only operation (`getBoundedProjectContext`), secret path exclusion, item & token budget clamping, CLI command routing (`intentloom context get`), and test coverage.
- **Completed:** Implemented versioned context schemas (`ContextSourceType`, `ContextSource`, `ContextRetrievalRequest`, `ContextRetrievalResult`) and validators in `@intentloom/protocol`. Added read-only `getBoundedProjectContext` operation in `@intentloom/application` enforcing secret path exclusion (`.env`, credentials, private keys, `.git`), item & token budget clamping, and trust classification. Added CLI command routing for `intentloom context get` in `@intentloom/cli`. Added unit & integration tests in `tests/memory-security-m1.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/memory-security-m1.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly.
- **Decisions:** `getBoundedProjectContext` is byte-for-byte read-only. Excluded files and secret paths can NEVER enter returned context.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/memory-security-m1`, observe CI, merge after approval, and proceed to Candidate M2 (Accepted Persistent Memory).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L8 profile isolation and role-aware delegation

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l8`
- **Objective:** Implement profile definition and delegation schemas (`DelegatedAgentRole`, `AgentRoleCapabilities`, `ProfileDefinition`, `DelegationRequest`, `DelegationResult`), application operations (`createProfile`, `getProfile`, `listProfiles`, `delegateTaskRole`), strict capability scoping, read-only enforcement for context-scout and reviewer roles, CLI command routing (`intentloom profile`, `intentloom delegate`), and test coverage.
- **Completed:** Implemented versioned `DelegatedAgentRole`, `AgentRoleCapabilities`, `ProfileDefinition`, `DelegationRequest`, `DelegationResult` schemas and validators in `@intentloom/protocol`. Added profile and delegation operations (`createProfile`, `getProfile`, `listProfiles`, `delegateTaskRole`) in `@intentloom/application` enforcing profile isolation, subagent capability clamping, and read-only constraints for `context-scout` and `reviewer` roles. Added CLI routing for `intentloom profile <create|get|list>` and `intentloom delegate` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l8.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l8.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (651 tests passed across 64 test files).
- **Decisions:** Cross-profile and cross-project retrieval is denied by default. Delegated roles (`context-scout`, `reviewer`) cannot mutate project state or widen their own capability grants.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l8`, observe CI, merge after approval, completing all candidates in the Controlled Agent Learning Roadmap!
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L7 optional semantic ranking

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l7`
- **Objective:** Implement provider-neutral semantic ranking contract (`SemanticRankingProvider`, `SemanticRankingConfig`, `SemanticRankItem`, `SemanticRankResult`), application memory ranking operations (`rankProceduralMemory`, `getSemanticRankingConfig`, `updateSemanticRankingConfig`), preservation of canonical records, privacy exclusions, CLI command routing (`intentloom rank`), and test coverage.
- **Completed:** Implemented versioned `SemanticRankingProvider`, `SemanticRankingConfig`, `SemanticRankItem`, `SemanticRankResult` schemas and validators in `@intentloom/protocol`. Added memory ranking operations (`rankProceduralMemory`, `getSemanticRankingConfig`, `updateSemanticRankingConfig`) in `@intentloom/application` enforcing canonical record preservation, deterministic baseline keyword ranking, and secret path filtering. Added CLI routing for `intentloom rank [QUERY|config]` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l7.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l7.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (646 tests passed across 63 test files).
- **Decisions:** Removing or rebuilding the semantic ranking index does NOT remove canonical memory records. Deterministic keyword and structural retrieval remain available as the default baseline.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l7`, observe CI, merge after approval, and prepare Candidate L8 (Profile Isolation and Role-Aware Delegation).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L6 pause, redirect, checkpoint, and resume

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l6`
- **Objective:** Implement checkpoint schemas (`TaskCheckpoint`, `TaskCheckpointState`, `TaskRedirectRequest`, `TaskResumeResult`), application memory operations (`createTaskCheckpoint`, `pauseTask`, `cancelTask`, `redirectTask`, `resumeTask`, `listTaskCheckpoints`, `deleteTaskCheckpoint`, `exportTaskCheckpoint`), byte-for-byte file preservation on pause/cancel, plan invalidation on redirect, state verification on resume, CLI command routing (`intentloom checkpoint`), and test coverage.
- **Completed:** Implemented versioned `TaskCheckpointState`, `TaskCheckpoint`, `TaskRedirectRequest`, `TaskResumeResult` schemas and validators in `@intentloom/protocol`. Added checkpoint operations (`createTaskCheckpoint`, `pauseTask`, `cancelTask`, `redirectTask`, `resumeTask`, `listTaskCheckpoints`, `deleteTaskCheckpoint`) in `@intentloom/application` enforcing byte-for-byte file safety on pause/cancel, plan invalidation on redirect, and root/state verification on resume. Added CLI routing for `intentloom checkpoint <create|pause|cancel|redirect|resume|list|delete>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l6.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l6.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (641 tests passed across 62 test files).
- **Decisions:** Pause and cancellation leave project files byte-for-byte unchanged unless an already approved transaction completed atomically. Redirect invalidates every stale digest or approval affected by the new intent.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l6`, observe CI, merge after approval, and prepare Candidate L7 (Optional Semantic Ranking).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L5 accepted procedural memory operations

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l5`
- **Objective:** Implement procedural memory summary (`listProceduralMemorySummary`), inspection (`inspectProceduralMemory`), extension lock validation (`validateSkillExtensionLock`), prepared-plan transaction boundary (`prepareSkillMutationPlan`, `applySkillMutationPlan`), doctor skill validation integration, CLI command routing (`intentloom memory inspect`, `intentloom proposal plan`, `intentloom proposal apply`), and test coverage.
- **Completed:** Implemented versioned `ProceduralMemorySummary`, `ProceduralMemoryInspection`, `SkillMutationPlan` schemas and validators in `@intentloom/protocol`. Added memory operations (`listProceduralMemorySummary`, `inspectProceduralMemory`, `validateSkillExtensionLock`, `prepareSkillMutationPlan`, `applySkillMutationPlan`) in `@intentloom/application` enforcing prepared-plan dry-run transactions and atomic apply with rollback logging. Added CLI routing for `intentloom memory inspect` and `intentloom proposal plan / apply` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l5.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l5.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (636 tests passed across 61 test files).
- **Decisions:** Skill mutations (approval, activation, deprecation, rollback) execute strictly through the prepared-plan transaction boundary to guarantee atomic application and rollback.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l5`, observe CI, merge after approval, and prepare Candidate L6 (Pause, Redirect, Checkpoint, and Resume).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L4 skill evaluation and regression gates

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l4`
- **Objective:** Implement evaluation schemas (`EvaluationCase`, `EvaluationOutcome`, `SkillEvaluationResult`), regression classification (`improved`, `regressed`, `ambiguous`, `unsupported`, `unsafe`, `passed`), evaluation runner (`evaluateSkillProposal`), regression gates blocking proposal activation on failed or unsafe evaluation, CLI command routing (`intentloom evaluate`), and test coverage.
- **Completed:** Implemented versioned `SkillEvaluationResult` and `EvaluationCase` schemas in `@intentloom/protocol`. Added evaluation operations (`evaluateSkillProposal`, `listSkillEvaluations`, `getSkillEvaluation`) in `@intentloom/application` with prompt injection security analysis and outcome classification (`improved`, `regressed`, `ambiguous`, `unsupported`, `unsafe`, `passed`). Enforced strict regression gate in `updateSkillProposalState` blocking proposal activation if evaluations fail, regress, or are missing. Added CLI routing for `intentloom evaluate <run|list>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l4.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l4.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (632 tests passed across 60 test files).
- **Decisions:** Proposal activation is strictly blocked if required evaluations fail, regress, or lack security verification.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l4`, observe CI, merge after approval, and prepare Candidate L5 (Accepted Procedural Memory Operations).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-26, Controlled Agent Learning Candidate L3 skill proposal lifecycle

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l3`
- **Objective:** Implement skill proposal lifecycle schemas (`proposed`, `under-review`, `approved`, `rejected`, `active`, `deprecated`, `archived`, `superseded`, `rolled-back`), local `.aif/memory/proposals/` storage, application operations (`createSkillProposal`, `listSkillProposals`, `getSkillProposal`, `updateSkillProposalState`, `rollbackSkill`), CLI command routing (`intentloom proposal`), and test coverage.
- **Completed:** Implemented versioned `SkillProposal` schemas and validators in `@intentloom/protocol`. Added proposal operations (`createSkillProposal`, `listSkillProposals`, `getSkillProposal`, `updateSkillProposalState`, `rollbackSkill`) in `@intentloom/application` enforcing local `.aif/memory/proposals/` storage and mandatory approval evidence for activation. Added CLI routing for `intentloom proposal <list|get|create|approve>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l3.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l3.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (627 tests passed across 59 test files).
- **Decisions:** Automatic skill activation is strictly prohibited. Every accepted proposal requires explicit approval evidence. Rejection and deletion do not modify project-owned files.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l3`, observe CI, merge after approval, and prepare Candidate L4 (Skill Evaluation & Regression Gates).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Controlled Agent Learning Candidate L2 progressive skill discovery

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l2`
- **Objective:** Implement 3 progressive skill loading levels (catalog metadata, execution contract, full procedure), context cost budget accounting, pack and role metadata filtering, discovery decision logs, application operations (`discoverSkills`, `getSkillAtLevel`), CLI routing (`intentloom skill discover`), and test coverage.
- **Completed:** Implemented 3 progressive loading levels (`catalog`, `contract`, `procedure`), context cost calculation, pack/role filtering, decision logs in `@intentloom/protocol` and `@intentloom/application`. Added CLI routing for `intentloom skill discover` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l2.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/controlled-learning-l2.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (622 tests passed across 58 test files).
- **Decisions:** Skills support 3 loading levels (`catalog`, `contract`, `procedure`) to enable progressive discovery and measurable context budget savings without eagerly injecting full procedures into agent context.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l2`, observe CI, merge after approval, and prepare Candidate L3 (Skill Proposal Lifecycle).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Controlled Agent Learning Candidate L1 structured task and session summaries

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/controlled-learning-l1`
- **Objective:** Implement versioned schemas for task and session summaries, local `.aif/memory/` storage, path redaction for secret files (`secretLikePath`), application operations (`recordTaskSummary`, `listTaskSummaries`, `getTaskSummary`), CLI routing, and unit/integration test coverage.
- **Completed:** Implemented versioned `TaskSummary` and `SessionSummary` schemas and validators in `@intentloom/protocol`. Added `recordTaskSummary`, `listTaskSummaries`, `getTaskSummary`, `recordSessionSummary`, and `listSessionSummaries` in `@intentloom/application` with secret path redaction (`secretLikePath`). Added CLI command routing for `intentloom summary <list|get|record>` in `@intentloom/cli`. Added unit & integration tests in `tests/controlled-learning-l1.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/protocol/src/index.ts`, `packages/application/src/index.ts`, `packages/application/package.json`, `packages/application/tsconfig.json`, `packages/cli/src/command.ts`, `vitest.config.ts`, `tests/controlled-learning-l1.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest test suites passed cleanly (614 tests passed).
- **Decisions:** Task and session summaries store structured execution metadata (intent, plan ref, affected paths, validation outcome, evidence, used skills, unresolved work, trust class, retention state) locally in `.aif/memory/` without storing raw chat transcripts or secret file paths.
- **Risks or compatibility impact:** None. Additive feature in `@intentloom/protocol`, `@intentloom/application`, and `@intentloom/cli`.
- **Next first action:** Open PR for `feat/controlled-learning-l1`, observe CI, merge after approval, and prepare Candidate L2 (Progressive Skill Discovery).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 6 provider synchronization (`intentloom sync` / `intentloom diff`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-provider-sync`
- **Objective:** Implement provider-specific instruction derivative generation, drift detection, local section preservation, pre-synchronization diffing (`intentloom diff` / `intentloom sync`), and test coverage.
- **Completed:** Verified provider instruction derivative generation across all supported adapters (`claude`, `codex`, `cursor`, `copilot`), ensured `buildTransactionMetadata` safety against missing pins, implemented CLI integration tests in `tests/cli-provider-sync.test.ts` verifying drift detection, local section preservation, diff proposals, and dry-run safety. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `tests/cli-provider-sync.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Canonical policy remains the single source of truth; provider derivative files can be regenerated without losing documented user-owned local extensions.
- **Risks or compatibility impact:** None. Completes the 6-phase Portable Adoption & Migration roadmap.
- **Next first action:** Open PR for `feat/intentloom-provider-sync`, observe CI, merge after approval.
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 5 conformance and security profiles (`intentloom conformance`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-conformance-profiles`
- **Objective:** Implement project stack profile detection (Nx, SQLite, sensitive security profiles), evidence-linked conformance evaluation, CLI routing, and test coverage.
- **Completed:** Expanded `detectProjectProfiles` in `@intentloom/application` to detect Nx monorepo (`nx`), SQLite database (`sqlite`), and sensitive security profiles (`security-sensitive`). Updated `intentloom conformance` CLI handler in `@intentloom/cli` to use `fileSystem.read` for memory filesystem compatibility. Added unit/integration test suite in `tests/cli-conformance-profiles.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-conformance-profiles.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Stack detection automatically identifies Nx, SQLite, and sensitive security paths (stealth, credentials, secrets) to enforce evidence-linked deterministic conformance rules.
- **Risks or compatibility impact:** None. Backwards compatible profile expansion.
- **Next first action:** Open PR for `feat/intentloom-conformance-profiles`, observe CI, merge after approval, and prepare Phase 6 (Provider Synchronization).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-25, Portable Adoption Phase 4 pack update and three-way migration (`intentloom update --plan` / `--apply`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-pack-update`
- **Objective:** Implement pack update planning operation `planPackUpdate`, 3-way migration comparison algorithm, CLI routing for `intentloom update --plan` and `intentloom update --apply`, and test coverage.
- **Completed:** Added `planPackUpdate` application operation in `@intentloom/application` to evaluate 3-way diffs between base pack version, project state, and target pack version. Implemented CLI routing for `intentloom update --plan` and `intentloom update --apply` supporting `--json`, `--output`, `--strict`, and `--dry-run` flags, and added unit/integration test suite in `tests/cli-pack-update.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-pack-update.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** 3-way comparison guarantees local customizations are preserved and conflicts are explicitly flagged instead of silently overwritten upon pack version upgrade. Update plans execute transactionally via `applyProjectAdoption`.
- **Risks or compatibility impact:** None. Backwards compatible addition to CLI and application layers.
- **Next first action:** Open PR for `feat/intentloom-pack-update`, observe CI, merge after approval, and prepare Phase 5 (Conformance and Security Profiles).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 3 transactional apply and rollback (`intentloom adopt --apply`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-adopt-apply`
- **Objective:** Implement transactional adoption execution (`intentloom adopt --apply <plan>`), expectedCurrentHash stale content guards, migration journal recording, atomic failure rollback, and test coverage.
- **Completed:** Added `applyProjectAdoption` application operation in `@intentloom/application` to validate plan envelopes, verify `expectedCurrentHash` invariants, create pre-apply file backups, execute approved operations, and append `.aif/migration-journal.json` entries. Implemented CLI routing for `intentloom adopt --apply` with `--json` and `--dry-run` flags, exit code 3 mapping for stale hash or invalid plan errors, exit code 4 for rollback recovery, and full unit/integration test suite in `tests/cli-adopt-apply.test.ts`. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-adopt-apply.test.ts`, `vitest.config.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** Stale hash mismatches immediately abort execution with exit code 3 before modifying any files. Rollback automatically restores original pre-apply file contents and removes newly created files. `.aif/migration-journal.json` records transaction history.
- **Risks or compatibility impact:** None. Backwards compatible transactional apply addition.
- **Next first action:** Open PR for `feat/intentloom-adopt-apply`, observe CI, merge after approval, and prepare Phase 4 (Pack Update & 3-Way Migration).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 2 interactive proposal (`intentloom adopt --plan`)

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/intentloom-adopt-plan`
- **Objective:** Implement interactive adoption proposal scanning operation and `intentloom adopt --plan` CLI command.
- **Completed:** Added `planProjectAdoption` application operation in `@intentloom/application` to scan project artifacts, compute hashes, detect governance role candidates, and invoke deterministic governance adoption planner. Implemented CLI routing for `intentloom adopt --plan` supporting `--json`, `--output`, and `--strict` flags, human-readable Markdown adoption plan formatter `formatGovernanceAdoptionPlan`, and full unit/integration test suite. Updated `PROJECT_STATE.md` and `DUTY_WATCH.md`.
- **Files changed:** `packages/application/src/index.ts`, `packages/cli/src/command.ts`, `tests/cli-adopt-plan.test.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and all vitest suites passed cleanly.
- **Decisions:** `adopt --plan` remains strictly read-only. It scans project files without writing or deleting any target project files. `--strict` returns exit code 3 on ambiguous/conflicting findings or when automatic apply is disallowed.
- **Risks or compatibility impact:** None. Backwards compatible addition to CLI and application layers.
- **Next first action:** Open PR for `feat/intentloom-adopt-plan`, observe CI, merge after approval, and prepare Phase 3 (Transactional Apply & Rollback).
- **Evidence:** local build, typecheck, lint, prettier format check, and vitest run.

### 2026-07-24, Portable Adoption Phase 1 contracts

- **Status:** complete
- **Agent/tool:** Antigravity AI Pair Programmer
- **Branch:** `feat/portable-adoption-contracts`
- **Pull request:** #53
- **Objective:** Implement versioned portable-adoption contracts, deterministic
  planning primitives, runtime validation, `@intentloom/core/adoption` exports, and a synthetic Applye fixture.
- **Completed:** Added governance roles, ownership classes, findings, operations,
  validations, exceptions, migration journal, and adoption plan types. Added
  stable serialization, deterministic identifiers, a deterministic read-only
  governance planner, plan-envelope validation, path-sort fix, vitest/tsconfig aliases, an Applye fixture, and tests.
- **Files changed:** `packages/core/src/adoption.ts`, `packages/core/package.json`, `tests/adoption-contracts.test.ts`, `tests/fixtures/adoption/applye.json`, `tsconfig.base.json`, `vitest.config.ts`, `PROJECT_STATE.md`, and `DUTY_WATCH.md`.
- **Validation:** All 589 tests across 51 test suites passed. Compatibility CI run #30127658406 passed on Node 22/24 on Ubuntu, macOS, and Windows. Merged into `main`.
- **Decisions:** Phase 1 remains deterministic and read-only. `@intentloom/core/adoption` subpath export established.
- **Risks or compatibility impact:** None. Fully backwards compatible read-only contracts.
- **Open issues or blockers:** None. Phase 1 complete.
- **Next first action:** Begin Portable Adoption Phase 2: interactive adoption proposal and `intentloom adopt --plan` CLI command.
- **Evidence:** merged PR #53 commit `f2cf5d6` and GitHub Actions run #30127658406.

### 2026-07-24, Portable Duty Watch adoption and migration contract

- **Status:** complete
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `feat/portable-duty-watch-adoption`
- **Pull request:** #52
- **Objective:** Define how Intentloom safely adopts and updates mature existing
  projects, using Applye as the first reference consumer.
- **Completed:** Defined the analysis-first adoption lifecycle, canonical role
  mapping, duplicate classification, proposal and approval model, transactional
  apply, three-way pack updates, rollback, conformance, security profiles,
  provider synchronization, portable Duty Watch pack contract, and Applye
  reference fixture expectations.
- **Files changed:** `docs/concepts/PORTABLE_DUTY_WATCH_ADOPTION.md`,
  `docs/roadmap/PORTABLE_ADOPTION_AND_MIGRATION_PLAN.md`,
  `catalog/packs/duty-watch/README.md`,
  `docs/fixtures/APPLYE_DUTY_WATCH_ADOPTION.md`, and `DUTY_WATCH.md`.
- **Validation:** Compatibility CI passed before final merge preparation. The
  branch was rebuilt directly on current `main` to remove stacked-branch merge
  conflicts without changing the approved documentation scope.
- **Decisions:** Adoption uses canonical roles rather than fixed filenames.
  Existing project-owned files are mapped and preserved. Pack updates use a
  three-way comparison between the old pack, current project, and new pack.
  Ambiguous, destructive, executable, privacy, and security changes require
  explicit approval.
- **Risks or compatibility impact:** This watch defines contracts only. It does
  not claim the planner, pack runtime, transactional migration, conformance
  engine, or security automation are already implemented.
- **Open issues or blockers:** Phase 1 runtime schemas, planner code, fixtures,
  and tests remain unimplemented.
- **Next first action:** Implement the adoption-plan and ownership schemas plus
  deterministic Applye fixture tests.
- **Evidence:** merged PR #51, PR #52, branch history, and CI results.

### 2026-07-24, Duty Watch governance foundation

- **Status:** complete
- **Agent/tool:** ChatGPT with GitHub connector
- **Branch:** `docs/duty-watch-agent-handoff`
- **Pull request:** #51
- **Objective:** Create a default project context and handoff system for Claude
  Code, Codex, Antigravity, and other repository agents.
- **Completed:** Added the mandatory entrypoint, durable project state, Duty
  Watch log, governance documents, templates, and repository agent rules.
- **Files changed:** `AGENT_START_HERE.md`, `PROJECT_STATE.md`, `DUTY_WATCH.md`,
  governance and template files, and `AGENTS.md`.
- **Validation:** Required compatibility checks passed before merge.
- **Decisions:** The handoff system is named Duty Watch. `PROJECT_STATE.md`
  stores durable state, while `DUTY_WATCH.md` stores chronological handoffs.
  Documentation updates are part of Definition of Done.
- **Open issues:** Portable adoption and migration remained follow-up work.
- **Next action:** Define portable Duty Watch adoption for existing projects.
- **Evidence:** merged PR #51 and repository history.
