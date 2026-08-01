# Project Inception, Model, and Nx Principles

These principles govern future Project Inception, AI model selection, reasoning
effort, blueprint generation, scaffolding, and Nx adoption work in Intentloom.

They supplement the engineering, security, ownership, transaction, extension,
privacy, and enterprise coordination rules.

## 1. Start from the problem, not a fashionable stack

Project Inception must clarify the problem, intended users, smallest useful
outcome, constraints, and non-goals before recommending frameworks, architecture,
workspace tooling, providers, or models.

A request to build “something like” a successful project is a starting point for
questions, not proof that the same architecture or feature breadth is required.

## 2. Questions must reduce uncertainty

Neutron should ask only questions that can materially affect a product,
architecture, security, compatibility, delivery, or tooling decision.

It must:

- preserve answers and provenance;
- distinguish hard constraints from preferences;
- allow unknown answers;
- expose assumptions;
- detect contradictions;
- avoid repeating resolved questions;
- stop when enough evidence exists for a safe first blueprint.

Question volume is not evidence of intelligence or completeness.

## 3. Recommendations remain proposals

A model-generated recommendation is not:

- canonical intent;
- architecture approval;
- a capability grant;
- dependency-installation approval;
- a license decision;
- a security exception;
- a scaffold approval;
- permission to create a remote repository;
- permission to publish.

The user must review a structured blueprint and an exact scaffold plan.

## 4. Prefer the smallest coherent first release

Intentloom should recommend the least complex architecture that satisfies the
confirmed constraints.

Broad ecosystems should normally begin with one strong use case, one stable
core, and one proven consumer. Additional frameworks, deployables, services,
plugins, hosted systems, and integrations should be deferred until evidence
justifies them.

## 5. Alternatives and costs must be visible

Important recommendations should show:

- the selected option;
- a simpler option when one exists;
- a more extensible option only when relevant;
- evidence and assumptions;
- benefits;
- operational and maintenance costs;
- migration and reversibility;
- security and compatibility impact;
- unresolved questions.

Intentloom must not recommend microservices, microfrontends, event sourcing,
polyrepo, Nx, or another tool only because a project may grow.

## 6. Blueprint approval and scaffold approval are separate

Approving what a project should become does not approve the exact files,
dependencies, commands, provider actions, or network calls used to create it.

The workflow is:

```text
review blueprint
→ approve blueprint
→ prepare scaffold plan
→ review paths and side effects
→ approve exact plan
→ revalidate
→ apply transactionally
→ verify
```

Changes to the blueprint or target state invalidate stale scaffold plans.

## 7. Existing projects do not use the new-project shortcut

The first Project Inception scaffold applies only to an absent or explicitly
confirmed empty root.

A non-empty repository uses inspection and adoption. Intentloom must not treat
existing project files as disposable template output.

## 8. No silent side effects

Project creation must not silently:

- install dependencies;
- execute package scripts;
- initialize or modify Git;
- create or push a remote repository;
- add hooks;
- create provider accounts or credentials;
- enable hosted services;
- make network calls;
- accept legal terms;
- publish a package;
- deploy infrastructure.

Each side effect requires a separate capability, preview, approval, and truthful
result.

## 9. Templates and generators require provenance

Every first-party or third-party starter, template, generator, architecture pack,
skill, or extension must preserve:

- stable identifier and version;
- publisher and source;
- license and notices;
- integrity evidence;
- compatibility range;
- requested capabilities;
- created paths;
- proposed dependencies and scripts;
- update, migration, and removal policy.

Popularity or a familiar project name is not a trust decision.

## 10. Model, effort, mode, capability, budget, and approval are independent

The following values must never be collapsed into one control:

```text
model
reasoning effort
workflow mode
capability grant
execution and cost budget
human approval
```

A high-capability model with `high` effort in `plan` mode remains unable to write
files if the session has read-only tools.

## 11. Canonical effort values are portable requests, not guarantees

Intentloom may expose:

```text
auto
low
medium
high
```

Each provider adapter must report whether the mapping is exact, bounded,
provider-profile-based, unsupported, or requires a user decision.

Silent downgrade is forbidden. `high` does not guarantee a better result and may
increase latency and cost.

## 12. Provider and model identity stay visible

Every Neutron session that uses a model must display or record:

- provider;
- exact model identity when available;
- adapter and runtime version;
- effort request and resolved provider setting;
- network and data-handling state;
- tools and capabilities;
- relevant budgets;
- fallback behavior;
- provenance and usage metadata.

Intentloom must not present a third-party model as an Intentloom-trained model
when it is only wrapped or routed by Neutron.

## 13. No hidden model fallback

