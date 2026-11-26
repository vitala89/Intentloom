# Engineering lifecycle

This is the canonical lifecycle for **developing the Intentloom repository**.
It ties together product discovery, planning, design, implementation, review,
and release quality. It does not add product features, runtime behavior, or a
second copy of an existing policy.

Use it for work on this repository. Do not use it as a specification of
Intentloom’s product-facing governance. Those concerns stay in their own
documents, including Feature Intent in the application package, the Foundation
Workshop documents, the Desktop design system, and the provider-neutral
architecture in `docs/architecture/ARCHITECTURE.md`. Generated skills and
catalog procedures are not rewritten here.

Task triage, skill routing, grilling, Design First, code quality, accessibility,
and release authorization keep the owners named below. This file states the
order and the planning rules that had no owner. Instruction files point here.
They do not restate the rules.

## Lifecycle

Release stages apply when preparing or publishing a release. They do not run
after every pull request.

```text
Task Triage
    ↓
Product Discovery
    ↓
SWOT and risk analysis
    ↓
Project planning and RACI
    ↓
System Design
    ↓
Accessibility planning
    ↓
Test planning
    ↓
Independent design review
    ↓
Owner approval
    ↓
Test-first development
    ↓
Implementation
    ↓
Quality validation
    ↓
Independent pull-request review
    ↓
Owner merge
    ↓
Main-branch verification
    ↓
Release quality gate
    ↓
Owner-authorized production release
    ↓
Post-release verification
```

A small change uses the short route: task triage, a brief risk and trade-off
note, an implementer and an independent reviewer, the tests the risk requires,
and owner merge. Security, accessibility, owner approval, and data-integrity
requirements stay in force when the change touches them. State why a skipped
stage does not apply.

The coding agent may be responsible for preparing a change. The agent cannot
approve its own design, merge, publish, or release. The Project Owner retains
final authority over product decisions, design approval, merge, publishing, and
releases.

## Verification statuses

Quality records use these statuses only:

| Status         | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| PASS           | The check ran against the named commit and the observed result matched |
| FAIL           | The check ran and the observed result did not match                    |
| PENDING        | The check is required and has not finished                             |
| BLOCKED        | The check cannot run until a named obstacle is removed                 |
| NOT APPLICABLE | The check does not apply, with a reason                                |

A check that did not run is not PASS. For a material check, NOT APPLICABLE
needs a reason. Record the commit SHA (Secure Hash Algorithm), the
environment, the evidence, and the observed result.

## Product discovery

Substantial features and product directions need a proportional discovery
record before design approval. Cover the user problem, target audience, user
value, business value, product goals, scope, non-goals, acceptance criteria,
dependencies, success metrics, and alternative solutions. Separate verified
evidence from assumptions and from hypotheses. A feature that can be built is
not, by that fact, a justified investment.

Reuse `catalog/skills/aif-feature-discovery` when the behavior is still
unsettled, and grilling (`.agents/skills/grilling/SKILL.md`) when
`docs/governance/MATT_POCOCK_SKILLS_ADOPTION.md` requires it. Do not run a
second interview in the same session. A trivial technical correction does not
need this discovery record. Say why it is trivial.

Feature Intent modules, Foundation Workshop plans, and design-system documents
remain the product records they already are. This section does not create a
parallel product-discovery system.

## SWOT

Use a Strengths, Weaknesses, Opportunities, and Threats (SWOT) analysis for a
substantial product direction, architectural choice, integration, or commercial
decision. Strengths and weaknesses are internal. Opportunities and threats are
external. Compare real alternatives, including deferring or rejecting the
proposal when that is a serious option.

For a material finding, record evidence, assumptions, business impact,
technical impact, mitigation, and the recommended decision. Do not write a
generic SWOT with no consequence. A small change uses a short risk and
trade-off note instead.

Put the analysis in the existing plan or System Design. Do not add a SWOT file
per task.

## Project planning

Extend the current roadmap, milestone slices, and T-shirt sizing. Do not add a
new management method. Where they apply, record priority, business impact,
user impact, technical risk, effort, dependencies, deliverables, milestones,
acceptance criteria, definition of done, and responsible roles.

Keep these separate:

