# Getting Started

Install the CLI with Node.js 22 or newer:

```sh
npm install --global intentloom
intentloom --help
```

The current stable release is `1.0.0`, served by both the `latest` and `next`
dist-tags. Pin it with `npm install --global intentloom@1.0.0` when
reproducibility is required. See the
[release state](../releases/RELEASE_STATE.md) for the exact npm/main boundary and
the [v1 support policy](../releases/SUPPORT_POLICY_V1.md) for compatibility
guarantees.

Use a preview before writing anything:

```sh
intentloom init --dry-run
intentloom adopt --plan
intentloom doctor
intentloom sync --dry-run
```

Intentloom supports Claude Code, Codex, Cursor, and GitHub Copilot. It runs
offline-first, sends no telemetry, and preserves project-owned files by
reporting conflicts instead of overwriting them.
