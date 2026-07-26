# ADR-0030: Controlled Agentic Security Sandbox

- **Status**: Accepted
- **Date**: 2026-07-26

## Decision

Candidate S4 introduces versioned sandbox capability contracts (`.aif/security/sandbox.json`) to enforce path boundaries, command allowlists, and capability modes on AI agent mutation proposals before execution.

Sandbox capability contracts configure:

1. `mode`: Mode restriction (`read-only`, `proposal-only`, `mutating`).
   - `read-only`: All write, update, delete, or shell execution actions are rejected.
   - `proposal-only`: Agent proposals can be created and evaluated, but persistent execution is blocked until human maintainer approval.
   - `mutating`: Mutations are evaluated against path and command allowlist rules.
2. `pathRules`: Bounded file path rules specifying allowed write and delete operations per directory prefix (e.g. `src/`, `.aif/`).
3. `commandRules`: Allowlisted command prefixes and arguments permitted during proposal evaluation or action execution.
4. `allowNetwork`: Boolean flag governing whether network connections are permitted (default: `false`).

When evaluating proposals (`evaluateProposalAgainstSandbox`), the application validates each proposed file modification, deletion, or command execution against the sandbox policy. Any out-of-bounds path access or unapproved command produces a structured violation diagnostic and sets `allowed: false`.

## Consequences

1. Agent mutation proposals violating capability policy rules are blocked before execution.
2. Path traversal outside designated project directories is caught and reported as a sandbox violation.
3. Network access remains disabled by default (`allowNetwork: false`), preserving local-first invariants.
