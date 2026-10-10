# Phase Q3 Implementation Plan: Legacy Baseline and Ratchet Engine

## Starting point

- Base branch: `feat/engineering-quality-contracts-and-metrics` at `d929a39`.
- Phase Q1 provides versioned quality policy, finding, evidence, baseline, and
  exception contracts plus validators.
- Phase Q2 provides deterministic artifact classification, physical-line
  measurement, and policy finding generation.
- Q3 is not present yet. The current baseline contract has the core measured
  value, digest, owner, reason, creation time, and allowed-growth fields, but it
  does not yet represent review metadata, approval evidence, or ratchet
  comparison results.

## Objective

Implement a provider-neutral, pure legacy-baseline workflow that:

1. previews existing quality findings as candidate baseline entries;
2. requires explicit approval evidence before producing an approved baseline;
3. rejects new findings and growth beyond the recorded non-growing allowance;
4. reports stale content and expired review windows without silently hiding
   legacy debt; and
5. prepares a reduced baseline by removing only findings that are no longer
   present, leaving unresolved debt visible for the next review.

Persistence, CLI routing, checker execution, filesystem mutation, network
access, and automatic approval remain out of scope for Q3.

## Clean Architecture layout

### Protocol

- Extend `EngineeringQualityBaseline` and its item with optional, backwards-
  compatible policy identity, review, approval, and lifecycle metadata.
- Add versioned preview, approval, ratchet result, and reduction result types.
- Keep the protocol package free of filesystem, time, and provider dependencies.

### Validator

- Validate the extended baseline metadata and all Q3 result envelopes.
- Preserve the existing Q1 schema URN and accept legacy baseline documents that
  omit newly optional fields.
- Reject malformed approval, timestamps, digests, negative allowances, and
  invalid lifecycle/status values.

### Application

- `baseline-preview.ts`: build deterministic candidate entries from Q2 findings
  and return an approval-required preview.
- `baseline-ratchet.ts`: compare current findings with an approved baseline by
  stable `(ruleId, artifactPath)` identity; classify legacy, new, growth, stale,
  expired, and resolved entries.
- `baseline-reduction.ts`: prepare an explicit reduced baseline containing only
  active debt and return removed entries as evidence.
- Export the operations through the existing engineering-quality subpath.

## Ratchet rules

- Existing debt is allowed only at its recorded measured value plus
  `allowedGrowth` (zero by default).
- A finding without a matching baseline entry is a new violation.
- A matching finding above the allowed ceiling is a growth violation.
- A content digest mismatch is stale baseline evidence and requires review; it
  must not silently suppress the current finding.
- An expired entry requires review and remains visible.
- A missing current finding is resolved debt and is eligible for reduction.
- The comparison status fails only for new or growth violations; review flags
  separately expose stale and expired entries.

## Tests

Add `tests/engineering-quality-baseline.test.ts` covering:

- preview does not imply approval;
- explicit approval creates a validated baseline;
- untouched legacy debt is retained and passes the non-growing ratchet;
- new violations and growth fail deterministically;
- stale digests and expired entries are reported;
- resolved entries are removed by the reduction preview while active debt is
  retained; and
- malformed Q3 contracts are rejected by validators.

## Validation and handoff

Run, in order:

```text
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
git diff --check
```

Review all changed files for the `<250` production-file budget, update
`PROJECT_STATE.md` if the durable active milestone changes, and append an
accurate Q3 entry to `DUTY_WATCH.md` with validation results and the next first
action. Do not commit, push, merge, publish, install hooks, or add dependencies
as part of this phase.
