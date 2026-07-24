# ADR-0022: Live Read-Only Provider Connections

- **Status**: Accepted
- **Date**: 2026-07-24
- **Authors**: Intentloom Maintainers

## Context

Intentloom previously implemented offline provider export import (`@intentloom/evidence-provider` / `intentloom import-provider`), which parses JSON exports from GitHub and GitLab.

To analyze current workflow timelines directly without requiring manual export downloads, Intentloom needs to support live read-only provider connections. However, connecting live APIs introduces risks around:

1. Secret/token leakage into project files or evidence logs.
2. Unbounded API calls, rate-limiting, and quota exhaustion.
3. Mixing evidence across distinct projects or repositories.
4. Retention of personal or confidential data after revocation.

## Decision

Intentloom adopts a live read-only provider connection model with strict security and isolation boundaries:

1. **Explicit Opt-in & External Credentials**: Provider credentials (Personal Access Tokens, OAuth tokens) must be provided via environment variables (`GITHUB_TOKEN`, `GITLAB_TOKEN`) or runtime flags. Credentials must NEVER be stored in project configuration, evidence logs, or committed files.
2. **Read-Only Scope Enforcement**: Only read-only endpoints (Pull Requests, Merge Requests, Commits, Reviews, Issue Comments, Pipeline Runs, Releases) are permitted. Mutating endpoints (creates, edits, merges, closes, deletes) are strictly prohibited.
3. **Project & Repository Scope Isolation**: Provider queries must be bound to an explicit repository target (`owner/repo` or `group/project`). Evidence collected from different targets must not be mixed.
4. **Secret & Identity Redaction**: Personal details, emails, access tokens, and private URLs must be redacted into vendor-neutral pseudonyms before inclusion in evidence timelines.
5. **Rate-Limiting & Caching**: Live queries must observe provider rate-limit headers (`X-RateLimit-Remaining`, `Retry-After`) and use local TTL-based evidence caching.
6. **Instant Revocation & Zero Retention Policy**: Revoking credentials or clearing local cache immediately purges cached provider data without modifying project-owned files.

## Consequences

### Positive

- Enables real-time workflow evidence collection and release analysis directly from GitHub and GitLab.
- Prevents credential leaks and unauthorized API mutations.
- Preserves vendor-neutral evidence format compatibility with offline imports.

### Negative

- Requires maintaining rate-limit and pagination handling logic for both GitHub REST/GraphQL and GitLab REST APIs.
- Offline test suites must rely on mock HTTP fixtures.
