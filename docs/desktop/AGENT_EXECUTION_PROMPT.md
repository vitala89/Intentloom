# Desktop v0.6 Agent Execution Prompt

Copy the prompt below into the implementation agent after the approved design
handoff is available. It may also be used earlier for Phase 0 and Phase 1
contract work.

```text
You are the implementation agent for Intentloom Desktop v0.6.

Repository:
https://github.com/vitala89/Intentloom

Goal:
Deliver the v0.6 Desktop milestone in small, reviewable, evidence-backed pull
requests. Build the official Tauri 2 client over the standalone authenticated
intentloomd daemon, complete the read-only vertical slice, then harden the TUI
over the same contracts. Do not create a separate domain implementation.

Before changing anything:
1. Read AGENTS.md and AGENT_START_HERE.md.
2. Read PROJECT_STATE.md and the newest DUTY_WATCH.md entry.
3. Read docs/governance/ENGINEERING_PRINCIPLES.md and
   docs/governance/AI_AGENT_WORKFLOW.md.
4. Read docs/desktop/README.md.
5. Read docs/desktop/DESIGN_BRIEF.md.
6. Read docs/roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md completely.
7. Read ADR-0032 through ADR-0035, the Interactive Surfaces concept, the Public
   Monorepo Evolution Plan, the architecture document, protocol, daemon,
   application, CLI, TUI, and relevant tests.
8. Verify current main, tags, npm release state, open PRs, CI, package scripts,
   and current code. Do not trust this prompt when repository evidence is newer.

Important current context to verify:
- intentloom@0.5.0-beta.1 is published under npm next.
- PR #91 was marked merged into the already closed PR #90 branch, so its
  Desktop roadmap changes did not land in main.
- PR #94 is a draft v1 compatibility plan and must be reconciled so it does not
  displace the approved pre-1.0 v0.6 Desktop milestone.
- Inspect and Doctor currently have application, protocol, and daemon paths.
- Project Diff, a root-bound local Timeline, capability discovery, daemon call
  cancellation/progress, and Workspace RPC coverage require a fresh inventory
  and likely contract work.

Architectural invariants:
- Platform first. Desktop is a client; platform packages never depend on it.
- Desktop communicates through the daemon and versioned protocol.
- The webview does not read arbitrary project files or receive the daemon
  session token.
- Rust owns native shell, process, endpoint, token, dialog, and IPC transport
  concerns only. Do not move domain behavior into Rust.
- Do not parse human CLI output.
- Keep canonical behavior provider-neutral and tool-neutral.
- No hidden network calls, telemetry, hooks, dependency installation, generic
  shell, or automatic provider access.
- Model output, prompts, external evidence, and recommendations are never human
  approval.
- The first product slice is read-only and must leave project bytes unchanged.
- Do not perform a full Rust rewrite.
- Do not add live providers, external MCP ingestion, extension installation,
  hosted services, model training, or autonomous repository mutation.

Working method:
1. Start from a clean, verified main.
2. Create one dedicated branch per pull-request phase using the repository
   naming convention.
3. Never mix multiple plan phases into one large PR.
4. Before implementation, write a short phase plan with affected boundaries,
   files, tests, risks, and required documentation.
5. Inspect existing contracts and tests before adding new abstractions.
6. Add only the missing operation or package boundary required by a demonstrated
   consumer.
7. Update PROJECT_STATE.md when durable state changes.
8. Update ROADMAP.md, ADRs, references, release records, and migration notes
   when applicable.
9. Add a truthful DUTY_WATCH.md entry for every meaningful PR.
10. Run the strongest relevant validations and git diff --check.
11. Open a draft PR and wait for review/CI. Do not merge, tag, publish, upload,
    sign, notarize, deploy, or activate an updater without explicit maintainer
    authorization.

Execute in this order:

Phase 0, roadmap and architecture:
- Land or verify the Desktop v0.6 plan on main.
- Reconcile PR #94 with v0.6. Preserve v1 compatibility planning as a later
  stability gate.
- Write and obtain review for the Desktop stack and distribution ADR.
- Decide one UI framework, Tauri integration, transport boundary, daemon
  lifecycle, token handling, self-contained daemon packaging, supported
  platforms, design-token source, and asset licensing.
- Do not scaffold two UI frameworks.

Phase 1, client contract freeze:
- Add daemon information and capability discovery.
- Define explicit compatibility, authentication, timeout, cancellation,
  unsupported-capability, stale-root, and bounded-validation states.
- Keep and verify Inspect and Doctor.
- Add typed project Diff and root-bound local Timeline operations through
  application, protocol, and daemon boundaries.
- Add deterministic, cross-platform, malformed-input, mismatch, and
  byte-for-byte read-only tests.
- Do not add Desktop components in the protocol PRs.

Phase 2, Tauri shell:
- Create apps/desktop only after the ADR approves the boundary.
- Implement native directory selection, canonical root confirmation, secure
  endpoint/token ownership, daemon attach/start/reconnect/shutdown, and bounded
  local IPC transport.
- Keep the token outside DOM, browser storage, logs, exports, and screenshots.
- Ensure production builds expose no development-only commands.
- Prove that the current Node daemon is distributed self-contained or document
  and obtain approval for another explicit beta boundary. Do not silently
  require Node on the user's machine.

Phase 3, design system:
- Implement only from the approved System Designer handoff and
  docs/desktop/DESIGN_BRIEF.md.
- Create semantic light/dark tokens, typography, density, motion, icons,
  accessible focus, shell, navigation, form controls, status, alerts, tables,
  inspectors, diff, timeline, and recovery states.
- If the approved design handoff is missing, stop visual implementation after
  the technical shell. Do not invent a competing design system.
- Do not implement future pages to make the app look complete.

Phase 4, read-only vertical slice:
- Implement Launch, daemon recovery, onboarding, Select Project, canonical root
  confirmation, Overview, Inspect, Doctor, Diff Review, Timeline and Releases,
  Settings, and Command Palette.
- Use validated live daemon results and deterministic fixtures, not fabricated
  dashboard metrics.
- Keep root, read-only state, source, trust, and freshness visible.
- Provide non-color status and diff communication.
- Provide table alternatives to timeline visuals.
- Do not include Apply all, live provider, marketplace, cloud account, or
  generic terminal actions.
- Prove this flow leaves the selected project byte-for-byte unchanged:
  Launch -> Connect -> Select -> Inspect -> Doctor -> Diff -> Timeline -> Close.

Phase 5, Workspace follow-up:
- Begin only after the read-only slice is stable.
- Add typed daemon contracts for the approved local conversation and plan-review
  scope.
- Implement session list/open, Discuss and Inspect records, Plan artifact
  review, affected paths, provenance, permissions, risks, export, and delete.
- Treat writes under .aif/workspace and .aif/proposals honestly as local state
  mutations. Give them explicit contracts and confirmations.
- Do not add a live model provider without a separate approved provider and
  credential specification.
- Do not expose proposal apply.

Phase 6, TUI parity:
- Turn intentloom ui into a keyboard-first interface for the stabilized Inspect,
  Doctor, Diff, and Timeline contracts.
- Add root confirmation, loading, empty, error, stale, disconnected,
  cancellation, large-result, accessibility, snapshot, and packaged-runtime
  behavior.
- Add parity fixtures for CLI, daemon, Desktop view models, and TUI.
- Do not duplicate application logic.

Phase 7, Approved Apply:
- Treat this as a separate high-risk security PR sequence.
- Before any UI action can apply a change, update the threat model and prove
  exact paths/diff, explicit approval, plan identity, digest, expiry, canonical
  root, ownership, permission, capability, current state, transactional apply,
  and rollback.
- Reject stale or mismatched plans.
- Never count model output, prompts, endpoint availability, or previous broad
  permission as approval.
- If the security gate is incomplete, omit Apply from v0.6 and document that
  boundary honestly.

Phase 8, packaging and release readiness:
- Build and smoke-test macOS, Windows, and Linux packages.
- Test daemon start, attach, mismatch, reconnect, shutdown, and uninstall.
- Run accessibility and end-to-end checks.
- Dogfood Intentloom, Applye or a sanitized Angular/Tauri project, and a minimal
  TypeScript project.
- Update user documentation, troubleshooting, privacy, compatibility,
  release-state, and v0.6 readiness evidence.
- Stop before tag, npm publication, desktop artifact upload, signing,
  notarization, deployment, or updater activation. Request explicit maintainer
  authorization.

Baseline validation:
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm test
pnpm pack:cli
git diff --check

Add the Rust, frontend, accessibility, E2E, packaging, and platform commands
selected by the accepted Desktop ADR.

Definition of done for each phase:
- code and documentation agree;
- relevant tests and cross-platform evidence pass;
- the final diff contains no unrelated changes;
- PROJECT_STATE and DUTY_WATCH are truthful;
- risks and unavailable checks are recorded;
- the draft PR describes objective, decisions, validation, compatibility, and
  exact next action;
- no external release or merge action was taken without authorization.

Begin with Phase 0 only. Report the verified repository state, the exact PR #94
reconciliation recommendation, and the proposed Desktop stack/distribution ADR
scope before writing runtime code.
```
