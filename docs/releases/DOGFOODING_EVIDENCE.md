# Dogfooding evidence

Use one completed record for each required beta scenario: a minimal project, a
TypeScript project, and a sanitized existing-project example. This is evidence
for a compatibility decision, not telemetry; keep it project-local or redact it
before sharing.

## Record template

```md
# Intentloom dogfooding record: <scenario>

**Date:** YYYY-MM-DD
**Intentloom version:** <exact version or commit>
**Scenario:** minimal | typescript | existing-project
**Project:** <sanitized description; no secrets or private paths>
**Profile and adapters:** <profile>; <adapter list>
**Environment:** Node <version>, operating system <version>

## Commands and evidence

- `intentloom init|adopt ...`: <exit code and safe summary>
- `intentloom plan|diff ...`: <exit code and safe summary>
- `intentloom doctor ...`: <exit code and finding codes>
- `intentloom sync --dry-run ...`: <exit code and confirmation of no mutation>
- If a write was approved: <preview, conflict/confirmation outcome, and backup or rollback evidence>

## Compatibility observations

- Generated paths and provider-visible files: <safe list>
- Schema/config/lock compatibility: <observed result>
- Adapter-specific behavior or limitation: <observed result>
- Unexpected output, drift, or migration concern: <none or safe summary>

## Conclusion

Pass | Pass with follow-up | Blocked

<Why this result supports or blocks the beta compatibility decision.>
```

Do not include tokens, absolute local paths, private project content, generated
file bodies, or unredacted repository history. A passing fixture or CI run is
supporting evidence, but it does not replace this record from a real project.

## Recent Vii records

- [2026-08-17-vii-nx-existing-project.md](dogfooding/2026-08-17-vii-nx-existing-project.md)
- [2026-08-18-vii-first-development-cycle.md](dogfooding/2026-08-18-vii-first-development-cycle.md)
- [2026-08-19-vii-desktop-full-adoption.md](dogfooding/2026-08-19-vii-desktop-full-adoption.md)
  (daemon/protocol dogfood of the Desktop adoption chain; interim NOT COMPLETE
  at that date)
- [2026-08-21-vii-desktop-adoption-completion.md](dogfooding/2026-08-21-vii-desktop-adoption-completion.md)
  (final maintainer packaged/dev verification; **Desktop Existing-Project
  Adoption: COMPLETE**)
