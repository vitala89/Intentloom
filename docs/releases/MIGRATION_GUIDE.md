# Migration Guide

Before updating, run `aif diff` and `aif doctor`. Preserve project-owned files. Resolve source-map drift explicitly; never replace a conflicting instruction file without a reviewed choice. Config, manifest-lock, and adapter-output version migrations must be documented with a compatibility range and rollback path.

Use `aif sync --dry-run` before applying a migration. Dry-run exits `0` for a valid plan and `3` for an unresolved conflict, and never writes generated files or metadata.

If sync exits `4`, the transaction failed but rollback completed; project state was restored and the migration was not applied. If sync exits `5` or reports `transaction-rollback-incomplete`, stop and inspect only the project-relative paths reported. Reconcile each generated file with `.aif/manifest.lock.json` and `.aif/source-map.json`; do not rerun sync until ownership is verified. Never interpret exit `5` as restored state.
