# Enterprise Team Workflow and Notifications Plan

## Status

Planned product increment. The current branch adds documentation only. It does
not implement organization identity, live provider access, notifications,
approval routing, hosted services, schemas, CLI commands, daemon operations,
Desktop views, MCP tools, or external mutations.

Governing documents:

- `docs/concepts/ENTERPRISE_TEAM_COORDINATION_AND_APPROVAL_GRAPH.md`
- `docs/governance/ENTERPRISE_COORDINATION_PRINCIPLES.md`
- `docs/concepts/ENGINEERING_PROCESS_INTELLIGENCE.md`
- `docs/specs/ENGINEERING_CONFORMANCE_V0_3_SPEC.md`
- `docs/concepts/PROJECT_CONNECTION_EVIDENCE_AND_MCP.md`
- `docs/concepts/INTERACTIVE_SURFACES_AND_AGENT_WORKSPACE.md`

## Product objective

Create an enterprise-capable coordination layer that helps cross-functional
teams understand:

- what work changed;
- which product, service, repository, data, model, or architecture scopes are
  affected;
- which reviews, approvals, checks, and consultations are required;
- who or which team currently owns each responsibility;
- why each recipient was selected;
- what evidence is verified, missing, conflicting, ambiguous, or unsupported;
- what action is requested next;
- where a workflow is blocked without blaming individuals.

The capability should support local, self-hosted, managed, and hybrid deployment
shapes while preserving the local-first and provider-neutral core.

## Product decision

Build the enterprise direction around four shared capabilities:

1. **Organization and responsibility graph**
   - teams, scopes, disciplines, owners, reviewers, approvers, delegates, and
     escalation contacts;
   - graph and attribute model rather than a fixed manager hierarchy.
2. **Work and approval graph**
   - explicit relationships among product briefs, designs, tasks, code changes,
     pull requests, validations, releases, and deployments.
3. **Routing and required-action engine**
   - deterministic resolution of reviews, approvals, checks, consultations, and
     notifications from policy and evidence.
4. **Enterprise Inbox and notification layer**
   - personal and team queues, deduplication, acknowledgement, delegation,
     digesting, quiet hours, and transparent escalation.

All clients consume the same application and protocol operations. Desktop, TUI,
CLI, MCP, daemon, and any hosted control plane must not implement competing route
or approval engines.

## Architectural relationship to current features

```text
canonical workflows and policies
            ↓
engineering standards and architecture scopes
            ↓
organization and responsibility mappings
            ↓
provider and local engineering evidence
            ↓
conformance + responsibility resolution
            ↓
review route + required actions
            ↓
Inbox / team queue / notification preview
            ↓
provider-verified review and approval evidence
```

The conformance engine remains responsible for comparing observed events with
canonical policy. The enterprise layer adds who should act, why, and through
which approved channel.

## First use case

The first supported enterprise case should be one pull or merge request in one
pilot organization.

Example:

```text
frontend engineer opens PR
→ changed paths and work-item links are inspected
→ affected product, service, design-system, data, and risk scopes resolve
→ required reviewers and checks are calculated
→ route preview identifies missing or conflicting ownership
→ personal Inbox and team queue display required actions
→ provider review and CI records update the case
→ conformance explains what is verified or missing
→ merge remains controlled by the source provider
```

The first milestone should remain read-only toward provider systems. It may show
who should be requested without sending review requests automatically.

## Work streams

### A. Organization contracts

Define vendor-neutral schemas for:

- organization profile;
- organization scope graph;
- teams and subjects;
- discipline and title aliases;
- responsibility relationships;
- provider identity and team mappings;
- delegation and duty rotations;
- notification preferences;
- retention and residency policy.

Important constraints:

- titles do not grant capabilities;
- manager, mentor, reviewer, owner, approver, and escalation contact are distinct;
- mappings retain source, trust, version, and expiry;
- inferred relationships cannot enforce policy without confirmation;
- organization configuration is separate from credentials and private HR data.

### B. Work graph contracts

Define:

- work-case identity and type;
- relationships among briefs, designs, tasks, changes, PRs, reviews, releases,
  incidents, and deployments;
- lifecycle state;
- source-system identity;
- affected scopes;
- current evidence;
- required actions;
- supersession and cancellation.

Do not merge unrelated case types into one timeline merely because they share a
provider ticket.

### C. Responsibility resolver

The resolver should:

- accept explicit case and changed-scope inputs;
- resolve responsibility candidates by rule precedence;
- combine project ownership, organization mapping, workflow policy, discipline,
  risk, delegation, and provider evidence;
