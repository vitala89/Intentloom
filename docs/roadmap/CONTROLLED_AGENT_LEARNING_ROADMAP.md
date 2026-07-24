# Controlled Agent Learning Roadmap

This roadmap supplement turns the controlled-learning direction into staged, reviewable candidates. It does not change the current release commitment and does not authorize autonomous agent mutation.

The architectural contract is defined in [Controlled Agent Learning and Procedural Memory](../concepts/CONTROLLED_AGENT_LEARNING_AND_PROCEDURAL_MEMORY.md). Persistent records and retrieval also remain subject to [Persistent Agent Memory](../concepts/PERSISTENT_AGENT_MEMORY.md), the managed extension lifecycle, project capability boundaries, and the existing prepare, preview, approve, revalidate, and transact model.

## Delivery principles

- task and workflow state before conversation state;
- deterministic local retrieval before semantic or remote retrieval;
- small active context before broad history injection;
- skill metadata before full procedure loading;
- proposals before accepted memory or active skills;
- evaluation and approval before activation;
- versioning and rollback before self-improvement;
- one selected project and explicit profile scope before retrieval;
- no hidden background work, telemetry, uploads, or training contribution;
- CLI, MCP, daemon, TUI, desktop, IDE, and Neutron reuse the same typed operations.

## Candidate L1: Structured task and session summaries

Scope:

- define versioned task-summary and session-summary schemas;
- record task identifier, selected root, intent, plan reference, affected paths, validation outcome, evidence references, used skills, unresolved work, provenance, trust class, and retention state;
- store summaries project-locally without storing unrestricted transcripts by default;
- add deterministic keyword and metadata retrieval through a local index such as SQLite FTS5;
- return structured references rather than raw chat replay.

Exit gate:

- unchanged state produces deterministic retrieval results;
- excluded paths and secrets never enter summaries or indexes;
- retrieval cannot cross the selected project root;
- records can be inspected, exported, retained, and deleted through typed operations;
- the index is rebuildable derived state rather than canonical memory.

## Candidate L2: Progressive skill discovery

Scope:

- define three loading levels: catalog metadata, execution contract, and full procedure;
- include stable identifier, version, trust, compatibility, capabilities, permissions, provenance, and context-cost metadata;
- add project and role filters for Frontend, Backend, QA, AI Engineering, DevOps, Security, and other packs;
- record why a skill was considered, selected, rejected, incompatible, or unavailable;
- account for the context budget added at every loading level.

Exit gate:

- full skill content is not loaded before explicit selection;
- repeated discovery over unchanged state is deterministic;
- selected skills expose exact version, source, trust, capability, and permission requirements;
- fixtures demonstrate measurable context reduction compared with eager loading;
- no skill discovery operation changes project or extension state.

## Candidate L3: Skill proposal lifecycle

Scope:

- define proposal, review, approval, rejection, activation, deprecation, archival, supersession, and rollback schemas;
- allow completed evidence-backed tasks to prepare inactive skill proposals;
- capture source tasks, observed pattern, confidence, uncertainty, requested capabilities, supported profiles, validation expectations, privacy impact, and license or notice metadata;
- keep agent-generated and imported proposals untrusted until explicit review;
- preserve previous active versions.

Exit gate:

- no task, model response, external MCP result, schedule, or repeated observation can activate a skill automatically;
- proposals remain separate from canonical catalog and active extension state;
- every accepted proposal records explicit approval evidence;
- rejection and deletion do not modify project-owned files;
- a previous skill version can be restored deterministically.

## Candidate L4: Skill evaluation and regression gates

Scope:

- define evaluation-case and skill-evaluation-result schemas;
- test tool selection, capability minimization, permission requests, expected output, validation success, context cost, failure recovery, compatibility, and security boundaries;
- run representative fixtures across supported project profiles;
- compare a proposed revision with the currently active version;
- classify improved, regressed, ambiguous, unsupported, and unsafe outcomes.

Exit gate:

- activation is blocked when required evaluations fail, regress, or lack evidence;
- evaluation results preserve runtime, provider, model, fixture, skill version, and environment provenance;
- instruction-only skills and executable plugins use different risk and review gates;
- prompt injection and malicious imported-skill fixtures cannot grant capabilities or bypass approval;
- rollback after a failed post-activation health check is verified.

