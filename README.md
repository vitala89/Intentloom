<p align="center">
  <img src="apps/desktop/src/design/assets/logo-mark.svg" alt="Intentloom" width="112" height="112">
</p>

<h1 align="center">Intentloom</h1>

<p align="center"><strong>Define engineering intent once, then validate and synchronize it across AI coding tools.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/intentloom"><img src="https://img.shields.io/npm/v/intentloom?label=npm" alt="npm version"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-339933" alt="Node.js 22+">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://github.com/vitala89/Intentloom/actions/workflows/compatibility.yml"><img src="https://img.shields.io/github/actions/workflow/status/vitala89/Intentloom/compatibility.yml?branch=main&label=compatibility" alt="Compatibility CI"></a>
</p>

<p align="center">
  <a href="https://vitala89.github.io/Intentloom/">Documentation</a> ·
  <a href="https://vitala89.github.io/Intentloom/guides/GETTING_STARTED">Getting started</a> ·
  <a href="https://vitala89.github.io/Intentloom/reference/CLI">CLI reference</a> ·
  <a href="ROADMAP.md">Roadmap</a> ·
  <a href="SECURITY.md">Security</a> ·
  <a href="https://www.npmjs.com/package/intentloom">npm</a>
</p>

---

Intentloom is a vendor-neutral framework and local toolchain for defining,
validating, and synchronizing engineering intent across AI-assisted development
workflows. It turns a canonical catalog of policies, workflows, templates,
schemas, and skills into deterministic, reviewable tool-specific guidance.

**Status:** stable · **Current release:** `1.0.2` (npm `latest`) · **Node.js:** `>=22`

Intentloom is local and offline-first. It does not send telemetry and does not
make hidden runtime network requests. See the
[release state](docs/releases/RELEASE_STATE.md) for the authoritative boundary
between the published npm artifact and what is merged into `main`, and the
[support policy](docs/releases/SUPPORT_POLICY_V1.md) for the v1 compatibility
and deprecation contract.

## Why Intentloom?

Engineering guidance fragments across README files, contributor notes, editor
rules, agent prompts, and tool-specific configuration. That fragmentation makes
AI assistants inconsistent, makes tool migrations expensive, and makes generated
configuration hard to review.

Intentloom provides one canonical source of engineering intent. It validates
that source, previews the resulting changes, generates adapter-specific files,
and tracks generated-file ownership so project-owned work is never silently
replaced.

## Supported integrations

| Integration    | Generated guidance                                                  |
| -------------- | ------------------------------------------------------------------- |
| Claude Code    | `AGENTS.md`, `CLAUDE.md`, and portable skills in `.claude/skills/`  |
| OpenAI Codex   | `AGENTS.md` and portable skills in `.agents/skills/`                |
| Cursor         | `AGENTS.md`, MDC rules, and experimental portable skills            |
| GitHub Copilot | Copilot instructions, path-scoped instructions, and portable skills |

Adapters are deterministic and capability-aware. Intentloom deliberately does
not generate unsupported vendor surfaces such as Claude hooks, Codex user
configuration, Cursor legacy rules, or environment-specific Copilot features.

Vendor names describe compatibility only. Intentloom is an independent project
and is not affiliated with or endorsed by OpenAI, Anthropic, GitHub, Cursor, or
other vendors.

## Surfaces

| Surface         | Binary                | Distribution                                         |
| --------------- | --------------------- | ---------------------------------------------------- |
| CLI             | `intentloom`          | Published to npm as `intentloom`                     |
| Local daemon    | `intentloomd`         | Built from source in this repository, not published  |
| MCP server      | `intentloom-mcp`      | Built from source in this repository, not published  |
| Read-only TUI   | `intentloom ui`       | Part of the published CLI                            |
| Desktop (Tauri) | `@intentloom/desktop` | `0.6.0-beta.1` milestone, not distributed as a build |

The CLI is the only published artifact. The daemon, MCP server, and Desktop
application live in the same monorepo and build from source; see
[Desktop documentation](docs/desktop/README.md) and
[ADR-0042](docs/decisions/ADR-0042-desktop-stack-and-daemon-distribution.md).

## Key capabilities

- A canonical catalog of policies, workflows, templates, JSON Schemas, and Agent Skills.
- Structural and semantic validation before planning or writing.
- Safe initialization of new projects and proposal-based adoption of existing ones.
- Multi-adapter generation with deterministic ordering and collision detection.
- `--dry-run`, `diff`, and read-only `doctor` workflows for review before change.
- Transactional writes, source-map ownership, rollback, and post-write consistency checks.
- Project inspection, local Git timeline, provider evidence export, and release analysis.
- Engineering conformance profiles, managed-extension schemas, and governance checks.
- Structured task and session summaries, skill lifecycle and evaluation, checkpoints, and delegation.
- Persistent agent memory and security analysis candidates with explicit review gates.
- Agent Workspace discuss, inspect, plan, review, and apply modes.
- Portable path handling, symlink defenses, and deterministic diagnostics.
- Profile-aware output for generic, TypeScript, Angular, Rust, Tauri, and Angular + Tauri projects.

