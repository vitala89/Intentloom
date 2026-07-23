# v0.2.8 Release Conformance Plan

Evaluate a narrow, explicit set of required release controls against the
existing deterministic release evidence report. The operation reports evidence
states only; it does not grant approval, compliance, release readiness, or
authorization.

## Proposed public contract

`evaluateReleaseConformance(report, controls)` returns a version `1`
release-conformance report.

`controls` is an explicit version `1` list of unique required control IDs:

- `local-release-timeline`;
- `provider-evidence`; and
- `provider-commit-provenance`.

Each conformance finding contains its required control ID, an evidence status,
and safe source IDs derived from the existing evidence report. The report has a
separate summary status that cannot be confused with compliance or approval.

## In scope

- pure types and deterministic evaluation in `@intentloom/evidence-analysis`;
- control-to-evidence mapping only for existing release-analysis finding codes;
- unit fixtures for verified, missing, conflicting, ambiguous, unsupported,
  unknown-control, and deterministic-order cases;
- an ADR-backed, versioned report and control-set contract.

## Out of scope

- filesystem, Git, process, network, credential, provider, CLI, daemon, or MCP
  integration;
- parsing workflows, policies, instructions, commit messages, or repository
  prose as executable controls;
- release-readiness, compliance, approval, causality, or remediation claims;
- ordering/timing controls, provider live access, workflow discovery, variants,
  and bottleneck analysis.

## Exit evidence

- identical inputs produce byte-for-byte equivalent conformance reports;
- each required control preserves the evidence distinction between verified,
  missing, conflicting, ambiguous, and unsupported;
- the operation has no I/O and introduces no new capability;
- typecheck, formatting, full tests, and CI pass.
