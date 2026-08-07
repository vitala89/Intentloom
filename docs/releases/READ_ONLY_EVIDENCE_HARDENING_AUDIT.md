# Intentloom Read-Only Evidence Hardening Audit

Status: CLOSED / VERIFIED ON `main`

Date: 2026-08-08

Governing ADRs: [ADR-0022: Live Read-Only Provider Connections](../decisions/ADR-0022-live-read-only-provider-connections.md), [ADR-0023: External MCP Evidence Ingestion](../decisions/ADR-0023-external-mcp-evidence-ingestion.md)

## Executive Summary

The Read-Only Evidence Hardening Gate is fully audited and verified. All 8 security, evidence, redaction, rate-limiting, cache-retention, credential-revocation, and non-mutation requirements mandated by ADR-0022 and ADR-0023 are implemented and covered by deterministic test suites.

## Hardening Gate Verification Matrix

| Requirement                                                   | Governing Standard | Implementation / Test Evidence                                                                                                                                                        | Status |
| ------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1. Live Provider Connection & Credentials                     | ADR-0022 §1        | `resolveProviderCredential` in `@intentloom/evidence-provider`; reads `GITHUB_TOKEN`, `GH_TOKEN`, `GITLAB_TOKEN`; `tests/evidence-provider-credentials.test.ts`                       | PASS   |
| 2. Read-Only Scope Enforcement                                | ADR-0022 §2        | `fetchGitHubLiveEvents` & `fetchGitLabLiveEvents`; read-only GET endpoints for PRs/MRs, Commits, Issues, Releases; zero mutating calls                                                | PASS   |
| 3. Repository Scope & Project Key Isolation                   | ADR-0022 §3        | `owner/repo` and `group/project` strict format checks; `tests/evidence-provider-live.test.ts`                                                                                         | PASS   |
| 4. Secret & Identity Redaction                                | ADR-0022 §4        | `redactProviderPayload`; regex & heuristic scanner sanitizes tokens (`ghp_*`, `glpat-*`) and emails into pseudonyms; `tests/evidence-provider-adversarial-live.test.ts`               | PASS   |
| 5. Rate-Limiting & Bounded Pagination                         | ADR-0022 §5        | `X-RateLimit-Remaining` and `Retry-After` headers; `maxRecords` (up to 500) and `maxStringLength` (up to 512); `tests/evidence-provider-pagination-contract.test.ts`                  | PASS   |
| 6. Cache Retention & Purge                                    | ADR-0022 §6        | `writeCachedProviderResult` (15-min TTL), `purgeProviderCache` & `intentloom clean --cache`; `tests/cli-clean-cache.test.ts`, `tests/evidence-cache-revocation-cross-surface.test.ts` | PASS   |
| 7. External MCP Evidence Ingestion & Untrusted Classification | ADR-0023 §1-4      | `trustLevel: "untrusted-external"`; schema validation (`urn:aif:schema:evidence-bundle:1`); allowlist in `.aif/config.yaml`; `tests/evidence-mcp-ingest.test.ts`                      | PASS   |
| 8. Surface Equivalence & Non-Mutation Invariant               | ADR-0023 §2        | `evidence analyze` CLI, MCP `tools/call`, and Daemon emit identical structured evidence; zero project mutation enabled; `tests/cli-mcp-evidence-equivalence.test.ts`                  | PASS   |

## Verification Command Results

Full repository verification command `pnpm verify` (`typecheck && lint && format:check && test && build && git diff --check`):

- **Typecheck:** 0 errors
- **Linter (oxlint):** 0 errors, pre-existing debt warnings only
- **Prettier:** 100% matched formatting
- **Test suite (vitest):** 137 test files, 1,038 tests passed, 3 skipped (platform-gated)
- **Build:** CLI CJS bundle, Daemon CJS bundle, MCP CJS bundle, Desktop bundle clean

## Conclusion

The Read-Only Evidence Hardening Gate is closed. The implementation fulfills all security and isolation invariants required before activating any future control-plane or agent capabilities.
