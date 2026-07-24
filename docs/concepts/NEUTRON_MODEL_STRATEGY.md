# Neutron Model Strategy

## Purpose

**Neutron** is the working name for Intentloom-native engineering intelligence. It should begin as a provider-neutral agent runtime and evaluation system, then evolve toward optional Intentloom-specialized open-weight models only when data, benchmarks, licensing, infrastructure, and product demand justify that work.

The product relationship is:

```text
Intentloom defines engineering intent.
Neutron understands that intent and helps execute it safely.
```

Neutron is not initially a foundation model and must not be represented as one. Early versions may run on explicitly selected hosted or local models while Intentloom supplies the distinctive context, tools, policies, workflows, planning, evidence, conformance, approval, and transaction behavior.

The name is a working codename until package, domain, model-registry, and trademark checks are complete.

## Product layers

### Neutron Runtime

The first deliverable is an Intentloom-native agent runtime containing:

- a provider-neutral model interface;
- project-scoped context construction;
- policy, workflow, skill, and documentation selection;
- typed Intentloom tool invocation;
- explicit agent modes and task state;
- evidence-aware output classification;
- planning and review protocols;
- capability and approval enforcement;
- session provenance, export, retention, and deletion;
- model and provider evaluation hooks.

A user may see:

```text
Agent: Neutron
Underlying model: explicitly selected provider/model
Mode: Discuss | Inspect | Plan | Review
Project: explicit root
Capabilities: visible grant
Network: visible state
```

This may be branded as Neutron because the agent behavior is produced by the Intentloom runtime, but documentation must identify the underlying model and avoid implying ownership of third-party weights.

### NeutronBench

Before model training, Intentloom should define a reproducible engineering-agent benchmark. Benchmark categories should include:

- project inspection and context selection;
- architecture reasoning and convention preservation;
- policy and workflow adherence;
- correct typed-tool selection;
- safe mutation avoidance;
- evidence-grounded claims and uncertainty handling;
- implementation-plan quality;
- patch acceptance and test success;
- conformance interpretation;
- rollback and migration awareness;
- long-horizon task completion;
- token, latency, and tool-call efficiency.

Every benchmark case requires a versioned repository fixture, task, allowed capabilities, expected evidence, acceptance checks, and reproducible evaluator configuration. Benchmark results must identify model, provider, version, runtime configuration, tool set, and dataset version.

### Neutron Local

A later local preview may run an existing compatible open-weight model without training. This stage validates local inference, privacy, typed tools, context budgets, and product experience before investing in new weights.

The project should start with models small enough for practical experimentation and should evaluate larger agentic coding models only where measurable benchmark gains justify infrastructure and licensing complexity.

### Neutron-tuned models

After NeutronBench and sufficient licensed training data exist, Intentloom may publish fine-tuned or adapter-based models such as a developer preview. Candidate techniques include supervised fine-tuning, LoRA or QLoRA, preference optimization, tool-call training, distillation, and later bounded reinforcement learning in reproducible software-engineering environments.

Potential model specializations include:

- Neutron Architect;
- Neutron Code;
- Neutron Fast;
- Neutron Local;
- Neutron Cloud.

Names, parameter counts, and publication forms must follow evidence rather than being committed in advance.

### Foundation-model research

Training a foundation model from scratch is not a current roadmap commitment. It requires a separate business case, dataset governance program, tokenizer and pretraining research, distributed training infrastructure, safety and evaluation systems, serving capacity, and sustained ML staffing.

## Intended specialization

Neutron should specialize in policy-aware engineering rather than generic code completion. Target behaviors include:

- understanding product and engineering intent;
- inspecting a project before proposing architecture-sensitive work;
- following canonical policies, workflows, skills, and ADRs;
- preserving existing architectural boundaries and public contracts;
- producing feature briefs, system designs, context packs, and implementation plans;
- selecting the correct typed Intentloom operation for the task;
- distinguishing verified, missing, conflicting, ambiguous, inferred, and unsupported evidence;
- showing exact diffs and policy impact before mutation;
- respecting project roots, ownership, capabilities, and approval boundaries;
- verifying tests and outcomes before claiming success;
- recording reviewable provenance and engineering evidence.

A preferred trajectory for a complex request is:

```text
inspect
→ retrieve relevant intent and evidence
→ identify constraints and uncertainty
→ propose alternatives and trade-offs
→ prepare a reviewable plan
→ show paths, diff, tests, policy impact, and rollback behavior
→ receive explicit approval
→ revalidate current state
→ apply transactionally
→ verify and record evidence
```

