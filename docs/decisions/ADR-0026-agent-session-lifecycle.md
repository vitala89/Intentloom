# ADR-0026: Agent Session Lifecycle

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate M4 introduces vendor-neutral, project-scoped agent session lifecycle management. Session state is persisted locally under `.aif/memory/sessions/` in versioned JSON format (`AgentSessionItem`).

Sessions undergo explicit lifecycle state transitions: `active` → `closed`, `compacted`, or `archived`. Session records capture active tasks, unresolved questions, key decisions, and verified outcomes without recording raw unredacted transcripts or secret file paths. Pre-compaction export is supported to preserve structured task state before LLM context compression or provider reset.

Closing, compacting, exporting, or deleting an agent session operates strictly through typed private application operations (`@intentloom/application`). Session lifecycle operations cannot silently mutate canonical project intent, overwrite accepted persistent memory, or execute unauthorized shell scripts. Memory poisoning and prompt injection risks are mitigated by validating all session fields against strict schemas, enforcing secret path redaction (`secretLikePath`), and treating imported or external session items as untrusted observations.

## Consequences

1. Agent session tracking is provider-neutral, local-first, and vendor-decoupled.
2. Compaction or session termination preserves structured execution metadata in `.aif/memory/sessions/`.
3. Canonical project intent and accepted persistent memory remain immutable during session operations unless explicitly mutated via approved proposal transactions.
