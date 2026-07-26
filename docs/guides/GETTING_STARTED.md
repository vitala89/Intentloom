# Getting Started

Install the beta CLI with Node.js 22 or newer:

```sh
npm install --global intentloom@next
intentloom --help
```

Prefer `@next` during the beta period because APIs and generated output may change.
To pin the current prerelease, use `npm install --global intentloom@0.4.0-beta.1`.
The default `latest` tag remains `0.1.0-alpha.3`; see the
[release state](../releases/RELEASE_STATE.md) for the exact npm/main boundary.

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
