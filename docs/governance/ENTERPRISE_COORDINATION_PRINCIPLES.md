# Enterprise Coordination Principles

These principles govern future team, organization, routing, notification,
approval, and enterprise capabilities in Intentloom. They supplement
`ENGINEERING_PRINCIPLES.md`, the security model, the evidence model, and the
human-approval boundary.

The objective is to help teams coordinate engineering work without turning
Intentloom into an employee-surveillance, productivity-scoring, or hidden
management system.

## 1. Coordination, not surveillance

Intentloom may report work state, requested action, verified evidence, policy
requirements, and workflow dependencies. It must not rank individuals, infer
motivation, score employee productivity, or present activity volume as human
performance.

Team-flow analysis should prefer process and system signals such as queue age,
missing review coverage, failing checks, blocked dependencies, and unclear
ownership. It should not identify a person as a bottleneck without explicit,
reviewable evidence and an approved organizational purpose.

## 2. Responsibilities are a graph, not a forced hierarchy

Enterprise teams are usually matrix organizations. One change may involve a
product manager, frontend reviewer, service owner, designer, security reviewer,
data owner, QA engineer, and release approver.

Intentloom must model scoped responsibility relationships rather than assuming a
single manager chain. A reporting manager, mentor, technical reviewer, product
owner, service owner, security approver, and escalation contact are different
relationships.

## 3. Human titles are not authorization

Titles such as Product Manager, Engineering Manager, Staff Engineer, Principal
Engineer, Designer, Data Scientist, Security Engineer, or Director do not grant
capabilities by themselves.

Authorization comes from explicit, scoped grants and provider policy. Role
labels may influence routing and presentation, but cannot silently grant access
to repositories, secrets, networks, deployments, approvals, merges, releases,
or publication.

## 4. Notification, review, approval, and execution are separate

A notification asks a person to inspect an event. A review records technical or
product feedback. An approval satisfies an explicit policy requirement. An
execution changes an external system.

Intentloom must not treat one as another. Reading a notification does not approve
a change. Commenting does not necessarily approve it. An Intentloom suggestion
or AI summary never counts as approval. A recorded approval does not itself
perform merge, release, deployment, or publication.

## 5. Provider systems remain authoritative for provider actions

GitHub, GitLab, Azure DevOps, Jira, Linear, CI systems, deployment systems, and
identity providers remain authoritative for actions they own.

Intentloom may normalize evidence, preview routes, request review through an
explicit integration, and display status. It must not fabricate provider state or
claim a pull request is approved, merged, deployed, or released without verified
provider evidence.

Where provider rules and Intentloom policy differ, the effective enforcement and
source-of-truth boundaries must be visible.

## 6. Routing must be deterministic and explainable

Review and approval routes should resolve from versioned inputs such as:

- affected repository and paths;
- service, product, data, or architecture scope;
- CODEOWNERS or equivalent reviewed ownership rules;
- change type and risk class;
- canonical workflow and policy;
- required disciplines;
- current delegation and absence records;
- separation-of-duties constraints;
- provider capability and branch-protection evidence.

Every route must explain why each participant was selected, which rule requires
their action, what evidence is missing, and whether an alternative or delegate is
allowed.

## 7. Uncertainty does not become enforcement

An inferred owner, role, team, manager, or reviewer is a candidate, not a fact.
Ambiguous evidence requires confirmation or a reviewed mapping.

Intentloom must distinguish configured, provider-verified, imported, inferred,
missing, conflicting, expired, and unsupported responsibility evidence.

## 8. No automatic self-approval or circular approval

The policy engine must support separation of duties. A change author must not
satisfy a required independent review merely by holding another title.

Circular routes, unavailable reviewers, empty teams, duplicate approvers, and
self-approval conditions must be detected before a workflow is described as
ready.

## 9. Delegation is explicit, scoped, and time-bounded

Temporary delegates, on-call rotations, leave coverage, incident roles, and
acting responsibilities must be explicit. A delegation records its scope,
source, start, expiry, and reason category without exposing unnecessary private
information.

A permanent hidden fallback to a senior manager is not an acceptable substitute
for a missing ownership model.

## 10. Escalation is transparent and non-punitive

Escalation should mean that a required action is unresolved, a target response
window is nearing expiry, or ownership is ambiguous. It must not imply blame.

Escalation routes, timing, recipients, quiet hours, and stop conditions must be
configured and visible. The system must avoid repeated notification storms.

## 11. Minimize personal data

Use organization-safe identifiers and the minimum attributes required for
routing. Do not expose private email, employment details, personal schedules,
commit-message content, or full provider payloads when a stable identifier and
status are sufficient.

Retention, export, deletion, redaction, legal hold, and data-residency behavior
must be specified before centralized enterprise storage is introduced.

## 12. No covert monitoring

No hidden background polling, presence tracking, keystroke tracking, screen
capture, IDE activity tracking, or cross-project employee collection is allowed.

Connections, repositories, event sources, polling or webhook behavior, retention,
and notification destinations must be visible, revocable, and auditable.

## 13. Notifications must be actionable

A notification should state:

- what changed;
- which project and scope it affects;
- what action is requested;
- why the recipient was selected;
- the current evidence and policy state;
- the response or review boundary;
- a safe link or local route to the relevant item;
- the consequence of no action, without manipulative urgency.

Deduplication, threading, digesting, subscriptions, quiet hours, acknowledgement,
and resolution are required before broad enterprise notification fan-out.

## 14. Cross-functional disciplines are first-class

Product, design, frontend, backend, mobile, desktop, QA, SDET, data, ML, security,
privacy, accessibility, platform, SRE, documentation, legal, and release concerns
may each own different review requirements.

Intentloom must not treat non-code contributions as secondary or force every work
item through an engineering-manager hierarchy.

## 15. The work item, change, and approval are related but distinct

A product brief, design artifact, code change, migration, model evaluation,
security review, release, and deployment may be separate cases connected by
explicit relationships.

They must not be collapsed into one timeline merely because they share a title or
external ticket number.

## 16. Enterprise policy cannot weaken platform safety

Organization policy may add stricter review, audit, retention, identity, or
change-control requirements. It cannot disable project-root containment,
ownership safety, provider neutrality, evidence provenance, approval integrity,
secret protection, compatibility checks, transactional writes, truthful
reporting, or rollback requirements.

## 17. AI may assist, but cannot be the approver

AI may summarize a change, explain route selection, identify missing evidence,
propose reviewers, draft a checklist, or classify a risk candidate.

AI output cannot count as human approval, identity proof, CODEOWNER evidence,
security authorization, merge authorization, release authorization, or legal
sign-off. Deterministic and provider-verified evidence remains authoritative.

## 18. Human override requires a record

A permitted override must identify the policy, scope, actor class, reason,
evidence, expiry or review trigger, and resulting residual risk.

An override does not rewrite history. The original requirement and the fact of
the override remain visible to authorized reviewers.

## 19. Organization profiles are versioned and portable

Team topology, responsibility mappings, workflow templates, notification policy,
and review rules should use versioned, vendor-neutral contracts.

Provider-specific teams, groups, users, channels, branch rules, and project IDs
belong in adapters and mappings. The canonical model must remain portable across
GitHub, GitLab, and future supported systems.

## 20. Enterprise deployment is optional

A future hosted or organization control plane may provide identity, shared
policy, routing, notifications, and audit services. It must not become a hidden
requirement for local project inspection, validation, or canonical intent.

Self-hosted, private-network, local, and hybrid deployment requirements must be
considered before calling the capability enterprise-ready.
