# Portable Paths

Intentloom metadata stores paths in one host-independent form:

- project-relative;
- Unicode NFC;
- `/` separators;
- no empty, `.` or `..` segments;
- no drive, root, UNC, or extended-device prefix;
- no Windows-reserved device name, trailing dot/space, control character, or
  invalid Windows filename character.

Safe input separators are normalized before serialization. Host-native path
resolution happens only when accessing the filesystem and is never written to
the manifest or source map. Collision analysis is case-insensitive and applies
separator and Unicode normalization, so paths such as `AGENTS.md`,
`agents.md`, and Unicode-equivalent spellings cannot become separate generated
destinations on different hosts.

A display path is the already-normalized stored path shown in CLI diagnostics;
it is not an absolute host path and never includes an external symlink target.
The collision key is an internal lowercase NFC comparison value and is not
persisted as the display spelling.

Provider glob fields are validated separately because `*`, `?`, and other glob
syntax are not filenames. Globs still reject backslashes, drive/root prefixes,
NUL, empty segments, and traversal, and generated globs use `/`.

Doctor reports `stored-path-incompatible` for non-portable metadata and
`path-scoped-rule-invalid` for invalid Cursor or Copilot frontmatter. These
checks are read-only and do not include the unsafe value in diagnostics.
