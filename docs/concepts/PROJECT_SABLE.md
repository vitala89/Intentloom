# Project Sable

**Status: FUTURE IDEA — NOT APPROVED FOR IMPLEMENTATION**

No timeline, delivery commitment, or implementation scope has been approved.
Project Sable is the name of this note. It records a possible later product
direction. It is not an architecture decision, a system design, a
specification, or an implementation task. The current Intentloom roadmap
remains the highest priority.

## Problem

Organizations struggle to integrate LLMs and AI agents with legacy
infrastructure, databases, ERP and CRM systems, internal APIs, and business
workflows. Each organization has its own systems, policies, and change-control
rules. A general model does not, by itself, produce a safe integration.

## Product vision

Intentloom may evolve into an AI-powered platform that supports engineers
doing this work for a specific organization. In that possible future, an
engineer would use the platform to discover that organization's requirements,
shape integrations, and deliver custom agent workflows, with human oversight
kept on every step that can change systems or data.

The present product stays what it is today: an independent, open-source,
provider-neutral infrastructure framework for reliable agentic engineering
workflows. This note does not replace that identity.

## Strategic evolution

A later exploration, if maintainers ever open one, would move through the
stages below. Listing a stage here does not authorize it.

1. **Engineer-led integration and customization.** An engineer leads discovery
   and delivery. Intentloom, if used, would support that person with the
   existing local, reviewable workflow. The engineer remains accountable for
   what is proposed and what is changed.
2. **AI-assisted discovery, architecture, and delivery.** Models may help
   gather requirements, sketch architectures, and draft delivery artifacts.
   People review the results. Assistance does not approve a change.
3. **Supervised AI execution.** An agent may carry out a bounded step only
   inside an explicit grant, with a person able to inspect, stop, and reject
   the result. Supervision is part of the step.
4. **Policy-governed autonomy.** Narrow, repeatable actions might proceed
   under policies the organization has already approved. That autonomy would
   stay inside those policies. New scope, new privileges, and irreversible
   effects would remain with a person.

## Potential capabilities

These are illustrations of what a future platform might help that engineer
do. None of them is scoped, scheduled, or approved.

- Business requirements discovery
- Enterprise integrations
- Custom AI agents
- Workflow automation
- Internal knowledge and retrieval-augmented generation
- Architecture generation
- Security and approvals
- Delivery and deployment support
- Reusable integrations and product feedback

Reusable integrations and product feedback, if ever pursued, would be a way
for repeated customer work to inform the product. They would pass through
review. A customer system would not become part of Intentloom Core.

## Architectural principles

A future design, if one is requested, would start from the current platform:

- Reuse existing Intentloom Core where it already fits. Clients, evidence,
  conformance, extensions, and mutations stay on the application and protocol
  boundaries in [Architecture](../architecture/ARCHITECTURE.md) and
  [Engineering principles](../governance/ENGINEERING_PRINCIPLES.md).
- Follow [Design First](../governance/DESIGN_FIRST_POLICY.md) and the
  pragmatic domain rules in
  [Domain modeling](../governance/DOMAIN_MODELING.md).
- Preserve human oversight. High-impact changes keep preview, explicit
  approval, and revalidation, as Engineering Principles sections 2 and 3
  already require.
- Apply least-privilege security. Capabilities stay explicit, reviewable, and
  auditable, as Engineering Principles section 9 already requires.
- Avoid a second execution engine or a second approval engine. Later work
  would use the existing prepare, preview, approve, and apply boundary.
- Evaluate any new bounded context only during a future architecture design.
  This note does not name, create, or approve one.

Engineering Principles section 12 still applies. New packages, services, and
boundaries wait for a demonstrated consumer and an approved roadmap trigger.

Existing adoption, evidence, conformance, extension lifecycle, and approval
behavior are the parts of the platform a later design would inspect before
proposing anything new. This note does not assign Project Sable work to those
areas.

## Prerequisites

Project Sable development is considered only after the current Intentloom
roadmap has reached its agreed completion and stability criteria. Those
criteria are the ones already recorded in [Roadmap](../../ROADMAP.md),
[Project state](../../PROJECT_STATE.md), and the active material under
`docs/roadmap/`. This idea does not add a milestone, a sprint, or an
implementation phase, and it does not reorder work already named there.

## Future exploration

The items below are questions a later maintainer might choose to open. They
are ideas, not approved implementation tasks. This note does not sequence
them.

### Discovery

A future discovery pass could ask which integration problems recur, which of
those problems the current platform already addresses, and which constraints
the present product does not claim to handle. Examples of those constraints
are legacy systems, identity, data residency, and change control. The output
would be a brief for maintainer review.

### Architecture RFCs

If discovery showed a real gap, a later RFC could examine whether that gap
belongs in an existing bounded context. The RFC would be a Design First
system design, with maintainer approval before any implementation. It would
have to show how execution and approval stay on the current engines.

### Proof-of-concept scenarios

Illustrative scenarios only:

- A read-only pass that describes one documented internal API and the
  questions an engineer still has to answer. No credentials and no writes.
- An engineer-led draft of a workflow that a person reviews and approves
  before anything is applied.
- A policy check that refuses an action outside an explicit grant, including
  a grant that has expired or changed.

Naming a scenario here does not authorize a prototype. A proof of concept
would need its own approved design.

### Validation criteria

A future decision to go beyond this note would need evidence such as:

- the current roadmap's agreed completion and stability criteria are met;
- maintainers explicitly approve a discovery or design brief;
- the proposed slice names which existing Core behavior it reuses;
- any new bounded context is justified in that design;
- human oversight and least privilege are part of the proposed slice;
- the design adds no second execution or approval engine;
- validation includes rejected and unauthorized actions.

Meeting those criteria in a future document would still require a separate
implementation approval.

## What this document does not do

- It does not approve development, a timeline, or a delivery commitment.
- It does not change current milestones, sprints, or implementation phases.
- It does not add packages, dependencies, schemas, or runtime behavior.
- It does not authorize access to customer systems, autonomous execution, or
  deployment.
