<p align="center">
  <img src="https://raw.githubusercontent.com/vitala89/Intentloom/main/apps/desktop/src/design/assets/logo-mark.svg" alt="Intentloom" width="96" height="96">
</p>

# Intentloom

`intentloom` provides the `intentloom` command for local, vendor-neutral AI
engineering workflows. It requires Node.js 22 or newer and runs offline-first:
commands do not send telemetry or make hidden runtime network requests.

Read the [Intentloom documentation](https://vitala89.github.io/Intentloom/).

```sh
npm install --global intentloom
intentloom --help
```

The current stable release is `1.0.2`, served by the `latest` dist-tag. Pin it
with `npm install --global intentloom@1.0.2`. Compatibility
and deprecation guarantees are defined by the
[v1 support policy](https://vitala89.github.io/Intentloom/releases/SUPPORT_POLICY_V1);
the published-artifact status is recorded in the
[release state](https://vitala89.github.io/Intentloom/releases/RELEASE_STATE).

Start safely in a project:

```sh
intentloom init --dry-run
intentloom adopt --plan
intentloom inspect --json
intentloom harness inspect --file scorecard.json --json
intentloom harness replay --file scorecard.json --mode strict --json
intentloom doctor
intentloom sync --dry-run
```

Supported adapters are Claude Code, Codex, Cursor, and GitHub Copilot. Intentloom
preserves project-owned files and reports conflicts instead of overwriting them.
Writes are transactional and preceded by a reviewable plan.

`intentloom inspect` is a bounded read-only project summary. It reports detected
profile, instruction surfaces, and Intentloom metadata readiness without running
project scripts, invoking Git, installing dependencies, following symbolic links,
or contacting a network service.

The read-only harness commands accept one explicitly supplied JSON scorecard.
`harness inspect` returns the canonical summary view; `harness replay` returns a
deterministic event summary in `simulate` mode by default or `strict` mode when
requested. Both commands keep scorecard files within the selected `--root`, do
not expose raw event or artifact contents, and never repeat external effects.

Vendor names describe compatibility only. Intentloom is an independent project
and is not affiliated with or endorsed by OpenAI, Anthropic, GitHub, Cursor, or
other vendors.

See the [repository](https://github.com/vitala89/Intentloom),
[documentation](https://vitala89.github.io/Intentloom/),
[CLI reference](https://vitala89.github.io/Intentloom/reference/CLI),
[issue tracker](https://github.com/vitala89/Intentloom/issues), and
[MIT license](https://github.com/vitala89/Intentloom/blob/main/LICENSE).
