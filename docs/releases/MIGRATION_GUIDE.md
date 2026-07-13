# Migration Guide

Before updating, run `aif diff` and `aif doctor`. Preserve project-owned files. Resolve source-map drift explicitly; never replace a conflicting instruction file without a reviewed choice. Config, manifest-lock, and adapter-output version migrations must be documented with a compatibility range and rollback path.

v0.1 supports schema version `1` only and provides no automatic schema
migration. A missing or different version exits `3` before writes. Preserve the
original document, review the future release's field-level migration notes,
preview the converted document, and rerun doctor. Never change only the version
field: required fields, ownership meaning, and cross-document relationships must
be migrated together.

Use `aif sync --dry-run` before applying a migration. Dry-run exits `0` for a valid plan and `3` for an unresolved conflict, and never writes generated files or metadata.

If sync exits `4`, the transaction failed but rollback completed; project state was restored and the migration was not applied. If sync exits `5` or reports `transaction-rollback-incomplete`, stop and inspect only the project-relative paths reported. Reconcile each generated file with `.aif/manifest.lock.json` and `.aif/source-map.json`; do not rerun sync until ownership is verified. Never interpret exit `5` as restored state.

## Adapter and path migrations

Changing the adapter selection is an ownership migration. First run doctor and
sync dry-run with the intended selection. Added adapters may share identical
destinations; differing duplicates are conflicts. Removed adapter outputs are
reported as orphaned and remain on disk until a human explicitly resolves them.

Adapter output version changes require regeneration from canonical sources;
never edit the generated version header alone. Non-portable manifest or source
map paths require a reviewed metadata migration to normalized, project-relative
`/` form. Preserve the original metadata and never infer ownership from the
normalized destination.
