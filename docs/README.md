# Intentloom documentation

This is the documentation index and the architecture source-of-truth map.
Start here before designing, implementing, or refactoring.

## Source of truth

| Concern                                               | Canonical document                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Current repository structure and dependency direction | [Architecture](architecture/ARCHITECTURE.md)                                                |
| Domain language                                       | [Domain modeling](governance/DOMAIN_MODELING.md)                                            |
| Engineering boundaries and safety                     | [Engineering principles](governance/ENGINEERING_PRINCIPLES.md)                              |
| File budgets, decomposition, and testing              | [Code quality standards](governance/CODE_QUALITY_STANDARDS.md)                              |
| Desktop and React                                     | [React best practices](governance/REACT_BEST_PRACTICES.md)                                  |
| Agent workflow                                        | [AI agent workflow](governance/AI_AGENT_WORKFLOW.md)                                        |
| Accepted decisions                                    | [ADRs](decisions/)                                                                          |
| Product scope                                         | [Roadmap](../ROADMAP.md) and current [roadmap material](roadmap/NEUTRON_RUNTIME_ROADMAP.md) |
| Operational state                                     | [Project state](../PROJECT_STATE.md) and [Duty Watch](../DUTY_WATCH.md)                     |

`DDD_ARCHITECTURE.md`, `UBIQUITOUS_LANGUAGE.md`, `ARCHITECTURE_GUIDELINES.md`,
`BACKEND_ARCHITECTURE.md`, `FRONTEND_ARCHITECTURE.md`, `CODE_STYLE.md`, and
`AGENT_DEVELOPMENT_RULES.md` are not separate sources of truth. Those concerns
belong to the documents above.

