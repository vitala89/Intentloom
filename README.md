# Intentloom

Define engineering intent once. Use it consistently across AI coding tools.

Intentloom is a vendor-neutral framework for defining, validating, and synchronizing engineering intent across AI coding tools. It supplies a canonical catalog of policies, workflows, templates, schemas, and Agent Skills, then generates deterministic adapters for Claude Code, OpenAI Codex, Cursor, and GitHub Copilot.

It is not an LLM, API proxy, autonomous runtime, MCP server, or replacement for coding agents.

## Status

`intentloom` is alpha software. It provides the `intentloom` CLI for Node.js 22 or
newer, with hosted Linux, macOS, and Windows verification on Node 22 and 24.
Commands are offline-first and do not send telemetry.

```sh
npm install --global intentloom@next
intentloom --help
intentloom init --dry-run
intentloom adopt --dry-run
intentloom doctor
intentloom sync --dry-run
```

Prefer the `@next` channel during the alpha period; APIs and generated output may
change. To pin this release, use `npm install --global intentloom@0.1.0-alpha.2`.
Because this is the first published version, an unqualified install currently resolves
to the alpha too, but it is not the supported installation form.

Supported adapters are Claude Code, Codex, Cursor, and GitHub Copilot. Intentloom
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

Read the [documentation index](docs/README.md), [v0.1 specification](docs/specs/AIF_V0_1_SPEC.md), [architecture](docs/architecture/ARCHITECTURE.md), and [compatibility matrix](docs/compatibility/COMPATIBILITY_MATRIX.md). See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute, [SECURITY.md](SECURITY.md) for private vulnerability reporting guidance, and [LICENSE](LICENSE) for terms. The repository is named `Intentloom`; `.aif` and `urn:aif:*` are retained compatibility identifiers.
