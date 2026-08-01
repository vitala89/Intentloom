# Agent Session History and Memory Experience

## Status

Candidate product experience built on the persistent-memory, agent-session,
Agent Workspace conversation, daemon, protocol, Desktop, TUI, CLI, MCP, and
Neutron foundations already present in Intentloom.

This document defines product behavior and boundaries. It does not add a new
storage engine, hosted service, provider hook, or public command by itself.

## Purpose

Intentloom should let a user stop an engineering-agent session and later recover
its useful state without treating a raw transcript as canonical project truth.

The experience should support:

- project-scoped conversation and session history;
- safe resume after repository or policy changes;
- session forks for alternative approaches;
- bounded automatic summaries;
- typed tool and lifecycle observations;
- progressive memory retrieval;
- explicit promotion of useful observations into accepted memory;
- export, archive, retention, redaction, and deletion controls;
- visible continuation with another compatible model.

The product model is:

```text
conversation history
+ agent session state
+ typed execution events
+ accepted memory
+ fresh project evidence
= reviewable continuation
```

## Existing foundations

Intentloom already separates three record types.

### Workspace conversation

A workspace conversation contains the project identity, workspace mode, user and
assistant messages, and timestamps. It is the human-visible chat history.

### Agent session

An agent session contains the active task, unresolved questions, decisions,
outcomes, lifecycle state, trust, retention, timestamps, and bounded metadata.
It is resumable task state rather than the entire chat.

### Persistent memory

A persistent-memory item contains classification, provenance, lifecycle state,
trust, approval, supersession, retention, and audit history. It is selected
long-term knowledge rather than an automatic transcript dump.

The new experience composes these contracts instead of creating another memory
core.

## Reference lessons from claude-mem

The claude-mem project demonstrates useful ideas:

- lifecycle capture around session start, prompts, tool use, compaction, and
  session close;
- semantic summaries instead of replaying every event;
- progressive disclosure for token-efficient retrieval;
- separate search, timeline, and full-record operations;
- a local history viewer;
- cross-session continuity;
- explicit privacy exclusions.

Intentloom should adopt these lessons without coupling Core to Claude Code, Bun,
Chroma, one hook format, one database, or one model provider.

## Required layers

### Conversation log

The conversation log stores user and assistant messages for human review. It
should preserve provider and model attribution by turn when a conversation uses
more than one model.

A conversation message never becomes a project decision automatically.

### Session state

The session state should additionally reference:

- linked conversations;
- workspace mode;
- model profile and resolved model;
- requested and resolved effort;
- project, policy, and configuration digests;
- capability grant;
- active prepared plan;
- parent session and fork point;
- compacted summaries;
- stale-state findings.

### Typed event journal

Tool use and lifecycle behavior should be structured events instead of text
inside assistant messages.

Candidate events include:

```text
session.started
session.resumed
session.forked
prompt.submitted
context.assembled
memory.retrieved
tool.requested
tool.approved
tool.started
tool.completed
tool.failed
plan.prepared
plan.approved
validation.completed
session.compacting
session.compacted
session.closed
session.archived
session.deleted
```

Each event contains bounded metadata such as identifiers, event type, timestamp,
provider or tool identity, digests, evidence references, duration, usage,
redaction state, trust class, and related approval or plan identifiers.

Unbounded tool payloads and arbitrary repository content should not be copied
into the event journal.

### Session summary

At compaction or close, Neutron may prepare a summary containing:

- user goal;
- inspected or attempted work;
- accepted decisions;
- rejected alternatives;
- changed or proposed paths;
- validation outcomes;
- unresolved work;
- assumptions that may become stale;
- memory proposals requiring review.

The summary remains agent-generated until individual durable claims are accepted
or verified.

### Accepted memory

Only selected records become accepted long-term memory. Examples include an
approved architecture decision, confirmed project preference, verified migration
outcome, persistent constraint, or accepted reason for rejecting an alternative.

A repeated statement, transcript, successful tool call, or generated summary is
not canonical by itself.

### Derived indexes

Keyword indexes, embeddings, reranking caches, and search summaries are
rebuildable derived state. Rebuilding an index must not destroy canonical intent,
verified evidence, accepted memory, or retained source records.

## Progressive disclosure

History retrieval should use three layers.

### Search

Returns a compact index with identifier, short summary, record type, project and
session scope, date, trust, retention, relevance explanation, and estimated
expansion cost.

### Timeline

Returns bounded chronological context around selected records without loading
full conversations or tool results.

### Details

Loads complete retained records only for explicitly selected identifiers and
within the active context budget.

```text
search compact index
-> inspect timeline
-> fetch selected details
```

The same application operations should serve CLI, MCP, daemon, TUI, Desktop, and
Neutron.

## Safe resume

Resume must not assume that the project is unchanged.

A resume operation should:

