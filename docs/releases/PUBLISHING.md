# Publishing AIF

The planned alpha package is `aif-core`; the command is `aif`. The package is
unscoped and public. The fallback package name is `aif-framework`. Do not
publish, tag, or change a version as part of package-readiness work.

For the future `0.1.0-alpha.1` release, an authorized maintainer must confirm
ownership of the chosen npm name, use the `next` dist-tag, and enable npm
provenance only in the approved release workflow. Run `pnpm build`, `npm pack
--dry-run --json`, and `npm publish --dry-run --tag next --access public` from
`packages/cli` first. A real publish requires explicit approval and npm
permissions; it must not run from ordinary pushes or pull requests.

If publication fails after a successful publish, do not unpublish by default.
Investigate the immutable package/version, communicate the issue, and publish a
corrected later prerelease under `next` when authorized.
