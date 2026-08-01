# AI Model Routing and Effort Profiles

## Status

Candidate provider-neutral model-selection and execution-budget direction for
Neutron and Intentloom clients.

This document does not add a supported provider, model, API key format, runtime
command, pricing guarantee, or public configuration schema by itself.

## Purpose

Intentloom should let a user choose:

- an AI provider and exact model;
- a reasoning-effort profile;
- an Agent Workspace mode;
- context, output, tool, time, retry, subagent, and cost budgets;
- manual, profile-based, or policy-assisted routing;
- an explicit fallback policy.

These concerns remain separate. A stronger model or higher effort never grants
additional filesystem, network, secret, merge, release, deployment, or
publication authority.

## Core separation

```text
provider and model
        !=
effort profile
        !=
workspace mode
        !=
capability grant
        !=
execution budget
        !=
human approval
```

### Provider and model

The exact hosted, enterprise-gateway, or approved local model used for the
request. Reproducible records should preserve the provider identifier, exact
model identifier or snapshot where available, adapter version, endpoint or local
runtime identity, and configuration digest.

### Effort

A provider-neutral request for reasoning depth and verification budget. The
portable values are:

```text
auto
low
medium
high
```

Provider-specific values may exist behind expert configuration, but they are not
portable until a documented and tested mapping exists.

### Workspace mode

The bounded Intentloom workflow state:

- `discuss`;
- `inspect`;
- `plan`;
- `review`;
- `apply`, only through an approved prepared plan.

### Capability grant

The exact project root, paths, typed tools, provider actions, network targets,
and mutation operations available to the session.

### Execution budget

Limits may include:

- maximum context and output tokens;
- provider reasoning or thinking budget where available;
- maximum tool calls and subagents;
- maximum wall-clock duration and retries;
- maximum estimated or actual cost.

### Approval

A human authorization for one exact prepared plan after current-state
revalidation. Model choice and effort are never approval.

## Effort semantics

### Low

Suitable for simple explanations, narrow lookups, short summaries, and small
low-risk planning tasks.

Expected behavior:

- smaller context and output budgets;
- fewer optional alternatives;
- minimal delegation;
- unchanged safety, permission, and validation rules.

### Medium

The balanced default for normal feature planning, project inspection, debugging,
architecture-sensitive review, and standard Project Inception discovery.

Expected behavior:

- balanced context and reasoning;
- explicit assumptions and trade-offs;
- proportionate evidence inspection;
- bounded tool and subagent use.

### High

Suitable for broad migrations, public API changes, security-sensitive review,
complex architecture decisions, difficult incidents, multi-package releases,
and final Project Inception blueprint comparison.

Expected behavior:

- larger reasoning and verification budgets;
- deeper alternative, contradiction, risk, test, rollback, and compatibility
  analysis;
- potentially higher latency and cost.

`high` is not a quality guarantee and does not widen authority.

### Auto

Neutron proposes an effort level from visible task metadata and policy, such as:

- task type and requested output;
- affected packages, deployables, or architecture scopes;
- security and compatibility sensitivity;
- uncertainty and conflicting evidence;
- user and organization budget policy.

The resolved effort, reasons, budget, and provider mapping remain visible.
`auto` cannot silently change providers or exceed an approved financial limit.

## Provider capability negotiation

Provider APIs expose different controls. An adapter must publish a versioned
capability record that includes, where known:

- provider, model, and adapter identity;
- streaming and structured tool-call support;
- context and output limits;
- native effort values or budget controls;
- vision and other required input capabilities;
- network and data-handling behavior.

A canonical effort may resolve as:

- `exact`, when the provider directly supports the requested value;
- `bounded-map`, when a reviewed native budget range is used;
- `model-profile-map`, when a reviewed provider model profile is selected;
- `unsupported`, when the provider cannot honor the request;
- `requires-user-choice`, when materially different mappings exist.

Unsupported effort must fail, request a user choice, use an explicitly approved
mapping, or continue with a clearly reported provider default according to
policy. Silent downgrade is prohibited.

## Model profiles

Users and organizations may define stable aliases such as:

```text
fast
balanced
deep
local-private
security-review
architecture-review
```

A profile resolves to:

- provider and exact model;
- default effort;
- execution budgets;
- required model capabilities;
- allowed workspace modes;
- network and data-handling policy;
- optional ordered fallback chain.

Example candidate configuration:

```yaml
modelProfiles:
  balanced:
    provider: openai
    model: exact-provider-model-id
    effort: medium
    limits:
      maxToolCalls: 24
      maxCostUsd: 2.0
  local-private:
    provider: local
    model: exact-local-model-id
    effort: medium
    network: disabled
```

Credentials never belong in project configuration.

## Configuration hierarchy

Candidate precedence is:

```text
built-in safe defaults
-> organization policy
-> user-local provider configuration
-> project policy
-> task or session selection
-> explicit one-turn override
```

Narrower configuration may reduce budgets and capabilities. It cannot bypass
organization restrictions, provider data policy, project isolation, or mutation
approval.

Project-visible configuration may contain approved providers, model profiles,
required capabilities, default effort by task class, maximum budgets, fallback
policy, network restrictions, and audit requirements.

