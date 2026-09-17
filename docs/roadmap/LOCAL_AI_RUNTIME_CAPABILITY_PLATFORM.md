# Local AI Runtime and Capability Platform

## Status

Future roadmap direction. Documentation only. This plan does not authorize implementation, dependency installation, model downloads, new network access, Desktop mutation UX, or changes to the active Neutron delivery sequence.

## Purpose

Intentloom should be able to operate as a local-first AI engineering platform without making cloud inference mandatory. Local inference is an execution option behind the existing Neutron provider-neutral model boundary, not a second agent core and not a general-purpose chat product.

The target is a coherent local and hybrid runtime in which developers can install, inspect, select, and safely use bounded AI capabilities for engineering workflows while Intentloom remains the authority for project scope, evidence, policy, permissions, approvals, transactions, and provenance.

The direction is informed by useful product patterns in local AI platforms such as Open WebUI, especially simple local model setup, unified provider UX, capability discovery, and local knowledge/tool integration. Intentloom must implement these ideas through its own contracts and security model rather than copying another product's implementation or weakening existing boundaries.

## Relationship to Neutron

This plan extends, and does not replace, `NEUTRON_RUNTIME_ROADMAP.md`.

Existing foundations remain canonical:

- the Neutron provider-neutral `ModelAdapter` boundary;
- Ollama as the first bounded loopback model adapter;
- N3 bounded context assembly and provenance;
- N4 capability-scoped typed tool routing;
- N5 task graphs, execution evidence, budgets, cancellation, and aggregation;
- N6 Desktop Neutron Workspace;
- persistent memory, project evidence, architecture/conformance/security operations;
- reviewed approval and transaction boundaries for mutation.

No local model receives direct repository authority. Models consume bounded context and request typed capabilities. Intentloom application operations remain the domain boundary.

## Product principles

1. Local-first, not local-only. A project may use local, cloud, or explicitly configured hybrid inference.
2. Provider-neutral. Features depend on declared capabilities, not hard-coded model brands.
3. Offline-capable where the selected capabilities permit it.
4. No silent downloads or installs. Runtime, model, speech, embedding, reranking, or tool installation is explicit and reviewable.
5. No generic plugin execution. Installed capabilities declare identity, version, source, checksum, license, hardware needs, network behavior, permissions, and data handling.
6. Safety remains outside model weights and prompts.
7. Repository content is never implicitly uploaded to a hosted provider.
8. Deterministic evidence remains distinct from model analysis.
9. Local AI augments Intentloom evidence, conformance, quality, and learning workflows; it does not replace them.
10. Chat is an interaction surface, not the architectural center of the product.

## Target architecture

```text
Intentloom Desktop / CLI / IDE / MCP
                |
         Intentloom Core
                |
      Neutron Runtime + Context
                |
       Capability Router
        /       |        \
   Local AI   Cloud AI   Typed Tools
      |           |          |
 runtimes      providers   application ops
      |
 code models / speech / embeddings / rerankers / vision
```

### Local runtime providers

The model adapter architecture may later support explicitly installed or configured local runtimes such as Ollama, llama.cpp, MLX, or vLLM where platform evidence justifies them. Ollama remains the existing first adapter and must not be displaced merely to add provider count.

### Capability registry

Intentloom should represent installable AI functionality as governed capability packages rather than arbitrary plugins. Candidate capability classes include:

- inference runtimes;
- coding and reasoning models;
- embedding models;
- rerankers;
- speech-to-text engines;
- vision models;
- approved MCP servers and typed tool integrations;
- curated skills where compatible with the existing managed-extension lifecycle.

A capability record should be able to expose at least:

- stable identity and version;
- capability class and declared features;
- source and integrity/checksum evidence;
- license metadata;
- supported platforms and hardware requirements;
- disk and memory expectations where known;
- network mode and data-handling declaration;
- requested permissions;
- installation and runtime state;
- provenance and verification state.

The registry must integrate with the existing managed-extension and capability-governance concepts instead of creating an unrelated marketplace security model.

## Local speech input

