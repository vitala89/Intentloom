# Specialized Engineering Packs Plan

## Status

Planned extension to `CONFIGURABLE_ENGINEERING_STANDARDS_PLAN.md` and
`ARCHITECTURE_AND_DISCIPLINE_PROFILES_PLAN.md`. This document defines coverage
and extensibility for engineering areas that do not fit one generic frontend,
backend, or infrastructure profile.

It does not add a valid schema, pack manifest, CLI command, or runtime contract.

## Problem

Software development contains too many job titles and specializations to encode
as one fixed dropdown. Titles also vary between organizations. A Platform
Engineer in one company may perform work called DevOps, Developer Experience, or
Cloud Engineering elsewhere.

Hardcoding every title would create duplication, inconsistent rules, and frequent
schema changes. Intentloom needs a stable model based on engineering concerns,
with aliases and compositions for human-facing role names.

## Product decision

Use three related concepts:

1. **Canonical discipline**
   - stable concern-based identity such as `frontend`, `quality-engineering`,
     `security`, `data-engineering`, or `embedded`;
   - owns reusable rules, checks, evidence, and review concerns.
2. **Role composition**
   - one primary discipline plus zero or more secondary perspectives;
   - represents a person, team, task, or agent assignment without duplicating
     canonical rules.
3. **Specialized engineering pack**
   - adds domain-specific architectures, technologies, checks, workflows, and
     evidence requirements;
   - versioned and governed through the same managed extension model as other
     Intentloom packs.

A visible job title is an alias or composition, not a new authorization class.

## Role composition examples

```yaml
roles:
  project:
    - id: product-engineer
      primary: full-stack
      secondary:
        - frontend
        - backend
        - qa
        - accessibility
    - id: desktop-platform-engineer
      primary: desktop
      secondary:
        - rust
        - security
        - release-engineering
    - id: ai-product-engineer
      primary: ml-ai
      secondary:
        - backend
        - data-engineering
        - security
        - evaluation
```

This example is illustrative only. It is not a valid contract until schemas and
migrations are accepted.

## Role resolution rules

Intentloom should support:

- one primary discipline for presentation and default prioritization;
- multiple secondary perspectives;
- task-specific additions without changing the project role permanently;
- organization-defined aliases;
- explicit required reviewers;
- task resolution by affected architecture scopes and files;
- user confirmation when inference is ambiguous.

Role resolution must not:

- grant capabilities;
- infer identity;
- assign repository ownership automatically;
- approve changes;
- contact reviewers;
- expose secrets;
- deploy, merge, release, or publish.

## Core discipline catalog

The initial core should remain small and concern-based:

- frontend;
- backend;
- full-stack;
- mobile;
- desktop;
- quality-assurance;
- quality-engineering or SDET;
- DevOps;
- SRE;
- platform-engineering;
- security or AppSec;
- data-engineering;
- ML or AI engineering;
- database-engineering;
- UX and UI engineering;
- accessibility;
- software-architecture;
- technical-documentation;
- release-engineering;
- developer-experience.

Specialized packs extend this catalog rather than forcing the core schema to
change for every industry or platform.

## Specialized first-party candidates

### Embedded and firmware

Candidate concerns:

- hardware abstraction layers;
- memory, timing, interrupt, and power constraints;
- RTOS tasks and message boundaries;
- deterministic behavior;
- unsafe-code review;
- hardware-in-the-loop and simulator tests;
- firmware update and rollback safety;
- device identity and secure boot;
- cross-compilation and target support.

Candidate architecture strategies:

- layered firmware;
- HAL plus application services;
- event loop;
- RTOS task/message architecture;
- state machines;
- data-oriented control loops.

### IoT and edge

Candidate concerns:

- intermittent connectivity;
- local-first state;
- device provisioning;
- fleet updates;
- protocol compatibility;
- telemetry minimization;
- device-cloud trust boundaries;
- offline queues and conflict resolution;
- resource and battery limits.

Candidate architecture strategies:

- edge gateway;
- device-cloud twin;
- store-and-forward;
- event-driven ingestion;
- local inference;
- offline synchronization.

### Game development

Candidate concerns:

- frame budgets;
- deterministic simulation;
- asset pipelines;
- input, physics, rendering, audio, and networking boundaries;
- save compatibility;
- replay and synchronization;
- platform certification;
- performance profiling.

Candidate architecture strategies:

- entity-component-system;
- data-oriented design;
- scene graph;
- game-state machines;
- client-server simulation;
- deterministic lockstep;
- authoritative server.

### Graphics, AR, VR, and spatial computing

Candidate concerns:

- rendering pipelines;
- GPU resource lifecycle;
- frame pacing and latency;
- spatial anchors and coordinate systems;
- sensor permissions;
- motion comfort;
- accessibility;
- device capability fallbacks;
- platform-specific packaging.

