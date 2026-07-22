# Package Publish Readiness

> Historical AIF-era evidence record. Its package-name and registry observations
> apply only to the stated audit date and are not authorization to publish
> Intentloom.

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

On 2026-07-15, the configured registry was `https://registry.npmjs.org/` and
both the exact `aif-core` registry endpoint and `npm view aif-core` returned 404. `aif` is registered (`0.0.1`). npm search also returned similar but
unrelated packages including `aif-core-compliance` and `@anemona/aif-core`.
These are point-in-time availability/search signals only; they neither reserve
the name nor establish a right to publish it.

| Exact registry record     | Observed result                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Package / registry / date | `aif-core` / public npm registry / 2026-07-15                                                                     |
| Evidence                  | exact registry endpoint: HTTP 404; `npm view aif-core`: E404; `npm search aif-core`: similar-name results         |
| Package state             | absent at check time (not a reservation)                                                                          |
| Versions and dist-tags    | none available because no package record was returned                                                             |
| Owner/maintainer status   | not applicable for an absent record; authenticated publish right is not confirmed                                 |
| Classification            | registry package absent at check time; publish authority **NOT CONFIRMED** because the account is unauthenticated |

This environment returned `ENEEDAUTH` for `npm whoami` and `E401` for `npm
profile get`, so the authenticated npm identity, profile eligibility, controlled
scopes, package-owner rights, and publication authorization are **not
confirmed**. The requested `npm access ls-packages` spelling is unsupported by
the installed npm CLI (`npm 11.18.0`); its [documented
equivalent](https://docs.npmjs.com/cli/v11/commands/npm-access/) is `npm access
list packages`, which must be run by the authenticated authorized maintainer.
No fallback scope is selected or assumed.

For an absent unscoped record, the first successful publisher would normally
claim the package, but npm provides no non-publishing check that guarantees the
name will remain available or that this account can complete that first publish.
Authentication, account policy, required MFA/trusted-publishing policy, and the
absence of a version collision remain unverified here; the current manifest is
public rather than `private`, and the package version is `0.1.0-alpha.0`.

Public web searching found a crowded AIF/agentic-engineering naming landscape
and similar, unrelated software uses, but did not establish an exact `aif-core`
conflict. Official EUIPO/TMview, DPMAregister, WIPO Global Brand Database, and
USPTO search portals were identified; interactive, jurisdiction- and
class-specific searches and legal review remain required. `aif` command
collisions must also be reviewed across npm, Homebrew/Linux indexes, PyPI,
crates.io, and shell-command use before release. This is engineering diligence,
not legal advice or trademark clearance.

| Naming source / date                                           | Exact or similar result                                                                       | Status and confusion signal                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| npm exact endpoint and search, 2026-07-15                      | `aif-core` absent; similar `aif-core-compliance` and `@anemona/aif-core`                      | unrelated software packages found; potential search/name confusion, not a legal conclusion                                         |
| GitHub and general web search, 2026-07-15                      | broad AIF/agentic-engineering usage; no obvious exact `aif-core` software conflict surfaced   | search is limited; category/status cannot be treated as clearance                                                                  |
| EUIPO/TMview, DPMAregister, WIPO, USPTO portals, 2026-07-15    | official search portals located; interactive queries/results not captured in this environment | **inconclusive** pending exact/similar, software-class, and jurisdictional searches by an authorized reviewer                      |
| CLI indexes (npm, Homebrew/Linux, PyPI, crates.io), 2026-07-15 | `aif` is an npm package; no completed cross-index binary survey                               | command-collision result **inconclusive**; keep `aif` provisional and evaluate `aif-core`, `aifx`, and `agentic-fw` before release |

`aif-core` naming risk is **UNRESOLVED**: it is memorable, aligns with the
repository, and can accommodate private modular packages, but it can be read as
an internal library, has an `aif`/package-name mismatch, and has unresolved
ownership, mark-similarity, and command-collision evidence.

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

**PARTIALLY RESOLVED.** Engineering package readiness is complete, but npm
identity/ownership authorization, command-collision review, and documented
naming/trademark review remain open before a real publish. See
`docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md`.
