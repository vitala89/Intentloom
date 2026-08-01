# Agent Session History and Memory Implementation Plan

## Status

Implementation roadmap for the Agent Session History and Memory Experience.

The plan extends existing Intentloom contracts and operations. It does not
replace workspace conversations, agent sessions, persistent memory, project
context, daemon protocol, or Neutron Runtime.

## Objective

Deliver a project-scoped Agent Mode experience where users can safely recover,
resume, fork, search, export, archive, and delete agent work while preserving
fresh project evidence, trust boundaries, and explicit approval.

The target flow is:

```text
start conversation and session
-> record bounded messages and typed events
-> compact or close with a generated summary
-> review durable memory proposals
-> list or search retained sessions
-> preview current-state differences
-> resume or fork
-> rebuild bounded context
-> continue under current permissions
```

## Architectural rules

1. Existing application operations remain the domain boundary.
2. Conversation history, session state, event history, and accepted memory remain
   separate schemas.
3. Full conversation storage is local and private by default.
4. Project-visible memory requires explicit user intent and appropriate trust.
5. Resume always revalidates project, policy, provider, model, and capability
   state.
6. A resumed or forked session does not inherit mutation approval.
7. Generated summaries remain untrusted until reviewed.
8. Derived indexes are replaceable and deletable.
9. External memory systems are optional adapters, not Core dependencies.
10. CLI, MCP, daemon, TUI, Desktop, and Neutron consume shared structured
    operations.

## H0. Baseline inventory and decisions

Confirm the implemented baseline for:

- workspace conversation creation, retrieval, message append, and listing;
- agent session start, get, list, close, export, and delete;
- persistent-memory propose, accept, supersede, search, export, import, and
  forget;
- bounded project context;
- daemon session and memory methods;
- Desktop and TUI session views;
- current project-local storage paths.

Create architecture decisions for:

- private session storage location;
- event journal schema and storage;
- project identity and state digests;
- retention and deletion semantics;
- transcript export formats;
- local search index provider;
- optional external memory-provider contract;
- migration from existing `.aif/memory/sessions/` and
  `.aif/workspace/conversations/` records.

Exit gate:

- the current implementation and gaps are documented from repository evidence;
- no second memory system is proposed;
- storage and migration decisions are accepted before implementation.

## H1. Versioned session and event contracts

Extend protocol contracts with versioned types for:

- session metadata and linked conversations;
- model, provider, adapter, effort, mode, and budget snapshots;
- project, policy, configuration, and capability digests;
- parent session and fork point;
- typed lifecycle and tool events;
- session summary references;
- stale-context and resume findings;
- compact, full, and redacted exports.

Candidate event envelope fields include:

```text
schemaVersion
id
projectId
sessionId
conversationId
eventType
occurredAt
source
trustClass
redactionState
providerRef
modelRef
toolRef
operationRef
inputDigest
resultDigest
evidenceRefs
approvalRef
planRef
durationMs
usage
```

Events use bounded metadata. Raw provider requests, unrestricted tool payloads,
and complete repository files are excluded from the default journal.

Exit gate:

- validators reject cross-project, oversized, malformed, or unsupported records;
- old session and conversation records remain readable or have a documented
  migration result;
- deterministic fixtures cover every lifecycle transition.

## H2. User-local private storage

Introduce a storage abstraction with separate classes for:

- shared accepted project records;
- private user-local conversations and sessions;
- private typed events;
- rebuildable search indexes and caches;
- explicit export destinations.

The default private store should use the operating-system application-data
location and a stable project identity rather than a repository-relative path.

Requirements include:

- atomic writes and recovery behavior;
- project isolation;
- bounded file and record sizes;
- safe identifiers and path handling;
- optional platform-backed encryption;
- backup and deletion documentation;
- no implicit synchronization;
- migration preview and rollback for current project-local records.

Exit gate:

- a private conversation cannot appear in `git status` under normal defaults;
- equivalent operations work on supported platforms;
- migration fixtures preserve identity, timestamps, and retention state;
- deletion removes retained source records and rebuildable indexes according to
  policy.

