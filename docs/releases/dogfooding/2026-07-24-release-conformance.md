# Intentloom dogfooding record: release conformance

**Date:** 2026-07-24
**Intentloom version:** development build at `59ee29a`
**Scenario:** release conformance against Intentloom and a sanitized existing
project
**Environment:** Node `22.17.0`; macOS `26.5.2`

## Commands and evidence

- Local Intentloom Git evidence plus an explicit empty GitHub-export payload:
  `summary: evidence-missing`; the local timeline was `ambiguous` because the
  bounded collector reached its commit limit, and provider evidence and commit
  provenance were `missing`.
- Local Git evidence for a sanitized existing project plus an explicit empty
  GitHub-export payload: the same `evidence-missing` result, with an ambiguous
  bounded timeline and missing provider evidence/provenance.
- Both evaluations used only `local-release-timeline`, `provider-evidence`,
  and `provider-commit-provenance` controls. No project files, provider
  credentials, network services, or project scripts were used.

## Compatibility observations

- The result separates bounded local evidence from missing provider evidence.
- Neither case produced a compliance, approval, readiness, or authorization
  claim.
- The report contained only control IDs, evidence codes, and sanitized project
  keys; no commit messages, identities, paths, or payload content were emitted.

## Conclusion

Pass with follow-up

The narrow v0.2.8 evaluator preserves evidence uncertainty during real local
execution. A future dogfooding pass should use an explicit sanitized provider
export to exercise verified and conflicting provider-provenance controls.
