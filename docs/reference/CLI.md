# CLI

AIF commands are local and deterministic. Generated files are AIF-owned only when recorded in the source map; project-owned files are never silently replaced.

## Transactional sync

`aif sync` consumes the structured transaction result directly. It does not infer success from filesystem presence, lack of an exception, or a subsequent empty diff. Human and JSON output use the same mapped outcome and exit code.

A successful write reports created, updated, and unchanged counts; manifest and source-map update status; consistency validation; and cleanup. A second identical sync reports `AIF sync completed. No changes required.`

`aif sync --dry-run` builds and reports the plan without executing the transaction. It does not create generated files, metadata, staging, or backup artifacts and prints `Dry run — no files were changed.` A conflict discovered during dry-run is still exit code `3`.

## Exit codes

The following values are a stable CLI contract and may be consumed by CI:

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| `0`  | Successful command, successful sync, or successful no-op/dry-run plan.  |
| `2`  | CLI usage or configuration error.                                       |
| `3`  | Conflict or pre-write validation failure; no transaction was applied.   |
| `4`  | Transaction failed and rollback completed; project state was restored.  |
| `5`  | Transaction failed and rollback was incomplete; inspect reported paths. |

Incomplete rollback is never described as restored state. Output preserves the original failed stage and error code, adds `transaction-rollback-incomplete`, and lists only sorted project-relative paths requiring inspection.

## JSON output

`aif sync --json` returns the same outcome as human mode with deterministic path arrays. Fields include status, dry-run status, failed stage, error code, rollback status and failures, created/updated/unchanged/conflict paths, metadata update flags, consistency validation, cleanup, and exit code. JSON and human modes never include generated contents, raw metadata, external absolute target paths, or exception stacks.