Candidate architecture strategies:

- render graph;
- scene graph;
- ECS;
- native engine plus application shell;
- local spatial state plus synchronized services.

### Blockchain and distributed ledger

Candidate concerns:

- on-chain and off-chain boundaries;
- deterministic smart-contract execution;
- upgrade and migration strategy;
- key custody;
- transaction finality;
- replay and reentrancy risk;
- economic and authorization invariants;
- audit evidence;
- testnet and mainnet separation.

Candidate architecture strategies:

- on-chain contract plus off-chain services;
- event-indexed read models;
- multisignature governance;
- proxy or immutable-contract deployment;
- decentralized identity integration.

A blockchain pack must not treat financial or governance safety as ordinary code
style. High-impact changes require explicit threat review and human approval.

### Cloud engineering

Candidate concerns:

- account and tenancy boundaries;
- infrastructure as code;
- regions and availability zones;
- identity and least privilege;
- cost and capacity;
- deployment and rollback;
- observability;
- data residency;
- disaster recovery;
- supply-chain controls.

Candidate architecture strategies:

- serverless;
- container platform;
- managed service composition;
- multi-region active-passive or active-active;
- event-driven cloud architecture;
- hybrid cloud.

### Infrastructure and GitOps

Candidate concerns:

- declarative desired state;
- environment promotion;
- policy as code;
- drift detection;
- secret references;
- immutable artifacts;
- change review;
- rollback and reconciliation;
- cluster and tenant boundaries.

Candidate architecture strategies:

- GitOps reconciliation;
- reusable infrastructure modules;
- environment overlays;
- control plane and workload separation;
- platform APIs.

### API and integration engineering

Candidate concerns:

- contract ownership;
- compatibility;
- schema evolution;
- authentication and authorization;
- rate limits;
- retries, idempotency, and timeouts;
- error semantics;
- consumer-driven contract tests;
- event and webhook delivery.

Candidate architecture strategies:

- REST;
- GraphQL;
- RPC;
- event and message integration;
- API gateway;
- backend for frontend;
- anti-corruption layer.

### Data science

Candidate concerns:

- experiment reproducibility;
- dataset provenance;
- statistical assumptions;
- notebook-to-production transition;
- environment and dependency capture;
- leakage prevention;
- evaluation and uncertainty;
- privacy;
- reviewable artifacts.

Candidate architecture strategies:

- experiment workspace plus production pipeline;
- feature preparation and evaluation stages;
- batch scoring;
- interactive analysis with governed publication.

### MLOps and model platform

Candidate concerns:

- training and serving separation;
- model registry;
- dataset and feature versioning;
- deployment gates;
- drift and performance monitoring;
- rollback;
- evaluation suites;
- compute and accelerator scheduling;
- access to sensitive training data.

Candidate architecture strategies:

- training pipeline plus online serving;
- batch inference;
- feature store;
- model gateway;
- multi-model routing;
- evaluation and promotion pipeline.

### Generative AI and agent engineering

Candidate concerns:

- provider and model identity;
- prompt, tool, and policy versioning;
- retrieval provenance;
- context isolation;
- evaluation;
- hallucination and uncertainty handling;
- capability and approval boundaries;
- memory retention;
- privacy and training-data consent;
- cost and latency.

Candidate architecture strategies:

- retrieval-augmented generation;
- tool-using agent;
- planner and executor separation;
- multi-agent orchestration;
- model gateway;
- local and hosted hybrid inference;
- deterministic policy layer around probabilistic models.

### Robotics and autonomous systems

Candidate concerns:

- sensing, planning, control, and actuation boundaries;
- real-time behavior;
- simulation and hardware tests;
- fail-safe states;
- human override;
- map and coordinate ownership;
- device communication;
- safety evidence.

Candidate architecture strategies:

- sense-plan-act;
- behavior tree;
- state machine;
- message bus;
- real-time control loop;
- digital twin and simulator.

### Scientific and high-performance computing

Candidate concerns:

- numerical correctness;
- reproducibility;
- parallel execution;
- memory and communication cost;
- accelerator portability;
- checkpointing;
- data formats;
- benchmark evidence.

Candidate architecture strategies:

- batch pipeline;
- distributed-memory processing;
- shared-memory parallelism;
- GPU kernels;
- workflow DAG;
- checkpoint and restart.

### Commerce, finance, health, public sector, and other regulated domains

Industry packs should add regulatory and domain constraints without copying the
entire technology or architecture catalog.

Candidate concerns include:

- auditability;
- retention;
- privacy;
- consent;
- segregation of duties;
- traceability;
- accessibility;
- change approval;
- incident reporting;
- regional requirements.

