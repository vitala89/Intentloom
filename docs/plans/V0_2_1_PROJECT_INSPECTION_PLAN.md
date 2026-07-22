# v0.2.1 Project Inspection Plan

## Objective

Deliver a local, deterministic, read-only project inspection operation over one
explicit root. This is the first connected-project capability after
`0.1.0-beta.1`; it does not include Git evidence, provider access, MCP
transport, persisted access grants, or mutation.

## Contract

- Operation: private `inspectProject` in `@intentloom/application`.
- Capability: fixed `project.files.read` only.
- Input: explicit root and bounded, versioned inspection options.
- Output: detected profile, supported adapters, recognized instruction and
  Intentloom metadata, bounded exclusions, adoption-readiness summary, and
  normalized machine-readable findings.
- Safety: no writes, scripts, package-manager commands, child processes, Git,
  network access, dependency traversal, build/cache/vendor traversal, ignored
  secret-like paths, external symlink traversal, or paths outside the root.

ADR-0011 defines the initial boundary. This plan does not treat the
application-level contract as an operating-system sandbox.

## Delivery slices

1. Accept ADR-0011 and define the TypeScript input, result, finding, exclusion,
   and error contracts in the application package.
2. Implement a bounded root-safe scanner and profile/adapter/metadata discovery
   using existing detection and ownership logic where possible.
3. Add fixture coverage for empty, initialized, adopted, ignored-content, root
   escape, and symlink-sensitive projects; prove snapshots stay unchanged.
4. Add `intentloom inspect PROJECT_PATH|--root PATH`, JSON output, human output,
   usage validation, and exit-code mapping without duplicating inspection logic.
5. Run the full local quality gate and the hosted compatibility matrix. Record
   compatibility and any follow-up scope before making the operation available
   through daemon or MCP adapters.

## Exit criteria

- The same project state and options produce identical structured inspection
  output.
- All reported paths are normalized and project-relative.
- The operation is byte-for-byte read-only for valid, invalid, and
  symlink-sensitive fixtures.
- Excluded directories and secret-like paths are not read or reported as
  content.
- CLI JSON and human output are rendered from the application result, with no
  CLI-only inspection semantics.
- No Git, network, process, dependency-installation, or write capability is
  introduced.