Provider or model fallback is disabled unless an explicit policy defines an
ordered allowlist.

A fallback that changes provider, endpoint, network, data handling, capability,
or effort semantics must be visible. Material boundary changes require renewed
approval.

## 14. Credentials stay outside project metadata

API keys, provider tokens, gateway credentials, private local-model paths, and
secret connection data must not be written to:

- `.aif/` project contracts;
- Git;
- generated instructions;
- manifests or source maps;
- evidence bundles;
- prompts and model context;
- exported sessions;
- normal logs.

Use operating-system protected storage, environment injection, or another
reviewed secret mechanism.

## 15. Deterministic operations do not require a model

Validation, ownership checks, path safety, schema checks, compatibility
resolution, plan digests, transactions, rollback, and post-write verification
remain deterministic application operations.

A configured model must not become a mandatory intermediary for operations that
can be performed reliably without one.

## 16. Budgets and costs must be bounded

Model execution should have explicit limits for context, output, reasoning,
tools, retries, subagents, duration, and cost where supported.

`auto` may propose a value inside approved policy. It cannot silently exceed the
user or organization limit.

Cost estimates must be labeled as estimates. Provider-returned usage is evidence
only for the request it describes.

## 17. Nx augments the existing workspace

For Intentloom, Nx is evaluated as a project-graph and task-orchestration layer
over pnpm workspaces and existing package or TypeScript contracts.

The first adoption must not require moving packages, rewriting applications, or
replacing trusted release workflows.

## 18. Nx Cloud is not a default dependency

Local graph, execution, and cache behavior must work without an account,
telemetry, or hosted service.

Remote caching, distributed execution, and cloud analytics require separate
privacy, security, credential, retention, residency, outage, and cost decisions.

## 19. Cache only verified pure tasks

A task must not be cacheable until inputs, outputs, environment dependencies,
network behavior, and mutation behavior are understood.

In particular, version synchronization, release preparation, signing,
publication, provider writes, dependency installation, Git mutation, and secret-
dependent tasks are not cacheable by default.

A cache hit does not count as human approval or release authorization.

## 20. Preserve authoritative verification during the Nx pilot

Existing `pnpm verify`, package verification, cross-platform Compatibility,
CodeQL, dependency review, Desktop packaging, and trusted publication remain
authoritative until Nx parity and benefit are proven.

Affected execution may accelerate ordinary changes, but unknown impact must
expand toward broader checks, and release gates may continue to require full
fresh execution.

## 21. Nx project metadata is not authorization

Project names, tags, dependencies, and affected status describe build and
architecture relationships. They do not grant repository access, ownership,
review rights, deployment access, secret access, or approval authority.

## 22. Tool adoption requires measurable value and rollback

Before accepting Nx as permanent infrastructure, record:

- current and new execution times;
- graph correctness;
- cache correctness;
- cross-platform behavior;
- contributor impact;
- CI impact;
- artifact reproducibility;
- maintenance cost;
- rollback procedure.

The pilot should be removable without moving source or reconstructing build
logic.

## 23. Generated project tooling remains optional

Intentloom may recommend pnpm plus Nx for a multi-package library ecosystem, but
must also support simpler workspaces when Nx adds no demonstrated value.

A selected starter composition is editable and cannot become a requirement for
all projects.

## 24. Safety rules cannot be weakened by effort or automation

No model, effort profile, Nx target, generator, cache result, agent, or automatic
routing decision may bypass:

- explicit project root;
- path and symlink safety;
- ownership;
- capability checks;
- secret handling;
- provider policy;
- prepared plan identity and expiry;
- explicit approval;
- current-state revalidation;
- transaction and rollback;
- truthful success and failure reporting.

## Pull request checklist

Any implementation pull request for these directions should answer:

1. Which existing application operation or contract is reused?
2. Is the change deterministic, model-assisted, or provider-dependent?
3. Which files, commands, network targets, and capabilities are affected?
4. Does model or effort selection remain separate from authority?
5. Are provider and model identities exact and visible?
6. Are credentials outside project metadata and logs?
7. Does the blueprint remain user-owned?
8. Is the scaffold plan exact, reviewable, expiring, and revalidated?
9. Can cancellation leave the target byte-for-byte unchanged?
10. Does the template preserve source, license, integrity, and compatibility?
11. If Nx is involved, is pnpm still the dependency authority?
12. Is any cached task proven pure?
13. Are release and security gates still authoritative?
14. Are cross-platform and packed-artifact results unchanged or intentionally
    reviewed?
15. Is there a tested rollback path?
16. Is Duty Watch, changelog, migration, and compatibility evidence updated where
    required?

A change that cannot answer these questions should remain a proposal rather than
be merged as an implementation.
