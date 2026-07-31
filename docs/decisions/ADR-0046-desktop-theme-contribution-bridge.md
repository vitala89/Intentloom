# ADR-0046: Desktop Theme Contribution & Design Token Bridge Spec

- **Status:** Accepted
- **Date:** 2026-08-01
- **Deciders:** Intentloom Architecture Board
- **Consulted:** Desktop Team, Design System Lead, Security Team

---

## Context

The Intentloom Desktop Application requires third-party theme support (`dark`, `light`, `high-contrast`) that allows customized color schemes, typography scales, elevation surfaces, and status tokens without allowing executable JavaScript, remote stylesheet loading, external fonts, or CSS injection attacks.

---

## Decision

We establish the **Declarative Theme Contribution Bridge**:

1. **Declarative Theme Manifest**:
   - Themes are declared strictly as key-value CSS variable token maps under `DesktopThemeContribution`.
   - No external `@import`, `<link href="...">`, or executable scripts are allowed.

2. **Allowed Design Token Namespace**:
   - `--surface-base`, `--surface-raised`, `--surface-overlay`, `--surface-subtle`.
   - `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-action`.
   - `--action-primary`, `--action-primary-hover`, `--action-subtle`.
   - `--status-success`, `--status-warning`, `--status-error`, `--status-info`.
   - `--border-subtle`, `--border-default`, `--border-focus`.

3. **Runtime Theme Bridge (`apps/desktop/src/design/theme-bridge.ts`)**:
   - Applies theme token maps directly onto `document.documentElement.style.setProperty()` in a sanitized, type-safe loop.
   - Restores native theme defaults when switching or removing extensions.

---

## Consequences

- Third parties can author custom light/dark/high-contrast desktop themes.
- Absolute security: theme contributions contain zero executable code and cannot make external network calls.