A future speech capability may use a local speech-to-text engine such as NVIDIA Parakeet when supported and appropriately packaged.

Speech is an input adapter, not an authority boundary:

```text
voice
 -> local transcription
 -> visible/editable text
 -> Intentloom intent/task flow
 -> normal planning, evidence, permission, and approval boundaries
```

A transcription must never become an implicit mutation approval. The user can inspect and correct recognized text before it drives consequential actions.

## Capability-based model routing

A later router may select among configured models by task requirements rather than brand name. Selection inputs may include:

- coding/tool-use capability;
- context and output limits;
- latency and resource budgets;
- privacy policy;
- offline/network requirement;
- task risk and required evidence;
- model/provider health and availability;
- user-selected preferences.

Example policy classes:

- `local-only`: repository-derived context cannot leave the local machine;
- `local-preferred`: use a suitable local capability when available and require explicit policy for fallback;
- `cloud-allowed`: hosted providers may receive the bounded context permitted by the project policy.

Fallback behavior must be visible and fail closed when it would violate the selected data-handling policy.

## Local code review

A local coding model may augment existing deterministic project evidence:

```text
git/project diff
 -> Intentloom evidence + architecture + policies + quality/conformance
 -> bounded model context
 -> model analysis
 -> review result with provenance
```

The UI and schemas must distinguish deterministic findings from model-generated observations. A model cannot convert an unsupported opinion into a conformance or security fact.

Candidate review dimensions include correctness observations, architecture-boundary concerns, performance hypotheses, test gaps, security observations, and implementation-to-intent differences. Each model-derived claim should retain model/provider/version and source-context provenance.

## Mentor Mode

A future Mentor Mode may turn project-aware analysis into an interactive learning workflow. Instead of automatically rewriting code, it can explain a change, ask a targeted question, offer a hint, compare alternatives, or reveal a solution on request.

Mentor Mode should reuse project evidence and bounded context so explanations are specific to the actual codebase while remaining clearly advisory. It must not introduce a separate hidden mutation path.

## Local context and retrieval

Intentloom should not create a second generic RAG subsystem merely to support local models. Local inference should consume the existing context architecture and evolve it where evidence requires:

- canonical intent and policies;
- project inspection and architecture evidence;
- accepted persistent memory;
- verified engineering evidence;
- task/checkpoint state;
- selected skills;
- bounded repository-derived context.

Future hybrid retrieval may combine lexical, semantic, graph, and reranking signals, but provenance, trust class, secret filtering, project isolation, and context budgets remain mandatory.

## Desktop setup experience

A future Local AI setup flow should make local capability installation understandable without requiring the user to manually assemble ML infrastructure.

Candidate flow:

```text
Choose AI mode: Local / Cloud / Hybrid
 -> detect supported local hardware
 -> show compatible optional capabilities
 -> show source, license, disk/RAM estimate, network and permissions
 -> user explicitly selects installation
 -> verify artifacts
 -> install into host-controlled state
 -> health check
 -> expose capability to Neutron
```

Hardware detection produces recommendations only. It must not silently install or start capabilities.

## Security boundary

Intentloom must not adopt an extension model in which downloaded code receives arbitrary server or workstation execution by default.

Installation and execution should preserve these constraints:

- manifest-first capability declaration;
- explicit user consent;
- trusted source and integrity verification;
- host-controlled installation locations outside user project source;
- least-privilege filesystem and network access;
- sandbox/isolation where the capability class permits it;
- no generic shell exposed to models;
- no implicit credential inheritance;
- no hidden telemetry;
- auditable lifecycle and provenance;
- uninstall/disable/revoke paths;
- Neutron and application permission checks remain authoritative.

## Delivery sequence

The following labels are planning identifiers only and do not authorize implementation.

### L0. Provider contract reconciliation

Audit the existing Neutron `ModelAdapter`, managed-extension schemas, daemon protocol, and Desktop capability discovery against local/hybrid requirements. Extend only where evidence shows a missing generic contract.

Exit gate: local and hosted providers can be represented without provider-specific leakage into product/domain contracts.

