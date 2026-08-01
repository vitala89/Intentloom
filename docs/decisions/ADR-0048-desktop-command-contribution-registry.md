# ADR-0048: Desktop Command Palette Contribution & Action Registry Spec

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Intentloom Architecture Board
- **Consulted:** Desktop Team, Security Board, UI Lead

---

## Context

The Intentloom Desktop Application features a Command Palette modal (`⌘K` / `Ctrl+K`) that allows users to quickly jump between workspace views, initiate health diagnostics, review diffs, or trigger daemon actions. Third-party extensions should be able to contribute custom commands to this palette without allowing arbitrary code execution or unapproved system operations.

---

## Decision

We establish the **Desktop Command Palette Contribution & Action Registry**:

1. **Declarative Command Contribution (`DesktopCommandContribution`)**:
   - `id`: Globally unique command identifier (e.g. `extension.git-graph.open`).
   - `title`: Human-readable title displayed in the command palette.
   - `category`: Grouping category (`"Navigation"` | `"Actions"` | `"Diagnostics"`).
   - `shortcut`: Optional keyboard shortcut descriptor (e.g. `"⌘Shift+G"`).

2. **Command Registry & Handler Binding (`apps/desktop/src/views/command-registry.ts`)**:
   - `registerExtensionCommand(command, handler)` registers validated extension commands into the global command palette list.
   - Extension commands run through host capability checks before invocation.

3. **Validation & Security**:
   - `validateDesktopCommandContribution` verifies command category, non-empty IDs, and title formatting.

---

## Consequences

- Third-party extensions can safely expose custom actions in the `⌘K` command palette.
- Strict security and category bounds prevent command clutter or privilege escalation.
