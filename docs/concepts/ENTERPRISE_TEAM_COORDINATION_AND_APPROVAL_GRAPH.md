# Enterprise Team Coordination and Approval Graph

## Status

Candidate product direction. This document does not add a valid organization
schema, identity integration, notification transport, provider write operation,
Desktop page, CLI command, or hosted enterprise service.

The governing rules are defined in
`docs/governance/ENTERPRISE_COORDINATION_PRINCIPLES.md`.

## Purpose

Intentloom should be able to help an organization route engineering work to the
right people and disciplines, show what requires attention, preserve evidence of
review and approval, and explain where a workflow is blocked.

A typical change may involve:

- a frontend engineer who implements and opens a pull request;
- a frontend or component owner who performs technical review;
- a mentor or staff engineer who supports the author but is not automatically an
  approver;
- an engineering manager who owns staffing or delivery risk;
- a product manager who confirms product intent;
- a designer who validates user experience;
- QA or SDET who validates behavior;
- a security or privacy reviewer for sensitive changes;
- a data owner for model, schema, or data-boundary changes;
- a release owner who authorizes release or deployment.

These relationships cannot be represented safely by one vertical org chart.
Intentloom should model them as a scoped responsibility and approval graph.

## Fit with Intentloom

The direction is consistent with the current platform:

- canonical workflows and policies describe expected work;
- engineering events and evidence describe observed work;
- conformance identifies verified, missing, conflicting, ambiguous, and
  unsupported evidence;
- project inspection, Git evidence, and provider imports establish read-only
  observation boundaries;
- CODEOWNERS and provider rules can supply review evidence;
- Desktop, TUI, CLI, MCP, and daemon are clients over shared application and
  protocol contracts;
- future mutations remain prepare, preview, approve, revalidate, and apply.

The enterprise increment adds organization context, responsibility resolution,
work routing, personal and team inboxes, notification policy, and cross-project
coordination. It must not duplicate the conformance engine or replace provider
review and merge controls.

## Product position

The capability may be presented as an **Enterprise Team Workspace** built on a
vendor-neutral **Responsibility and Approval Graph**.

```text
organization and team contracts
              +
product, service, repository, data, and architecture scopes
              +
canonical workflows and policies
              +
observed provider evidence
              ↓
responsibility resolution
              ↓
required actions and review routes
              ↓
personal inbox / team queue / project view
              ↓
provider-verified review, approval, merge, release, and deployment evidence
```

Intentloom coordinates and explains. It is not the authoritative identity
provider, source-control provider, issue tracker, CI system, deployment system,
or HR system.

## Core domain model

### Organization scope

Candidate scope types:

- organization;
- business unit;
- portfolio;
- product area;
- product;
- program;
- team or squad;
- platform;
- service;
- application;
- repository;
- package, module, crate, or path;
- bounded context;
- architecture domain;
- data domain;
- model or ML system;
- design system;
- environment;
- release train.

Scopes form a versioned graph. A repository may support multiple products, and a
team may own multiple services. The model must not require a perfect tree.

### Responsibility relationship

A relationship connects one subject to one scope with one responsibility type.

Candidate responsibility types:

- accountable;
- technical-owner;
- product-owner;
- design-owner;
- data-owner;
- security-owner;
- privacy-owner;
- service-owner;
- repository-owner;
- reviewer;
- required-approver;
- consulted;
- informed;
- mentor;
- engineering-manager;
- escalation-contact;
- delegate;
- on-call;
- release-owner;
- incident-commander.

The relationship may include:

- source and provenance;
- applicable paths or domains;
- change and risk classes;
- required discipline;
- priority and precedence;
- minimum reviewer count;
- independence requirements;
- start and expiry;
- delegation rules;
- response-window policy;
- notification preference;
- provider mapping;
- trust and verification state.

### Subject

A subject may be:

- a person-safe identifier;
- a team;
- a provider group;
- a rotating duty or on-call role;
- a service account for machine checks;
- an external organization reviewer;
- a vacant or unresolved responsibility slot.

A machine check can satisfy a CI or policy-check requirement. It cannot satisfy a
human review requirement unless the policy explicitly defines that requirement
as machine-verifiable rather than human approval.

### Human-facing title

Titles are aliases and presentation metadata, not canonical authorization.
Examples include:

- Product Manager;
- Product Lead;
- Engineering Manager;
- Tech Lead;
- Staff Engineer;
- Principal Engineer;
- Frontend Engineer;
- Backend Engineer;
- Product Engineer;
- Data Scientist;
- ML Engineer;
- Product Designer;
- UX Researcher;
- QA Engineer;
- SDET;
- Security Engineer;
- SRE;
- Platform Engineer;
- Release Manager.

