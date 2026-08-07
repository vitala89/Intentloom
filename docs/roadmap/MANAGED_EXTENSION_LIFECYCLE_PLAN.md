# Managed Extension Lifecycle Implementation Plan

## Status

Phases E1-E8 are implemented. Phase E4 Update Discovery & Migration Pipeline
merged through PR #224 (`18b6b53`), Phase E5 Doctor Diagnostics & Health
Verification merged through PR #226 (`56bf4bd`), Phase E6 Safe Revocation,
Removal & Rollback Recovery merged through PR #227 (`d65e735`), Phase E7
Knowledge-Provider & Adapter-Pack Boundaries merged through PR #229 (`8d4eed5`),
and Phase E8 Extension Sandboxing & Contextual Security Policies is complete.

## Outcome

Establish a vendor-neutral governance, discovery, inspection, resolution,
capability-gating, integrity-locking, and rollback-recovery model for optional
external extensions (skills, MCP servers, knowledge providers, adapter packs, and
policy packs) without compromising local-first security, project ownership, or
reproducible builds.

## Delivery principles

- external tools are replaceable dependencies, not canonical core code;
- local read-only inspection before installation or update;
- explicit human approval before capability grants or side effects;
- pre-adoption inspection reports exact file, process, network, and license scope;
- pinned reproducible lock state (`.aif/extension-lock.json`);
- unpinned `latest` resolution is forbidden;
- update discovery and update execution are separate operations;
- transactional update and health validation with fail-closed rollback;
- safe removal preserves project-owned code and required legal notices;
- no silent background installation, hidden network calls, or automatic updates.

---

## Phase E1: Core Manifest & Lockfile Protocol Contracts

Status: complete in protocol and validator packages.

Scope:

- define versioned JSON Schemas `urn:aif:schema:extension-manifest:1` and
  `urn:aif:schema:extension-lock:1` in `catalog/schemas/`;
- add TypeScript types and interfaces in `@intentloom/protocol`;
- add schema validators and semantic checks in `@intentloom/validator`;
- add unit and contract tests in `tests/extension-schema.test.ts`.

Exit gate:

- manifest and lockfile schemas validate valid extension declarations;
- invalid category, missing license, unparsed capabilities, or invalid digests fail
  validation with typed diagnostics;
- no process execution or filesystem mutation is enabled by protocol schemas.

---

## Phase E2: Pre-Adoption Inspection & Capability Delta Engine

Status: complete in protocol, validator, and application packages.

Scope:

- define canonical application operation `inspectExtensionManifest`;
- compute capability deltas (filesystem paths, process commands, network endpoints)
  between candidate manifest and existing `.aif/extension-lock.json`;
- verify runtime compatibility (Node.js version, OS, architecture, Intentloom core API range);
- audit license SPDX identifier, notice requirements, publisher changes, and
  known restrictive terms;
- generate human-readable and machine-readable pre-adoption inspection reports.

Exit gate:

- pre-adoption inspection is byte-for-byte read-only;
- unapproved capability expansions fail closed with explicit diagnostics;
- incompatible runtime or core API versions produce typed incompatibility findings;
- legal metadata is reported accurately without claiming legal advice status.

---

## Phase E3: Transactional Extension Resolution & Lockfile Management

Status: complete in protocol, validator, and application packages.

Scope:

- define canonical application operation `proposeExtensionAdoption`;
- resolve candidate version range against declared registry or source;
- verify artifact integrity digest (sha256 / sri) when source supports it;
- snapshot license and notice metadata;
- prepare transactional adoption plan including `.aif/extension-lock.json` update;
- commit lock state only after explicit human approval and health check validation.

Exit gate:

- unpinned `latest` resolution is rejected;
- SHA256 integrity digest mismatch aborts transaction before writing lockfile;
- adoption transaction is atomic: failure rolls back staging and leaves project files byte-for-byte unchanged;
- lockfile records exact resolved version, integrity, approved capabilities, and approval metadata.

---

## Phase E4: Update Discovery & Migration Pipeline

Status: complete on `main` through PR #224 (`18b6b53`); Windows portability and
hosted compatibility verification are complete.

Scope:

- define canonical application operation `discoverExtensionUpdates`;
- compare current pinned lockfile entries against candidate update channels;
- highlight capability expansions, license changes, publisher changes, and breaking changes;
- prepare migration preview for configuration and project-local extension state;
- execute update via isolated transactional engine (`applyExtensionUpdate`).

Implementation notes:

- discovery consumes explicit candidate metadata and never performs hidden
  registry or network access;
- every available update requires approval evidence, with additional reasons for
  capability, publisher, source, license, breaking, and migration changes;
- reversible configuration and project-local state migrations use exact SHA256
  before/after digests plus symlink-safe, extension-owned project paths;
- runtime staging, integrity verification, health checking, commit, and rollback
  remain behind a narrow injected boundary rather than granting canonical core
  process or installation authority.

Exit gate:

- update discovery never auto-installs or auto-updates extensions;
- capability delta or license change during update forces human review;
- migration failure triggers automatic rollback to prior pinned version and lockstate;
- unapproved updates leave installed extensions unchanged.

---

## Phase E5: Doctor Diagnostics & Health Verification

Status: implemented and merged through PR #226 (`56bf4bd`).

Scope:

- extend `intentloom doctor` with extension health check suite;
- detect stale or unpinned extension locks;
- detect unavailable, revoked, or compromised extension sources;
- verify local artifact integrity against pinned `integrity` digest;
- detect unapproved capability grants or configuration drift;
- verify entrypoint command availability and health check endpoints.

Exit gate:

- `intentloom doctor` reports extension health findings without changing files;
- integrity mismatch or missing executable emits high-severity diagnostic;
- revocation or security advisory emits clear remediation instructions.

---

## Phase E6: Safe Revocation, Removal & Rollback Recovery

Status: implemented and merged through PR #227 (`d65e735`).

Scope:

- define canonical application operation `removeExtension`;
- preview processes to stop, files/caches to clear, and project files retained;
- execute clean removal of extension references from configuration and lockfile;
- preserve project-owned code, user evidence, and required legal notice snapshots;
- support rollback to previous known-healthy lockfile snapshot upon failure.

Exit gate:

- removal never deletes project-owned source files;
- notice and audit records remain intact for compliance;
- rollback restores exact previous lockfile, configuration, and executable references.

---

## Phase E7: Knowledge-Provider & Adapter-Pack Boundaries (Graphify Integration)

Status: complete in protocol, validator, application, and graphify adapter modules.

Scope:

- define vendor-neutral `knowledge-provider` application boundary;
- implement adapter pattern for external code-graph tools (e.g., Graphify CLI or MCP adapter);
- pin Graphify artifact version, record license/notices, and enforce capability allowlist;
- ensure core platform remains fully functional if Graphify is absent or disabled.

Exit gate:

- core platform has zero hard runtime dependency on Graphify or third-party graph tools;
- Graphify adapter consumes standard application operation contracts;
- no third-party binary is bundled or redistributed without explicit license review.

---

## Phase E8: Extension Sandboxing & Contextual Security Policies

Status: implemented and complete.

Scope:

- define vendor-neutral isolation profiles (`strict`, `workspace-read`, `workspace-write`, `network-read`, `unrestricted`) in `@intentloom/protocol`;
- add schema and semantic validators `validateExtensionSandboxPolicy` and `validateExtensionSandboxEvaluation` in `@intentloom/validator`;
- define canonical application operation `evaluateExtensionSandboxPolicy` in `@intentloom/application`;
- evaluate requested vs allowed capability boundaries across filesystem, process exec, and network endpoints;
- emit typed sandbox evaluation verdicts (`approved`, `requires-approval`, `rejected`) with actionable diagnostics;
- add contract and unit test suite in `tests/extension-sandbox.test.ts`.

Exit gate:

- isolation profile violations reject adoption with `isolation-profile-exceeded` diagnostic;
- unapproved read/write paths, exec commands, or connect hosts require explicit user approval;
- policy requiring explicit approval triggers `requires-approval` status;
- byte-for-byte read-only evaluation without side effects or unapproved capability grants.

---

## Non-Goals

- Remote extension marketplace or public registry hosting.
- Automatic background updates or silent installation.
- Arbitrary code execution inside canonical core process space.
- Legal certification or warranty of third-party extensions.
