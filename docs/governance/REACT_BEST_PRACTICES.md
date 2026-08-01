# Intentloom React & Desktop UI Best Practices

These standards govern React 19 and UI development in `apps/desktop` and any future web surfaces. They complement `CODE_QUALITY_STANDARDS.md` and [ADR-0044](../decisions/ADR-0044-desktop-design-system-import.md).

---

## 1. React 19 Component Architecture

- **Functional Components & TypeScript**: Use functional components with strict TypeScript props. Export explicit interface types for component props (e.g. `export interface CardProps`).
- **Module Resolution & Imports**: All relative imports must carry `.js` extensions under `NodeNext` (e.g., `import { Card } from "./design/components/layout/Card.js"`).
- **No Barrel Files**: Import components directly from their module paths (`./design/components/layout/Card.js`) to keep bundle sizes minimal and avoid circular dependencies.
- **Composition over Prop Proliferation**: Avoid boolean prop proliferation (`hasHeader`, `isCompact`, `showIcon`, `isRed`). Prefer compound components, explicit discriminated unions, or sub-component slots (`title`, `action`, `footer`).

---

## 2. State Management & Hooks

- **Local State Primitives**: Keep state at the narrowest possible scope. Derive state during rendering rather than creating redundant state synchronized in `useEffect`.
- **Focus & Event Management**:
  - Focus MUST return to the triggering element on modal/overlay dismiss (`triggerRef.current?.focus()`).
  - Use `useId()` for generating deterministic `aria-labelledby` and `aria-describedby` pairings.
  - Event handlers attached to `window` or `document` (e.g., `Escape` key listeners) must be cleanly removed in `useEffect` cleanup callbacks.
- **Async & Cancellability**: Long-running or IPC operations must use `AbortController` / `AbortSignal` to prevent race conditions or state updates after unmount.

---

## 3. Accessibility (WCAG 2.x & Keyboard-First)

- **Roving Tabindex**: Tab groups (`role="tablist"`) must maintain roving `tabIndex` (`0` for active tab, `-1` for inactive tabs) and support keyboard navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`).
- **Dialogs & Overlays**: Modals (`role="dialog"`) must trap focus inside the panel while open, support `Escape` key dismissal, and backdrop click closing.
- **Color is Never the Only Signal**: Every status indicator or badge MUST include an icon glyph and an explicit word label (`"Connected"`, `"Not evaluated"`, `"Findings present"`).
- **Tabular Figures**: All numerical figures, timestamps, durations, and line numbers must use the `.il-tnum` CSS class for fixed-width tabular alignment.

---

## 4. Design System Invariants & Token Mapping

- **Action vs. Intelligence Rules**:
  - **Indigo** (`var(--action-primary)`) is strictly reserved for user actions, primary buttons, and active selection states.
  - **Cyan** (`var(--status-info-fg)` / `#4cc9e0`) is strictly reserved for intelligence, model output, and live evidence signals. Indigo never marks model output; Cyan never fills a control that writes.
- **Zero-Network Invariant**:
  - Desktop applications operate under a strict `default-src 'self'` Content Security Policy.
  - No remote fonts, CDN icons, or external scripts may be fetched. Icons must be vendored into `apps/desktop/src/design/icons/glyphs.ts` via `scripts/desktop/generate-design-icons.mjs`.
- **Explicit Empty States**:
  - Unavailable capabilities must render `"Not configured"`, `"Not evaluated"`, `"Unsupported"`, or `"Future"`.
  - Never render `0`, `N/A`, em dashes, or empty blank cards. Use `EmptyState` component for empty views.
