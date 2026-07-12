# AIF repository guidance

This repository is in documentation-and-architecture phase. Keep changes vendor-neutral in the canonical core and avoid implementation, dependency installation, MCP configuration, external-agent configuration, or tool-specific behavior in canonical documents.

- Start from the specification and relevant ADRs before changing architecture.
- Keep instruction files concise; place reusable procedures in future catalog skills/workflows, not here.
- Treat generated adapters as derivatives of `catalog/`; do not hand-edit generated output once it exists.
- Preserve non-destructive adoption: preview, diff, conflict detection, and backup or confirmation are mandatory for future writes.
- Do not introduce telemetry, hidden network calls, automatic hooks, or automatic dependency installation.
- For documentation edits, run Markdown formatting checks when configured and always run `git diff --check`.

The source of product scope is `docs/specs/AIF_V0_1_SPEC.md`; architecture decisions live in `docs/decisions/`.
