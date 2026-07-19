# Core and Protocol Foundation

## Metadata

- Date: 2026-07-19
- Branch: `refactor/platform-foundation-core-protocol`
- Pull Request: not created; remote actions are out of scope
- Milestone: Platform Foundation
- Author: Codex
- Related ADR: ADR-0007, ADR-0008

## Goal

Separate reusable project operations from the CLI and define the first private,
versioned protocol contract without adding a daemon.

## Initial state

The CLI package owned both process adaptation and project operations. No
transport-independent protocol module existed.

## Decisions

Application operations live in private `@intentloom/application`; the CLI retains
argument parsing, rendering, and exit codes. The first protocol method is the
read-only `intentloom.project.doctor.v1` JSON-RPC-compatible contract.

## Implementation

Moved project-operation source and direct operation tests to the application
boundary. Added private protocol request/response parsing and serialization tests.

## Verification

- `pnpm typecheck`
- `pnpm build`
- `pnpm test` — 36 files, 525 passed, 2 skipped
- `pnpm format:check`
- `git diff --check`

## Risks

No daemon exists yet. The protocol is private and must not become a public API
without a separate decision.

## Follow-up

Implement daemon lifecycle and local-IPC security controls in a separate work item.
