# Schema Validation Audit

Audit date: 2026-07-13. Baseline: 171 passing tests on
`feat/schema-driven-validation` before implementation changes. Sources reviewed:
the v0.1 specification, ADR-0001 through ADR-0003, `catalog/schemas/`, all
workspace package sources, build scripts, profiles, templates, and tests.

## Executive summary

AIF has seven JSON Schema files, but only `aif-config.schema.json` describes more
than a version placeholder. None is loaded by runtime code. Structural checks are
instead distributed across `@aif/core`, `@aif/validator`, and `@aif/cli`, often
mixed with filesystem, ownership, checksum, collision, and cross-document checks.
There is no common safe parser, normalized validation result, schema registry,
planning-artifact validator, or runtime schema validation for the manifest lock
and source map.

This is a release blocker. The existing semantic checks remain necessary and
must run after structural validation; JSON Schema cannot establish project-root
containment, symlink safety, ownership, content checksum correctness, adapter
capability support, or cross-document consistency.

## Schema catalog inventory

| Artifact             | Current schema               | Classification                                                                                                                                                                                                       | Runtime validation                                                                                                          | Semantic validation                                                                                             | Priority                                                                    |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Project config       | `aif-config.schema.json`     | Schema partial: version, profile, and adapter enum only; no uniqueness, framework compatibility, workflow/output/mapping/override model, or explicit secret/hook exclusion beyond generic unknown-property rejection | Present but handwritten twice; catalog schema unused                                                                        | Profile existence, adapter capabilities, mapping collisions, and path/root safety                               | Release blocker                                                             |
| Manifest lock        | `manifest-lock.schema.json`  | Schema partial: version placeholder only; it does not match the generated `lockVersion` document                                                                                                                     | Handwritten minimum check in validator and extensive post-write checks in CLI; schema unused                                | Generated-file existence and checksums, ownership/source-map agreement, normalized collisions, filesystem state | Release blocker                                                             |
| Source map           | `source-map.schema.json`     | Schema partial: version placeholder only                                                                                                                                                                             | Handwritten parsing in CLI ownership planning plus post-write checks; schema unused                                         | Root escape, symlinks, normalized collisions, checksums, ownership, manifest agreement                          | Release blocker                                                             |
| Feature brief        | `feature-brief.schema.json`  | Schema partial: version placeholder only                                                                                                                                                                             | Missing; `plan` emits unvalidated Markdown rather than a structured artifact                                                | Status transitions, references, allowed/forbidden path policy, live verification                                | Release blocker                                                             |
| Context pack         | `context-pack.schema.json`   | Schema partial: version placeholder only                                                                                                                                                                             | Missing                                                                                                                     | Set overlap, source existence, bounded-context expansion policy, path/root safety                               | Release blocker                                                             |
| Change request       | `change-request.schema.json` | Schema partial: version placeholder only                                                                                                                                                                             | Missing                                                                                                                     | Related-feature/spec existence, decision lifecycle, migration consistency                                       | Release blocker                                                             |
| Technical debt       | `technical-debt.schema.json` | Schema partial: version placeholder only                                                                                                                                                                             | Missing                                                                                                                     | Related-feature/file existence, root-safe paths, resolution lifecycle                                           | Release blocker                                                             |
| Agent Skill metadata | No schema or policy contract | Schema missing                                                                                                                                                                                                       | Partial handwritten frontmatter parsing and duplicate-name validation                                                       | Unique names across catalog, reference containment, trigger/non-trigger and stop-condition AIF policy           | Release blocker                                                             |
| Profiles             | No profile schema            | Schema missing                                                                                                                                                                                                       | Runtime consumption missing; JSON profiles are packaged catalog data but the current CLI treats profile as an opaque string | Inheritance cycles, referenced profile existence, defaults compatibility                                        | Later: outside the requested artifact list, but runtime absence is recorded |

Every schema currently present under `catalog/schemas/` is documentation-only at
runtime. The CLI build copies the catalog into `dist`, so schemas are packaged in
development builds, but no validator resolves them and packed-runtime resolution
is untested.

