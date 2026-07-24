# Duty Watch Pack

Status: design contract, not yet a runtime-installed pack.

This directory defines the intended portable governance capability that projects
can adopt through Intentloom. Runtime behavior must not be claimed until the pack
schema, planner, transaction layer, tests, and CLI integration are implemented.

## Capabilities

- agent entrypoint and context-reading order;
- canonical role mapping without enforcing filenames;
- operational state and chronological Duty Watch separation;
- project-specific validation matrix;
- Definition of Done and handoff requirements;
- provider derivative generation and drift detection;
- adoption, update, conformance, privacy, and security checks;
- reversible migration and recorded exceptions.

## Required role model

A project may map these roles to existing files:

- `agent-entrypoint`
- `working-agreement`
- `durable-project-context`
- `operational-project-state`
- `duty-watch-log`
- `validation-policy`
- `roadmap`
- `execution-plan`
- `changelog`
- `security-policy`
- `provider-instructions:<provider>`

A role can be absent, mapped to one canonical file, or intentionally represented
by a canonical file plus generated provider derivatives. Two user-owned files
may not both be silently assigned the same canonical source-of-truth role.

## Ownership classes

- `intentloom-managed`: generated and replaceable only through a reviewed plan;
- `project-owned`: never overwritten without explicit section-level approval;
- `shared`: contains managed markers and project-owned regions;
- `provider-derivative`: generated from canonical roles with preserved local
  extension regions;
- `external`: referenced but not managed;
- `unknown`: requires review before mutation.

## Proposal operation classes

- create;
- map-existing;
- update-managed;
- merge-sections;
- generate-derivative;
- rename;
- deprecate;
- delete-redundant;
- preserve-local;
- record-exception;
- no-op.

Each operation must include a stable id, reason, evidence, confidence, risk,
approval requirement, expected current hash, preview, validation, and rollback
description.

## Applye reference expectations

The Applye fixture must produce mappings rather than duplicate files:

- `docs/product/CURRENT_STATE.md` -> `operational-project-state`;
- `PROJECT_CONTEXT.md` -> `durable-project-context`;
- `AGENTS.md` -> `working-agreement`;
- `CLAUDE.md` -> `provider-instructions:claude`;
- `DUTY_WATCH.md` -> `duty-watch-log`;
- `docs/governance/VALIDATION_MATRIX.md` -> `validation-policy`.

The planner should propose `AGENT_START_HERE.md` only when no equivalent
entrypoint exists, and should never propose `PROJECT_STATE.md` for Applye while
its existing operational state mapping is accepted.
