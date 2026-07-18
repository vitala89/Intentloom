# Intentloom

[![npm](https://img.shields.io/npm/v/intentloom/next?label=npm)](https://www.npmjs.com/package/intentloom)
![Node.js 22+](https://img.shields.io/badge/node-%3E%3D22-339933)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Define engineering intent once, then validate and synchronize it across AI coding tools.**

Intentloom is a vendor-neutral framework and local CLI for defining, validating,
and synchronizing engineering intent across AI-assisted development workflows. It
turns a canonical catalog of policies, workflows, templates, schemas, and skills
into deterministic, reviewable tool-specific guidance.

**Status:** Alpha · **Current release:** `0.1.0-alpha.2` · **Node.js:** `>=22`

[Repository](https://github.com/vitala89/Intentloom) · [Documentation](docs/README.md) · [Security](SECURITY.md) · [npm package](https://www.npmjs.com/package/intentloom)

> Intentloom is alpha software. Its commands, schemas, and generated output may
> evolve before a stable release. It is local and offline-first: it does not send
> telemetry or make hidden runtime network requests.

## Why Intentloom?

Engineering guidance often fragments across README files, contributor notes,
editor rules, agent prompts, and tool-specific configuration. That fragmentation
makes AI assistants inconsistent, makes tool migrations expensive, and makes
generated configuration difficult to review.

Intentloom provides one canonical source of engineering intent. It validates that
source, previews the resulting changes, generates adapter-specific files, and
tracks generated-file ownership so project-owned work is not silently replaced.

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

## Key capabilities

- A canonical catalog of policies, workflows, templates, JSON Schemas, and Agent Skills.
- Structural and semantic validation before planning or writing.
- Safe initialization of new projects and proposal-based adoption of existing ones.
- Multi-adapter generation with deterministic ordering and collision detection.
- `--dry-run`, `diff`, and read-only `doctor` workflows for review before change.
- Transactional writes, source-map ownership, rollback, and post-write consistency checks.
- Portable path handling, symlink defenses, and deterministic diagnostics.
- Profile-aware output for generic, TypeScript, Angular, Rust, Tauri, and Angular + Tauri projects.

## Installation

Install the alpha package as a development dependency:

```bash
npm install --save-dev intentloom@next
# or
pnpm add --save-dev intentloom@next
```

For reproducible installs, pin the current release:

```bash
npm install --save-dev intentloom@0.1.0-alpha.2
```

You can also inspect the CLI without installing it globally:

```bash
npx intentloom@next --help
```

The public package and CLI are both named `intentloom`. The private
`@intentloom/workspace` package is not an installation target.

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
intentloom adopt --dry-run
intentloom adopt
intentloom doctor
intentloom diff
```

Review the dry-run proposal before applying it. Ambiguous evidence, manual
decisions, or conflicts block writes rather than guessing or overwriting files.

## Core workflow

```text
Define → Validate → Preview → Synchronize → Review
```

1. **Define** canonical policies, workflows, templates, and skills in the catalog.
2. **Validate** project metadata and supported adapter/profile combinations.
3. **Preview** with `init --dry-run`, `adopt --dry-run`, `sync --dry-run`, or `diff`.
4. **Synchronize** with `sync` only after the plan is acceptable.
5. **Review** ongoing state with the read-only `doctor` command.

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

## CLI reference

| Command                | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `intentloom init`      | Initialize Intentloom metadata and adapter output for a project.      |
| `intentloom adopt`     | Inspect an existing project and apply only a safe adoption proposal.  |
| `intentloom plan`      | Produce a deterministic planned output view.                          |
| `intentloom diff`      | Show the current generated-file delta.                                |
| `intentloom sync`      | Apply a validated transactional synchronization.                      |
| `intentloom doctor`    | Report read-only validation, ownership, security, and drift findings. |
| `intentloom --help`    | Show the supported command surface.                                   |
| `intentloom --version` | Print the installed CLI version.                                      |

Common options include `--dry-run`, `--root PATH`, `--profile NAME`, and
`--adapters claude,codex,cursor,copilot` where supported. `sync --force` is
explicitly limited to synchronization. See the [full CLI reference](docs/reference/CLI.md).

## Architecture and safety

```text
Catalog + profiles → core resolver → adapter contracts → target files
                          ↓
                    validation + source map + manifest lock
```

The catalog is the vendor-neutral source of meaning. The core resolves it into
a normalized desired state; adapters render only their declared capabilities;
and validation checks configuration, paths, ownership, collisions, and drift
before any filesystem mutation.

Writes are transactional. Intentloom validates generated metadata and checksums
after finalization, rolls back recoverable failures, and reports incomplete
rollback explicitly. It rejects unsafe or escaping paths, detects normalized
collisions, and never treats a comment header alone as ownership proof.

Read the [architecture](docs/architecture/ARCHITECTURE.md),
[configuration reference](docs/reference/CONFIG.md), [portable path model](docs/reference/PATHS.md),
and [generated-files reference](docs/reference/GENERATED_FILES.md) for detail.

## Examples and documentation

- [Documentation index](docs/README.md)
- [Getting started](docs/guides/GETTING_STARTED.md)
- [New project guide](docs/guides/NEW_PROJECT.md)
- [Existing project adoption](docs/guides/EXISTING_PROJECT.md)
- [Tool adapters](docs/guides/TOOL_ADAPTERS.md)
- [Upgrading](docs/guides/UPGRADING.md)
- [Troubleshooting](docs/guides/TROUBLESHOOTING.md)
- [v0.1 specification](docs/specs/AIF_V0_1_SPEC.md)
- [Release process](docs/releases/RELEASE_PROCESS.md)

Public examples include [minimal](examples/minimal/README.md),
[TypeScript](examples/typescript/README.md), and
[Angular + Tauri](examples/angular-tauri/README.md) projects. The
[Applye adoption report](examples/applye-adoption-report/README.md) is a
sanitized migration/adoption example, not bundled Applye source.

## Development and testing

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
pnpm vitest run
```

The latest verified local result is **35 test files, 522 passed, 2 expected
skips, and 0 failures**. Package verification also checks byte-identical
archives and isolated npm and pnpm local-tarball installs.

Hosted PR CI: **NOT EXECUTED - BILLING BLOCKED**. It is not represented as a
passing CI badge.

## Roadmap

v0.1 focuses on a local canonical catalog, adapter contracts, validation,
non-destructive adoption, and deterministic synchronization. Later candidates
include more profiles and adapters, schema-evolution tooling, and compatibility
certification. See the [roadmap](ROADMAP.md) for the current scope and explicit
non-goals.

## Contributing

Contributions are welcome. Review the architecture and ADRs, keep provider
syntax in adapters rather than the canonical catalog, run the local checks, and
open a focused pull request. See [CONTRIBUTING.md](CONTRIBUTING.md).

For security-sensitive issues, follow [SECURITY.md](SECURITY.md) rather than
opening a public issue with sensitive details. Normal bugs and feature requests
can use [GitHub Issues](https://github.com/vitala89/Intentloom/issues).

## License

Intentloom is released under the [MIT License](LICENSE).