An organization maps its titles to stable responsibility types and discipline
perspectives. The same title may resolve differently in different organizations.

### Work item

Candidate work-item types:

- product idea;
- product brief;
- architecture decision;
- design artifact;
- implementation task;
- code change;
- pull or merge request;
- database migration;
- model or dataset change;
- security review;
- incident;
- release;
- deployment;
- extension adoption;
- policy exception.

Each work item has an explicit identifier, scope, relationships, lifecycle,
source, evidence, and access boundary.

## Work and approval graph

A work graph relates different cases without collapsing them.

```text
product brief
      ↓ implements
architecture decision
      ↓ constrains
implementation task
      ↓ produces
pull request
      ↓ validated by
CI checks + QA evidence + design review + security review
      ↓ approved by
provider review records and policy-specific approvals
      ↓ may produce
merge → release candidate → deployment
```

A product approval is not a code approval. A design review is not a security
approval. A pull-request approval is not a deployment authorization. Intentloom
must preserve these distinctions.

## Routing model

### Inputs

The routing resolver may use:

- explicit work-item scope;
- changed repository-relative paths;
- package, service, data, model, and architecture ownership;
- CODEOWNERS or provider-equivalent rules;
- selected engineering disciplines;
- workflow policy;
- risk classification;
- security, privacy, accessibility, and regulatory triggers;
- provider branch protection and required-check evidence;
- team responsibility mappings;
- active delegation and duty rotation;
- requested target environment;
- release or deployment policy;
- conflicts of interest and separation of duties.

### Output

A route result should contain:

- requested actions;
- required and optional participants;
- the rule and evidence behind each participant;
- ordering and concurrency constraints;
- unresolved responsibility slots;
- unavailable or expired mappings;
- duplicate or circular requirements;
- self-approval conflicts;
- provider capabilities and limitations;
- notification plan;
- escalation plan;
- status and readiness summary.

### Route state

Candidate states:

- not-requested;
- pending;
- acknowledged;
- in-review;
- changes-requested;
- approved;
- rejected;
- waived-with-record;
- expired;
- superseded;
- blocked;
- missing-evidence;
- ambiguous;
- unsupported.

These are normalized Intentloom states. Provider adapters retain the original
provider state and provenance.

### Example

A pull request changes:

```text
apps/web/src/features/checkout/**
packages/payments-contract/**
packages/design-system/**
```

The route may resolve:

```text
frontend technical review        → checkout frontend owners
contract review                  → payments service owners
visual and interaction review    → design-system owner
accessibility review             → accessibility discipline
security review                  → required only if payment or authentication rule triggers
product confirmation             → checkout product owner
CI evidence                      → required provider checks
merge authorization              → source-control provider branch rules
```

A principal engineer is included only when a policy, ownership mapping, risk
class, architecture boundary, or explicit consultation requires that role. The
system must not notify every senior person for every change.

## Lifecycle example

```text
1. Developer starts a reviewed work item.
2. Intentloom resolves affected scopes and expected workflow.
3. Developer creates a branch, commits, pushes, and opens a pull request in the
   provider.
4. Provider evidence or an explicit export records the pull request.
5. Intentloom resolves the review route and shows a preview.
6. Authorized integrations may request reviews after explicit configuration.
7. Recipients see one actionable item in their Inbox or team queue.
8. Reviews and checks remain authoritative in GitHub, GitLab, or another owner
   system.
9. Intentloom normalizes verified evidence and updates conformance.
10. Missing, ambiguous, rejected, or expired actions remain visible.
11. Merge, release, and deployment require their own provider and policy gates.
12. The completed graph becomes auditable workflow evidence.
```

## Notification system

### Notification classes

Candidate classes:

- action-required;
- review-requested;
- approval-requested;
- changes-requested;
- policy-blocked;
- evidence-missing;
- route-unresolved;
- delegation-required;
- response-window-warning;
- escalation;
- status-change;
- informational;
- digest.

### Delivery surfaces

Initial delivery should remain inside Intentloom:

- Desktop personal Inbox;
- Desktop team queue;
- TUI queue;
- CLI structured output;
- MCP resource for the current user-scoped session;
- optional local desktop notification after explicit permission.

Later provider adapters may support:

- GitHub or GitLab review requests;
- issue-tracker comments or assignments;
- Slack or Microsoft Teams messages;
- email;
- incident systems;
- enterprise notification brokers.

Outbound delivery is a write or external side effect. It requires explicit
connection, destination scope, content preview where appropriate, deduplication,
audit evidence, and revocation.

