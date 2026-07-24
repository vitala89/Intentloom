# Portable Duty Watch Adoption

Intentloom must be able to adopt an existing repository without erasing its
working agreements, project state, history, or provider-specific instructions.

Applye is the first reference consumer for this workflow.

## Goal

A project owner should be able to run an Intentloom adoption or update and
receive a reviewable proposal instead of an automatic rewrite.

The system must inspect the repository, identify existing governance, detect
overlap and drift, propose improvements, and apply only explicitly approved
changes through a reversible transaction.

## Core rule

Adoption is analysis first, proposal second, mutation last.

Intentloom must never assume that its default file names are the only valid
structure. For example, an existing `docs/product/CURRENT_STATE.md` may already
fulfil the role of `PROJECT_STATE.md`. In that case the proposal should preserve
it and map the canonical role instead of creating a duplicate.

## Adoption lifecycle

1. **Discover**
   - detect repository type, languages, frameworks, package managers,
     applications, libraries, CI, Git hooks, provider instruction files, skills,
     state files, changelog, roadmap, ADRs, security policy, and validation
     commands;
   - inspect current Intentloom ownership metadata when already adopted;
   - perform no writes and no dependency installation.

2. **Classify**
   - assign discovered files to canonical roles such as agent entrypoint,
     durable context, operational state, duty log, roadmap, changelog, validation
     matrix, provider adapter, generated derivative, user-owned content, or
     unknown;
   - attach confidence and evidence to every classification;
   - mark ambiguous cases for human review.

3. **Compare**
   - compare the repository with the selected Intentloom pack and its installed
     version;
   - detect missing capabilities, equivalent files, exact duplicates, semantic
     overlap, conflicts, stale generated files, local customizations, obsolete
     rules, broken references, and unsupported commands;
   - distinguish safe additions from destructive or policy-changing changes.

4. **Propose**
   - produce an adoption plan containing each proposed operation, reason,
     evidence, risk, ownership result, preview diff, validation requirement, and
     rollback behavior;
   - present alternatives when more than one structure is reasonable;
   - recommend consolidation when duplicate sources of truth exist;
   - never silently choose between conflicting user-owned files.

5. **Approve**
   - support approve all, approve selected, reject, defer, edit mapping, keep
     local, replace generated, merge manually, or mark as intentional exception;
   - require explicit confirmation for deletes, renames, replacements, hooks,
     dependencies, network access, secret-related changes, executable
     configuration, CI changes, or security policy changes.

6. **Apply**
   - create a backup or transaction snapshot;
   - apply only approved operations;
   - preserve user-owned sections and local overrides according to ownership
     markers;
   - never modify unrelated files.

7. **Validate**
   - run project-specific formatting, lint, type, test, build, security,
     compatibility, and native/manual gates selected from repository evidence;
   - report checks as passed, failed, skipped, unavailable, or manual-required;
   - do not claim successful adoption while required checks fail.

8. **Record and hand off**
   - update the project state mapping, installed pack version, ownership
     manifest, migration journal, and Duty Watch entry;
   - record accepted exceptions and deferred proposals so the next update does
     not ask the same question without new evidence.

## Duplicate handling

Intentloom should classify duplication into four categories:

- **Exact duplicate**: identical or generated-equivalent content. Recommend one
  canonical source and safe removal of the redundant derivative.
- **Role duplicate**: two files claim the same source-of-truth role. Recommend
  consolidation, aliasing, or an explicit precedence rule.
- **Partial overlap**: files share some rules but also contain unique material.
  Propose a section-level merge and show what would move.
- **Intentional provider derivative**: files such as `CLAUDE.md` or tool rules
  repeat canonical policy for compatibility. Keep them as generated adapters and
  detect drift rather than deleting them.

No duplicate may be deleted solely because its filename resembles an Intentloom
default.

## Update lifecycle

When Intentloom or a pack is updated, the same lifecycle applies. The update
compares:

- previously installed canonical version;
- current repository state;
- new pack version;
- recorded local overrides and accepted exceptions.

This is a three-way migration, not a blind overwrite.

For every changed pack item, classify the result as:

- unchanged upstream;
- safe fast-forward;
- local-only customization;
- upstream-only addition;
- clean semantic merge;
- conflict requiring approval;
- deprecated item with migration path;
- removed item retained locally by choice.

## Required safety properties

- dry-run and machine-readable plan before writes;
- stable operation identifiers so approvals can be audited;
- content hashes and expected-current-state checks to prevent stale-plan writes;
- atomic transaction or full rollback;
- no hidden network calls, telemetry, hooks, dependencies, commits, pushes, PRs,
  merges, or releases;
- secret redaction in reports and logs;
- path traversal and symlink boundary protection;
- project-root isolation;
- deterministic output for identical repository state and pack version;
- idempotency: running adoption again after a successful apply produces no new
  changes;
- interruption recovery with a transaction journal;
- explicit unsupported and manual-review states instead of guessing.

## Reference consumer: Applye

Applye already has mature AIF-era governance. Its intended role mapping is:

- `AGENT_START_HERE.md`: agent entrypoint;
- `AGENTS.md`: canonical repository working agreement;
- `PROJECT_CONTEXT.md`: durable product and architecture context;
- `docs/product/CURRENT_STATE.md`: operational project state;
- `DUTY_WATCH.md`: chronological handoff log;
- `docs/governance/VALIDATION_MATRIX.md`: project-specific validation policy;
- `CLAUDE.md`: Claude provider derivative;
- `ROADMAP.md`, `STEP_BY_STEP_PLAN.md`, and `CHANGELOG.md`: existing canonical
  planning and history documents.

An Applye adoption must therefore map and enhance these files, not create
competing defaults.
