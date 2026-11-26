# Release Checklist

Use the statuses in `docs/governance/ENGINEERING_LIFECYCLE.md`: PASS, FAIL,
PENDING, BLOCKED, or NOT APPLICABLE. Record the release-candidate commit, the
environment, the evidence, and the observed result. A check that did not run is
not PASS. A mandatory check that is FAIL, BLOCKED, or PENDING blocks release
readiness for the functionality it covers.

Verify the release candidate, not an unmerged development branch. Publishing
still requires `PUBLISH_AUTHORIZATION_CHECKLIST.md` and an explicit owner
decision.

## This repository

- [ ] No readiness blockers remain for the candidate.
- [ ] Production build of the candidate passed.
- [ ] Clean install and packaged CLI smoke passed.
- [ ] Format, lint, typecheck, tests, build, and security/path tests passed.
- [ ] Critical user journeys and regression checks that the candidate can affect
      still pass.
- [ ] Four adapter fixtures and second-run zero diff passed.
- [ ] Desktop, Tauri, CLI, TUI, and daemon surfaces that ship in this candidate
      were exercised, or NOT APPLICABLE with a reason.
- [ ] Supported-platform installers or packages were run where this candidate
      publishes them. A build log is not a substitute for an installer that
      users will run.
- [ ] Installation, startup, and upgrade from the supported previous version
      were checked where this candidate changes them.
- [ ] Database migrations and data integrity were checked, or NOT APPLICABLE
      because this candidate does not migrate stored data.
- [ ] Accessibility evidence for changed user-facing behavior is recorded
      (`docs/governance/ACCESSIBILITY.md`), or NOT APPLICABLE with a reason.
- [ ] Security and dependency review evidence for the candidate is recorded.
- [ ] Authentication, billing, and entitlements were checked, or NOT APPLICABLE
      because this candidate does not include them.
- [ ] Rollback and recovery for the candidate are described and, where practical,
      tried.
- [ ] Version metadata is synchronized. The npm authorization and naming gates
      in `PUBLISH_AUTHORIZATION_CHECKLIST.md` are complete before publication.
- [ ] Changelog and migration guidance match the candidate.

## After publication

- [ ] Smoke checks against the published artifact, not only the git tree.
- [ ] Critical journeys, install/update, migration and data integrity, error
      behavior, and recovery were re-checked where the release can affect them.
- [ ] No new telemetry or user-data collection was introduced without explicit
      authorization.

## Later web or backend deployments

When a deployed service exists, repeat the applicable rows against that
deployment. This checklist does not invent that environment.