### L1. Local runtime discovery

Discover explicitly supported installed runtimes and report version, endpoint, health, capabilities, and network mode without installing anything.

Exit gate: discovery is deterministic, bounded, read-only, and cannot scan arbitrary workstation state.

### L2. Model and capability registry

Introduce the governed registry representation for configured local capabilities, including provenance, compatibility, resources, integrity, license, permissions, and lifecycle state.

Exit gate: Desktop/CLI can explain exactly what a capability is and what it requires before activation.

### L3. Capability installation packs

Add explicit host-controlled installation lifecycle for approved capability classes. Start with the narrowest class justified by evidence. No arbitrary post-install scripts.

Exit gate: installation, verification, activation, disable, upgrade, and removal are reviewable and cannot mutate project source.

### L4. Capability-based local model router

Route bounded model requests using declared capabilities and policy. Preserve explicit model/provider identity in evidence.

Exit gate: deterministic routing fixtures prove privacy, capability, budget, fallback, and failure behavior.

### L5. Privacy and data-handling policies

Make `local-only`, `local-preferred`, and `cloud-allowed` project/session behavior explicit across context assembly, routing, Desktop, daemon, and evidence.

Exit gate: forbidden context cannot reach a disallowed provider, including fallback paths.

### L6. Local code review

Combine deterministic Intentloom evidence with a local coding-model analysis surface. Keep factual evidence and model observations visibly separate.

Exit gate: review provenance is complete, model failure cannot suppress deterministic findings, and no review action mutates source.

### L7. Mentor Mode

Add project-aware explain/hint/question/solution learning interactions over reviewed context and evidence.

Exit gate: Mentor Mode remains advisory, bounded, reproducible enough for evaluation, and cannot bypass mutation approval.

### L8. Local voice development

Add an optional governed speech capability, with NVIDIA Parakeet as a candidate to evaluate rather than a mandatory dependency.

Exit gate: transcription can feed visible intent/task input offline on supported hardware and never counts as approval.

### L9. Desktop Local AI setup wizard

Expose mode selection, hardware compatibility, capability review, installation, health, activation, and removal through Desktop.

Exit gate: a clean supported installation can configure a local read-only Neutron flow without manual ML setup or hidden downloads.

### L10. Hybrid runtime

Allow policy-governed task routing across local and hosted providers while retaining bounded context, provenance, budgets, and visible fallback decisions.

Exit gate: hybrid execution cannot weaken local-only guarantees and every model turn identifies where data was processed.

## Explicit non-goals for the first increments

- building a general-purpose ChatGPT clone;
- copying Open WebUI implementation code;
- a public marketplace before extension security and provenance are proven;
- arbitrary Python/JavaScript plugin execution;
- model-controlled package installation;
- automatic model downloads on project open;
- unrestricted repository RAG dumps;
- replacing deterministic conformance/security evidence with LLM judgment;
- custom model training before runtime and benchmark evidence justify it;
- granting local models broader permissions merely because inference is offline.

## Reference products and technologies to evaluate

These names are research inputs, not dependencies or commitments:

- Open WebUI, for local-AI setup, provider UX, capability discovery, and knowledge/tool interaction patterns;
- Ollama, already selected for the first Neutron loopback adapter;
- llama.cpp, MLX, and vLLM, as possible future local runtime targets;
- NVIDIA Parakeet, as a candidate local speech-to-text capability;
- local coding/reasoning model families such as Gemma or Qwen variants, evaluated through capability and benchmark evidence rather than hard-coded product assumptions.

Any adoption requires a separate current license, security, packaging, maintenance, and benchmark review.

## Roadmap placement

This is a post-foundation direction. It must not interrupt the currently authorized Neutron runtime, mutation-hardening, Desktop, or production-hardening sequence.

Before L0 implementation begins, maintainers should explicitly authorize the increment from the then-current `main`, reconcile this plan against completed Neutron work, and record any changed security assumptions. Each later stage requires evidence from the preceding stage rather than being treated as one large feature branch.
