# Getting Started

Install the alpha CLI with Node.js 22 or newer:

```sh
npm install --global aif-core
aif --help
```

Use a preview before writing anything:

```sh
aif init --dry-run
aif adopt --dry-run
aif doctor
aif sync --dry-run
```

AIF supports Claude Code, Codex, Cursor, and GitHub Copilot. It runs
offline-first, sends no telemetry, and preserves project-owned files by
reporting conflicts instead of overwriting them.
