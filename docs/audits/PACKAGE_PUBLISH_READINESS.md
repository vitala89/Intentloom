# Package Publish Readiness

Audit date: 2026-07-15. Scope: `0.1.0-alpha.0` package metadata and tarball.

## Inventory

| Area                     | Name                  | Status                        | Alpha.1 decision |
| ------------------------ | --------------------- | ----------------------------- | ---------------- |
| Root workspace           | `@aif/workspace`      | private development workspace | remain private   |
| CLI                      | `aif-core`            | public CLI/runtime bundle     | publish          |
| Core                     | `@aif/core`           | private implementation        | bundle into CLI  |
| Adapters                 | `@aif/adapters`       | private implementation        | bundle into CLI  |
| Validator                | `@aif/validator`      | private implementation        | bundle into CLI  |
| Catalog/profiles/schemas | package `dist` assets | runtime assets                | bundle into CLI  |

`aif-core` has no supported programmatic import surface in this alpha; exports
only permit `aif-core/package.json`. Deep imports are intentionally blocked.

## Naming and scope

Model A (one public package) is selected. Model B (scoped modular packages)
and Model C (public CLI plus core API) were rejected in ADR-0006. The framework
display name remains **AIF — Agentic Engineering Framework**, repository remains
`vitala89/aif-core`, package is `aif-core`, and binary is `aif`.

Exact npm lookup and registry API results on 2026-07-15: `aif` is registered
(`0.0.1`); `aif-core`, `aif-framework`, `agentic-engineering-framework`,
`agentic-engineering`, and `aif-cli` returned 404. `@aif/cli` and
`@vitala89/aif` also returned 404, but scope ownership was not verified and no
scope is selected. Search results show unrelated AIF/active-inference products;
legal and trademark review remains required before real publication.

## Metadata, license, and tarball

The public manifest declares MIT, repository/homepage/bugs URLs, Node `>=22`,
public publish access, `aif` → `dist/aif.cjs`, and an explicit runtime-only
allowlist. The tarball includes LICENSE, README, bundled CLI, catalog, schemas,
skills, templates, workflows, and profiles; it excludes source, tests, fixtures,
`.env`, `.idea`, CI data, workspace links, and absolute paths.

Runtime bundle license review: Ajv is MIT and YAML is ISC; both are permissive
with the project MIT license. This is an engineering summary, not legal advice.
Catalog and schemas are repository-authored MIT content. No separate third-party
notice is currently identified; re-review bundled dependencies before release.

Repeated packs have identical file lists and per-file payload checksums. Archive
container checksums may differ because npm-generated archive metadata is not a
runtime payload guarantee.

## Verification

`npm pack --dry-run` reported 67 files, 136,877 bytes packed, and 706,386 bytes
unpacked. `npm publish --dry-run --tag next --access public --ignore-scripts`
succeeded for `aif-core@0.1.0-alpha.0`; it warned that real publication requires
login. No OTP or credentials were requested or printed, and no package was
published. Clean isolated npm and pnpm installs run help, version, init, adopt
dry-run, doctor, sync, and a no-op sync. The compatibility matrix runs this
packed coverage on Node 22/24 across Linux, macOS, and Windows.

## Verdict

**PARTIALLY RESOLVED.** Engineering package readiness is complete, but an
authorized maintainer must confirm npm name ownership and complete legal/
trademark review before a real publish.
