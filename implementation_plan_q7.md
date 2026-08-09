# Engineering Quality Packs Phase Q7: Checker Report Ingestion

## Objective

Add a provider-neutral, read-only ingestion boundary for bounded reports that
already exist. Normalize ESLint JSON, structured TypeScript diagnostics, SARIF,
and Clippy JSON into canonical engineering-quality checker findings without
executing a checker, reading the filesystem, using the network, installing
dependencies, writing files, or publishing data.

## Scope and exit gate

In scope:

- versioned checker-report and normalized-finding contracts in `protocol`;
- validator-boundary checks for untrusted report shape, counts, string sizes,
  locations, paths, and source-specific required fields;
- pure deterministic application adapters for the four report formats;
- lexical project-relative path normalization and secret-like path/snippet
  redaction;
- stable finding identities, provenance retention, duplicate suppression, and
  truthful partial/unsupported diagnostics;
- focused contract and adversarial normalization tests.

Out of scope:

- checker execution, process spawning, command resolution, or tool installation
  (Q8);
- external pack import, download, signature verification, or activation (Q9+);
- filesystem reads/writes, network access, telemetry, dependency mutation,
  publishing, CLI/daemon/MCP surface changes, and generated adapters.

The Q7 exit gate is satisfied only when malformed or oversized untrusted input
is rejected at the validator boundary, all four supported report formats yield
the same canonical meaning for equivalent findings, normalization is stable
under repeated execution and input ordering, duplicates are removed without
silently merging conflicting meanings, and no checker is executed.

## Architecture boundaries

1. `packages/protocol/src/engineering-quality/checker-report.ts` owns the
   canonical schema URNs, source/tool provenance, locations, normalized checker
   findings, diagnostics, and ingestion result status.
2. `packages/validator/src/engineering-quality/checker-report.ts` owns all
   runtime validation of untrusted report data and returns bounded canonical
   values or fails closed. It must not parse files or invoke tools.
3. `packages/application/src/engineering-quality/` owns pure source adapters,
   common path/redaction normalization, stable identity generation, and
   deterministic deduplication. It accepts strings or already-parsed values;
   it has no filesystem, network, process, or mutation dependency.
4. Existing security SARIF persistence remains separate. Q7 produces the
   provider-neutral engineering-quality result and does not write security
   findings or alter the existing security lifecycle.

## Source mapping

- ESLint JSON: file result messages, numeric severity, rule IDs, locations,
  suggestions/help URLs when bounded.
- TypeScript diagnostics: structured diagnostic objects with category/code,
  message text, file and start/length location data.
- SARIF 2.1.0: run tool metadata, result level/rule/message, physical
  locations, fingerprints, and help URI.
- Clippy JSON: diagnostic message, code, rendered text, level, and primary
  spans from the JSON message format.

Source-specific fields are mapped to the same canonical severity, rule ID,
message, location, tool provenance, and optional source fingerprint. Unknown
or unsupported fields are ignored; missing required meaning is reported as a
bounded diagnostic or rejects the malformed report according to the contract.

## Safety and determinism

- Maximum report size, finding count, diagnostic count, string length, location
  count, and nesting depth are explicit constants covered by tests.
- Paths are normalized lexically to `/`, made project-relative when a project
  root is supplied, and redacted when they look like `.env`, key, certificate,
  or private-key paths. Snippets and messages are bounded and secret-like
  snippets are redacted; raw report content is never retained.
- Finding IDs are derived from source/tool/rule/message/location/fingerprint
  meaning, not array position. Stable sorting uses canonical fields.
- Identical canonical findings deduplicate. Same identity with different
  meaning produces a conflict diagnostic rather than silent overwrite.
- The result preserves source and tool provenance, reports dropped or
  unsupported records explicitly, and never claims execution or verification.

## Validation and review gate

- Focused tests cover all four adapters, malformed input, oversized arrays and
  strings, secret redaction, path traversal, duplicate/conflicting meanings,
  deterministic ordering, unsupported diagnostics, and input immutability.
- Run the focused Q7 and existing Q3–Q6 engineering-quality tests.
- Run the bounded security and privacy review against the final diff and data
  flow.
- Before commit: staged quality checks and `git diff --cached --check`.
- Before push: full `pnpm verify`, production-file size audit, final diff
  review, and `git diff --check`.
- Update `PROJECT_STATE.md` and `DUTY_WATCH.md`, then create a separate draft
  PR from the Q7 branch.