Legal or regulatory claims must be versioned, jurisdiction-scoped, sourced, and
reviewed by qualified humans. Intentloom must not present a generic pack as legal
compliance certification.

## Pack composition

A specialized pack may contribute:

- discipline aliases;
- architecture strategies on existing or new axes;
- technology constraints;
- test categories;
- evidence requirements;
- conformance checks;
- task templates;
- review requirements;
- migration guidance;
- examples and fixtures.

It must not redefine mandatory platform invariants or silently override another
pack. Conflicts are resolved explicitly through stable rule IDs and precedence
contracts.

## Pack manifest requirements

Every specialized pack should declare:

- stable ID and semantic version;
- publisher and provenance;
- license;
- supported Intentloom compatibility range;
- supported platforms, languages, and tools;
- provided disciplines and aliases;
- provided architecture strategies and axes;
- rule IDs and severity;
- deterministic checks and required tooling;
- network, process, filesystem, and credential needs;
- data handling and retention behavior;
- conflicts and dependencies;
- references and last-reviewed date;
- migration and deprecation policy.

External packs remain untrusted until explicitly reviewed and enabled. Pack
installation must never imply permission to execute arbitrary code.

## Detection and recommendation

Intentloom may detect evidence such as Cargo targets, mobile manifests, game
engines, infrastructure files, model artifacts, notebooks, smart contracts, or
embedded build definitions.

Detection should produce:

- candidate packs;
- evidence paths;
- confidence;
- exclusions and scan limits;
- ambiguity;
- security impact;
- confirmation requirements.

Detection must not enable a pack, install tooling, access a network, or rewrite
architecture automatically.

## Task-specific resolution

A task should receive only relevant guidance.

Example:

```text
change touches a Tauri command and authentication UI
→ desktop + frontend + rust + tauri-2
→ security + QA + accessibility perspectives
→ local IPC architecture scope
→ capability and approval policies remain separate
```

Another example:

```text
change touches a model evaluation pipeline
→ ml-ai + data-engineering + MLOps
→ evaluation + security + privacy perspectives
→ training pipeline architecture scope
→ no production deployment permission is inferred
```

## Client surfaces

### CLI

Candidate commands:

```bash
intentloom packs list
intentloom packs detect --root .
intentloom packs explain embedded
intentloom packs compatibility game-development,networking
intentloom roles compose --primary desktop --with security,qa
intentloom task profiles --paths apps/desktop/src-tauri/**
```

### Desktop and TUI

Candidate views:

- discipline and specialization catalog;
- detected pack recommendations;
- primary and secondary role composition;
- architecture strategies contributed by packs;
- compatibility and conflicts;
- required tools and permissions;
- task-specific effective guidance;
- pack provenance, version, and trust state.

### MCP

Candidate read-only resources and tools:

```text
intentloom://packs/catalog
intentloom://packs/effective
intentloom://roles/catalog
intentloom_specialized_packs_detect
intentloom_specialized_pack_explain
intentloom_role_compose
intentloom_task_profile_resolve
```

MCP must not install or execute a pack.

## Delivery sequence

1. Define canonical discipline IDs and role composition schema.
2. Define specialized pack manifests and trust states.
3. Add aliases without duplicating canonical rules.
4. Implement read-only detection and compatibility resolution.
5. Add a small initial set of first-party specialized packs with fixtures.
6. Expose equivalent CLI, daemon, MCP, Desktop, and TUI results.
7. Add deterministic checks only where evidence and tooling are stable.
8. Add reviewed external packs through the managed extension lifecycle.
   S8a met by `previewExternalSpecializedPack` /
   `activateExternalSpecializedPack` (PR #319). S8b adds canonical digest and
   `prepareExternalSpecializedPackLockEntry` for extension-lock entries (PR
   #355). S8c adds `applyExternalSpecializedPackActivation` for transactional
   project-owned lock apply.

## Acceptance criteria

The specialized-pack capability is complete when:

- job-title aliases resolve to stable concern-based disciplines;
- users can compose primary and secondary perspectives;
- specialized areas extend the system without changing the core schema for every
  new title;
- pack architecture strategies participate in scoped compatibility resolution;
- task guidance includes only relevant packs and perspectives;
- role, pack, capability, ownership, and approval remain separate;
- external packs expose provenance, compatibility, permissions, and trust state;
- detection is read-only and confirmation-based;
- clients resolve the same effective result;
- no pack can weaken mandatory safety invariants.

## Non-goals

This feature does not:

- claim to enumerate every software job title;
- make a title a security identity;
- automatically install domain tooling;
- certify regulatory compliance;
- enable network, deployment, secret, or release capabilities from a role;
- require every project to use specialized packs;
- treat detected files as proof that an architecture is correct;
- let third-party packs execute arbitrary code through the policy resolver.
