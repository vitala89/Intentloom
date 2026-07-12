# GENERATED FILES

AIF commands are local and deterministic. A generated header is not ownership proof: only a valid `.aif/source-map.json` record with normalized relative path and matching checksum establishes `aif-owned-generated` status. Generated destinations are written before the lock and source map; metadata finalizes only after destination writes succeed. A recoverable failure restores prior files and removes newly created files.

Before a write plan is accepted, AIF evaluates a portable normalized collision key (POSIX separators, NFC Unicode normalization, and case-folding) and resolves existing destination parents against the project root. This mitigates link escapes but cannot eliminate a filesystem TOCTOU race between validation and replacement.

The collision sequence rejects absolute/null-byte input, converts separators, normalizes dot segments, rejects root escape, removes redundant `./`, applies NFC, then locale-independent lowercase comparison. This is deterministic but is not a complete Unicode case-folding implementation.

The v0.1 policy rejects every symlink component, including links whose current target is inside the project. Paths are revalidated immediately before each replacement; this narrows but cannot eliminate TOCTOU races.
