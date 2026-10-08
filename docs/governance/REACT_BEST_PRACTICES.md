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

---

## 5. Desktop feature boundaries

Desktop source under `apps/desktop/src` is organized by product capability:

```text
app / shell
    ↓
features
    ↓
shared UI (design/) and Desktop client adapters
    ↓
typed protocol → Tauri → daemon → application
```

Directories name cohesive feature responsibility. They do not name file
types. Do not regroup Desktop into global `components/`, `controllers/`,
`hooks/`, `services/`, or `models/`.

Current boundaries:

- `features/adoption/` — Existing Project Adoption: preview, decisions,
  prepared plan, and apply. The page module is the shell entrypoint.
- `features/foundation/workshop/` — Foundation Workshop, including Discovery.
- `features/foundation/blueprint/` — Foundation Blueprint.
- `features/foundation/scaffold/` — Foundation Scaffold.
- `features/external-specialized-pack/` — External Specialized Pack preview,
  review, approval, activation, input staleness, and doctor integration.
  The preview page is the shell entrypoint.
- `neutron/` — the existing Neutron feature boundary. Leave it flat until
  the Neutron decomposition increment. Do not add new Neutron modules at
  the `neutron/` root by default.
- `views/` — temporary home for smaller surfaces (Inspect, Doctor, Diff,
  Timeline, Settings, Overview, New Project, Open Existing Project, Feature
  Intent, Bounded Execution, Continuous Loop) and the extension contribution
  registries (`command-registry`, `panel-registry`, `extension-settings`,
  `view-sandbox-protocol`). It must not become a dumping ground.

When a feature grows beyond a small cohesive set of files, add internal
sub-feature boundaries by semantics or lifecycle, as Foundation does for
Workshop, Blueprint, and Scaffold. Do not split that feature into
`components/`, `hooks/`, and `services/` merely by technical type.

Shared modules require demonstrated cross-feature responsibility. Similar
syntax in two features is not a reason to extract a shared helper.

Dependency direction:

- A feature may import `design/`, `desktop-client*`, and
  `@intentloom/protocol`.
- A feature must not import `@intentloom/application`, `@intentloom/core`,
  `@intentloom/daemon`, a provider SDK, or the filesystem.
- A feature must not import the shell (`App.tsx`, `WorkspaceContent.tsx`,
  `main.tsx`), `views/`, `neutron/`, or another feature.
- `design/` must not import features or views.
- Desktop client adapters must not import feature UI.
- The shell imports feature entrypoints only:
  `AdoptionPreviewPage`, `FoundationWorkshopView`, and
  `ExternalSpecializedPackPreviewPage`.
- Business invariants stay in application and protocol. Desktop feature
  folders organize presentation and client-side interaction. Do not add
  Aggregate, Entity, Repository, Domain Service, or Value Object types in
  Desktop to mirror tactical DDD.

Public entrypoints are the modules the shell renders. Do not add wildcard
barrels. Controllers and helpers stay private by convention.

The one current cross-boundary consumption is `views/DoctorView.tsx`
importing `hasExternalSpecializedPackDoctorFindings` from External
Specialized Pack. A new cross-boundary import needs the same explicit
reason.

`tests/desktop-feature-boundaries.test.ts` records the permitted `views/`
root files and these import rules. A new file directly under `views/`
fails that test until this section and the allowlist change together.

Before adding a new Desktop source file:

1. Identify its feature or domain owner.
2. Place it inside that feature boundary.
3. Do not default to `src/views/`.
4. Do not default to the root of `src/neutron/`.
5. Do not create a new shared abstraction without evidence of
   cross-feature reuse.

Later increments are not authorized by this section. Neutron decomposition
groups the current flat `neutron/` tree by session, graph, activity,
context, result/evidence, mutation proposal, mutation review, and mutation
recovery. Workspace shell composition is a separate increment. Do not add a
router or a global client state framework in order to place a feature.
