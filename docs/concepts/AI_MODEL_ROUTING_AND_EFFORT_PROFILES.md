# AI Model Routing and Effort Profiles

## Status

Candidate provider-neutral model-selection and execution-budget direction for
Neutron and Intentloom clients.

This document does not add a supported provider, model, API key format, runtime
command, pricing guarantee, or public configuration schema by itself.

## Purpose

Intentloom should let a user choose:

- which AI provider and model should be used;
- how much reasoning effort should be allocated;
- which workflow mode is active;
- what cost, context, output, latency, and tool budgets apply;
- whether routing is manual or policy-assisted;
- whether a fallback is allowed.

These concerns must remain separate. Selecting a more capable model or a higher
effort level must never increase filesystem, network, secret, deployment, merge,
release, or publication permissions.

## Core separation

```text
provider + model
        ≠
effort profile
        ≠
workflow mode
        ≠
capability grant
        ≠
financial and execution budget
        ≠
mutation approval
```

### Model

The exact provider model identifier, for example a hosted model, an enterprise
gateway model, or an approved local model.

### Effort

A provider-neutral request for how much reasoning depth and verification budget
Neutron should attempt for the current turn or task.

### Mode

The Intentloom workflow boundary:

- `discuss`;
- `inspect`;
- `plan`;
- `review`;
- `apply` only through an approved prepared plan.

### Capability grant

The exact typed tools, project root, paths, network targets, provider actions,
and mutation operations allowed for the session.

### Execution budget

Limits such as:

- maximum context tokens;
- maximum output tokens;
- maximum reasoning or provider budget where exposed;
- maximum tool calls;
- maximum wall-clock duration;
- maximum estimated or actual cost;
- maximum subagent count and concurrency;
- maximum retries.

### Approval

A human decision that authorizes one exact prepared plan after revalidation.
Neither a model choice nor an effort level is approval.

## Canonical effort vocabulary

The first portable Intentloom contract should support:

```text
auto
low
medium
high
```

Provider adapters may support additional native values, but those values must
remain provider-specific expert configuration until a portable meaning is
proven.

### `low`

Intended for:

- simple explanations;
- quick repository questions;
- small deterministic lookups;
- narrow formatting or summarization tasks;
- low-risk planning with few alternatives.

Expected behavior:

- concise context selection;
- smaller reasoning and output budget;
- fewer optional alternatives;
- minimal delegation;
- required safety and validation remain unchanged.

### `medium`

The default balanced profile for:

- normal feature planning;
- architecture-sensitive code review;
- project inspection;
- debugging with several plausible causes;
- standard Project Inception discovery.

Expected behavior:

- balanced context and reasoning;
- explicit assumptions and trade-offs;
- normal verification depth;
- bounded use of typed tools and subagents.

### `high`

Intended for:

- complex architecture decisions;
- broad migrations;
- security-sensitive review;
- public API and compatibility work;
- multi-package release planning;
- difficult incident analysis;
- final Project Inception blueprint comparison.

Expected behavior:

- larger reasoning and verification budget;
- more alternative comparison;
- deeper evidence inspection;
- stronger contradiction and risk checks;
- expanded test, rollback, and compatibility analysis;
- potentially higher latency and cost.

`high` is not a quality guarantee and does not grant additional authority.

### `auto`

Neutron proposes an effort level from deterministic task metadata and visible
policy, for example:

- task type;
- affected scopes;
- security and compatibility sensitivity;
- number of packages or deployables;
- uncertainty;
- requested output;
- user and organization budget policy.

The resolved effort, reasons, budget, and provider mapping must be shown before
or at execution. `auto` must not silently change providers or exceed an approved
financial limit.

## Provider capability negotiation

Provider APIs expose different controls. Some expose a direct reasoning-effort
parameter, some expose thinking or token budgets, some distinguish model tiers,
and some expose no portable equivalent.

Each model adapter should declare a versioned capability record such as:

```json
{
  "providerId": "provider:example",
  "modelId": "model:example/engineer",
  "supports": {
    "streaming": true,
    "structuredToolCalls": true,
    "vision": false,
    "nativeEffortValues": ["low", "medium", "high"],
    "contextWindow": 200000,
    "maxOutputTokens": 16000
  }
}
```

The exact schema requires an ADR and compatibility review.

### Mapping rules

An adapter may map a canonical Intentloom effort to a native provider control
only when the mapping is documented and tested.

Possible outcomes:

- `exact`: the provider directly supports the requested value;
- `bounded-map`: the adapter uses a documented provider budget range;
- `model-profile-map`: the effort resolves to a reviewed provider model profile;
- `unsupported`: the provider cannot honor the request;
- `requires-user-choice`: more than one materially different mapping exists.

Intentloom must not silently claim that an unsupported provider setting was
honored.

### Unsupported effort

Policy choices may be:

1. fail closed;
2. ask the user to choose a supported effort;
3. use an explicitly configured fallback mapping;
4. continue with provider default while clearly reporting that the requested
   effort was not enforceable.

The project or organization policy selects the behavior. Silent downgrade is not
allowed.

## Model selection

### Exact identifiers

Reproducible sessions should record:

- provider identifier;
- exact model identifier and version or snapshot when available;
- adapter version;
- endpoint or gateway identity;
- local runtime version when applicable;
- effort request and resolved native value;
- context, output, tool, time, retry, and cost budgets;
- network and data-handling mode;
- configuration digest.

Mutable aliases such as `latest` may be displayed for discovery but should not be
persisted as the only reproducibility evidence.

### Model aliases

Users and organizations may define stable local aliases:

```text
fast
balanced
deep
local-private
security-review
architecture-review
```

An alias resolves to:

- provider;
- model;
- default effort;
- execution budgets;
- required model capabilities;
- allowed modes;
- data-handling policy;
- optional fallback chain.

Aliases are configuration, not model names owned by Intentloom.

Example candidate configuration:

```yaml
modelProfiles:
  balanced:
    provider: openai
    model: exact-provider-model-id
    effort: medium
    limits:
      maxToolCalls: 24
      maxCostUsd: 2.00
  local-private:
    provider: local
    model: exact-local-model-id
    effort: medium
    network: disabled
```

Credentials must never be stored in this project configuration.

## Configuration hierarchy

Candidate precedence from broadest to narrowest:

```text
built-in safe defaults
→ organization policy
→ user-local provider configuration
→ project policy
→ task or session selection
→ explicit one-turn override
```

Narrower configuration may reduce capabilities and budgets. It must not bypass
organization restrictions, provider data-handling policy, or project mutation
approval.

### Project-visible configuration

A project may store:

- allowed provider identifiers;
- approved model aliases;
- minimum required model capabilities;
- default effort by task class;
- maximum budgets;
- fallback policy;
- local-only or network restrictions;
- required audit and retention settings.

### User-local configuration

User-local or operating-system protected storage should contain:

- API credentials;
- gateway endpoints requiring authentication;
- private local-model paths;
- user-specific cost limits;
- provider account configuration;
- encrypted connection metadata.

Secrets must not be written to `.aif/`, Git, prompts, generated instructions,
logs, manifests, source maps, evidence exports, or session exports.

## Routing modes

### Manual

The user selects the exact model and effort.

```bash
loom --model provider/model --effort high
```

### Profile

The user selects a reviewed alias.

```bash
loom --model-profile balanced
```

### Policy-assisted

Intentloom filters available models by required capabilities, data policy,
budget, and task type, then proposes a choice for confirmation.

### Automatic

A later mode may resolve a model from an explicit allowlist. Automatic routing
must report:

- candidates considered;
- candidates rejected and reasons;
- selected provider and model;
- expected data handling;
- resolved effort and budgets;
- fallback behavior.

Automatic routing must not use an unapproved provider, endpoint, model, or
network path.

## Fallback policy

Fallback is disabled by default for sensitive or reproducible workflows.

An enabled fallback chain must be explicit, ordered, and capability-checked:

```text
primary exact model
→ approved equivalent hosted model
→ approved local model
→ fail
```

Intentloom must not silently switch providers because of rate limits, cost,
timeouts, or model unavailability.

When fallback occurs, the final result must record:

- original selection;
- failure category;
- fallback selected;
- capability and effort differences;
- data-handling changes;
- whether the task was restarted or continued;
- any result comparability limitations.

A fallback that changes network or data-handling boundaries requires renewed
approval.

## Candidate CLI commands

### Discovery and configuration

```bash
loom models list
loom models list --provider openai
loom models inspect PROVIDER/MODEL
loom models capabilities PROVIDER/MODEL
loom models profiles
loom models profile show balanced
loom models profile set balanced --provider PROVIDER --model MODEL --effort medium
loom models profile remove balanced
loom models test PROVIDER/MODEL
```

