# Intentloom

> Alpha software: review generated changes before applying them in a project.

`intentloom` provides the `intentloom` command for local, vendor-neutral AI engineering
workflows. It requires Node.js 22 or newer and runs offline-first: commands do
not send telemetry or make hidden runtime network requests.

```sh
npm install --global intentloom@next
intentloom --help
```

Prefer `@next` while Intentloom is alpha; APIs and generated output may change. To
pin this release, use `npm install --global intentloom@0.1.0-alpha.2`. An unqualified
install currently resolves to this alpha because it is the first published version,
but it is not the supported alpha installation form.

Start safely in a project:

```sh
intentloom init --dry-run
intentloom adopt --dry-run
intentloom doctor
intentloom sync --dry-run
```

Supported adapters are Claude Code, Codex, Cursor, and GitHub Copilot. Intentloom
preserves project-owned files and reports conflicts instead of overwriting them.

See the [repository](https://github.com/vitala89/Intentloom),
[issue tracker](https://github.com/vitala89/Intentloom/issues), and
[MIT license](https://github.com/vitala89/Intentloom/blob/main/LICENSE).
