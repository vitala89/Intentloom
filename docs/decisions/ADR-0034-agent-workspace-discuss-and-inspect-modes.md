# ADR-0034: Agent Workspace Discuss and Inspect Modes

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

To enable collaborative AI engineering without risking accidental codebase mutations, Intentloom introduces project-scoped local workspace conversation records (`.aif/workspace/conversations/`) and initial bounded workspace operational modes: **Discuss** and **Inspect**.

The Agent Workspace architecture:

1. Stores conversation records locally under `.aif/workspace/conversations/<id>.json` bound strictly to one selected project root.
2. Supports versioned `WorkspaceConversationRecord` schemas:
   - `Discuss` mode: Requirements, trade-offs, architecture, and system-design assistance without project mutation.
   - `Inspect` mode: Typed read-only project inspection, diagnostic findings, continuous security audit, persistent memory, and evidence navigation.
3. Defines vendor-neutral model provider interfaces for message passing (`user`, `assistant`) and response generation.
4. Redacts credential paths and secrets from conversation state, outputs, and exported histories.
5. Exposes CLI subcommands under `intentloom workspace <start|get|list|append>`.

## Consequences

1. Conversations are local, project-isolated, versioned, exportable, and deletable.
2. Model responses in Discuss and Inspect modes cannot directly mutate code files, execute arbitrary commands, or trigger unauthorized network calls.
3. Plain-text and JSON formats support both human terminal review and programmatic consumption.
