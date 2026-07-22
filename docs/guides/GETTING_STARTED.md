# Getting Started

Install the beta CLI with Node.js 22 or newer:

```sh
npm install --global intentloom@next
intentloom --help
```

Prefer `@next` during the beta period because APIs and generated output may change.
To pin this release, use `npm install --global intentloom@0.1.0-beta.1`. An
unqualified install may resolve to the first prerelease, but it is not the
supported installation form.

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