- business priority and roadmap order;
- estimated effort, including T-shirt size when that is the existing scale;
- technical risk;
- the Task Triage Score in `AGENT_TASK_TRIAGE_POLICY.md`.

Prefer independently reviewable slices, as the package-stabilization work
already does. Do not add Scrum ceremonies, mandatory meetings, or standing
status reports without a demonstrated need.

## RACI

For a substantial or multi-stage task, name at least one Responsible role and
exactly one Accountable role for each deliverable. Responsible, Accountable,
Consulted, and Informed (RACI) roles may include Project Owner, Product Owner,
Project Manager, Software Architect, Frontend Engineer, Backend Engineer, AI
Engineer, User Interface / User Experience Designer, Quality Assurance
Engineer, Accessibility Specialist, Security Specialist, DevOps Engineer,
Release Manager, AI Coding Agent, and Independent Reviewer.

Do not invent people, capacity, qualifications, or availability. In a small
project one person may hold several roles. A small task needs only a named
implementer and an independent reviewer.

The Independent Reviewer inspects production code and tests. The Project Owner
merges.

## Time and resource planning

For a substantial task, estimate the applicable work: discovery and analysis,
architecture design, accessibility planning, test planning, owner approval,
implementation, automated and manual testing, security review, independent
review, corrections and regression testing, release validation, dependencies
and waiting, and contingency.

Keep three numbers separate:

1. Human active effort.
2. AI agent execution effort.
3. Calendar duration.

Use ranges, state assumptions, and state confidence. Unsupported precise
deadlines are not estimates. Reassess after discovery, a scope change, or a
material blocker. Do not drop a mandatory verification to meet an estimate.

Use a fitting method and skip the others: T-shirt sizing, a Work Breakdown
Structure (WBS), a Gantt chart, the Critical Path Method (CPM), the Program
Evaluation and Review Technique (PERT), or timeboxing.

## RAID

Track material Risks, Assumptions, Issues, and Dependencies (RAID) in the
existing plan or System Design. Do not open a second risk register.

For a material risk record:

```text
Risk:
Cause:
Potential impact:
Likelihood:
Severity:
Mitigation:
Contingency:
Responsible:
Trigger:
Status:
```

Cover the security, privacy, accessibility, data-loss, compatibility, cost,
release, and vendor-dependency risks that apply. An open risk is not the same
thing as an existing issue or an unverified assumption. Label each one.

## Design, accessibility, and tests

System Design and the design-before-implementation gate live in
`DESIGN_FIRST_POLICY.md`. Accessibility impact assessment lives in
`ACCESSIBILITY.md`. Test planning, test-first development, and risk-based test
selection live in `CODE_QUALITY_STANDARDS.md` section 5. Follow those documents
rather than copying them.

Before design approval, repository investigation, existing test runs, baseline
characterization planning, and test-design documentation are allowed. New
feature implementation, migrations, and new feature tests wait for that
approval. `DESIGN_FIRST_POLICY.md` states the exceptions for trivial changes.

## AI engineering quality

When a change affects model output, prompts, tools, or agent workflow, the
design or pull request covers the applicable items below. These are quality
requirements for repository work. Listing them does not mean the product
implements or automates them.

- Output correctness, hallucinations, and grounding in supplied evidence.
- Prompt regression and structured-output validation.
- Tool calling, agent permissions, and context isolation.
- Prompt injection, human approval, and prevention of unauthorized actions.
- Timeouts, cancellation, retry, recovery, and provider failure.
- Token and cost limits, and model compatibility.
- Agent workflow reliability, memory consistency, and evaluation datasets.

Prefer deterministic fixtures, mocked providers, and versioned evaluation
datasets. A live model run needs owner authorization, a cost bound, and data
protection consistent with the local-first and privacy commitments. One
successful response is not sufficient evidence. AI-generated code meets the
same quality bar as human-written code.

## Pull request, main, and release

The pull request template is `.github/PULL_REQUEST_TEMPLATE.md`. Link the plan,
design, and risk record. Do not paste them again. The owner merges. Merge is
not release readiness.