- report conflicts and uncertainty;
- detect self-approval and circular routes;
- produce deterministic sorted output;
- explain every participant and requirement;
- remain side-effect free.

### D. Required-action and route engine

Define action types such as:

- technical-review;
- product-confirmation;
- design-review;
- accessibility-review;
- QA-validation;
- security-review;
- privacy-review;
- data-review;
- model-evaluation-review;
- architecture-review;
- documentation-review;
- release-approval;
- deployment-approval;
- machine-check;
- consultation;
- acknowledgement;
- exception-review.

Each action records:

- action ID;
- case and scope;
- policy rule;
- required discipline or responsibility;
- eligible subjects;
- assigned subject when resolved;
- independence constraint;
- ordering and dependency;
- provider mapping;
- status;
- evidence;
- response-window policy;
- escalation route;
- waiver policy;
- provenance.

### E. Inbox and team queue

The first Inbox should be read-only and local or self-hosted.

Capabilities:

- list current user's required actions;
- list team-owned or unresolved actions;
- filter by project, scope, action, severity, state, and age;
- group duplicates across providers;
- show why the item is routed to the user or team;
- show verified and missing evidence;
- acknowledge locally without fabricating provider approval;
- support local snooze and display preferences;
- show delegation candidates and unresolved ownership.

A future acknowledgement write must clearly state whether it is only local or
also written to an external provider.

### F. Notification policy

Define versioned rules for:

- immediate, digest, or silent delivery;
- severity and action class;
- scope subscription;
- quiet hours and time zone;
- deduplication and threading;
- maximum repeat frequency;
- acknowledgement and resolution;
- delegation;
- response windows;
- escalation targets and stop conditions;
- external channel redaction;
- provider and channel capability.

Notifications should be generated from required actions, not from every raw
engineering event.

### G. Provider adapters

Initial provider sequence:

1. GitHub export import;
2. GitLab export import;
3. read-only GitHub live access;
4. read-only GitLab live access;
5. review-request preview;
6. prepared and approved review-request write;
7. optional issue-tracker and messaging adapters.

Provider writes require:

- exact destination;
- exact recipients;
- content or action preview;
- capability grant;
- deduplication key;
- stale-state revalidation;
- provider response evidence;
- audit event;
- truthful failure and partial-success reporting.

### H. Identity and enterprise security

Before organization-wide deployment, specify:

- OIDC authentication;
- optional SAML federation;
- SCIM or approved directory synchronization;
- RBAC and ABAC boundaries;
- provider identity linking;
- service identities;
- least privilege;
- multi-tenant isolation;
- data residency;
- encryption in transit and at rest;
- secret storage;
- audit integrity;
- retention, deletion, export, and legal hold;
- backup and disaster recovery;
- self-hosted and private-network operation;
- incident response and revocation.

No identity provider password or token belongs in project `.aif/` metadata.

### I. Privacy and anti-surveillance controls

Enterprise readiness requires product-level restrictions:

- no individual productivity score;
- no activity leaderboard;
- no keystroke, presence, screen, or IDE monitoring;
- no automatic management inference from Git activity;
- no commit-volume performance claims;
- no hidden organization-wide collection;
- minimum disclosure in notifications;
- aggregate-only flow analytics by default;
- small-group suppression;
- role-based access to personal or sensitive data;
- auditable access to organization reports;
- explicit purpose and retention for analytics.

## Candidate configuration model

Illustrative only:

```yaml
organization:
  schemaVersion: "1"
  organizationId: example-corp
  scopes:
    - id: product:checkout
      type: product
    - id: team:checkout-web
      type: team
    - id: service:payments
      type: service
  responsibilities:
    - subject: team:checkout-web
      scope: product:checkout
      type: technical-owner
      disciplines:
        - frontend
    - subject: team:payments-platform
      scope: service:payments
      type: required-approver
      actions:
        - contract-review
    - subject: role:checkout-product-manager
      scope: product:checkout
      type: product-owner
  workflowProfiles:
    pull-request:
      notificationPolicy: review-default
```

This is not valid configuration until schemas and migration rules are accepted.

## Candidate CLI

### Read-only organization and route operations

```bash
intentloom org inspect
intentloom org scopes list
intentloom org responsibilities show --effective
intentloom org responsibility explain RESPONSIBILITY_ID
intentloom work case show CASE_ID
intentloom work graph CASE_ID
intentloom route preview CASE_ID
intentloom route explain ACTION_ID
intentloom inbox list
intentloom team queue --team TEAM_ID
intentloom notifications preview CASE_ID
```

### Import operations

