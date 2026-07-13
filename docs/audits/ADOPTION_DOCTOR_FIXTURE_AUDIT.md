# Adoption and Doctor Fixture Audit

Audit date: 2026-07-13. Baseline: commit `fb5b724`, framework
`0.1.0-alpha.0`, and 294 passing tests. This audit was completed before the
adoption/doctor implementation and fixture changes.

## Current command paths

`aif adopt` follows `bin.ts → runCli() → validateExistingMetadata() →
projectConfiguration() → adoptProject() → plan()`. The command validates any
present config, manifest, and source map, selects stored or default
profile/adapters, probes seven hard-coded paths, builds the same desired-file
plan as initialization, forces that plan to dry-run, and returns the plan plus
plain string diagnostics. It never applies a proposal, even when `--dry-run` is
absent.

`aif doctor` follows `bin.ts → runCli() → validateExistingMetadata() →
validateProjectSkills() → projectConfiguration() → doctorProject() → plan()`.
Structural or cross-metadata failures return early through the artifact
validation formatter. Otherwise doctor compares the desired generated tree to
the current ownership map, converts updates to stale findings, strips proposed
content, and returns generated-state semantic errors. Doctor performs no write.

## Files inspected today

Adoption directly probes:

- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`,
  `.github/copilot-instructions.md`, `README.md`, `ROADMAP.md`, and
  `CHANGELOG.md`;
- `.aif/config.yaml`, `.aif/manifest.lock.json`, and `.aif/source-map.json`
  when present;
- every desired generated destination for the selected adapters, including
  generated Agent Skill destinations;
- parent path components of metadata and generated destinations for symlink
  and root-containment checks.

Doctor inspects the same metadata and desired destinations. In addition,
`validateProjectSkills()` recursively enumerates the complete project root and
reads every path ending in `/SKILL.md`. The native filesystem implementation
uses unrestricted recursive `readdir`; the memory implementation returns every
stored path below the supplied prefix.

Neither command currently has evidence-based stack discovery. Neither inspects
`package.json`, lockfiles, framework configuration, `Cargo.toml`, Tauri
configuration, or `tsconfig.json`. Product and engineering documentation beyond
the seven hard-coded adoption probes is not classified.

## Files created or modified today

Adoption always calls `plan()` with `dryRun: true` and therefore creates or
modifies nothing. It does not create `.aif`, staging files, backups, ownership
records, or generated output. The absence of an adoption apply path is not
visible in its result contract.

Doctor calls only validation, reads, path checks, and planning. It creates or
modifies nothing. Existing tests prove this for one in-memory initialized
project and one built-CLI project, but not for the required state matrix.

## Current assumptions and misclassification risks

### Release blockers

- Adoption reuses the generic `Plan` interface. It cannot distinguish mapping,
  generated candidates, unsupported items, skipped items, or manual decisions;
  it also exposes proposed file contents in JSON.
- Any existing non-identical generated destination is a generic conflict.
  Existing project-owned instructions remain unclaimed, which is safe, but the
  result cannot explain compatible mapping or migration choices.
- An identical existing destination disappears from the plan. With no ownership
  record, adoption therefore fails to state that the file remains project-owned
  and may misleadingly appear fully adopted.
- The hard-coded `.cursor/rules` probe treats a directory like a file and does
  not classify individual `.mdc` rules. Claude, Codex, Cursor, and Copilot skill
  directories and `.github/instructions/*.instructions.md` are not adoption
  inventory items.
- README, ROADMAP, and CHANGELOG produce only generic diagnostics. Architecture,
  product-state, technical-debt, alternate-name, partial-set, and duplicated
  documentation concepts are not discovered or mapped.
- Profile selection defaults to `generic` unless config or CLI flags specify a
  profile. There is no deterministic stack evidence, competing-candidate list,
  confidence reason, or manual-confirmation signal.
- Doctor skips absent metadata during structural validation. A completely
  uninitialized or partial installation reaches desired-state planning, but
  missing metadata is reported as generic generated-state creation rather than
  precise required-state diagnostics.
- Doctor does not provide the requested severity/category/remediation/read-only
  contract. It uses `diagnostics: string[]` plus a narrow generated-state error
  shape.
- Doctor does not explicitly diagnose orphaned manifest/source-map records,
  conflicting adapter selection, profile mismatch, experimental capability,
  missing generated headers, or optional documentation recommendations.
- Adoption has no supported apply mode. The v0.1 command table describes adopt
  as write-capable with conflict detection, but current implementation is
  analysis-only and cannot prove transactional apply, rollback, ownership
  creation, or idempotence.
- There is no reusable fixture metadata/tree loader and no fixture matrix for
  the required repository states.
- Packed CLI tests do not cover adopt and cover doctor only in schema-oriented
  cases; they do not prove packed proposal parity, state immutability, or
  repeated deterministic output.

### Required before stable `0.1.0`

- Recursive skill scanning is unbounded and does not ignore `.git`,
  `node_modules`, build output, coverage, vendor content, or generated caches.
  It can traverse irrelevant large trees and allow ignored `SKILL.md` files to
  affect doctor.
- Native recursive enumeration order is not normalized before skill reads.
  Validation output is later sorted, but read order and duplicate/result
  association can vary by filesystem.
- There is no explicit proof that scanning stays inside the project root or
  refuses symlinked external directories during recursive discovery.
- No tests cover spaces/Unicode roots, monorepos, nested applications, ignored
  trees, minimally represented large trees, or symlinked source directories.
- Doctor currently treats every blocking generated-state change as error-level
  through its exit decision. It cannot represent warning-only optional
  documentation or informational healthy findings.
- Human adoption formatting reduces the result to generic change lines and
  omits classification, evidence, manual decisions, and safe next actions.

### Recommended

- Keep scanning and classification behind one deep read-only analysis module
  whose interface returns sorted evidence, proposal items, and diagnostics.
  CLI formatting and fixtures should consume the same result rather than
  reproducing classification rules.
- Represent detected documentation purpose separately from filename so
  alternate and duplicate concepts remain explainable without automatic moves.
- Preserve both the selected profile and all deterministic candidates so a
  stored profile mismatch can be diagnosed without silently rewriting config.
- Treat healthy doctor information as stable output rather than an empty,
  context-free result.

### Later

- User-configured scan exclusions beyond an already supported configuration
  seam; the current config schema has no exclusion field.
- Content-semantic documentation classification beyond bounded filename and
  repository-layout evidence.
- Broader adapter/Windows fixture matrices, graph analysis, provider runtime
  discovery, and automatic migration execution.

## Determinism and safety findings

Desired adapter output, hard-coded adoption probes, generated-file planning,
and final human plan formatting are sorted or iterate stable source arrays.
Native recursive filesystem enumeration is the notable nondeterministic seam.
JSON adoption output serializes proposal order directly and can include full
generated candidate contents. Doctor strips those contents, but early schema
failures and normal generated-state findings use different top-level contracts.

Ownership is currently inferred only from a valid source-map record, never from
path, header, name, or matching bytes. That core invariant must remain. The
fixture work must make identical/header-like unowned files explicit as
project-owned rather than weakening the ownership rule.

## Implementation direction

The release blocker requires a small public analysis interface backed by a
bounded read-only scanner, evidence-based profile detector, adoption classifier,
and structured doctor evaluator. Fixtures should exercise that same interface
and the real CLI. Adoption apply must either route accepted safe creation through
the existing transactional synchronization path or remain explicitly
unsupported with the blocker left open; fixture metadata must never enter
production behavior.

## Pre-implementation verdict

**NOT RESOLVED.** Safe defaults exist, but the proposal contract, bounded
scanning, profile detection, structured doctor diagnostics, fixture matrix,
packed-runtime proof, and adoption apply decision are incomplete.
