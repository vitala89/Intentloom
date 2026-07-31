# Intentloom Engineering Principles

These principles are the project's architectural constitution. Roadmaps may
change, implementations may evolve, but exceptions to these principles require
an explicit architecture decision record.

## 1. Platform first

Intentloom is infrastructure before it is an interface. CLI, MCP, Desktop, IDE
integrations, and future clients must use shared application and protocol
contracts rather than creating separate domain implementations.

## 2. Evidence before mutation

Agents must inspect relevant repository evidence before proposing or applying
changes. Destructive or state-changing operations require preview, diff,
conflict detection, validation, and explicit human approval where risk exists.

## 3. Human authority

Intentloom assists and orchestrates. It does not silently take ownership away
from the user. High-impact mutations, permission changes, credential use,
publishing, release operations, and external side effects require clear
authorization.

## 4. Local first

Local execution, local project ownership, and transparent data flow are
defaults. Cloud services may be optional enhancements, never hidden
requirements for basic local capabilities.

## 5. Provider neutrality

Canonical core behavior must not depend on one model vendor, agent product, IDE,
memory provider, or hosted service. Provider-specific behavior belongs behind
adapters and capability declarations.

## 6. One source of truth

Protocols, schemas, extension manifests, and shared contracts must have
canonical definitions. Generated derivatives must not be hand-maintained as
competing truth.

## 7. Explicit boundaries

Core, application, protocol, adapters, daemon, clients, and user interfaces must
have directional dependencies. In particular:

- clients depend on protocol and public application contracts;
- Desktop depends on the platform;
- the platform never depends on Desktop;
- provider adapters depend on canonical interfaces;
- canonical interfaces never depend on provider implementations.

## 8. Safe evolution

Backward compatibility, migrations, deprecations, and versioning are designed
intentionally. Breaking changes require documented impact, migration guidance,
and version changes appropriate to the affected contract.

## 9. Security by default

No hidden telemetry, network calls, hooks, subprocesses, dependency
installation, or credential access. Capabilities must be explicit,
least-privileged, reviewable, and auditable.

## 10. Deterministic foundations, AI verification

Prefer deterministic parsing, validation, policy, and transaction logic. Use AI
where interpretation and reasoning add value, but validate outputs against typed
contracts and repository evidence.

## 11. Reversible operations

Potentially destructive writes should support preview, backup, rollback, or an
equivalent recovery mechanism. Failure must not leave the project in an
unexplained partial state.

## 12. Implementation follows demonstrated need

Do not create packages, services, repositories, abstractions, or extension
points only because they may be useful later. Introduce them when a real
consumer, roadmap trigger, lifecycle difference, or measurable duplication
justifies the boundary.

## 13. Documentation is executable context

Project state, architectural decisions, compatibility guarantees, and Duty
Watch handoffs are part of the product. A code change that makes these documents
false is incomplete.

## 14. Claims require evidence

Agents and maintainers must not invent tests, releases, milestones, issue
status, user demand, performance numbers, or security guarantees. Mark
uncertainty explicitly and verify important claims.

## 15. Open product, optional services

The selected direction is a public monorepo containing the official local
product surfaces. Future hosted, team, support, or enterprise offerings may
fund development, but should preserve portability and avoid unnecessary
lock-in.

## 16. Small, cohesive, testable units

Hand-written modules should remain focused, reviewable, and independently
testable. File size, function size, complexity, nesting, and dependency direction
are explicit engineering budgets, not matters left entirely to agent judgment.

Existing oversized modules are reduced through a non-growing ratchet and
incremental extraction. Their current size is technical debt, not permission for
new code to repeat the pattern. Detailed budgets, exemptions, tests, and
exception evidence are defined in `CODE_QUALITY_STANDARDS.md`.

The budgets must not be gamed by compressed formatting, vague helper modules, or
unnecessary layers. SOLID and Clean Architecture are used to reveal real
responsibilities and boundaries, while principle 12 continues to prohibit
premature abstraction.

## 17. Configurable quality, invariant safety

Intentloom may allow users to choose maintainability profiles, architecture
principles, code budgets, testing requirements, legacy migration behavior, and
technology-specific domain packs.

Those choices are layered over the mandatory platform baseline. No quality
preset or custom policy may disable security, ownership, explicit roots,
evidence before mutation, human approval, provider neutrality, compatibility,
truthful reporting, or reversible writes.

CLI, MCP, Desktop, TUI, daemon, and generated agent guidance must resolve one
canonical effective policy through shared application and protocol contracts.
No client may implement a separate standards engine.