### Notification quality

The system should support:

- one thread per work item and responsibility;
- deduplication across providers;
- acknowledgement;
- snooze;
- delegation;
- quiet hours and time zone;
- immediate versus digest preferences;
- subscriptions by scope and severity;
- escalation stop conditions;
- resolved and superseded states;
- safe redaction for external channels.

## Enterprise role templates

Templates help onboarding but do not create permissions automatically.

### Product Manager

Typical concerns:

- product intent and acceptance criteria;
- priority and scope changes;
- product-risk confirmation;
- release communication readiness;
- stakeholder consultation.

Not automatically responsible for:

- code correctness;
- security approval;
- merge authorization;
- deployment authorization.

### Engineering Manager

Typical concerns:

- team ownership and unresolved responsibility;
- delivery and operational risk;
- escalation and delegation;
- staffing or cross-team dependencies;
- policy-exception accountability where configured.

Not automatically required to review every code change.

### Tech Lead, Staff, or Principal Engineer

Typical concerns:

- architecture boundaries;
- cross-service contracts;
- high-risk or wide-blast-radius changes;
- technical standards;
- disputed or unresolved technical decisions.

The route should involve these roles selectively, based on scope and policy.

### Engineer

Typical concerns:

- implementation;
- tests and evidence;
- change explanation;
- requested reviews;
- response to findings;
- preservation of policy and ownership boundaries.

### Designer

Typical concerns:

- design intent;
- interaction and visual review;
- design-system consistency;
- accessibility collaboration;
- user-research evidence where applicable.

### QA or SDET

Typical concerns:

- test strategy;
- risk-based verification;
- regression evidence;
- environment readiness;
- release-quality evidence.

### Data or ML discipline

Typical concerns:

- data ownership and lineage;
- schema compatibility;
- privacy and retention;
- evaluation evidence;
- model-risk and rollback requirements;
- reproducibility and dataset provenance.

### Security and privacy

Typical concerns:

- threat and abuse cases;
- secret and identity boundaries;
- permission changes;
- sensitive data;
- supply chain;
- exceptions and residual risk.

## Organization onboarding

A safe onboarding sequence:

```text
1. Select one organization or pilot project.
2. Import an explicit provider export or connect read-only.
3. Import or define teams and scoped responsibilities.
4. Reconcile CODEOWNERS and provider team mappings.
5. Select one canonical workflow, initially pull-request review.
6. Preview routes against historical examples.
7. Confirm unresolved and conflicting mappings.
8. Enable an internal read-only Inbox.
9. Enable external review requests only after trust and notification review.
10. Expand to additional projects and disciplines incrementally.
```

Intentloom must not infer a full organization chart from commit history,
repository membership, or review frequency.

## Source systems and adapters

### First sources

Prefer explicit exports and read-only provider evidence:

- GitHub organizations, teams, repositories, pull requests, reviews, and checks;
- GitLab groups, projects, merge requests, approvals, and pipelines;
- CODEOWNERS files;
- local Git evidence;
- Intentloom workflow and conformance records;
- explicit organization and responsibility configuration.

### Later sources

Possible future adapters:

- Jira;
- Linear;
- Azure DevOps;
- Slack;
- Microsoft Teams;
- email;
- identity providers;
- incident management;
- deployment platforms;
- design tools;
- data catalogs;
- service catalogs.

Every adapter remains optional, least-privilege, versioned, source-attributed,
capability-scoped, and replaceable.

## Identity and access

Enterprise readiness eventually requires:

- OIDC and possibly SAML for organization authentication;
- SCIM or explicit directory import for lifecycle management;
- RBAC for broad role assignment;
- ABAC for project, path, data, environment, and risk attributes;
- provider identity mapping;
- group and team mapping;
- least-privilege service identities;
- just-in-time and time-bounded grants;
- separation of duties;
- audit of grants and changes;
- revocation and offboarding;
- emergency access policy;
- multi-tenant isolation.

These identity controls do not belong in the local canonical core. They should be
implemented behind organization, identity, provider, and deployment boundaries.

## Enterprise deployment shapes

Candidate deployment shapes:

### Local project mode

One developer or team uses local Intentloom and explicit provider exports. No
central service is required.

### Self-hosted organization mode

An organization runs its own coordination and evidence services in a private
network, with its own identity, storage, retention, and notification adapters.

### Managed control plane

An optional hosted service provides organization policy, identity integration,
routing, notifications, and audit. Project execution may remain local through
approved connectors or agents.

### Hybrid mode

Sensitive code and evidence remain local or self-hosted, while non-sensitive
organization configuration and notification routing use a managed service.