## Runtime file-type inventory

| File type                                           | Read                                                                                   | Written                                                                                           | Current validation and pass-through risk                                                                                                                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.aif/config.yaml`                                  | `sync` reads it directly; other commands currently derive config from flags/defaults   | `init`/adopt planning and apply generate it                                                       | YAML parser defaults plus shallow handwritten type checks; duplicate keys, custom tags, depth/size, unknown fields, missing/unsupported schema versions, and duplicate adapters can pass or be misclassified as CLI usage errors |
| `.aif/manifest.lock.json`                           | Post-write consistency re-reads it; planning compares bytes                            | `init` and sync transactions generate it                                                          | No pre-write schema validation; malformed existing manifest can be treated as an ordinary byte difference; generated shape is not validated before writing                                                                       |
| `.aif/source-map.json`                              | init/adopt/diff/sync/doctor ownership planning and post-write validation               | `init` and sync transactions generate it                                                          | Handwritten checks cover a subset before planning; unknown fields, incomplete identity/version data, wrong record shapes, and unsupported versions are not comprehensively rejected before semantic use                          |
| `.aif/local.example.yaml`                           | Not read                                                                               | Generated by init/adopt planning                                                                  | Comment-only placeholder, no structured contract; intentionally not a config input                                                                                                                                               |
| Canonical `SKILL.md`                                | Catalog loading reads YAML frontmatter and Markdown body                               | Adapter output generation writes derived skills                                                   | Required name/description partially checked; duplicate YAML keys, unsafe tags, unsupported fields, trigger policy, expected I/O, stop conditions, and reference containment are not safely/completely validated                  |
| Canonical policy/workflow/template Markdown         | Catalog loader lists paths; adapters consume selected catalog paths/content indirectly | Adapter outputs embed/render canonical content                                                    | No structural schema; plain Markdown artifacts are outside JSON Schema scope. Broken canonical references are only exposed through a standalone validator helper and not integrated into CLI flows                               |
| Generated adapter Markdown/MDC/instruction files    | Planning, ownership checks, sync, and post-write checks read current bytes             | init/sync/adopt apply writes them                                                                 | Semantic path/checksum/provenance logic exists; no separate structured schema is appropriate for arbitrary generated text                                                                                                        |
| Feature-brief planning output                       | `plan` does not read an existing brief                                                 | `plan` returns Markdown to stdout and does not write                                              | Required structured fields are absent; output cannot be schema validated and invalid planning artifacts can pass through                                                                                                         |
| Context pack/change request/technical-debt artifact | Not read                                                                               | Not written by current commands                                                                   | Schemas/templates are placeholders; no runtime validation path exists                                                                                                                                                            |
| Profile JSON                                        | No runtime reader in current CLI                                                       | Not written                                                                                       | Versioned files can be invalid without runtime detection; recorded as later because profile validation is not one of the eight required schemas in this blocker                                                                  |
| Catalog JSON Schemas                                | Copied by CLI build only                                                               | Build copies them into CLI `dist/catalog`                                                         | Never loaded or compiled; broken local references and remote references are not checked                                                                                                                                          |
| Workspace/package JSON and generated version source | Build scripts read package JSON                                                        | Version-sync/build scripts write package versions, generated version source, and CLI distribution | Build-time concern, not a project artifact validation surface                                                                                                                                                                    |

## Structured-document consumers by command

| Command      | Structured inputs/outputs                                                    | Current invalid-data path                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aif init`   | Generates YAML config and JSON manifest/source map                           | Generated documents are written without schema validation; only later post-write metadata semantics cover sync transactions, not init's legacy apply path                               |
| `aif adopt`  | Inspects existing project files and plans generated config/metadata          | Reuses shallow source-map ownership parsing; invalid existing metadata is reduced to a generic conflict and generated documents are not structurally validated                          |
| `aif plan`   | Takes a task id and returns Markdown                                         | Does not create or validate the required feature brief/context pack structures                                                                                                          |
| `aif diff`   | Compares desired config, manifest, source map, and adapter outputs with disk | Invalid config is not read; invalid source map becomes one generic conflict; malformed manifest can produce a misleading diff                                                           |
| `aif sync`   | Reads YAML config, existing JSON metadata, generates next JSON metadata      | Config uses a second shallow parser and errors exit `2`; existing manifest is not structurally read before planning; generated next metadata is not schema validated before transaction |
| `aif doctor` | Reuses diff/planning inputs                                                  | Reports generic conflicts only; cannot enumerate parse/schema/skill/reference errors and has no structural-versus-semantic separation                                                   |

