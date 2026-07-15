# Schemas

Intentloom validates project artifacts through locally bundled JSON Schema draft
2020-12 contracts. Runtime validation never downloads a schema and does not
accept user-supplied schemas. All v0.1 Intentloom documents use schema version `1`;
Agent Skill frontmatter follows the independently versioned open Agent Skills
format and is validated against Intentloom's version-1 validator contract.

| Artifact       | Schema identifier                 | Version field                      | Unknown-property policy                                 |
| -------------- | --------------------------------- | ---------------------------------- | ------------------------------------------------------- |
| Project config | `urn:aif:schema:aif-config:1`     | `schemaVersion`                    | Reject                                                  |
| Manifest lock  | `urn:aif:schema:manifest-lock:1`  | `schemaVersion` and `lockVersion`  | Reject                                                  |
| Source map     | `urn:aif:schema:source-map:1`     | `schemaVersion`                    | Reject                                                  |
| Feature brief  | `urn:aif:schema:feature-brief:1`  | `schemaVersion`                    | Reject core fields; allow `extensions`                  |
| Context pack   | `urn:aif:schema:context-pack:1`   | `schemaVersion`                    | Reject core fields; allow `extensions`                  |
| Change request | `urn:aif:schema:change-request:1` | `schemaVersion`                    | Reject core fields; allow `extensions`                  |
| Technical debt | `urn:aif:schema:technical-debt:1` | `schemaVersion`                    | Reject core fields; allow `extensions`                  |
| Agent Skill    | `urn:aif:schema:agent-skill:1`    | External format; no invented field | Open-format fields; Intentloom catalog policy is opt-in |

Extensions cannot replace core fields because they live under one isolated
`extensions` object. Config, manifest, and source-map documents have no extension
escape hatch. Misspelled or secret-like fields are therefore rejected rather
than ignored. Intentloom config has no executable-hook or secret field.

## Validation pipeline

Artifact bytes pass through a size-limited JSON/YAML/frontmatter parser, schema
version selection, structural validation, normalized safe diagnostics, and then
artifact-specific semantic validation. Structural errors include a stable code
and JSON Pointer field location. Results identify artifact type, schema id and
version, project-relative document path, structural errors, semantic errors, and
warnings. Raw Ajv/YAML exceptions and document contents are not CLI output.

JSON Schema covers types, required fields, enums, string shapes, array
uniqueness, unknown fields, and declared schema versions. It does not prove that
a path stays inside the real project root, a symlink is safe, destinations do
not collide after filesystem normalization, a checksum matches bytes on disk,
ownership is valid, adapters support a capability, lifecycle transitions are
valid, or manifest/source-map records agree. Those remain semantic checks after
structural success; the post-write corruption validator remains authoritative
for committed filesystem state.

Runtime semantic policy resolves selected profiles, workflows, and adapter
capabilities against the bundled catalog. Callers validating planning artifacts
may supply prior lifecycle state, known feature/document identifiers, and known
project paths; invalid transitions or unresolved references are reported as
semantic errors without changing the schemas.

Portable project-owned Agent Skills receive the open-format checks, including
frontmatter, directory-name agreement, and local-reference containment. Only
skills being admitted to Intentloom's canonical `catalog/skills/` opt into the extra
Intentloom body sections for triggers, inputs, outputs, non-triggers, and stop
conditions and catalog-wide name uniqueness. Expected copies of one skill under
different generated adapter roots are therefore valid.

## Parser limits

Documents are limited to 1 MiB and 64 object/array levels. YAML duplicate keys,
unknown/custom tags, malformed syntax, excessive alias expansion, null roots,
and non-object roots are rejected. Core YAML anchors and aliases are supported
within the parser's alias limit. UTF-8 BOM and Unicode values are supported.
Diagnostics never contain complete source documents or rejected values.

## Dependency decision

`@aif/validator` adds Ajv 8.20 as its only new production dependency. Ajv is a
mature MIT-licensed JSON Schema implementation with draft-2020-12 support,
strict compilation, an active security policy, and active upstream releases. Its
installed package is approximately 2.3 MiB before bundling. A custom validator
would be incomplete, harder to audit, and likely to diverge from JSON Schema.
Intentloom uses strict mode, precompiles only bundled schemas, disables coercion and
defaults, and provides no async/network schema loader. The existing `yaml`
dependency remains the sole JSON/YAML-adjacent parser dependency.

Schema source files live in `catalog/schemas/`; the CLI build copies the catalog
into its deterministic runtime bundle. Packed-runtime tests install the tarball
outside the monorepo and validate real generated config and metadata there.
The manifest additionally pins the selected profile, every selected adapter and
adapter-output version, supported schema-family versions, canonical source
content hashes, framework version, and generated-output hashes.