1. resolve the explicit root and project identity;
2. load the retained session and linked records;
3. verify project ownership of those records;
4. inspect current repository, policy, ownership, and capability state;
5. compare current state with the session snapshot;
6. identify changed paths and superseded decisions;
7. validate provider, model, effort, and network availability;
8. rebuild bounded context from current sources and selected memory;
9. show stale assumptions and missing evidence;
10. require renewed approval for changed mutation or network boundaries;
11. record a resume event before continuing.

Candidate results include:

```text
ready
ready-with-stale-context
provider-substitution-required
capability-review-required
project-identity-mismatch
unsupported-session-version
blocked-by-conflict
```

## Session fork

A fork creates a new session from an earlier conversation point while preserving
the original.

It records the parent session, parent conversation, selected message or event,
fork reason, inherited accepted-memory references, copied working context, and
any changed model, effort, or architecture alternative.

A fork does not inherit mutation, publication, deployment, or provider-data
approval.

## Storage boundaries

Full conversations and private execution history should not enter Git by
default.

### Shared project records

Explicitly accepted and intentionally shared artifacts may include accepted
project memory, approved decision references, portable summaries selected by the
user, and schema or policy configuration.

### User-local records

The operating-system user-data directory should hold full conversations,
sessions, typed events, provider usage, local indexes, private drafts, and
unaccepted summaries, keyed by stable project identity.

Project-local `.aif/` paths may retain portable accepted records and non-sensitive
references. Existing project-local session data requires a reviewed migration
path.

### Exports

Exports are explicit, versioned, bounded, redacted, and user-selected. A complete
conversation export must remain distinct from a compact portable session summary.

## Privacy and security

Required controls include:

- project isolation by default;
- explicit grants for cross-project retrieval;
- sensitive-data detection before storage, indexing, export, or provider use;
- encryption at rest where platform support exists;
- visible retention and deletion policy;
- bounded record and context sizes;
- protection against path escape, malicious imports, index poisoning, prompt
  injection, and duplicate identities;
- no implicit upload, cloud sync, telemetry, or training contribution;
- disclosure for external embedding, reranking, or memory providers;
- deletion behavior covering derived indexes and documented backup limits;
- audit evidence for accept, supersede, archive, export, and delete operations.

## Cross-provider continuation

A session may continue with another compatible model only when the change is
visible. The resume preview shows original and selected models, adapter
differences, tool and context differences, effort mapping, data handling,
non-reproducible context, and required reinspection.

Provider substitution does not carry previous provider consent or permissions.

## Optional claude-mem integration

Claude-mem should not become a mandatory Intentloom Core dependency.

Possible integrations are:

- an import adapter that creates untrusted project-scoped proposals;
- a read-only MCP provider for bounded search and timeline retrieval;
- a managed memory-provider extension with pinned version, integrity, license,
  declared capabilities, explicit networking, and rollback instructions.

Intentloom must not silently install additional runtimes, databases, model
weights, hooks, or worker services.

## Candidate commands

```bash
loom sessions list
loom sessions show SESSION_ID
loom sessions resume SESSION_ID
loom sessions fork SESSION_ID
loom sessions rename SESSION_ID
loom sessions pin SESSION_ID
loom sessions archive SESSION_ID
loom sessions export SESSION_ID
loom sessions delete SESSION_ID
loom memory search QUERY
loom memory timeline RECORD_ID
loom memory show RECORD_ID
loom memory propose
loom memory accept MEMORY_ID
loom memory supersede MEMORY_ID
loom memory forget MEMORY_ID
```

Candidate Agent Workspace controls include:

```text
/sessions
/session info
/resume SESSION_ID
/fork SESSION_ID
/session compact
/session export
/memory search QUERY
/memory timeline RECORD_ID
/memory propose
/memory forget MEMORY_ID
```

## Desktop experience

The Agent Workspace should provide recent, pinned, archived, and deleted session
views; search and filtering; resume and fork previews; conversation and event
timelines; context, memory, model, tool, permission, usage, and provenance
inspection; stale-context warnings; export choices; and explicit retention and
deletion controls.

A Memory area should distinguish accepted decisions, working context,
observations, evidence, and superseded records.

## Success criteria

The first useful increment proves that:

- users can list, open, resume, archive, export, and delete sessions;
- resume detects changed project state and stale assumptions;
- conversations, sessions, events, and accepted memory remain distinct;
- tool activity uses typed records;
- search returns compact results before full records;
- full conversations do not enter Git by default;
- cross-provider continuation shows material differences;
- accepted memory still requires explicit review;
- all clients consume shared structured operations;
- deleting a derived index does not destroy retained source records.

## Non-goals

This experience does not require recording every token forever, making raw
conversations canonical, sharing memory across projects by default, silently
enabling cloud sync, installing claude-mem as a required dependency, allowing
remembered intent to authorize mutations, or treating semantic relevance as
proof that a record is current.
