# Live Read-Only Provider Connections Specification

- **Status**: Draft / Candidate
- **Version**: 0.4.0-candidate
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

---

## 5. Redaction & Identity Protection

Before writing fetched API responses to timeline evidence or disk cache:

1. Strip all authentication header traces.
2. Hash user email addresses into pseudo-IDs (`usr_<sha256_prefix>`).
3. Replace private repository clone URLs with canonical `git+https://` formats.
4. Remove authorization tokens embedded in issue comments or commit messages using regex matching (`ghp_[A-Za-z0-9]{36}`, `glpat-[A-Za-z0-9\-_]{20}`).

---

## 6. Revocation & Cache Purging

1. Running `intentloom clean --cache` removes `.aif/cache/providers/` without touching project code.
2. Unsetting token environment variables immediately revokes live API access.
