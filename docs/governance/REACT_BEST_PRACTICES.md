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
- `neutron/` — one Desktop feature boundary for Neutron. The root holds
  composition and the one Neutron-level presentation module recorded by
  `tests/desktop-neutron-boundaries.test.ts`. Subfeatures follow lifecycle
  and ubiquitous language, not technical type:

  - `session/` — session header, composer, session hook, and the Desktop
    session viewmodel.
  - `graph/` — task-graph projection, including stale graph state and the
    graph input the session submits.
  - `activity/` — tool activity, plus context summary and context sources.
    Context stays here: the activity panel composes it and it shares
    activity copy. It has no separate lifecycle.
  - `result/` — session result and evidence projection. Evidence is part of
    this result surface, not a second feature.
  - `mutation/proposal/` — mutation proposal presentation.
  - `mutation/review/` — exact mutation review.
  - `mutation/recovery/` — recovery and status presentation, including the
    Approve & Apply control that renders that status. There is no separate
    `apply/` directory.
  - `mutation/neutron-mutation-review-state.ts` and
    `mutation/neutron-mutation-review-copy.ts` — shared mutation review
    state and copy read by both review and recovery.
  - `neutron-digest-display.ts` — Neutron-root digest shortening used by
    result, proposal, and review.

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
- A feature must not import the shell (`App.tsx`, `DesktopShell.tsx`,
  `WorkspaceSidebar.tsx`, `WorkspaceTopbar.tsx`, `WorkspaceContent.tsx`,
  `workspace-view-registry.tsx`, the workspace shell hooks, or `main.tsx`),
  `views/`, `neutron/`, or another feature.
- `design/` must not import features, views, or Neutron.
- Desktop client adapters must not import feature UI. The approve/apply
  client may import `NeutronMutationRecoveryPorts` from
  `neutron/mutation/recovery/neutron-mutation-recovery-controller.ts`
  only. That file is the Neutron recovery-port integration surface.
- Outside code may consume a feature only through an explicit public
  entrypoint or integration module. Private controllers and helpers stay
  inside the feature.
- The shell render entrypoints are `AdoptionPreviewPage`,
  `FoundationWorkshopView`, and `ExternalSpecializedPackPreviewPage`.
- Doctor consumes External Specialized Pack only through
  `external-specialized-pack-doctor-integration.ts`, which exports
  `hasExternalSpecializedPackDoctorFindings`. That module is the feature's
  doctor integration surface. It is not a shared helper.
- An integration surface stays narrow and uses a domain name. Do not add
  `utils`, `helpers`, `shared`, or a wildcard `index.ts` barrel to stand
  in for a boundary.
- Adding an exception in `tests/desktop-feature-boundaries.test.ts` or
  `tests/desktop-neutron-boundaries.test.ts` is not a substitute for
  declaring that public module. The test allowlist may name shell
  entrypoints, Neutron subfeature public surfaces, and integration
  modules only.
- Business invariants stay in application and protocol. Desktop feature
  folders organize presentation and client-side interaction. Do not add
  Aggregate, Entity, Repository, Domain Service, or Value Object types in
  Desktop to mirror tactical DDD.

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

Neutron dependency direction:

```text
NeutronWorkspace
  ↓
subfeature public surfaces
  ↓
local viewmodels and presentation helpers
  ↓
desktop client + @intentloom/protocol
```

`NeutronWorkspace` composes subfeatures and stays at the Neutron root. It
does not own domain rules. A subfeature may import another subfeature only
through a public surface named in
`tests/desktop-neutron-boundaries.test.ts`. Private parsers and helpers
stay in the owning subfeature. Do not add `utils`, `helpers`, `shared`, or
an `index.ts` barrel to stand in for that boundary.

Before adding Neutron source:

1. Identify the semantic owner: session, graph, activity, result, mutation
   proposal, mutation review, or mutation recovery.
2. Place the module in that subfeature.
3. Do not add a feature module at the `neutron/` root.
4. Do not invent a shared helper without a real cross-subfeature consumer.
   The mutation review state and copy modules exist because review and
   recovery both read them.
5. Do not import another subfeature's private internals.

## 6. Desktop shell composition

The shell composes workspace views. It does not own feature behavior.
`App.tsx` is the composition root: it wires focused controllers and renders
`DesktopShell`. Do not add product logic, daemon calls, or feature branching
to `App.tsx`.

```text
App
  ↓
DesktopShell
  ↓
WorkspaceSidebar / WorkspaceTopbar
  ↓
WorkspaceContent
  ↓
workspace view registry
  ↓
public feature entrypoints and the remaining views
```

- `DesktopShell`, `WorkspaceSidebar`, and `WorkspaceTopbar` are presentation.
  They render the current view, project label, navigation catalog, command
  palette trigger, cancel button, and theme toggle. They do not call the
  daemon or decide feature behavior.
- `WorkspaceContent` renders the active view through
  `workspace-view-registry.tsx`. That registry is a static, typed map from
  `WorkspaceView` to a render function. It imports only public feature
  entrypoints (`AdoptionPreviewPage`, `FoundationWorkshopView`,
  `ExternalSpecializedPackPreviewPage`), `NeutronWorkspace`, and the views
  that still live in `views/`. It does not load modules by string, own remote
  operations, or fall back to Overview for an unhandled view.
- Do not add a new `if (activeView === ...)` branch in the shell. Add the
  view to the navigation catalog and the registry together. A missing view
  fails compilation because the registry must cover every `WorkspaceView`.
- `workspace-navigation.ts` is the catalog for view id, icon, sidebar
  placement, and command-palette navigation. The id strings are the
  user-visible labels (`"Diff review"`, `"Neutron"`, and the rest). Do not
  replace them with different product names or route URLs. Command-palette
  navigation is derived from that catalog. Non-navigation actions stay
  explicit in `workspace-command-options.ts`. Domain side effects, including
  opening Doctor and loading Doctor, stay in
  `desktop-workspace-view-actions.ts`.
- Project selection (`use-project-selection.ts`) owns the selected root, the
  loaded-view confirmation, native folder selection, and the root-bound
  reset. Workspace operation state (`use-workspace-operation.ts`) owns the
  single `AbortController`, connection-in-progress flag, and cancel
  behavior. Inspect, Diff, and Timeline snapshots that reset with the root
  live in `use-workspace-project-reads.ts`. Doctor state stays in
  `useDesktopDoctor`. Daemon connection stays in `useDesktopConnect`.
  `use-workspace-daemon-session.ts` only composes those two hooks.
- The application remains one window with local React state. Do not add a
  URL router, history navigation, or a global client state framework
  (Redux, Zustand, MobX, React Query, XState, Jotai, Recoil, or a custom
  event bus) without an ADR.
- Do not introduce a broad React context for shell state. Pass grouped
  values through composition. Do not replace `App.tsx` with one hook that
  returns every field and callback.
- Future shell code must not accumulate feature logic. A new feature exposes
  a public entrypoint. The shell only composes it.