No deployment shape should silently upload source code or private evidence.

## Desktop experience

Candidate enterprise areas:

- **My Work**: requested reviews, approvals, blocked actions, mentions, and
  delegated items;
- **Team Queue**: unassigned and team-owned work;
- **Work Graph**: related brief, design, code, review, release, and deployment
  cases;
- **Responsibility Map**: teams, scopes, owners, reviewers, and delegates;
- **Route Preview**: exact required actions and why they apply;
- **Project Flow**: work state and verified conformance;
- **Policy and Exceptions**: active rules, overrides, and expiry;
- **Notification Settings**: channels, quiet hours, digest, scope, and severity;
- **Audit and Evidence**: provider-verified actions and provenance;
- **Organization Settings**: identity, providers, retention, residency, and
  integration permissions.

The UI should support graph, tree, list, and text representations. A graph alone
is not accessible or sufficient for large organizations.

## Candidate CLI

Read-only candidates:

```bash
intentloom org inspect --root .
intentloom org responsibilities show --effective
intentloom org route review --case pull-request:123
intentloom org route explain --action ACTION_ID
intentloom inbox list
intentloom inbox show ITEM_ID
intentloom team queue --team checkout
intentloom workflow graph --case pull-request:123
intentloom notifications preview --case pull-request:123
```

Import candidates:

```bash
intentloom org import --provider github --file organization-export.json
intentloom org import --provider gitlab --file group-export.json
intentloom responsibilities import --file responsibilities.yaml --dry-run
```

External or mutating operations are later and require prepared plans:

```bash
intentloom review-request prepare --case pull-request:123
intentloom review-request apply --plan PLAN_ID
```

## Candidate MCP surface

Initial resources:

```text
intentloom://organization/summary
intentloom://organization/responsibilities
intentloom://organization/current-user/inbox
intentloom://organization/team-queue
intentloom://work/case
intentloom://work/route
intentloom://work/conformance
```

Initial tools:

```text
intentloom_organization_inspect
intentloom_responsibility_resolve
intentloom_review_route_preview
intentloom_work_case_show
intentloom_inbox_list
intentloom_notification_preview
```

The initial MCP surface remains read-only. It does not expose organization-wide
arbitrary search, generic messaging, provider mutation, or approval actions.

## Candidate contracts

Potential future schemas:

```text
organization-profile.schema.json
organization-scope.schema.json
organization-subject.schema.json
responsibility-relationship.schema.json
responsibility-mapping.schema.json
work-case.schema.json
work-relationship.schema.json
review-route.schema.json
required-action.schema.json
notification-policy.schema.json
notification-item.schema.json
delegation.schema.json
organization-provider-mapping.schema.json
enterprise-audit-event.schema.json
```

Schema names are illustrative. They require ADR, threat model, privacy review,
compatibility policy, and migration design.

## Analytics boundary

Intentloom may eventually report organization-safe process measures such as:

- number of unresolved ownership slots;
- review queue age by team or scope;
- percentage of cases with sufficient evidence;
- repeated failed-check loops;
- policy exceptions nearing expiry;
- cross-team dependency wait states;
- notification delivery and acknowledgement health;
- workflow variants at an aggregated level.

It must not provide individual productivity scores, activity leaderboards,
keystroke or presence metrics, or opaque rankings of employees.

Small-group and individual-identifying analytics require suppression, access
control, retention limits, and a documented legitimate purpose.

## Non-goals

This direction does not initially include:

- replacing GitHub, GitLab, Jira, Slack, Teams, CI, deployment tools, or identity
  providers;
- recreating an HR organization chart;
- employee productivity scoring;
- manager surveillance dashboards;
- automatic role assignment from commit frequency;
- automatic review approval;
- automatic merge, release, or deployment;
- automatic messages to external systems;
- unrestricted organization-wide file access;
- opaque AI routing;
- one mandatory hosted SaaS deployment;
- organization-wide real-time monitoring in the first milestone.

## Initial success criteria

A first enterprise pilot is useful when:

- one organization can model one product, two or more teams, scoped ownership,
  and delegates without forcing a strict hierarchy;
- one pull-request workflow resolves required technical, product, design, QA, or
  security actions deterministically;
- every requested participant has an explainable rule and scope;
- self-approval, missing ownership, circular routes, and unavailable reviewers
  are detected;
- a user sees a deduplicated local Inbox and a team queue;
- provider evidence updates status without fabricating approval;
- the pilot remains read-only toward external systems;
- no employee productivity score or hidden monitoring is introduced;
- CLI, Desktop, daemon, and MCP represent the same route and evidence state.
