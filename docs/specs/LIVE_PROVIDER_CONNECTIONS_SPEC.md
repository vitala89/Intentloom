# Live Read-Only Provider Connections Specification

- **Status**: Draft / Candidate
- **Version**: 0.5.0-candidate
- **Governing ADR**: [ADR-0022](../decisions/ADR-0022-live-read-only-provider-connections.md)

---

## 1. Overview

This specification defines the protocol, security boundaries, rate-limiting, redaction, and caching rules for Intentloom live read-only connections to GitHub and GitLab.

---

## 2. Authentication & Credential Storage

1. **Environment Variables**:
   - GitHub: `GITHUB_TOKEN` or `GH_TOKEN`
   - GitLab: `GITLAB_TOKEN` or `GL_TOKEN` and optional `GITLAB_BASE_URL` (defaults to `https://gitlab.com`)
2. **Credential Rules**:
   - Tokens MUST NOT be written to `.aif/config.yaml`, evidence logs, or disk caches.
   - Tokens MUST be passed in-memory to HTTP request headers (`Authorization: Bearer <token>` or `PRIVATE-TOKEN: <token>`).
   - An explicit runtime token takes precedence over environment variables. When
     no explicit token is supplied, the first non-empty provider variable in the
     listed order is read at the start of each fetch operation.
   - Credential values MUST NOT be snapshotted across fetch operations or
     included in result diagnostics.

---

## 3. Allowed Read-Only Endpoints

### GitHub (REST v3 / GraphQL v4)

- `GET /repos/{owner}/{repo}/pulls`
- `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- `GET /repos/{owner}/{repo}/commits`
- `GET /repos/{owner}/{repo}/releases`
- `GET /repos/{owner}/{repo}/actions/runs`

### GitLab (REST v4)

- `GET /api/v4/projects/{id}/merge_requests`
- `GET /api/v4/projects/{id}/merge_requests/{mr_iid}/notes`
- `GET /api/v4/projects/{id}/repository/commits`
- `GET /api/v4/projects/{id}/releases`
- `GET /api/v4/projects/{id}/pipelines`

_All POST, PUT, PATCH, DELETE operations are strictly prohibited._

---

## 4. Rate-Limiting, Pagination & Caching

1. **Pagination**:
   - Use standard cursor/link pagination (`Link` header for GitHub, `X-Page`/`X-Next-Page` for GitLab).
   - Maximum page limit per sync operation is 10 pages (1,000 items max) to prevent memory exhaustion.
2. **Rate Limit Handling**:
   - Inspect `X-RateLimit-Remaining` and `Retry-After` response headers.
   - If remaining requests < 10, suspend fetching and emit an `E_PROVIDER_RATE_LIMITED` finding.
3. **Local Cache**:
   - Cache fetched JSON objects in `.aif/cache/providers/{provider}/{owner_repo_hash}/` with a 15-minute TTL.
   - Cached files must contain redacted data only.
   - Cache only complete `available` normalized results; bounded or rate-limited
     responses must not become reusable cache entries.
   - The current library boundary exposes an injectable cache store and
     provider/project-scoped purge operation. The CLI `clean --cache` adapter
     exposes complete-cache, provider, and provider/project scopes over that
     same operation.

---

## 5. Redaction & Identity Protection

Before writing fetched API responses to timeline evidence or disk cache:

1. Strip all authentication header traces.
2. Hash user email addresses into pseudo-IDs (`usr_<sha256_prefix>`).
3. Replace private repository clone URLs with canonical `git+https://` formats.
4. Remove authorization tokens embedded in issue comments or commit messages using a bounded deterministic scanner for known provider token prefixes (`ghp_`, `github_pat_`, `glpat-`); do not persist the raw token or payload.

The normalization boundary uses the same deterministic scanner for provider
export, live-provider, and external-MCP evidence. Email identities become
stable vendor-neutral `usr_<sha256-prefix>` pseudonyms before normalized fields
are returned. Raw provider payloads are not retained by this slice.

---

## 6. Revocation & Cache Purging

1. Running `intentloom clean --cache` removes `.aif/cache/providers/` without touching project code. `--provider` and `--project-key` narrow the purge scope; a project key requires a provider.
2. Local credential revocation means that the caller stops supplying the
   explicit token and unsets all recognized provider environment variables
   before the next fetch operation. The resolver reads the environment anew on
   every operation, so clearing those variables prevents subsequent authorized
   requests.
3. Intentloom MUST NOT call provider token-delete or token-rotation endpoints.
   Remote revocation remains an authenticated provider-owner action outside the
   read-only connection boundary. Intentloom also MUST NOT claim that changing
   a child CLI process environment changes the parent shell.

The current cache implementation supports the same deletion contract through
`purgeProviderCache`: callers may remove one project, one provider, or the
entire configured cache root. Cache records are versioned and rejected when
their provider/project identity, source, or retention timestamps do not match
the requested entry. Cache purging is independent of credential resolution, so
callers can clear retained evidence even when no credential is configured.