After merge, verify the resulting `main` commit, confirm the expected change is
present, inspect Continuous Integration (CI) for that commit, and run the
regression checks that apply. Reconcile `PROJECT_STATE.md` when durable state
changed. Update `DUTY_WATCH.md`. Update `CHANGELOG.md` when the repository’s
changelog convention makes the change user-visible. Record remaining
limitations and the next approved roadmap step. Do not open a documentation
pull request whose only purpose is to restate a green merge.

Release readiness, publication, and post-release checks live in
`docs/releases/RELEASE_PROCESS.md`, `docs/releases/RELEASE_CHECKLIST.md`, and
`docs/releases/PUBLISH_AUTHORIZATION_CHECKLIST.md`. Publishing stays a separate
owner decision. Do not add telemetry or collect user data without explicit
authorization.

## Authorship transition

The Project Owner decided not to conceal genuine AI-assisted contributions.

Intended policy:

- Accurate existing co-authorship metadata may stay.
- Do not require removal of a legitimate `Co-authored-by` trailer.
- Do not fabricate an author, an identity, or a contribution.
- Do not impersonate a contributor.
- Do not add promotional footers such as `Generated with`, `Made with`, or
  `Generated by`.
- Do not rewrite published Git history only to change attribution.
- Attribution does not give an AI agent accountability, approval authority, or
  ownership.

**Pending enforcement reconciliation.** This intended policy is not fully
active. `scripts/commit-policy.mjs` still rejects any `Co-authored-by` trailer
and any generated-with or made-with line. `.githooks/commit-msg` and the
Governance workflow both call that script (`scripts/validate-commit-message.mjs`
and `scripts/validate-commit-range.mjs`). There is no separate unit test for
the script today.

Until the owner authorizes the enforcement change:

- Do not present the intended policy as what CI enforces.
- Do not bypass hooks, disable governance validation, or hide attribution to
  obtain a passing result.
- Do not rewrite published history to strip or insert trailers.
- A new commit that includes a trailer will fail the current check. Report
  that failure. Do not treat a forced deletion of a legitimate trailer as
  policy compliance.
- Conventional Commit subjects and the other safeguards in the script stay.

Smallest proposed enforcement change, not applied in the governance update:

- In `validateCommitMessage`, remove only the `co-authored-by` rejection.
- Keep the Conventional Commit subject rules, the empty-subject rule, the
  120-character subject limit, and the rejection of `Generated with`,
  `Generated by`, and `Made with` lines.
- No workflow edit is required. Governance CI already calls the same function.

Regression tests to add with that change, in a Vitest file that imports
`validateCommitMessage`:

- A valid Conventional Commit subject passes.
- The same message plus a real `Co-authored-by: Name <email@example.com>`
  trailer passes, including a different trailer capitalisation.
- `Generated with`, `Generated by`, and `Made with` still fail.
- An empty subject, an over-long subject, and an unsupported type still fail.
- The script does not try to judge whether a named person is real. Fabrication
  and impersonation remain review rules, not regular expressions.

## What verification runs where

These checks stay separate. The Governance workflow is the commit and diff
policy. It is not the local pre-push command.

- Local pre-push. `.githooks/pre-push` runs `pnpm verify`. `package.json`
  defines that as typecheck, lint, format check, test, build, and
  `git diff --check`.
- Automated commit and diff policy. `.github/workflows/governance.yml` runs on
  pull requests. It validates the commit range and the diff (whitespace and
  production-file budgets). It does not run the test suite or the build.
- Compatibility matrix. `.github/workflows/compatibility.yml` runs on pull
  requests and on pushes. Each job runs typecheck, lint, format check, build,
  and test. It does not run `git diff --check`.
- Manual quality checks. Accessibility evidence, assistive-technology passes,
  and other checks that have no workflow remain manual.
- Release validation. The release checklist and the manual `release.yml`
  dispatch apply when preparing a release. They are not the pull-request
  gates above.

## CI observations

These observations are recommendations. Workflow files, branch protection, and
billing are unchanged until the owner approves a separate change. Do not weaken
a mandatory check to save work. Duplicated jobs are duplicated compute. This
repository does not contain account invoices, so no billable charge is stated.

