# Intentloom

> Alpha software: review generated changes before applying them in a project.

`intentloom` provides the `intentloom` command for local, vendor-neutral AI engineering
workflows. It requires Node.js 22 or newer and runs offline-first: commands do
not send telemetry or make hidden runtime network requests.

```sh
npm install --global intentloom
intentloom --help
```

Start safely in a project:

```sh
intentloom init --dry-run
intentloom adopt --dry-run
intentloom doctor
intentloom sync --dry-run
```

Supported adapters are Claude Code, Codex, Cursor, and GitHub Copilot. Intentloom
preserves project-owned files and reports conflicts instead of overwriting them.

See the [repository](https://github.com/vitala89/aif-core),
[issue tracker](https://github.com/vitala89/aif-core/issues), and
[MIT license](https://github.com/vitala89/aif-core/blob/main/LICENSE).
