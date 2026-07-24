# Persistent Agent Memory

## Purpose

Intentloom may provide a project-scoped, vendor-neutral memory layer so AI coding agents can carry useful engineering context across sessions and supported providers without making one model, one CLI, or one note application the canonical owner of project knowledge.

The memory layer is not a transcript dump and is not an authority for project mutation. It is a bounded evidence and context system that helps agents recover decisions, goals, architecture, tasks, constraints, prior outcomes, and unresolved questions.

## Reference analysis

Obsidian Mind demonstrates several useful ideas:

- durable knowledge is stored in normal files rather than one vendor's hidden memory;
- Claude Code, Codex CLI, and Gemini CLI can reuse the same vault conventions;
- session-start hooks inject a small working set rather than the full vault;
- semantic search retrieves detailed context on demand;
- lifecycle hooks classify messages, validate writes, preserve pre-compaction records, and perform end-of-session hygiene;
- Git provides local history and portability.

Intentloom should adopt the architectural lessons, not couple Core to Obsidian Mind, Obsidian, QMD, or any single hook system.

## Product position

```text
project sources + Intentloom catalog + engineering evidence
                         ↓
             project-scoped memory store
                         ↓
       deterministic retrieval and trust filters
                         ↓
     CLI / MCP / daemon / desktop / Neutron agent
```

Memory remains a replaceable application capability. Obsidian-style Markdown, SQLite, a local vector index, or another provider may implement the storage contract later.

## Memory classes

The first specification should distinguish at least:

- **Canonical intent**: policies, workflows, ADRs, accepted architecture, schemas, and user-owned configuration.
- **Verified evidence**: commits, reviews, checks, releases, generated reports, and accepted findings.
- **Accepted decisions**: explicitly approved decisions with date, scope, author or agent provenance, and supersession state.
- **Working context**: active task, current hypotheses, blockers, and short-lived plans.
- **Agent observations**: model-generated summaries or recommendations that remain untrusted until accepted.
- **Session records**: bounded conversation metadata, tool calls, approvals, outcomes, and retention status.

A memory item must never silently become canonical merely because an agent wrote or repeated it.

## Tiered retrieval

Intentloom should avoid loading the complete store into every model context.

1. **Always available**: selected root, active case, current policy identifiers, concise project summary, permissions, and unresolved critical findings.
2. **On demand**: semantically or structurally retrieved decisions, ADRs, prior task outcomes, and evidence.
3. **Triggered**: context requested by an operation, policy, finding, or explicit user action.
4. **Full source read**: only for a bounded file or resource when required.

Every retrieval result should include provenance, trust class, source path or identifier, timestamp, scope, and an explanation of why it was selected.

## Session lifecycle

Candidate lifecycle operations:

- `memory session-start`: construct a bounded context pack from explicit sources;
- `memory search`: retrieve project-scoped records with deterministic filters and optional semantic ranking;
- `memory propose`: prepare a new or updated memory item without committing it;
- `memory review`: show source, classification, conflicts, retention, and redaction impact;
- `memory accept`: commit an explicitly approved item;
- `memory supersede`: retain history while marking a decision replaced;
- `memory forget`: delete or redact eligible records with evidence of the action;
- `memory session-close`: record outcomes and unresolved work without inventing completion.

## Portability

The canonical memory schema should be vendor-neutral. Adapters may render selected context into Claude Code, Codex, Gemini, Cursor, Copilot, MCP, or desktop surfaces, but provider-specific files must not become the primary database.

Export should support human-readable Markdown and a versioned machine-readable bundle. Import must treat all content as untrusted until schema, scope, provenance, and conflict checks pass.

## Security and privacy boundaries

Persistent memory expands the impact of mistakes and prompt injection. The following are required:

- explicit selected project and memory root;
- no cross-project retrieval unless the user grants it for the current operation;
- separate canonical, verified, accepted, working, and untrusted classes;
- untrusted repository text, issue content, external MCP output, and model output cannot directly create trusted memory;
- secrets detection and redaction before indexing, export, logging, or provider transmission;
- encryption-at-rest support where platform facilities allow it;
- visible retention, export, deletion, and backup policies;
- protection against path traversal, symlink escape, malicious Markdown links, oversized records, index poisoning, and duplicate or conflicting identities;
- deterministic limits for item size, retrieval count, context budget, index scope, and recursion;
- no hidden background upload, training contribution, or telemetry;
- external embedding or reranking providers require explicit network and data-handling disclosure;
- hook or lifecycle integration must use reviewed commands or typed operations, never arbitrary shell text from repository content.

## Obsidian-style adapter

A future optional adapter may expose a project memory store as an Obsidian-compatible Markdown vault. It should:

- remain optional and replaceable;
- write only inside an explicit memory root;
- use schemas and stable identifiers rather than folder names as authority;
- preserve links and human readability;
- support dry-run, diff, ownership, and transactional writes;
- avoid automatically installing Obsidian, QMD, models, plugins, or hooks;
- treat semantic indexes as rebuildable derived state, not canonical memory.

## Delivery sequence

1. Define memory item, trust, provenance, retention, redaction, and conflict schemas.
2. Add a read-only project-context operation using current canonical and evidence sources.
3. Implement deterministic keyword and structural retrieval before vector search.
4. Add project-local storage and explicit accepted-memory transactions.
5. Add export, import, deletion, supersession, and audit evidence.
6. Add optional local semantic indexing with a provider-neutral contract.
7. Add bounded session lifecycle integration for desktop and Neutron.
8. Evaluate an Obsidian-compatible adapter and external memory providers only after the core contract and threat model are stable.

## Exit criteria for the first milestone

- the same bounded context request produces equivalent structured results through CLI, MCP, daemon, and desktop adapters;
- no read-only operation changes project or memory state;
- untrusted content cannot become accepted memory without explicit review;
- cross-project retrieval is denied by default;
- secrets and excluded paths do not enter indexes or exports;
- users can inspect, export, supersede, and delete eligible memory records;
- memory improves a documented benchmark without exceeding declared context and latency limits.

## Non-goals for the first milestone

- recording every conversation forever;
- silently learning from private repositories;
- replacing Git, ADRs, issue trackers, or canonical documentation;
- making model summaries authoritative;
- sharing memory between unrelated projects by default;
- autonomous task execution based only on remembered intent;
- coupling Intentloom to Obsidian, QMD, one vector database, or one model provider.