| Workflow                      | When it runs                                                                 | Role today                                       | Compute note                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `governance.yml`              | Every pull request                                                           | Commit text and production-file budgets          | One Ubuntu job. It does not run `pnpm verify`.                                                       |
| `compatibility.yml`           | Every pull request and every push                                            | Typecheck, lint, format, build, and test         | Three operating systems and two Node versions (six jobs). Both events can run the same commit twice. |
| `codeql.yml`                  | Pull requests to `main`, pushes to `main`, Mondays 02:30 UTC, manual         | JavaScript/TypeScript and Actions analysis       | Two language jobs. The schedule runs even when nothing changed. It stays; it is the security scan.   |
| `dependency-review.yml`       | Pull requests that touch dependency manifests                                | Dependency review                                | Path-filtered. Automated.                                                                            |
| `desktop-sea-feasibility.yml` | Manual, and pull requests touching Desktop, daemon, protocol, or application | Ubuntu, macOS, and Windows packaging feasibility | Path filter is broad. Three hosted runners.                                                          |
| `docs.yml`                    | Pushes to `main` that touch docs, plus manual                                | GitHub Pages                                     | Not a pull-request gate.                                                                             |
| `harness-benchmark.yml`       | Manual, and pull requests touching harness paths                             | Benchmark matrix, `continue-on-error: true`      | Six jobs that do not fail the pull request. Reporting only.                                          |
| `release.yml`                 | Manual dispatch only                                                         | npm publish via trusted publishing               | Dry run defaults to true. Protected `npm-publish` environment.                                       |

`compatibility.yml` uses `actions/setup-node` with `cache: pnpm`. The suite is
not limited to affected projects. A future owner-approved saving is to avoid
running the full matrix on both `push` and `pull_request` for the same commit,
without dropping an operating system or Node version from the required matrix.
That would remove a repeated run. It would not, by itself, document a sum of
money.

Not automated, and not made automated here: accessibility tooling (`axe-core`
is not installed), manual assistive-technology checks, live model evaluation,
release-candidate installer checks, and post-release smoke tests. Docs-site
link checking is not a separate command; VitePress is configured with
`ignoreDeadLinks: true` in `docs/.vitepress/config.mts`.

## Canonical ownership

| Concern                                        | Canonical source                                       | Class in this update                                         |
| ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ |
| Task triage and model role                     | `AGENT_TASK_TRIAGE_POLICY.md`                          | EXTENDED                                                     |
| Skill route                                    | `catalog/skills/aif-task-router`                       | EXISTING                                                     |
| Grilling and specialist review                 | `MATT_POCOCK_SKILLS_ADOPTION.md`, `AGENTS.md`          | EXISTING                                                     |
| Product discovery for repository work          | This file, plus `aif-feature-discovery` when unsettled | EXTENDED; interview skill EXISTING                           |
| SWOT, RACI, time planning, RAID                | This file; written into the plan or System Design      | NEW; NOT AUTOMATED                                           |
| Project priority and slices                    | `ROADMAP.md` and the active plan                       | EXISTING; planning fields EXTENDED here                      |
| System Design                                  | `DESIGN_FIRST_POLICY.md`                               | EXTENDED                                                     |
| Accessibility                                  | `ACCESSIBILITY.md`                                     | NEW; axe-core NOT AUTOMATED                                  |
| Tests                                          | `CODE_QUALITY_STANDARDS.md` section 5                  | EXTENDED                                                     |
| Architecture and domain language               | Engineering principles, domain modeling, architecture  | EXISTING                                                     |
| AI quality requirements                        | This file                                              | NEW; NOT AUTOMATED                                           |
| Pull request evidence                          | `.github/PULL_REQUEST_TEMPLATE.md`                     | EXTENDED; review remains manual                              |
| Main-branch verification                       | This file and `CONTRIBUTING.md`                        | EXTENDED                                                     |
| Release and post-release                       | `docs/releases/`                                       | EXTENDED; publication NOT AUTOMATED beyond existing workflow |
| Authorship                                     | `AGENTS.md` and this section                           | EXTENDED as intent; enforcement NOT reconciled               |
| Product Feature Intent and Foundation Workshop | Existing concept, roadmap, and application docs        | NOT APPLICABLE to change in this update                      |