## Handwritten validation paths

1. `@aif/core.parseAifConfig` parses YAML and checks three config fields and the
   adapter enum.
2. `@aif/cli.projectConfiguration` independently parses YAML, checks profile and
   adapter array shapes, then reparses adapters through CLI-option logic.
3. `@aif/core.parseSkill` uses a regular expression and a general YAML parse for
   frontmatter, then checks only `name` and `description`.
4. `@aif/validator.validateSkillDocuments` wraps skill parsing and checks names
   for duplication.
5. `@aif/validator.validateManifest` checks only `lockVersion` and
   `frameworkVersion` string presence.
6. `@aif/cli.ownership` parses source-map JSON and checks version, file array,
   path, checksum, ownership, normalization, and exact destination uniqueness.
7. `@aif/cli.validateCommittedOwnershipState` reparses both metadata documents
   and performs the 31 filesystem/cross-document corruption classifications plus
   version/identity checks.
8. `@aif/core.normalizeOutputPath`, `@aif/cli.destinationCollisionKey`,
   `@aif/cli.inside`, and `@aif/cli.safeDestination` validate different aspects
   of path syntax, normalization, root containment, collisions, and symlinks.
9. `@aif/validator.validateGeneratedFiles` independently checks generated paths,
   exact collisions, source attribution, and checksums.
10. `@aif/validator.validateCanonicalReferences` checks supplied references
    against a supplied catalog but has no CLI consumer.

## Duplicate validation and missing integration

- Config YAML parsing and adapter validation are duplicated in core and CLI with
  different accepted shapes and error categories.
- Source-map record shape, version, path, ownership, and duplicate checks occur
  separately in ownership planning and post-write validation.
- Destination validation is spread across four functions. Some duplication is
  intentional defense-in-depth at the filesystem seam, but structural path shape
  should have one schema/policy definition.
- Manifest version checks appear in the standalone validator and the post-write
  validator, but neither uses the catalog schema.
- Skill parsing returns raw parser-derived messages containing source paths and
  has no normalized field locations or stable granular error codes.
- Structural defects are frequently collapsed into `null`, generic conflicts, or
  `CliUsageError`, allowing exit code `2` where project validation must use `3`.
- Existing semantic post-write checks are valuable and must be preserved rather
  than encoded as JSON Schema assertions.

## Required architecture correction

Introduce one deep validation module with a small interface that accepts artifact
bytes, artifact type, format, and project-relative document path. Its
implementation must enforce size/depth/parser safety, select a bundled local
schema, validate structure, and return deterministic safe diagnostics. Commands
then run artifact-specific semantic validators only after structural success.

The module must not load schemas over the network, execute code, echo private
document values, or expose raw library exceptions. Security-sensitive config and
ownership metadata should reject unknown properties. Human-authored planning
artifacts should reject unknown core properties while allowing one explicit
`extensions` object that cannot override core fields. Agent Skills must first
follow the open frontmatter contract, then pass an additional AIF policy layer.

## Release-blocker disposition before implementation

**NOT RESOLVED.** All eight required artifact families need complete versioned
contracts; runtime structural validation; hardened JSON/YAML parsing; command
integration before semantic validation and writes; safe exit-code-aware
diagnostics; doctor reporting; and packed-runtime verification.