## Candidate L5: Accepted procedural memory operations

Scope:

- expose skill proposal and lifecycle operations through the shared application boundary;
- add CLI and local MCP read-only discovery, search, proposal inspection, and evaluation views;
- add reviewed mutation operations for approval, activation, deprecation, and rollback only through the prepared-plan transaction boundary;
- preserve equivalence across direct CLI, daemon, MCP, TUI, and desktop adapters;
- integrate managed extension lock state where skills are installed external artifacts.

Exit gate:

- equivalent operations return equivalent structured results across supported surfaces;
- stale project root, skill version, proposal digest, capability grant, permission, or evaluation state rejects activation;
- failed writes roll back or report incomplete recovery explicitly;
- no presentation surface becomes an independent memory or skill authority;
- doctor reports stale, incompatible, unverified, modified, deprecated, or rollback-required skills.

## Candidate L6: Pause, redirect, checkpoint, and resume

Scope:

- define task checkpoint, pause, cancellation, redirect, invalidation, and resume contracts;
- preserve completed step evidence and unresolved work without claiming task completion;
- recompute context and affected plan steps after redirect;
- invalidate stale plans, approvals, selected skills, permissions, or context packs when assumptions change;
- keep cancellation safe for read-only and prepared mutation operations.

Exit gate:

- pause and cancellation leave project files byte-for-byte unchanged unless an already approved transaction completed atomically;
- redirect invalidates every stale digest or approval affected by the new intent;
- resume verifies selected root, project state, ownership, capabilities, skill versions, and provider configuration;
- checkpoints are project-isolated, exportable, and deletable;
- interrupted execution cannot silently continue in the background.

## Candidate L7: Optional semantic ranking

Scope:

- define a provider-neutral ranking contract over bounded task, decision, evidence, and skill records;
- keep keyword, structural, and explicit-filter retrieval available as a deterministic baseline;
- support optional local embeddings first;
- require explicit disclosure and permission for external embedding or reranking providers;
- measure retrieval quality, latency, context cost, and privacy impact.

Exit gate:

- semantic ranking improves a published benchmark over deterministic retrieval;
- removing or rebuilding the semantic index does not remove canonical records;
- provider identity, model, network destination, retention, and data scope are visible;
- secrets, excluded paths, and unrelated projects cannot enter requests or indexes;
- users can disable semantic ranking without losing core functionality.

## Candidate L8: Profile isolation and role-aware delegation

Scope:

- define optional named local profiles with separate provider settings, credentials, skills, memory, policies, and budgets;
- keep selected-project capability boundaries inside every profile;
- define role-aware subagent capability templates such as read-only Context Scout, scoped Feature Builder, Test Engineer, Reviewer, and Release Analyst;
- prevent a delegated role from widening its own scope;
- preserve tool calls, context selections, outputs, and hand-offs as evidence.

Exit gate:

- cross-profile and cross-project retrieval is denied by default;
- delegated agents cannot exceed parent capability, path, tool, network, or budget grants;
- reviewer and read-only roles cannot mutate project state;
- parallel work cannot overwrite concurrent user or agent changes silently;
- delegation remains optional and does not change single-agent deterministic operations.

## Later candidates

The following require separate ADRs, threat reviews, and product justification:

- scheduled read-only reports and maintenance checks;
- remote execution environments such as Docker, SSH, or cloud sandboxes;
- automatic proposal generation heuristics beyond explicit task completion;
- cross-project knowledge reuse with explicit redaction and grants;
- community skill exchange or registry discovery;
- training-data trajectory export;
- hosted memory or agent services.

## Explicit non-goals

- cloning Hermes Agent or a general personal assistant;
- using conversation history as the primary task state machine;
- autonomous activation or self-modification of skills;
- loading all skills, memories, or sessions into every model prompt;
- global implicit user profiling;
- hidden cron agents or scheduled project mutation;
- unrestricted terminal, filesystem, network, or credential access;
- automatic dependency installation, commits, pull requests, merges, releases, deployments, or publishing;
- requiring one provider, one vector database, or one plugin language;
- treating model confidence, repetition, or successful execution as approval.