# AIF — Agentic Engineering Framework

AIF is a vendor-neutral, open-source framework for consistent AI-assisted software engineering. It supplies a canonical catalog of policies, workflows, templates, schemas, and Agent Skills, then generates tool-specific adapters for Claude Code, OpenAI Codex, Cursor, and GitHub Copilot.

It is not an LLM, API proxy, autonomous runtime, MCP server, or replacement for coding agents.

## Status

`aif-core` is alpha software. It provides the `aif` CLI for Node.js 22 or
newer, with hosted Linux, macOS, and Windows verification on Node 22 and 24.
Commands are offline-first and do not send telemetry.

```sh
npm install --global aif-core
aif --help
aif init --dry-run
aif adopt --dry-run
aif doctor
aif sync --dry-run
```

Supported adapters are Claude Code, Codex, Cursor, and GitHub Copilot. AIF
preserves project-owned files and reports conflicts rather than overwriting.

## Principles

- Minimal sufficient context and specification before implementation.
- Short, atomic, human-verifiable iterations.
- One vendor-neutral canonical source; generated adapters are disposable derivatives.
- Non-destructive adoption: preview, detect conflicts, and never silently overwrite.
- Explicit technical debt and scope changes.
- No hidden network calls, telemetry, MCP dependency, automatic dependency installation, or automatic hook installation.

## Intended layout

```text
catalog/          Canonical policies, workflows, templates, schemas, skills
adapters/         Tool-specific generated adapter definitions
packages/         Future core, adapters, validator, and CLI packages
profiles/         Composable adoption profiles
examples/         Dogfooding and usage examples
tests/            Fixtures and conformance tests
```

Read the [v0.1 specification](docs/specs/AIF_V0_1_SPEC.md), [architecture](docs/architecture/ARCHITECTURE.md), and [compatibility matrix](docs/compatibility/COMPATIBILITY_MATRIX.md). See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute, [issues](https://github.com/vitala89/aif-core/issues) for support, and [LICENSE](LICENSE) for terms.
