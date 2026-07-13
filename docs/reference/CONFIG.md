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
