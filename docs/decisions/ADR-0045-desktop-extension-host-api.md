# ADR-0045: Desktop Extension Host API & Contribution Declarations

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Intentloom Architecture Board
- **Consulted:** Desktop Team, Security Team, Governance Board

---

## Context

The Intentloom Desktop Application requires an extension mechanism for third-party themes, custom views, panels, settings, and command palette actions without allowing arbitrary untrusted code to bypass the local daemon, wire protocol, capability grants, approval boundaries, or local-first invariants.

The managed extension lifecycle is defined by `urn:aif:schema:extension-manifest:1` and `urn:aif:schema:extension-lock:1`. Desktop-specific contributions must extend that model rather than introducing a competing package format.

---

## Decision

We establish the **Desktop Extension Host API** and declarative contribution schema additions:

1. **Declarative Contribution Kinds**:
   - `theme`: Declarative CSS variable token overrides (colors, spacing, radius, fonts) with zero executable code.
   - `view`: Sandboxed React view surface registered in the primary navigation.
   - `panel`: Bounded side panel hosted in declared desktop regions.
   - `command`: Command palette action mapped to an allowed host operation.
   - `menu`: Declarative menu item contribution.
   - `settings`: Namespaced settings schema contribution.

2. **Security & Boundary Invariants**:
   - Themes carry NO executable code and run unconditionally under `default-src 'self'`.
   - Executable extensions (`view`, `panel`, `command`) must declare required capability grants (`fs_read`, `proc_exec`, `net_connect`).
   - Extensions must never access internal Tauri APIs, mutate project files directly, or make unrequested network calls.

3. **Validation**:
   - `validateDesktopExtensionContribution` in `@intentloom/validator` verifies contribution manifests and enforces capability boundaries before loading.

---

## Consequences

- Third-party extensions can declare desktop contributions safely under the existing extension manifest schema.
- Security invariants (local-first, zero-telemetry, capability grants) remain 100% enforced.