## Installation

```bash
npm install --save-dev intentloom
# or
pnpm add --save-dev intentloom
```

Pin the release for reproducible installs:

```bash
npm install --save-dev intentloom@1.0.2
```

Inspect the CLI without installing it:

```bash
npx intentloom --help
```

The public package and CLI are both named `intentloom`. The private
`@intentloom/workspace` package is not an installation target.

`1.0.0` was published manually before the trusted-publishing release workflow
existed, so it carries no npm provenance attestation and cannot gain one
retroactively. Releases from `1.0.1` onward publish through
[`release.yml`](.github/workflows/release.yml) and carry provenance.

## Quick start

From the project you want to configure, preview first:

```bash
intentloom init --dry-run
intentloom init
intentloom doctor
intentloom sync --dry-run
intentloom diff
intentloom sync
```

`init` creates the Intentloom metadata and planned adapter output. `doctor` is
read-only and reports validation, ownership, migration, security, and drift
findings. `sync --dry-run` shows a plan without writing; `diff` lets you review
the generated delta before `sync` applies a transactional update.

## Adopt an existing project

Adoption is proposal-based and non-destructive. Existing files remain
project-owned unless valid Intentloom ownership metadata proves otherwise.

```bash
intentloom adopt --plan
intentloom adopt --apply PLAN_FILE
intentloom doctor
intentloom diff
```

Review the plan before applying it. Ambiguous evidence, manual decisions, or
conflicts block writes rather than guessing or overwriting files.

## Core workflow

```text
Define → Validate → Preview → Synchronize → Review
```

1. **Define** canonical policies, workflows, templates, and skills in the catalog.
2. **Validate** project metadata and supported adapter/profile combinations.
3. **Preview** with `init --dry-run`, `adopt --plan`, `sync --dry-run`, or `diff`.
4. **Synchronize** with `sync` only after the plan is acceptable.
5. **Review** ongoing state with the read-only `doctor` command.

## Command surface

Core lifecycle:

| Command             | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `intentloom init`   | Initialize Intentloom metadata and adapter output for a project.      |
| `intentloom adopt`  | Inspect an existing project and apply only a safe adoption proposal.  |
| `intentloom update` | Apply a pack update through 3-way migration.                          |
| `intentloom plan`   | Produce a deterministic planned output view.                          |
| `intentloom diff`   | Show the current generated-file delta.                                |
| `intentloom sync`   | Apply a validated transactional synchronization.                      |
| `intentloom doctor` | Report read-only validation, ownership, security, and drift findings. |

Inspection and evidence:

| Command                  | Purpose                                                 |
| ------------------------ | ------------------------------------------------------- |
| `intentloom inspect`     | Bounded read-only project summary.                      |
| `intentloom timeline`    | Local Git timeline view.                                |
| `intentloom evidence`    | Import and analyze provider evidence exports.           |
| `intentloom conformance` | Evaluate engineering conformance and security profiles. |
| `intentloom ui`          | Read-only interactive terminal surface.                 |

Agent and memory surfaces:

| Command                 | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `intentloom summary`    | List, read, and record structured task and session summaries.     |
| `intentloom session`    | Manage agent sessions.                                            |
| `intentloom checkpoint` | Create, pause, cancel, redirect, and resume checkpoints.          |
| `intentloom memory`     | Inspect, propose, review, accept, forget, and export memory.      |
| `intentloom security`   | Import, scan, triage, and audit security findings.                |
| `intentloom skill`      | Discover catalog skills at catalog, contract, or procedure level. |
| `intentloom proposal`   | List, create, approve, plan, and apply proposals.                 |
| `intentloom evaluate`   | Run and list skill and proposal evaluations.                      |
| `intentloom profile`    | Create, read, and list agent profiles.                            |
| `intentloom delegate`   | Delegate a task to a profile and role.                            |
| `intentloom context`    | Produce a bounded context bundle for an agent.                    |
| `intentloom rank`       | Configure and run optional semantic ranking.                      |
| `intentloom workspace`  | Agent Workspace discuss, inspect, plan, review, and apply.        |
| `intentloom neutron`    | Autonomous subagent orchestration and local workspace sync.       |

Common options include `--dry-run`, `--root PATH`, `--profile NAME`, `--json`,
and `--adapters claude,codex,cursor,copilot` where supported. `sync --force` is
explicitly limited to synchronization. Run `intentloom --help` for the exact
supported surface, or read the [full CLI reference](docs/reference/CLI.md).

Some agent, memory, security, workspace, and Neutron surfaces are marked
experimental in the [release state](docs/releases/RELEASE_STATE.md). Stability
guarantees follow that table, not this list.

## Project structure

