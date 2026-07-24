# Public Monorepo Evolution Plan

## Status

This document records the preferred long-term repository and product-development direction for Intentloom.

Intentloom should evolve as one public, open-source monorepo containing the infrastructure core, CLI, daemon, MCP integration, interactive terminal interface, official Desktop application, agent runtime, memory, security, and supporting documentation.

This is a sequencing plan, not an instruction to reorganize the repository immediately. Structural changes should happen only when the corresponding product surface is ready to be implemented and the migration has a measurable benefit.

## Product principle

Intentloom is developed as an open product rather than an intentionally limited open-core edition.

The public repository should provide a complete local-first engineering platform. Future optional hosted, team, enterprise, model-serving, synchronization, and support services may fund development without making the local CLI or Desktop application artificially incomplete.

The preferred model is:

```text
open local product
+ community sponsorship
+ optional paid hosted and organizational services later
```

Possible future funding channels include GitHub Sponsors, one-time donations, organizational sponsorship, paid support, implementation assistance, managed Neutron inference, encrypted synchronization, team collaboration, enterprise deployment, and security intelligence services.

No commercial service is required for the first Desktop milestones.

## Architectural invariant

All user-facing surfaces remain adapters over common application operations and versioned protocols.

```text
CLI
TUI
Desktop
MCP
Agent runtime
        ↓
versioned protocol and typed application operations
        ↓
core / validation / evidence / conformance / memory / security / transactions
```

The following rule is mandatory:

```text
Desktop depends on the platform.
The platform never depends on Desktop.
```

Desktop, TUI, MCP, and agent interfaces must not duplicate project inspection, ownership, validation, evidence, conformance, memory, security, approval, or transaction logic.

## Target repository shape

The exact paths may evolve, but the intended logical structure is:

```text
Intentloom/
├── apps/
│   ├── desktop/
│   ├── docs-site/
│   └── optional future reference applications/
├── packages/
│   ├── cli/
│   ├── core/
│   ├── application/
│   ├── protocol/
│   ├── daemon/
│   ├── mcp-server/
│   ├── validator/
│   ├── evidence-*/
│   ├── conformance/
│   ├── memory/
│   ├── security/
│   ├── agent-runtime/
│   ├── desktop-client/
│   └── ui/
├── catalog/
├── docs/
├── examples/
└── tooling/
```

This is a logical destination, not a requirement to move existing packages prematurely.

## Why the Desktop remains in the monorepo

Keeping the official Desktop application in the public monorepo provides:

- atomic changes across daemon, protocol, application operations, and UI;
- one compatibility matrix;
- one review and security history;
- easier contributor participation;
- verifiable local-first and privacy claims;
- less package publishing and cross-repository coordination during early development;
- simpler dogfooding of memory, security, extensions, and agent workflows;
- reduced risk of duplicated or diverging business logic.

A separate Desktop repository should be considered only if there is later evidence of a materially different release lifecycle, team boundary, access-control requirement, repository-size problem, licensing boundary, or operational ownership model.

## Delivery stages and triggers

### Stage 0: Preserve the current structure

Current action:

- keep existing packages and release workflows stable;
- do not reorganize merely to match the target diagram;
- continue stabilizing application operations, protocol, daemon, MCP, evidence, conformance, extensions, memory, and security contracts.

Exit trigger:

- the first real Desktop implementation milestone is approved;
- daemon and protocol support enough deterministic read-only operations for a useful UI.

### Stage 1: Prepare Desktop integration surfaces

Add or stabilize:

- versioned daemon protocol;
- typed local client;
- capability discovery;
- project-root selection;
- operation progress and cancellation events;
- structured errors;
- protocol compatibility tests;
- local authentication or process ownership where required;
- no direct Desktop access to internal package state.

Preferred dependency direction:

```text
Desktop UI → desktop client → daemon protocol → application operations
```

Exit trigger:

- inspect, doctor, diff, timeline, release analysis, conformance, and extension status can be invoked through the same typed boundary with CLI-equivalent results.

### Stage 2: Introduce `apps/desktop`

Create the official Desktop application inside the existing workspace.

Initial scope:

- project selection;
- project overview;
- inspect;
- doctor;
- ownership and drift;
- diff review;
- timeline and releases;
- conformance;
- extensions;
- explicit privacy and capability state.

Initial Desktop remains read-only except for already established reviewed application transactions.

Exit trigger:

- packaged Desktop builds run on supported platforms;
- read-only equivalence with CLI and daemon is verified;
- closing or cancelling the application leaves the project unchanged;
- secrets and provider credentials remain outside project metadata and logs.

### Stage 3: Add shared UI and client packages only when duplication appears

Possible packages:

```text
packages/desktop-client
packages/ui
packages/security-model
packages/memory-model
packages/agent-protocol
```

Do not create these packages in anticipation alone. Extract them when at least two consumers or a clear isolation boundary exists.

Exit trigger:

- duplicated types or UI behavior have appeared;
- package ownership and compatibility responsibilities are documented.

### Stage 4: Add persistent memory and agent workspace

Integrate:

- project-scoped session storage;
- accepted memory records;
- retrieval and provenance;
- Discuss, Inspect, Plan, and Review modes;
- provider-neutral model configuration;
- visible network, model, tool, and permission state;
- export, retention, and deletion controls.

The model cannot directly mutate files. Any future write follows prepared plan, exact diff, explicit approval, revalidation, and transaction rules.