```bash
intentloom org import --provider github --file github-org-export.json --dry-run
intentloom org import --provider gitlab --file gitlab-group-export.json --dry-run
intentloom responsibilities import --file responsibilities.yaml --dry-run
intentloom notification-policy import --file notifications.yaml --dry-run
```

### Future reviewed external actions

```bash
intentloom review-request prepare CASE_ID
intentloom review-request apply --plan PLAN_ID
intentloom notification prepare ACTION_ID --channel teams
intentloom notification apply --plan PLAN_ID
```

All human and JSON outputs derive from the same structured result.

## Candidate Desktop flow

### Organization Setup

```text
Connect provider export or read-only provider
→ inspect organization and repositories
→ define or import scopes and teams
→ reconcile CODEOWNERS and responsibility mappings
→ preview unresolved and conflicting ownership
→ select pilot workflow
→ save reviewed organization profile
```

### My Work

Cards show:

- action requested;
- project and scope;
- work-item summary;
- route reason;
- required evidence;
- state;
- response window when configured;
- provider source;
- safe navigation action.

### Team Queue

Shows:

- unassigned required actions;
- team-owned work;
- unavailable or expired assignments;
- missing ownership;
- delegated items;
- blocked dependencies;
- deduplicated provider state.

### Work Graph

Shows connected cases and current gates without forcing a single vertical
hierarchy. Accessible list and table forms are required.

### Responsibility Map

Shows scope, responsibility, source, trust, delegate, expiry, and conflicts. It
must not become an HR-performance view.

### Policy and Notification Settings

Shows workflow routes, review requirements, notification channels, quiet hours,
digest policy, escalation, redaction, and external side effects.

## Candidate daemon and protocol operations

Read-only first:

```text
organization.inspect
organization.responsibilities.resolve
organization.route.preview
work.case.get
work.graph.get
inbox.list
teamQueue.list
notification.preview
```

Later prepare/apply pairs:

```text
reviewRequest.prepare
reviewRequest.apply
notification.prepare
notification.apply
responsibilityMapping.prepare
responsibilityMapping.apply
```

Every apply operation revalidates organization identity, provider connection,
case state, route digest, recipients, capability grant, expiry, and deduplication
key.

## Candidate MCP surface

Read-only resources:

```text
intentloom://organization/summary
intentloom://organization/scopes
intentloom://organization/responsibilities
intentloom://organization/current-user/inbox
intentloom://organization/team-queue
intentloom://work/case
intentloom://work/graph
intentloom://work/route
intentloom://work/conformance
```

Read-only tools:

```text
intentloom_organization_inspect
intentloom_responsibility_resolve
intentloom_review_route_preview
intentloom_work_case_show
intentloom_work_graph_show
intentloom_inbox_list
intentloom_team_queue_list
intentloom_notification_preview
```

No MCP prompt or model output may approve a work item or authorize an external
message.

## Delivery phases

### Phase 0: decision, privacy, and threat model

- Accept an ADR for the responsibility and approval graph.
- Accept the enterprise coordination principles.
- Define local, self-hosted, managed, and hybrid trust boundaries.
- Complete privacy, anti-surveillance, identity, multi-tenancy, notification, and
  provider-write threat reviews.
- Define terminology and source-of-truth boundaries.

Exit gate: the model clearly separates title, responsibility, ownership,
notification, review, approval, permission, and execution.

### Phase 1: read-only organization model

- Define organization, scope, subject, responsibility, mapping, and delegation
  schemas.
- Add deterministic fixtures for teams, products, services, repositories,
  CODEOWNERS, delegates, and missing ownership.
- Import explicit GitHub and GitLab organization exports.
- Produce an organization inspection report.

Exit gate: one pilot organization can be represented without inferring hierarchy
from activity.

### Phase 2: read-only responsibility resolver

- Resolve scoped owners, reviewers, approvers, consulted, and informed subjects.
- Implement precedence, inheritance, expiry, delegation, and conflict handling.
- Detect unresolved, circular, duplicate, and self-approval conditions.
- Add explanation and golden fixtures.

Exit gate: the same inputs produce byte-identical route candidates across CLI,
application, and protocol tests.

### Phase 3: work and approval graph

- Define work-case, relationship, required-action, and route schemas.
- Connect product brief, design, implementation, pull request, checks, release,
  and deployment as distinct cases.
- Add one pull-request route using explicit exported evidence.
- Reuse conformance rather than duplicating approval evaluation.

Exit gate: a pull request resolves its required cross-functional actions and
preserves source evidence.

### Phase 4: local Inbox and team queue