## H3. Session history operations

Add shared application operations for:

- list sessions with filters and pagination;
- get one session with linked summary and conversation metadata;
- rename and pin;
- archive and restore;
- delete with preview and retention checks;
- export compact, redacted, or full retained records;
- inspect storage, size, retention, and provider attribution.

Candidate CLI commands:

```bash
loom sessions list
loom sessions show SESSION_ID
loom sessions rename SESSION_ID --title TITLE
loom sessions pin SESSION_ID
loom sessions archive SESSION_ID
loom sessions restore SESSION_ID
loom sessions export SESSION_ID --mode compact
loom sessions export SESSION_ID --mode redacted
loom sessions delete SESSION_ID --dry-run
loom sessions delete SESSION_ID --approved-by USER
```

Exit gate:

- CLI, daemon, MCP, and Desktop return equivalent structured results;
- deletion and export never include unrelated projects;
- dry-run reports exact records and indexes affected;
- private record contents are not included in routine logs.

## H4. Typed lifecycle capture

Add an event writer used by Agent Workspace and Neutron Runtime.

Initial events should cover:

- session start, resume, fork, compact, close, archive, and delete;
- prompt submission;
- bounded context assembly;
- memory retrieval;
- typed tool request, approval, completion, and failure;
- prepared-plan creation and approval reference;
- validation outcome.

Provider-specific hooks map into the same events through adapters. Hook scripts
may invoke reviewed fixed commands or typed operations only.

Exit gate:

- one read-only Neutron flow creates a deterministic event sequence;
- cancellation and failure produce explicit terminal events;
- event capture cannot grant capabilities or approve mutations;
- event limits prevent unbounded growth.

## H5. Compaction and session summary

Implement a provider-neutral compaction operation.

Inputs include:

- retained messages selected by policy;
- typed event index;
- current task and unresolved questions;
- accepted decisions and evidence references;
- context and output budget;
- selected model profile where AI summarization is enabled.

Outputs include:

- generated summary;
- included and excluded source references;
- unresolved work;
- potentially stale assumptions;
- proposed memory items;
- provider, model, effort, usage, and provenance;
- deterministic validation result.

A deterministic fallback should preserve key structured fields when no model is
available.

Exit gate:

- compaction does not change canonical intent or accepted memory;
- every summary claim can be traced to retained sources or marked as inference;
- users can inspect and delete summaries;
- repeated compaction does not create duplicate accepted memory.

## H6. Progressive history retrieval

Implement shared operations for:

```text
search
-> timeline
-> get details
```

Search supports bounded filters for:

- project;
- session and conversation;
- date range;
- record and event type;
- provider and model;
- workspace mode;
- tool and skill;
- trust and retention state;
- active task and affected paths where available.

Start with deterministic keyword and structural search. Add optional local
semantic ranking only after benchmark and privacy review.

Exit gate:

- compact search results are materially smaller than full records;
- timeline retrieval preserves ordering and source references;
- semantic ranking remains optional and removable;
- external embedding or reranking requires visible network and data policy.

## H7. Safe resume

Implement a resume preparation operation that returns a reviewable result before
starting a new model turn.

The operation should:

- verify project and session identity;
- compare stored and current project-state digests;
- inspect changed paths and relevant current evidence;
- check policy, ownership, and capability changes;
- check provider, model, adapter, effort, and network compatibility;
- identify superseded decisions and stale memory;
- rebuild bounded current context;
- classify blockers and required confirmations;
- prepare a new capability grant rather than reusing an old approval.

Candidate commands:

```bash
loom sessions resume SESSION_ID --dry-run
loom sessions resume SESSION_ID
loom sessions resume SESSION_ID --model-profile PROFILE --effort high
```

Exit gate:

- changed project state is always visible;
- a project mismatch fails closed;
- changed provider or network boundaries require explicit confirmation;
- old mutation approvals are never reused;
- the resumed session records its parent and resume evidence.