Exit trigger:

- agent sessions can use bounded typed tools;
- memory remains project-isolated;
- model output cannot silently become canonical intent or approval.

### Stage 5: Add Security Center

Integrate the public security contracts and scanners into a visual surface:

- findings and verification status;
- dependencies and supply chain;
- secrets;
- hooks, MCP, extension, memory, and agent security;
- coverage and unsupported areas;
- reviewed remediation and exact patch previews;
- scan history and accepted risks.

Exit trigger:

- findings retain provenance and confidence;
- deterministic evidence is separated from model inference;
- no exploit execution or autonomous remediation exists;
- every applied patch uses the shared transaction boundary.

### Stage 6: Add Neutron Runtime experiences

Add the official UI for:

- provider-neutral Neutron Runtime;
- hosted and local model selection;
- NeutronBench results where appropriate;
- context and tool inspection;
- plan and artifact review;
- transparent underlying model attribution.

Training or tuning model weights remains a separate research program and cannot block the Desktop.

### Stage 7: Evaluate optional hosted services

Only after local adoption and demand evidence, evaluate:

- managed Neutron inference;
- encrypted synchronization;
- shared team memory and policies;
- organization workspaces;
- hosted security intelligence;
- scheduled remote tasks;
- enterprise deployment and support.

The local product remains usable without an account or subscription unless a future decision explicitly changes that contract.

## Versioning and release strategy

The monorepo does not require one shared product version.

Possible independent versions:

```text
Intentloom CLI          0.x
Intentloom Desktop      0.x
Daemon protocol         1.x
Extension schemas       1.x
Memory schema           1.x
Security finding schema 1.x
```

Each independently released artifact requires:

- its own compatibility statement;
- changelog entries;
- migration notes when relevant;
- release evidence;
- supported-platform declaration;
- rollback or downgrade guidance where possible.

Atomic source changes may still be delivered through one pull request.

## CI strategy

As the monorepo grows, use path-aware and package-aware workflows rather than running every expensive build for every documentation change.

Required categories may include:

- platform typecheck, lint, build, and tests;
- protocol compatibility;
- CLI packed-runtime tests;
- daemon integration tests;
- Desktop unit and end-to-end tests;
- Tauri or platform packaging checks;
- security and dependency checks;
- documentation validation;
- release-specific workflows.

Shared contracts should still trigger all affected consumers.

## Open-source and funding boundary

The project should avoid promising that donations are the only possible funding source forever.

The public commitment should be:

> Intentloom Core and the official Desktop application are developed openly. The project may later offer optional hosted, team, enterprise, model-serving, synchronization, security-intelligence, and support services that fund continued open-source development.

Open and portable contracts should include:

- project metadata;
- schemas;
- protocol definitions;
- memory export;
- security findings;
- extension manifests and locks;
- evidence and conformance formats;
- local data deletion and migration paths.

Future paid services must not become hidden authority over local project mutation.

## Sponsorship readiness

When the project is ready to accept support, add and maintain:

- `.github/FUNDING.yml`;
- a funding section in the README;
- transparent use-of-funds language;
- sponsor recognition rules;
- a conflict-of-interest policy for sponsored roadmap work;
- clear separation between donations and guaranteed feature delivery.

Sponsorship does not grant private access to user projects, model prompts, memory, security findings, or roadmap authority unless governed by a separate explicit agreement.

## When to consider repository separation later

A separate repository may be justified only when at least one of these conditions is demonstrated:

1. model weights or datasets require a different license or storage model;
2. benchmarks or fixtures are too large for the main repository;
3. a hosted service has a genuinely independent deployment and security lifecycle;
4. a separate team owns a product with stable public interfaces;
5. repository size or CI cost materially harms contributors;
6. legal or customer access requirements require separation;
7. release cadence cannot be managed safely inside the monorepo.

Even then, public protocol and portability contracts should remain in the main Intentloom repository.

## Agent implementation checklist

Before creating a new application, package, or repository, the implementing agent must check:

1. Does an existing application operation already own this behavior?
2. Is this presentation logic, reusable domain logic, or infrastructure?
3. Does the proposed dependency preserve the direction toward Core?
4. Is there a second consumer that justifies package extraction?
5. Does the change require a protocol or schema version?
6. Can CLI, MCP, daemon, Desktop, and agent outputs remain equivalent?
7. Does the change preserve local-first, no hidden telemetry, explicit capabilities, and human-approved mutation?
8. Does it require new CI, release, changelog, migration, or compatibility evidence?
9. Is repository separation supported by a concrete operational requirement rather than anticipation?
10. Has the current roadmap stage and its exit trigger been satisfied?

If these questions are not answered, the agent should propose a reviewed architecture decision before restructuring the repository.

## Non-goals

This plan does not require:

- immediate directory migration;
- one version for every package and application;
- a hosted account;
- mandatory telemetry;
- a paid subscription;
- closing the Desktop source;
- moving all future experiments into the main runtime;
- placing model weights or large datasets in the core repository;
- preventing third parties from building alternative clients.

## Decision summary

The current preferred direction is one public Intentloom monorepo with a complete open local product. The Desktop application should be introduced inside that monorepo when the daemon and protocol are ready, then expanded in controlled stages through memory, security, agent workspace, and Neutron experiences.

Repository separation remains a later evidence-based option, not the default starting architecture.
