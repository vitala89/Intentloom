# Getting Started

Install the alpha CLI with Node.js 22 or newer:

```sh
npm install --global intentloom
intentloom --help
```

Use a preview before writing anything:

```sh
intentloom init --dry-run
intentloom adopt --dry-run
intentloom doctor
intentloom sync --dry-run
```

Intentloom supports Claude Code, Codex, Cursor, and GitHub Copilot. It runs
offline-first, sends no telemetry, and preserves project-owned files by
reporting conflicts instead of overwriting them.
