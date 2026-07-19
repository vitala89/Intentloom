# Local Daemon Security Design

## Metadata

- Date: 2026-07-19
- Branch: `security/intentloomd-lifecycle-design`
- Pull Request: not created; remote actions are out of scope
- Milestone: Platform Foundation
- Author: Codex
- Related ADR: ADR-0009

## Goal

Define local-only daemon authentication, endpoint, framing, and shutdown controls
before implementation.

## Decisions

Use explicit IPC endpoints, one-use session tokens held in memory, bounded
newline-delimited JSON-RPC, read-only doctor dispatch, and owned-endpoint cleanup.
TCP and automatic service registration are excluded.

## Verification

- `pnpm format:check`
- `git diff --check`

## Follow-up

Implement lifecycle and security tests before adding any CLI daemon client mode.