`models test` may make a network request and incur cost. It must preview the
endpoint, model, requested capabilities, and estimated limits before execution.

### Session selection

```bash
loom --model PROVIDER/MODEL --effort low
loom --model PROVIDER/MODEL --effort medium
loom --model PROVIDER/MODEL --effort high
loom --model-profile balanced
loom --effort auto
```

### Project Inception

```bash
loom new --model-profile balanced --effort medium
loom inception resume SESSION_ID --effort high
loom blueprint compare OPTION_A OPTION_B --effort high
```

### Task-specific override

```bash
loom plan --effort high
loom review --model-profile security-review
loom inspect --model-profile local-private
```

Commands that are fully deterministic, such as schema validation or ownership
checks, should not require a model merely because a model is configured.

## Candidate interactive commands

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

The interactive status area should display at least:

```text
Provider: explicit provider
Model: exact model id
Effort: high
Mode: plan
Network: enabled for provider endpoint only
Data handling: provider policy name
Tools: read-only
Estimated budget: visible
```

## Desktop experience

Candidate controls:

- provider selector;
- exact model selector;
- model-profile selector;
- effort segmented control: Auto, Low, Medium, High;
- mode indicator;
- network and data-handling indicator;
- context, output, tool, time, and cost limits;
- fallback state;
- capability compatibility findings;
- session usage and provenance.

The UI must not present effort as a permission level.

## Task-aware defaults

Candidate defaults may include:

| Task | Default effort |
| --- | --- |
| simple explanation | low |
| bounded inspect summary | low or medium |
| normal feature plan | medium |
| Project Inception discovery | medium |
| blueprint alternative comparison | high |
| public API migration | high |
| security-sensitive review | high |
| deterministic validation | no model required |

Organization or user policy may override these within allowed bounds.

## Budget and cost transparency

Before a model request, Intentloom should know or declare when possible:

- provider pricing source and freshness;
- estimated input size;
- configured maximum output;
- configured reasoning or thinking budget;
- maximum tool calls;
- maximum subagents;
- maximum task duration;
- maximum cost;
- whether prompt caching or batch behavior is used;
- whether pricing cannot be estimated reliably.

Cost estimates are estimates, not guarantees. Actual usage should be recorded
when the provider returns trustworthy usage metadata.

## Enterprise policy

Organizations may define:

- approved providers and gateways;
- approved model snapshots;
- prohibited data classes;
- project and repository routing restrictions;
- maximum effort and budgets by task class;
- local-model-only scopes;
- retention and audit requirements;
- required human approval for network use;
- disabled fallback across providers;
- incident and security-review model profiles.

A human title or discipline does not grant access to a provider or model.

## Local models

Local model adapters must declare:

- model source and license;
- exact artifact digest;
- runtime and version;
- hardware requirements;
- context and output limits;
- tool-call support;
- effort-mapping support;
- local network behavior;
- update and rollback policy.

Intentloom must not silently download model weights or runtimes. Installation and
updates use the managed extension and explicit approval boundaries.

## NeutronBench relationship

NeutronBench should evaluate model and effort combinations separately.

A benchmark record should include:

- exact provider and model;
- canonical and resolved native effort;
- runtime and adapter versions;
- context, output, tool, time, retry, subagent, and cost budgets;
- task result quality;
- policy and safety adherence;
- latency and usage;
- unsupported or degraded mappings.

A `high` result should be compared against `medium` and `low` on the same task to
show whether additional cost and latency produce measurable benefit.

## Success criteria

The first useful increment proves that:

- at least one provider adapter exposes exact model identity and capability
  discovery;
- users can select a model and `low`, `medium`, or `high` effort;
- unsupported mappings fail or degrade visibly according to policy;
- model, effort, mode, capability, budget, and approval remain separate;
- provider credentials remain outside project metadata;
- network, model, effort, usage, and fallback state are visible;
- CLI, Desktop, TUI, daemon, MCP, and Neutron consume one typed configuration;
- a higher effort never widens authority;
- deterministic operations remain usable without a model.

## Non-goals

This direction does not imply:

- identical behavior across different provider models;
- a universal quality score for models;
- a guarantee that `high` is always better;
- silent provider fallback;
- mandatory cloud inference;
- storing API keys in a project;
- automatic purchase or subscription management;
- autonomous budget increases;
- model output as approval;
- model selection as a substitute for deterministic validation;
- hardcoding mutable provider model catalogs into the Intentloom core.