An initialized project stores Intentloom metadata in `.aif/`:

```text
.aif/
├── config.yaml          # user-owned profile and adapter selection
├── manifest.lock.json   # generated, pinned resolved inputs and versions
└── source-map.json      # generated ownership, paths, and checksums
```

`.aif` and `urn:aif:*` identifiers are intentional v0.1 compatibility values.
They are persisted protocol identifiers, not the public package name.

## Repository layout

Intentloom is a single public pnpm monorepo.

```text
catalog/                 canonical policies, workflows, templates, schemas, skills, packs
profiles/                generic, typescript, angular, rust, tauri, angular-tauri
packages/
├── core/                resolver and desired-state model
├── protocol/            versioned local protocol contracts
├── validator/           structural and semantic validation
├── adapters/            Claude, Codex, Cursor, Copilot renderers
├── application/         application operations and transaction engine
├── cli/                 published `intentloom` CLI
├── daemon/              authenticated local daemon (`intentloomd`)
├── mcp-server/          MCP server (`intentloom-mcp`)
├── evidence-provider/   provider evidence contracts
├── evidence-git/        local Git evidence
└── evidence-analysis/   evidence analysis and release analysis
apps/desktop/            Tauri 2 read-only Desktop client and design system
examples/                minimal, typescript, angular-tauri, adoption report
tests/                   cross-package test suite
docs/                    specs, ADRs, guides, references, roadmap, audits
```

## Architecture and safety

```text
Catalog + profiles → core resolver → adapter contracts → target files
                          ↓
                    validation + source map + manifest lock
```

The catalog is the vendor-neutral source of meaning. The core resolves it into a
normalized desired state; adapters render only their declared capabilities; and
validation checks configuration, paths, ownership, collisions, and drift before
any filesystem mutation.

Writes are transactional. Intentloom validates generated metadata and checksums
after finalization, rolls back recoverable failures, and reports incomplete
rollback explicitly. It rejects unsafe or escaping paths, detects normalized
collisions, and never treats a comment header alone as ownership proof.

Read the [architecture](docs/architecture/ARCHITECTURE.md),
[configuration reference](docs/reference/CONFIG.md),
[portable path model](docs/reference/PATHS.md), and
[generated-files reference](docs/reference/GENERATED_FILES.md) for detail.

## Documentation

- [Documentation index](docs/README.md)
- [Getting started](docs/guides/GETTING_STARTED.md)
- [New project guide](docs/guides/NEW_PROJECT.md)
- [Existing project adoption](docs/guides/EXISTING_PROJECT.md)
- [Tool adapters](docs/guides/TOOL_ADAPTERS.md)
- [Upgrading](docs/guides/UPGRADING.md) and [migration guide](docs/releases/MIGRATION_GUIDE.md)
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md)
- [Compatibility matrix](docs/compatibility/COMPATIBILITY_MATRIX.md)
- [v0.1 specification](docs/specs/AIF_V0_1_SPEC.md)
- [Architecture decisions](docs/decisions/)
- [Release process](docs/releases/RELEASE_PROCESS.md), [release state](docs/releases/RELEASE_STATE.md), and [versioning policy](docs/releases/VERSIONING.md)
- [v1.0 support policy](docs/releases/SUPPORT_POLICY_V1.md)

Public examples include [minimal](examples/minimal/README.md),
[TypeScript](examples/typescript/README.md), and
[Angular + Tauri](examples/angular-tauri/README.md) projects. The
[Applye adoption report](examples/applye-adoption-report/README.md) is a
sanitized migration and adoption example, not bundled Applye source.

## Development and testing

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm vitest run
```

The latest verified local result on `main` is **87 test files, 753 passed, 3
expected skips, and 0 failures** (2026-07-31). Package verification also checks
byte-identical archives and isolated npm and pnpm local-tarball installs. Hosted
CI runs the declared checks on Linux, macOS, and Windows for Node.js 22 and 24,
plus CodeQL and dependency review.

## Roadmap

v1.0 delivers the stable compatibility contract over the canonical catalog,
adapter contracts, validation, non-destructive adoption, deterministic
synchronization, evidence and conformance, and the agent, memory, and workspace
surfaces. Later candidates include live provider connections, external MCP
evidence ingestion, managed extension installation, HTTP MCP transport, and a
distributed Desktop application. See the [roadmap](ROADMAP.md) for the current
scope and explicit non-goals.

## Contributing

Contributions are welcome. Review the architecture and ADRs, keep provider
syntax in adapters rather than the canonical catalog, run the local checks, and
open a focused pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) and the
[engineering principles](docs/governance/ENGINEERING_PRINCIPLES.md).

For security-sensitive issues, follow [SECURITY.md](SECURITY.md) rather than
opening a public issue with sensitive details. Normal bugs and feature requests
can use [GitHub Issues](https://github.com/vitala89/Intentloom/issues).

## License

Intentloom is released under the [MIT License](LICENSE).
