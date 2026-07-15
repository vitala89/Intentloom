# TROUBLESHOOTING

Use the local Intentloom CLI; it makes no network calls.

## Safety

Start with `--dry-run`, inspect `intentloom diff`, and resolve conflicts explicitly. Intentloom never modifies Applye or another project unless it is the explicit root.

## Sync failures

- Exit `2`: correct the command options or initialize the project so `.aif/config.yaml` exists.
- Exit `3`: resolve the reported schema, ownership, collision, or path-security failure. No transaction was applied. For schema errors, inspect the artifact path, schema version, safe field path, and stable code; unsupported future versions are not assumed or migrated.
- Exit `4`: rollback completed and the original project state was restored. Review the failed stage and safe error code before retrying.
- Exit `5`: rollback was incomplete. Stop immediately, inspect every reported project-relative path, reconcile generated files with the manifest and source map, and do not rerun sync until ownership is verified.

Normal output intentionally omits file contents, raw metadata, external symlink targets, and stack traces. Use the stable error code and project-relative paths when reporting an issue; do not attach secrets or generated files unless they have been reviewed and redacted.

For `json-malformed`, `yaml-malformed`, `yaml-duplicate-key`, or
`yaml-unsafe-tag`, repair the indicated document without pasting private values
into issue reports. `schema-version-missing` requires an explicit version;
`schema-version-unsupported` requires a documented migration, not a manual
version bump. Run `intentloom doctor --json` to distinguish structural errors from
filesystem or cross-document semantic errors.

For CI, treat only exit `0` as success. Exit `4` means the workspace was restored but the requested sync did not complete; it must not be silently ignored.

## Adoption and doctor recovery

- Start with `intentloom adopt --dry-run --json`. A manual-decision item means keep the
  file project-owned until its generated destination is explicitly resolved.
- For missing config, manifest, or source map, do not hand-create ownership.
  Review adoption output and apply only a complete safe proposal.
- For malformed/unsupported metadata, repair or explicitly migrate the stated
  artifact before sync. Doctor never assumes a future schema is compatible.
- For orphaned ownership records or missing generated files, compare both
  metadata documents and the reported project-relative destination. Do not
  delete a project file merely because its path resembles generated output.
- For checksum/header/version drift, review `intentloom diff` and sync dry-run before
  transactional regeneration. Doctor does not update stale state.
- Doctor exit `0` allows warning/info findings; exit `3` means at least one
  error finding. Usage remains exit `2`; doctor never returns `4` or `5`.

## Adapter and path recovery

- For `shared-file-conflict`, keep the existing file project-owned or reconcile
  the canonical sources so every selected adapter produces the same bytes.
- For `path-scoped-rule-invalid`, restore the generated Cursor/Copilot
  frontmatter or review a sync dry-run. Do not convert portable `/` globs to
  host-native backslashes.
- For `stored-path-incompatible`, preserve both metadata files, migrate the
  unsafe entry to the documented project-relative form, and rerun doctor before
  sync. Do not copy an absolute host path into Intentloom metadata.
- For adapter removal, review `adapter-selection-conflict` and orphan findings.
  Intentloom intentionally does not delete the prior adapter's files.
- If a package manager reports an engine mismatch, use Node 22 or newer. Node 21
  and older are outside the supported range.