## H8. Session fork

Implement non-destructive branching from a session, message, or event.

Candidate command:

```bash
loom sessions fork SESSION_ID
loom sessions fork SESSION_ID --at MESSAGE_OR_EVENT_ID
loom sessions fork SESSION_ID --model-profile PROFILE --effort high
```

The fork operation records parent identity, fork point, copied working context,
inherited accepted-memory references, and changed configuration.

Exit gate:

- original records remain byte-for-byte unchanged;
- inherited records retain provenance;
- approvals and private provider consent are not inherited;
- alternative sessions can be compared through a structured summary.

## H9. Desktop and TUI experience

Desktop should add:

- recent, pinned, active, archived, and deleted session collections;
- session search and filters;
- conversation and event timeline;
- session details for model, effort, tools, permissions, usage, and provenance;
- resume and fork review dialogs;
- changed-project and stale-context findings;
- compaction and export controls;
- Memory views for accepted decisions, working context, observations, evidence,
  and superseded items;
- retention and deletion settings.

TUI should provide an equivalent keyboard-first list and detail experience.

Exit gate:

- visual and non-visual views expose equivalent information;
- closing or cancelling a preview performs no mutation;
- Desktop uses daemon and protocol operations rather than direct private-store
  access;
- inaccessible color-only or graph-only states are avoided.

## H10. Optional claude-mem adapters

After native session history is stable, evaluate:

### Import adapter

- accepts an explicit export or supported local source;
- verifies source version and project mapping;
- imports records as untrusted proposals;
- previews conflicts, redactions, and retention;
- never turns imported summaries directly into accepted memory.

### Read-only MCP provider

- declares exact capabilities;
- supports bounded search, timeline, and selected-record retrieval;
- treats results as external untrusted context;
- records provider identity, source identifiers, and network behavior.

### Managed extension

- pins source, version, integrity, and license;
- declares local services and runtime dependencies;
- previews installation and removal behavior;
- requires explicit approval for additional runtimes or background services.

Exit gate:

- removing the adapter leaves native memory intact;
- external records cannot cross projects silently;
- no automatic runtime, database, hook, or worker installation occurs.

## H11. Benchmarks and release gates

Create fixtures covering:

- long conversation compaction;
- stale project state on resume;
- cross-provider resume;
- session fork and comparison;
- sensitive-data redaction;
- cross-project denial;
- malformed and oversized imports;
- event-journal truncation and recovery;
- index rebuild and deletion;
- full, redacted, and compact export;
- session deletion with derived indexes;
- provider and model unavailability.

Measure:

- retrieval relevance;
- context and token cost;
- resume correctness;
- stale-state detection;
- storage growth;
- latency;
- false promotion into durable memory;
- privacy and isolation failures.

Release requires:

- protocol compatibility tests;
- cross-platform storage tests;
- security and threat review;
- migration and rollback evidence;
- Desktop and CLI equivalence;
- documentation for retention, export, and deletion;
- no unresolved high-severity data-isolation finding.

## Recommended implementation order

1. H0 baseline and architecture decisions.
2. H1 contracts and fixtures.
3. H2 user-local storage and migration.
4. H3 session history operations.
5. H4 typed lifecycle capture.
6. H5 compaction and summaries.
7. H6 progressive retrieval.
8. H7 safe resume.
9. H8 fork.
10. H9 Desktop and TUI experience.
11. H10 optional adapters.
12. H11 benchmarks and release evidence.

The first vertical slice should be:

```text
one project
-> local conversations and sessions
-> session list and details
-> changed-state resume preview
-> resume into a read-only Neutron session
-> compact export and delete
```

## Non-goals for the first increment

- cloud synchronization;
- shared organization memory;
- recording unlimited raw provider traffic;
- storing provider credentials in project files;
- automatic acceptance of generated memory;
- reusing old mutation approval;
- mandatory vector search;
- mandatory claude-mem installation;
- autonomous work triggered only by remembered intent;
- hidden background capture outside an active or explicitly configured session.