User-local protected storage contains API credentials, authenticated gateway
endpoints, private local-model paths, account configuration, and user-specific
cost limits.

Secrets must not be written to `.aif/`, Git, prompts, generated instructions,
logs, manifests, source maps, evidence exports, or session exports.

## Routing modes

### Manual

The user selects an exact model and effort.

```bash
loom --model PROVIDER/MODEL --effort high
```

### Profile

The user selects a reviewed alias.

```bash
loom --model-profile balanced
```

### Policy-assisted

Intentloom filters available models by capabilities, data policy, task type, and
budget, then proposes a choice for confirmation.

### Automatic

A later mode may resolve a model from an explicit allowlist. It must show the
candidates considered, rejection reasons, final model, data handling, effort,
budgets, and fallback behavior.

Automatic routing cannot use an unapproved provider, endpoint, model, or network
path.

## Fallback policy

Fallback is disabled by default for sensitive or reproducible workflows.

An enabled chain is explicit, ordered, and capability-checked:

```text
primary exact model
-> approved equivalent hosted model
-> approved local model
-> fail
```

Intentloom does not silently switch providers because of rate limits, cost,
timeouts, or model unavailability.

A fallback record includes the original selection, failure category, selected
fallback, capability and effort differences, data-handling changes, and whether
the task restarted. A changed network or data boundary requires renewed
approval.

## Candidate commands

### Discovery and configuration

```bash
loom models list
loom models list --provider PROVIDER
loom models inspect PROVIDER/MODEL
loom models capabilities PROVIDER/MODEL
loom models profiles
loom models profile show balanced
loom models profile set balanced --provider PROVIDER --model MODEL --effort medium
loom models profile remove balanced
loom models test PROVIDER/MODEL
```

`models test` may use the network and incur cost. It previews the endpoint,
model, requested capabilities, and limits before execution.

### Session and task selection

```bash
loom --model PROVIDER/MODEL --effort low
loom --model PROVIDER/MODEL --effort medium
loom --model PROVIDER/MODEL --effort high
loom --model-profile balanced
loom --effort auto
loom new --model-profile balanced --effort medium
loom inception resume SESSION_ID --effort high
loom blueprint compare OPTION_A OPTION_B --effort high
loom plan --effort high
loom review --model-profile security-review
loom inspect --model-profile local-private
```

Deterministic validation, ownership, conformance, and schema operations do not
require a model merely because one is configured.

### Interactive controls

```text
/model
/model list
/model use PROVIDER/MODEL
/model profile balanced
/effort low
/effort medium
/effort high
/effort auto
/budget
/provider
/network
/session
```

The status surface displays provider, exact model, effort, workspace mode,
network state, data-handling policy, tool capabilities, fallback state, and
estimated budget.

## Desktop experience

Candidate controls include:

- provider, exact model, and profile selectors;
- an Auto, Low, Medium, High effort selector;
- workspace mode and capability indicators;
- network and data-handling indicators;
- context, output, tool, time, retry, subagent, and cost limits;
- fallback and compatibility findings;
- session usage and provenance.

The UI must not present effort as a permission level.

## Budget and cost transparency

Before execution, Intentloom should show when available:

- pricing source and freshness;
- estimated input size and maximum output;
- reasoning or thinking budget;
- maximum tool calls, subagents, duration, and retries;
- maximum cost;
- prompt-cache or batch behavior;
- whether reliable estimation is unavailable.

Actual usage is recorded only when the provider returns trustworthy metadata.

## Enterprise policy

Organizations may define approved providers, gateways, model snapshots, data
classes, routing restrictions, effort and cost ceilings, local-only scopes,
retention rules, audit requirements, network approvals, and fallback policy.

A title, discipline, or role does not itself grant provider access.

## Local models

A local adapter declares model source, license, artifact digest, runtime version,
hardware needs, limits, tool support, effort mapping, network behavior, update
policy, and rollback behavior.

Intentloom never silently downloads model weights or runtimes. Installation and
updates use managed-extension and explicit-approval boundaries.

## NeutronBench relationship

NeutronBench evaluates model and effort combinations independently. A benchmark
record includes exact model and provider identity, canonical and native effort,
runtime and adapter versions, all budgets, result quality, safety and policy
adherence, latency, usage, and degraded mappings.

The same task should compare `low`, `medium`, and `high` to determine whether
additional cost and latency create measurable benefit.

## Success criteria

The first useful increment proves that:

- one provider adapter exposes exact model identity and capabilities;
- users can select a model and `low`, `medium`, or `high` effort;
- unsupported mappings fail or degrade visibly according to policy;
- model, effort, mode, capability, budget, and approval remain separate;
- provider credentials remain outside project metadata;
- network, usage, and fallback state are visible;
- every client consumes one typed configuration;
- higher effort never widens authority;
- deterministic operations remain usable without a model.

## Non-goals

This direction does not promise identical provider behavior, a universal model
quality score, a guarantee that `high` is always better, silent fallback,
mandatory cloud inference, project-stored API keys, automatic purchases,
autonomous budget increases, model output as approval, or hardcoded mutable
provider catalogs in Intentloom Core.
