# AIF — Agentic Engineering Framework

AIF is a vendor-neutral, open-source framework for consistent AI-assisted software engineering. It supplies a canonical catalog of policies, workflows, templates, schemas, and Agent Skills, then generates tool-specific adapters for Claude Code, OpenAI Codex, Cursor, and GitHub Copilot.

It is not an LLM, API proxy, autonomous runtime, MCP server, or replacement for coding agents.

## Status

v0.1 is in architecture and documentation design. This repository deliberately contains no CLI or production implementation yet.

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

Read the [v0.1 specification](docs/specs/AIF_V0_1_SPEC.md), [architecture](docs/architecture/ARCHITECTURE.md), and [compatibility matrix](docs/compatibility/COMPATIBILITY_MATRIX.md). See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute.
