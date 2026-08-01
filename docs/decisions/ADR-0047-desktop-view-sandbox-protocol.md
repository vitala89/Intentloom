# ADR-0047: Desktop View Sandbox & Frame Communication Protocol Spec

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Intentloom Architecture Board
- **Consulted:** Desktop Team, Security Team, Protocol Lead

---

## Context

Executable third-party desktop views (`kind: "view"`) need to render project visualizations, analytical charts, or custom workflow surfaces within the Desktop application. However, third-party views must never execute arbitrary unconfined scripts in the main desktop window context or access internal Tauri IPC commands without explicit host permission.

---

## Decision

We establish the **Desktop View Sandbox & Frame Communication Protocol**:

1. **Sandboxed `<iframe>` Container**:
   - Custom views are hosted inside an `<iframe>` container with `sandbox="allow-scripts"` and `csp="default-src 'self'"` enforcement.
   - Direct access to `window.top`, `window.parent`, Tauri APIs, Node primitives, local filesystem, or ungranted network endpoints is strictly blocked.

2. **Typed PostMessage Wire Protocol**:
   - Host to View: `{ type: "intentloom:view:init", payload: { root, theme, capabilities } }`
   - View to Host: `{ type: "intentloom:view:request", id, operation, params }`
   - Host to View Response: `{ type: "intentloom:view:response", id, result, error }`

3. **Capability Boundary Enforcement**:
   - Requests from custom views pass through host capability validation before forwarding to the daemon.
   - Operations without explicit manifest capabilities are rejected with `unsupported_capability`.

---

## Consequences

- Third-party desktop views can run safely inside isolated sandboxed frames.
- Local-first invariants and user privacy remain 100% protected.
