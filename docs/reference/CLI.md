# CLI

Install the alpha CLI with `npm install --global intentloom`. The public package
supports the `intentloom` binary only; programmatic imports and deep imports are not
part of the alpha contract.

Intentloom commands are local and deterministic. Generated files are Intentloom-owned only when recorded in the source map; the persisted ownership value remains `aif-owned-generated` for v0.1 compatibility. Project-owned files are never silently replaced.

`init`, `adopt`, `plan`, `diff`, `sync`, and `doctor` use the shared structural
validator. Existing project metadata is parsed and validated before semantic
ownership/filesystem checks. Generated config, manifest, source map, feature
brief, and context pack structures are validated before output or writes.
`doctor` aggregates config, manifest, source-map, Agent Skill, and semantic
cross-document issues and never modifies files.

`--adapters` accepts a comma-separated selection of `claude`, `codex`,
`cursor`, and `copilot`. Multi-adapter output is order-independent, identical
shared files are emitted once, and non-identical destination collisions stop
before writes. `--profile` controls documented path-scoped Cursor and Copilot
derivatives.

## Adoption

`intentloom adopt --dry-run` returns the same deterministic adoption proposal in human
or JSON form and creates no `.aif`, backup, or staging state. Proposal actions
are `create`, `map-existing-project-owned`,
`map-existing-aif-compatible-document`, `generated-candidate`, `conflict`,
`unsupported`, `skip`, and `manual-decision-required`. Existing files are never
claimed from their path, header, name, or content.

`intentloom adopt` without `--dry-run` accepts only a proposal with no manual decisions
and routes safe generated creation through transactional sync. A blocked
proposal writes nothing; a partial failure reports restored/incomplete status
through the proposal's `applicationStatus`.

## Doctor

Doctor findings contain a stable code, `error`/`warning`/`info` severity,
category, project-relative path, concise message, sorted remediation list,
read-only guarantee, and related adapter/profile where applicable. Categories
are config, schema, ownership, generated-file, adapter, profile, documentation,
migration, security, and drift. Findings are sorted by code and path.

Doctor exits `0` when there are no error findings, including warning-only
states; it exits `3` for one or more project validation errors and `2` for CLI
invocation errors. It never uses transaction codes `4` or `5`, writes files,
creates `.aif`, repairs metadata, or refreshes stale output.

## Transactional sync

`intentloom sync` consumes the structured transaction result directly. It does not infer success from filesystem presence, lack of an exception, or a subsequent empty diff. Human and JSON output use the same mapped outcome and exit code.

A successful write reports created, updated, and unchanged counts; manifest and source-map update status; consistency validation; and cleanup. A second identical sync reports `Intentloom sync completed. No changes required.`

`intentloom sync --dry-run` builds and reports the plan without executing the transaction. It does not create generated files, metadata, staging, or backup artifacts and prints `Dry run — no files were changed.` A conflict discovered during dry-run is still exit code `3`.

## Exit codes

The following values are a stable CLI contract and may be consumed by CI:

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| `0`  | Successful command, successful sync, or successful no-op/dry-run plan.  |
| `2`  | CLI syntax/invocation error or missing required initialization input.   |
| `3`  | Conflict or pre-write validation failure; no transaction was applied.   |
| `4`  | Transaction failed and rollback completed; project state was restored.  |
| `5`  | Transaction failed and rollback was incomplete; inspect reported paths. |

Incomplete rollback is never described as restored state. Output preserves the original failed stage and error code, adds `transaction-rollback-incomplete`, and lists only sorted project-relative paths requiring inspection.

## JSON output

`intentloom sync --json` returns the same outcome as human mode with deterministic path arrays. Fields include status, dry-run status, failed stage, error code, rollback status and failures, created/updated/unchanged/conflict paths, metadata update flags, consistency validation, cleanup, and exit code. JSON and human modes never include generated contents, raw metadata, external absolute target paths, or exception stacks.

Artifact validation JSON uses `artifact-validation-failed` and a sorted `errors`
array. Each error includes a stable code, structural/semantic phase, artifact
type, schema id/version, project-relative document path, safe field path, and
concise message. Project artifact validation exits `3` before a transaction.
Doctor-only generated-state findings use the distinct
`urn:aif:semantic:generated-state:1` contract and identify the affected
project-relative path; they are not mislabeled as schema failures for config,
manifest, or source-map documents.

Adapter-specific findings include `adapter-capability-experimental`,
`adapter-capability-unsupported`, `adapter-profile-unsupported`,
`adapter-output-stale`, `shared-file-conflict`, `path-scoped-rule-invalid`, and
`stored-path-incompatible`. Missing generated files identify the related
adapter where the destination is unambiguous.
