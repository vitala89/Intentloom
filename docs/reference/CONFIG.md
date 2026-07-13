# CONFIG

AIF commands are local and deterministic. Generated files are AIF-owned only when recorded in the source map; project-owned files are never silently replaced.

`.aif/config.yaml` declares `schemaVersion: "1"`, a non-empty profile, and one
or more unique supported adapters. Optional version compatibility, workflows,
generated-output policy, project/documentation mappings, and local override
references are defined by `aif-config.schema.json`. Unknown fields are rejected;
there are no secret fields or arbitrary executable hooks. Store secrets outside
AIF configuration.

Config structure is validated before profile resolution, adapter generation,
ownership checks, diffs, or writes. Path syntax in mappings is structural;
project-root containment, collisions, symlinks, and adapter capability remain
semantic validation.

For an unconfigured existing repository, adoption detects a candidate profile
from bounded stack evidence. An existing valid config remains authoritative;
doctor reports a non-fatal `profile-mismatch` when deterministic repository
evidence disagrees. Ambiguous evidence requires confirmation and never silently
rewrites the configured profile. README prose is not detection evidence.

The v0.1 config has no user-defined scan-exclusion field. Adoption and doctor
apply the documented built-in ignored-directory and binary limits; adding a
configurable exclusion contract is deferred rather than accepting unknown
configuration.

Adapters may be listed in any order; generation sorts and deduplicates them.
Supported profiles for adapter-scoped output are `generic`, `typescript`,
`angular`, `rust`, `tauri`, and `angular-tauri`. Doctor reports
`adapter-profile-unsupported` rather than silently omitting output for another
profile. All paths persisted through configuration-derived metadata follow the
portable stored-path contract in `PATHS.md`.
