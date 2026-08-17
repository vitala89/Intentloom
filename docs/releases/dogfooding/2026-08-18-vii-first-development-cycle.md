# Intentloom dogfooding record: Vii first post-adoption development cycle

**Date:** 2026-08-18
**Scenario:** existing-project development cycle after adoption
**Consumer repository:** [kas-labs/vii](https://github.com/kas-labs/vii)
**Consumer pull request:** [kas-labs/vii#76](https://github.com/kas-labs/vii/pull/76)
**Consumer merge:** `0f5713ac30d66772991562f22c104ad8178faf0a` on 2026-08-17
**Vii baseline before merge:** `5614f6cf04fde716b6ed75823bfeb161b7e6b101`
**Intentloom recording tree:** `origin/main` at `779a9e2` (this evidence commit's parent)
**Published npm artifact:** still `1.0.2` `latest`; this cycle used a post-`1.0.2` source tree
**Consumer lock `frameworkVersion`:** `1.0.2` in `.aif/manifest.lock.json`
**Profile and adapters:** `typescript`; Codex (`codex` in `.aif/config.yaml`)
**Workspace topology:** Nx (Intentloom inspect/adopt profile remains `typescript`)
**Environment:** not re-executed in this Intentloom checkout; evidence is from Vii PR #76 and maintainer-reported post-merge CLI output

This record is documentation only. It does not change Intentloom runtime or CLI
behavior, does not modify Vii, and does not authorize a release.

Related earlier record:
[2026-08-17-vii-nx-existing-project.md](2026-08-17-vii-nx-existing-project.md)
covers the pre-adoption inspect/adopt defects. This record covers the first
successful real development loop after adoption completed.

## Claim boundary

This is observational evidence of one real consumer cycle. It is not:

- a v1.0 or later release gate;
- proof that skill routing is automated or high-quality across task types;
- a W9–W12 Engineering Workspace Desktop/CLI retrofit walkthrough;
- authorization to implement Desktop existing-project adoption.

## Adoption state

Adoption was already complete before this development cycle. At Vii merge
`0f5713a`, the consumer contained:

- `.aif/config.yaml` with `profile: typescript`, adapter `codex`, and a
  project-owned `AGENTS.md` self-mapping;
- `.aif/manifest.lock.json` and `.aif/source-map.json`;
- generated Codex skills under `.agents/skills/`.

Intentloom was not applied to Vii from this Intentloom pull request.

## Selected real task

Fix the packed Core reference consumer so its Computed value is owned by the
checkout Scope and evaluated before Scope disposal.

Vii described the change as example-only: Core public API, package contents,
and release state were unchanged.

## Lifecycle

```text
Intentloom adoption already completed
-> doctor
-> diff
-> agent reads AGENTS.md / .aif / generated skills
-> agent analyzes Vii
-> selects a small real task
-> planning
-> implementation
-> tests
-> docs sync
-> code review
-> verification gate
-> Intentloom doctor
-> Intentloom diff
-> commit
-> PR
-> CI
-> merge
-> post-merge doctor
-> post-merge diff
```

Vii PR #76 commits:

1. `e6b77b7` `fix(core-reference): scope computed lifecycle`
2. `976383a` `fix(governance): allow validated dogfood branches`
3. `8f79d8f` `docs(governance): record delivery policy verification`

## Responsibility split

### 1. What Intentloom directly enforced or verified

Observed on the consumer after adoption, as reported for the cycle and
post-merge verification:

- `intentloom doctor`: installation healthy.
- Known non-blocking Codex capability information diagnostics.
- Known `instruction-files-conflicting` warning (not an error; not fixed).
- `intentloom diff` after merge:

```json
{
  "changes": [],
  "diagnostics": []
}
```

Intentloom also supplied the generated Codex skill files the agent later read.
Doctor and diff do not implement, review, or merge Vii code.

### 2. What the AI agent did using generated Intentloom skills

Vii PR #76 states that the cycle exercised task routing, planning review,
testing strategy, bounded implementation, docs sync, code review, verification
gate, and branch finishing.

Those names match generated first-party skills present in the consumer
(`.agents/skills/aif-task-router`, `aif-planning-review`,
`aif-testing-strategy`, `aif-feature-builder`, `aif-docs-sync`,
`aif-code-review`, `aif-verification-gate`, `aif-branch-finisher`).

This is observational: the agent read project instructions and generated
skills, then performed the work. This single cycle does not prove automated
skill routing quality across multiple task types.

### 3. What Vii repository governance enforced

- Conventional commits and dedicated-branch naming.
- `pnpm validate` / packed-consumer checks for the Core reference change.
- GitHub checks on PR #76, all success:
  - Dependency Review
  - Governance (`delivery-policy`)
  - CodeQL (JavaScript/TypeScript and Actions)
  - Validate
- After the first Governance failure, Vii added `dogfood` as an explicit
  validated branch type (`dogfood/intentloom-first-development-loop`).

That branch-type rule is Vii policy, not an Intentloom Core defect.

### 4. What required human or maintainer decisions

- Choosing a small real task instead of a fixture-only change.
- Approving commit, push, pull request, and merge.
- Deciding that `dogfood/*` is an allowed Vii delivery branch type.
- Earlier adoption mappings, including keeping `AGENTS.md` project-owned.

### 5. What remains observational rather than proven automation

- Skill selection and sequencing were not shown to be machine-enforced.
- Desktop, TUI, daemon, and MCP were not used for this cycle.
- Exact local `intentloom` git SHA invoked on the Vii machine is not recorded
  in the consumer PR; only lock `frameworkVersion` `1.0.2` and the Intentloom
  main fixes that unblocked adoption are repository-checkable.
- Codex capability information diagnostics were reported as present and
  non-blocking; this record does not re-list their exact codes.

## Validation evidence

From [kas-labs/vii#76](https://github.com/kas-labs/vii/pull/76) and Vii
`DUTY_WATCH.md` at merge `0f5713a`:

| Check                                       | Result                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Core reference test/build                   | passed                                                                               |
| `pnpm pack:check`                           | passed                                                                               |
| `pnpm validate`                             | passed                                                                               |
| `git diff --check`                          | passed                                                                               |
| Intentloom verification gate (Vii-reported) | ready                                                                                |
| Intentloom doctor (cycle and post-merge)    | installation healthy; Codex capability info; `instruction-files-conflicting` warning |
| Intentloom diff (cycle and post-merge)      | no unmanaged drift; post-merge `{"changes":[],"diagnostics":[]}`                     |
| PR CI                                       | Dependency Review, Governance, CodeQL, Validate: success                             |

## Campaign problems and ownership

These issues appeared during the broader Vii adoption campaign. They are not
all defects of this development PR.

| Observation                               | Owner                        | Disposition                                                                                                                                                       |
| ----------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inspect selected unsupported `nx`         | Intentloom Core              | Fixed in PR #320 (`a732af9`)                                                                                                                                      |
| `.nx/cache` scan noise                    | Intentloom Core              | Fixed in PR #320                                                                                                                                                  |
| Nested README / docs false ambiguity      | Intentloom Core              | Fixed in PR #320                                                                                                                                                  |
| Specialized architecture-doc ambiguity    | Intentloom Core              | Fixed in PR #321 (`02695a5`)                                                                                                                                      |
| Formatter-only generated JSON false drift | Intentloom Core              | Fixed in PR #322 (`7040924`)                                                                                                                                      |
| `dogfood/*` rejected by delivery policy   | Vii consumer policy          | Fixed in Vii PR #76 by adding `dogfood` as a validated branch type                                                                                                |
| `instruction-files-conflicting`           | Intentloom diagnostic (open) | Still present; non-blocking because installation is healthy and diff is clean. Candidate for a separate taxonomy/scanner investigation. Do not claim it is fixed. |

Desktop existing-project adoption remains a proposed follow-up
([DESKTOP_EXISTING_PROJECT_ADOPTION_PLAN.md](../../roadmap/DESKTOP_EXISTING_PROJECT_ADOPTION_PLAN.md),
Intentloom PR #332). Core adoption defects from this campaign are closed; the
Desktop mutation path is not implemented.

## Lessons learned

- Real Nx/TypeScript adoption needs topology and engineering profile to stay
  separate, and generated cache directories must stay out of scan proposals.
- Documentation classification must stay narrow; specialized architecture
  files are not generic architecture mappings.
- Generated metadata JSON should be compared semantically, or formatters
  create false drift.
- Consumer branch governance can block a valid dogfood cycle even when
  Intentloom itself is healthy.
- Generated skills can be used successfully by an agent on a small real task
  without proving routing quality in general.
- A healthy doctor plus empty diff is enough to continue work while a known
  instruction-file warning remains.

## Remaining gaps

- `instruction-files-conflicting` is still reported and still not fixed.
- One development cycle does not prove automated skill routing across task
  types.
- Exact invoked Intentloom CLI commit is not pinned in the consumer evidence.
- W9–W12 real-root workspace retrofit dogfood remains deferred
  ([2026-08-16-workspace-public-gate.md](2026-08-16-workspace-public-gate.md)).
- Desktop existing-project adoption is planned, not implemented.
- This record does not close a published-release gate.

## Next recommendation

Not authorized by this record. Suggested order from this evidence only:

1. A second real Vii task of a different type, to test whether generated
   skill routing still holds outside a small Core-example fix.
2. A bounded Intentloom investigation of `instruction-files-conflicting`
   taxonomy/scanner behavior, without treating the warning as a release
   blocker for Vii.
3. Use this record plus the earlier Nx adoption record to inform Desktop
   existing-project adoption implementation when that increment is
   separately approved.

## Conclusion

Pass with follow-up

Vii completed one real post-adoption development cycle: a scoped Core
reference fix, consumer validation, green PR CI, merge, healthy doctor, and
empty diff. Intentloom verified installation and drift; the agent used
generated skills; Vii governance enforced delivery and CI; humans chose the
task and merged. The remaining instruction-file warning and unproven
cross-task skill routing are follow-ups, not claims of completion.