- Add read-only structured operations.
- Implement CLI, TUI, and Desktop presentation over shared results.
- Add deduplication, filtering, grouping, acknowledgement display, and local
  preferences.
- Add cancellation and data-minimization tests.

Exit gate: current-user and team views are useful without writing to a provider.

### Phase 5: notification policy and preview

- Define notification policy and item schemas.
- Implement threading, deduplication, quiet hours, digest, subscriptions,
  response windows, escalation, and redaction.
- Add local Desktop notification as the first optional delivery channel.
- Keep outbound provider delivery disabled.

Exit gate: a notification preview is deterministic, actionable, and avoids
notification storms.

### Phase 6: live read-only provider integration

- Add least-privilege GitHub and GitLab read-only access.
- Normalize teams, pull requests, reviews, checks, and branch-policy evidence.
- Add webhook or bounded polling only after lifecycle, authentication, replay,
  deduplication, outage, and retention behavior are specified.
- Preserve exports as an offline path.

Exit gate: live evidence and equivalent exports produce compatible normalized
cases.

### Phase 7: prepared review requests

- Add review-request prepare, preview, approve, revalidate, and apply contracts.
- Request exact provider reviewers or teams only after explicit approval.
- Preserve provider errors and partial-success evidence.
- Never approve, merge, or dismiss review automatically.

Exit gate: one approved provider review request is sent idempotently and is fully
auditable.

### Phase 8: optional enterprise channels

- Add Slack, Microsoft Teams, email, and issue-tracker adapters incrementally.
- Require destination-scoped grants and content redaction.
- Keep channel delivery separate from approval state.
- Add channel-specific deduplication and revocation.

Exit gate: one external notification channel can be enabled without exposing
unnecessary repository content.

### Phase 9: enterprise identity and deployment

- Add OIDC and directory lifecycle contracts.
- Implement RBAC and ABAC over organization resources.
- Add self-hosted deployment evidence before managed multi-tenant operation.
- Add audit, residency, retention, backup, recovery, and key-management controls.
- Add organization administration and offboarding.

Exit gate: a pilot organization can operate with least privilege and complete
auditability.

### Phase 10: aggregated team-flow intelligence

- Add organization-safe queue, evidence-quality, workflow-variant, and dependency
  analytics.
- Apply small-group suppression and access controls.
- Keep facts, interpretations, and recommendations separate.
- Prohibit individual productivity scoring.

Exit gate: reports help improve the system and workflow without ranking people.

## Pilot scenarios

### Scenario 1: cross-functional frontend change

A checkout UI change requires frontend review, design review, accessibility
validation, CI, and product confirmation. Security is included only when a
payment or authentication boundary changes.

### Scenario 2: backend contract change

An API or event contract change requires service-owner review, affected consumer
teams, migration evidence, and architecture review when compatibility risk is
high.

### Scenario 3: data or model change

A dataset, schema, feature, or model change requires data ownership, privacy,
evaluation, reproducibility, and rollback evidence without exposing sensitive
payloads in notifications.

### Scenario 4: organization absence and delegation

A required owner is unavailable. A reviewed, time-bounded delegate receives the
action. The system explains the delegation source and expiry without disclosing
private leave details.

### Scenario 5: unresolved ownership

No valid owner exists for an affected scope. The work is marked blocked or
requires an explicit waiver. It is not silently routed to the highest manager.

## Acceptance criteria

The increment is enterprise-credible when:

- organization structure supports graphs and matrix teams, not only trees;
- title, responsibility, ownership, permission, approval, and execution remain
  separate;
- one pull-request case routes cross-functional actions deterministically;
- every route is explainable and source-attributed;
- self-approval, circular routes, expired delegation, and missing ownership are
  detected;
- provider state remains authoritative for provider-owned actions;
- notifications are deduplicated, actionable, configurable, and revocable;
- no employee productivity scoring or covert monitoring exists;
- local, self-hosted, and managed trust boundaries are documented;
- CLI, Desktop, TUI, daemon, MCP, and hosted clients share one resolver and one
  protocol result;
- all external writes use prepare, preview, explicit approval, revalidation,
  idempotency, audit, and truthful error reporting.

## Non-goals

This plan does not authorize:

- implementing a hidden employee-monitoring product;
- automatic manager-chain escalation for every change;
- automatic approval, merge, deployment, release, or publication;
- treating a title as a permission grant;
- replacing provider branch protection or review state;
- inferring an organization chart from commits;
- sending notifications without an explicit connection and policy;
- mandatory hosted storage;
- unrestricted cross-repository or organization access;
- opaque AI-generated routing or compliance decisions.
