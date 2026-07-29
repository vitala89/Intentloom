# Intentloom v1 candidate clean-room and explicit-path evidence

**Date:** 2026-07-29
**Candidate tree:** `46a278c` (the merged `main` tree before this record)
**Artifact:** `intentloom@0.5.0-beta.1` packed from the candidate tree

## Clean-room installation

- `pnpm build`: exit `0`.
- `pnpm pack:cli`: exit `0`; produced the expected private local tarball.
- `npm install --ignore-scripts --no-audit --no-fund <tarball>` in an isolated
  temporary runner with a task-specific cache: exit `0`.
- Installed CLI `--version`: `0.5.0-beta.1`; `--help`: exit `0`.
- An initial install attempt using the machine's pre-existing npm cache failed
  with a local cache-permission `EPERM`; it was not counted as package evidence
  and the global cache was not changed.

## Explicit-path immutability

Commands were launched from the unrelated clean-room runner directory against
an explicit target root containing project-owned files:

| Command                                 | Exit | Result                               |
| --------------------------------------- | ---: | ------------------------------------ |
| `inspect --root <target> --json`        |    0 | read-only inspection completed       |
| `adopt --plan --root <target> --json`   |    0 | proposal completed without apply     |
| `doctor --root <target> --json`         |    3 | missing metadata diagnosed read-only |
| `sync --root <target> --dry-run --json` |    2 | safely refused uninitialized target  |

The pre-command and post-command file inventories and SHA-256 hashes were
identical. No credentials, provider network access, private paths, or target
file bodies were retained in this record.

## Disposition

Pass as supplemental exact-candidate evidence. This proves the packaged
explicit-path and clean-room behavior for isolated local targets; it does not
claim a new run against the withheld external project from the historical
Applye audit and does not by itself authorize the v1.0 release.