## Training-data strategy

Training data must be licensed, provenance-complete, privacy-safe, and suitable for the selected base model license.

Candidate sources include:

- synthetic engineering tasks over versioned open-source fixtures;
- accepted project-local dogfooding trajectories with explicit consent;
- licensed issue, pull-request, review, test, and release histories;
- manually authored policy, conformance, architecture, and tool-use examples;
- evaluator-generated preference pairs with human review.

Private user repositories, conversations, prompts, generated artifacts, evidence, or telemetry must never be used for training by default. Any future contribution program requires explicit opt-in, documented retention and deletion, redaction, dataset provenance, and a separate policy review.

High-value training trajectories include:

- policy plus project state to compliant implementation plan;
- architecture decision plus proposed change to compatibility analysis;
- unknown project state to correct inspect or doctor invocation;
- release question to timeline, analysis, and conformance operations;
- missing evidence to an uncertainty-aware answer rather than a false violation claim;
- mutation request to a prepared plan rather than direct filesystem action;
- long-horizon inspect, plan, edit, test, diagnose, correct, and verify sequences.

## Base-model evaluation

Candidate open-weight bases must be selected through measurement, not popularity. Evaluation must cover:

- license and redistribution rights;
- commercial-use terms;
- model and dataset transparency;
- coding and tool-use quality;
- context length and memory behavior;
- local and hosted inference cost;
- hardware requirements;
- fine-tuning support;
- safety and prompt-injection resilience;
- benchmark performance inside the Neutron runtime.

No third-party model may be renamed as a Neutron-trained model without material Intentloom training and transparent attribution. A prompt, wrapper, or routing layer alone remains Neutron Runtime powered by the named underlying model.

## Safety and transparency

- Display the underlying provider, model, version, runtime, network mode, and data-handling state.
- Do not conceal derivative-model attribution or base-model licensing.
- Do not use project data for training without explicit opt-in.
- Do not allow model output to become mutation approval.
- Evaluate prompt injection, tool misuse, secret exposure, unsafe patches, false success claims, and evidence fabrication.
- Keep capability enforcement outside model weights and prompts.
- Preserve deterministic application validation and transaction guarantees even when the model is unavailable or incorrect.
- Permit users to export and delete local sessions and training contributions.

## Open-source and commercial options

A possible long-term structure is:

```text
Intentloom Core       open source
Neutron Runtime       open source
NeutronBench          open where licenses permit
Neutron Local         open weights or adapters where permitted
Neutron Cloud         optional managed service and proprietary checkpoints
```

This is a strategic option, not a current licensing commitment. Every model release requires its own license, notice, data-governance, security, and publication review.

## Delivery sequence

1. Build the desktop agent workspace and provider-neutral Neutron Runtime.
2. Define stable typed tools, agent-session records, capability grants, and evaluation traces.
3. Create NeutronBench with representative Intentloom, TypeScript, Angular, Rust, Tauri, and sanitized existing-project cases.
4. Benchmark hosted and open-weight models through the same runtime.
5. Release an experimental Neutron Local configuration using an existing model without new training.
6. Collect only licensed and explicitly approved training trajectories.
7. Train a small adapter or fine-tuned developer preview and compare it against the unmodified base.
8. Add preference optimization or bounded software-engineering reinforcement learning only after reproducible environments and rewards are verified.
9. Consider larger custom checkpoints or foundation-model research only after product, data, benchmark, infrastructure, and staffing gates are met.

## Exit gates

### Runtime gate

- provider identity and permissions are visible;
- typed tools are capability-bounded;
- approval enforcement is external to the model;
- sessions are project-isolated, exportable, and deletable;
- benchmark traces are reproducible.

### Benchmark gate

- cases are versioned and reproducible;
- evaluators distinguish factual success, policy adherence, safety, and efficiency;
- results identify exact model and runtime configuration;
- benchmark fixtures do not leak private repositories or secrets.

### First tuned-model gate

- the base-model license permits the intended fine-tuning and distribution form;
- training data has documented provenance and rights;
- the tuned model measurably improves target NeutronBench categories;
- safety and regression checks pass;
- derivative attribution and limitations are published;
- serving and local-use requirements are documented.

## Non-goals for early milestones

- training a foundation model from scratch;
- claiming parity with large commercial coding agents without benchmark evidence;
- hiding the underlying model;
- using user repositories for training by default;
- making model training a blocker for the desktop agent workspace;
- replacing deterministic validators, conformance engines, approvals, or transactions with model judgment;
- selecting a base model before licensing and benchmark review.