Architecture stabilization R1–R4 is merged, including R4D (PR #556). The
maintainer-authorized packages program is
[Packages stabilization plan](architecture/PACKAGES_STABILIZATION_PLAN.md).
P1A is the application audit and decomposition plan. P1 implementation has
not started. Undo U4 and Desktop Undo U5 are not started.

## How this tree is organized

- [Architecture](architecture/ARCHITECTURE.md) — current structure and ownership.
- [Governance](governance/) — principles, domain language, quality, and agent workflow.
- [Decisions](decisions/) — accepted ADRs. Historical decisions stay historical.
- [Roadmap](../ROADMAP.md) and [docs/roadmap/](roadmap/) — current planning. Active plans stay here.
- [Releases](releases/) and [dogfooding records](releases/dogfooding/) — what shipped and what was exercised.
- [Archive](archive/implementation-plans/README.md) — historical implementation plans. Not current authority.
- Guides, reference, concepts, specs, desktop, compatibility, audits, security, and journal remain beside those categories.

## Start here

- [Getting Started](guides/GETTING_STARTED.md)
- [Release state](releases/RELEASE_STATE.md)
- [v0.5 readiness audit](audits/V0_5_RELEASE_READINESS.md)
- [v1.0 readiness audit](releases/V1_0_READINESS_AUDIT.md)
- [v1.0 support policy](releases/SUPPORT_POLICY_V1.md)
- [CLI reference](reference/CLI.md)
- [Configuration and schemas](reference/SCHEMAS.md)
- [Tool adapters](guides/TOOL_ADAPTERS.md)
- [Existing project adoption](guides/EXISTING_PROJECT.md)
- [Generated files](reference/GENERATED_FILES.md)
- [Compatibility matrix](compatibility/COMPATIBILITY_MATRIX.md)
- [Migration guide](releases/MIGRATION_GUIDE.md)

## Product and platform directions

- [Desktop documentation](desktop/README.md)
- [Desktop v0.6 implementation plan](roadmap/DESKTOP_V0_6_IMPLEMENTATION_PLAN.md)
- [Project Design and Development Workspace](concepts/PROJECT_DESIGN_AND_DEVELOPMENT_WORKSPACE.md)
- [Engineering Workspace Implementation Plan](roadmap/ENGINEERING_WORKSPACE_IMPLEMENTATION_PLAN.md)
- [Engineering Workspace Principles](governance/ENGINEERING_WORKSPACE_PRINCIPLES.md)
- [Core and Client Parallel Development Protocol](governance/CORE_CLIENT_PARALLEL_DEVELOPMENT_PROTOCOL.md)
- [Engineering Workspace Desktop, CLI, and TUI UX](desktop/ENGINEERING_WORKSPACE_UX.md)
- [Project Connection, Evidence, and MCP](concepts/PROJECT_CONNECTION_EVIDENCE_AND_MCP.md)
- [Interactive Surfaces and Agent Workspace](concepts/INTERACTIVE_SURFACES_AND_AGENT_WORKSPACE.md)
- [Engineering Process Intelligence](concepts/ENGINEERING_PROCESS_INTELLIGENCE.md)
- [Engineering Assessments and Evidence-backed Audit Reports](concepts/ENGINEERING_ASSESSMENTS_AND_AUDIT_REPORTS.md)
- [Engineering Assessments Implementation Plan](roadmap/ENGINEERING_ASSESSMENTS_IMPLEMENTATION_PLAN.md)
- [Engineering Assessment Principles](governance/ENGINEERING_ASSESSMENT_PRINCIPLES.md)
- [Project Guardian and Canonical Workspace](concepts/PROJECT_GUARDIAN_AND_CANONICAL_WORKSPACE.md)
- [Project Bootstrap, Guardian, and Interactive CLI Plan](roadmap/PROJECT_BOOTSTRAP_GUARDIAN_AND_INTERACTIVE_CLI_PLAN.md)
- [Project Inception and Blueprints](concepts/PROJECT_INCEPTION_AND_BLUEPRINTS.md)
- [Project Inception and Scaffolding Plan](roadmap/PROJECT_INCEPTION_AND_SCAFFOLDING_PLAN.md)
- [Foundation Workshop and Evolutionary Architecture](concepts/FOUNDATION_WORKSHOP_AND_EVOLUTIONARY_ARCHITECTURE.md)
- [Foundation Workshop Implementation Plan](roadmap/FOUNDATION_WORKSHOP_IMPLEMENTATION_PLAN.md)
- [Foundation-First Development Principles](governance/FOUNDATION_FIRST_DEVELOPMENT_PRINCIPLES.md)
- [AI Model Routing and Effort Profiles](concepts/AI_MODEL_ROUTING_AND_EFFORT_PROFILES.md)
- [Nx Incremental Adoption Plan](roadmap/NX_INCREMENTAL_ADOPTION_PLAN.md)
- [Project Inception, Model, and Nx Principles](governance/PROJECT_INCEPTION_MODEL_AND_NX_PRINCIPLES.md)
- [Engineering Quality Packs and Checker Adapters](concepts/ENGINEERING_QUALITY_PACKS_AND_CHECKER_ADAPTERS.md)
- [Engineering Quality Packs, Marketplace, and Graph Plan](roadmap/ENGINEERING_QUALITY_PACKS_MARKETPLACE_AND_GRAPH_PLAN.md)
- [Engineering Quality Pack and Marketplace Principles](governance/ENGINEERING_QUALITY_PACK_AND_MARKETPLACE_PRINCIPLES.md)
- [Agent Session History and Memory Experience](concepts/AGENT_SESSION_HISTORY_AND_MEMORY_EXPERIENCE.md)
- [Agent Session History and Memory Implementation Plan](roadmap/AGENT_SESSION_HISTORY_AND_MEMORY_IMPLEMENTATION_PLAN.md)
- [Enterprise Team Coordination and Approval Graph](concepts/ENTERPRISE_TEAM_COORDINATION_AND_APPROVAL_GRAPH.md)
- [Enterprise Team Workflow and Notifications Plan](roadmap/ENTERPRISE_TEAM_WORKFLOW_AND_NOTIFICATIONS_PLAN.md)
- [Enterprise Coordination Principles](governance/ENTERPRISE_COORDINATION_PRINCIPLES.md)
- [Neutron Model Strategy](concepts/NEUTRON_MODEL_STRATEGY.md)
- [Neutron Runtime Roadmap](roadmap/NEUTRON_RUNTIME_ROADMAP.md)
- [Neutron N3 Context Assembly Brief](roadmap/NEUTRON_N3_CONTEXT_ASSEMBLY_BRIEF.md)
- [Neutron N5 Executable Task Graph Brief](roadmap/NEUTRON_N5_EXECUTABLE_TASK_GRAPH_BRIEF.md)
- [Neutron Mutation Routing Brief](roadmap/NEUTRON_MUTATION_ROUTING_BRIEF.md)
- [Neutron Mutation Slice 3 Security Review](roadmap/NEUTRON_MUTATION_SLICE3_SECURITY_REVIEW.md)
- [Neutron N6 Desktop Read-Only Brief](roadmap/NEUTRON_N6_DESKTOP_READONLY_BRIEF.md)
- [Persistent Agent Memory](concepts/PERSISTENT_AGENT_MEMORY.md)
- [Controlled Agent Learning and Procedural Memory](concepts/CONTROLLED_AGENT_LEARNING_AND_PROCEDURAL_MEMORY.md)
- [Security Analysis and Remediation](concepts/SECURITY_ANALYSIS_AND_REMEDIATION.md)
- [Memory and Security Roadmap](roadmap/MEMORY_AND_SECURITY_ROADMAP.md)
- [Controlled Agent Learning Roadmap](roadmap/CONTROLLED_AGENT_LEARNING_ROADMAP.md)
- [Public Monorepo Evolution Plan](roadmap/PUBLIC_MONOREPO_EVOLUTION_PLAN.md)

## Repository governance

- [Contributing guide](../CONTRIBUTING.md)
- [Security policy](../SECURITY.md)
- [Project roadmap](../ROADMAP.md)

The public documentation site is built with VitePress and deployed to GitHub Pages through [.github/workflows/docs.yml](../.github/workflows/docs.yml).

## Design First and diagram sources

[Design-first policy](governance/DESIGN_FIRST_POLICY.md) defines approval gates and diagram conventions. New task designs use `designs/<task-slug>/` for editable Excalidraw (`.excalidraw` plus `.svg`), diagrams.net (`.drawio` plus `.svg`) and/or Mermaid (`.md`/`.mmd`). Use only necessary tools; existing approved designs need not be relocated or duplicated.

[P1G.3 Foundation workshop cycle](designs/p1g3-foundation-workshop-cycle/SYSTEM_DESIGN.md) is the approved design (PR #591). Implementation is merged as PR #596 (`488067af1d39a614e718660944c7f3ae030b1be7`).

[P1H.1 Persistent memory extraction](designs/p1h1-persistent-memory/SYSTEM_DESIGN.md) is the approved design (PR #597, `eeda24d7bfba504d5ea6c7a781a6a054117a8a15`). Implementation is merged as PR #598 (`5f7917c1cef0997f6947932aa2f8f4186ac2decc`). [P1H.2 Agent Session extraction](designs/p1h2-agent-session/SYSTEM_DESIGN.md) is the approved design (PR #599, `ff7cb79329f403220aa4b369eede4cb8f06e591b`). Implementation is merged as PR #600 (`efce5db2b40d1f350df43d38b4b97d1ccd5c2736`). [P1H.3 Skill Catalog and Proposals extraction](designs/p1h3-skill-catalog-proposals/SYSTEM_DESIGN.md) is the approved design (PR #601, `6b387a34c221f967a15ef670d53bea9b76e40828`). P1H.3a catalog read is merged as PR #602 (`460b81efd1e81f5b24a22e11d3af4680c8f28aad`). P1H.3b proposal store and evaluation is merged as PR #603 (`f116d199a0783870806e8c8660d90385c106f8e1`). P1H.3c skill mutation and procedural memory is merged as PR #604 (`911b229af00fcde54d8861af83a56e7e61df0902`). P1H.3 is fully implemented. [P1H.4 Security Findings and SARIF Import extraction](designs/p1h4-security-findings-sarif/SYSTEM_DESIGN.md) is the approved design (PR #605, `6a9d0d26015caa857c19d0d22415904d832ad818`). P1H.4a finding store and coverage is merged as PR #606 (`ec951f32246ad0c94a145f520dc1862d9592c72e`). P1H.4b SARIF import is merged as PR #607 (`7a77db52753360f0029cd266d8c95eb78c34995c`). P1H.4 is fully implemented. [P1H.5 Security Policy and Sandbox extraction](designs/p1h5-security-policy-sandbox/SYSTEM_DESIGN.md) is the approved design (PR #608, `1d0611070b02c5e9f0f0e2816a0f560fbf18c18e`). P1H.5a policy, baseline, and comparison is merged as PR #609 (`7589c6ccff5d79d1f8c6e5de34d2f521ea3caa6e`). P1H.5b sandbox policy and evaluation is merged as PR #610 (`2c0749dce9a31976195277971d6fb35fe663cd31`). P1H.5 is fully implemented. [P1H.6 Continuous Security Audit extraction](designs/p1h6-continuous-security-audit/SYSTEM_DESIGN.md) is the approved design (PR #611, `52b34c8b202cb07ab30c4f3e991dbce3815510a4`). Implementation is open as PR #612 (https://github.com/vitala89/Intentloom/pull/612) on `refactor/application-continuous-security-audit-p1h6` and is not merged. P1H.7 and later stages have not started.
