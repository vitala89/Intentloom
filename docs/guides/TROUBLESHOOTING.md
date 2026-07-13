# TROUBLESHOOTING

Use the local AIF CLI; it makes no network calls.

## Safety

Start with `--dry-run`, inspect `aif diff`, and resolve conflicts explicitly. AIF never modifies Applye or another project unless it is the explicit root.

## Sync failures

- Exit `2`: correct the command options or initialize the project so `.aif/config.yaml` exists.
- Exit `3`: resolve the reported ownership, collision, or path-security conflict. No transaction was applied.
- Exit `4`: rollback completed and the original project state was restored. Review the failed stage and safe error code before retrying.
- Exit `5`: rollback was incomplete. Stop immediately, inspect every reported project-relative path, reconcile generated files with the manifest and source map, and do not rerun sync until ownership is verified.

Normal output intentionally omits file contents, raw metadata, external symlink targets, and stack traces. Use the stable error code and project-relative paths when reporting an issue; do not attach secrets or generated files unless they have been reviewed and redacted.

For CI, treat only exit `0` as success. Exit `4` means the workspace was restored but the requested sync did not complete; it must not be silently ignored.
