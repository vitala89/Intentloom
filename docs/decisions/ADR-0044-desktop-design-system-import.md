# ADR-0044: Desktop Design System Import

- **Status**: Accepted
- **Date**: 2026-07-30
- **Authors**: Intentloom Maintainers

## Context

`apps/desktop` shipped its v0.6 read-only surfaces with ad hoc styling: a single
`src/styles.css` holding hardcoded colours and an Inter font stack, with every
component styled inline at the point of use. There was no shared token layer, no
component vocabulary, and no way to keep the Desktop surfaces visually
consistent with each other as they grew.

A design system for Intentloom Desktop was authored separately in Claude Design
(project `ed22f0a4-9bf4-4200-8bf1-889f0f9979c1`, "Intentloom Design System"). It
supplies a token layer, a component library, vector logo masters, and written
guidelines. Its content model was derived from this repository: finding codes,
categories, readiness values, trust classes, evidence quality values, protocol
method names, profiles, and adapter names are the real values from
`packages/`, not invented placeholders.

Two properties of the authored system conflict directly with an Intentloom
invariant:

1. Its `Icon` component fetched every glyph from `https://unpkg.com` at runtime
   and applied it as a CSS mask.
2. Its font layer imported Geist and JetBrains Mono from Google Fonts.

Both violate the local-first boundary recorded in ADR-0008 and
`docs/security/THREAT_MODEL.md` ("zero telemetry, zero external network calls
during normal operations"). Both would also be blocked by the Desktop content
security policy, which is `default-src 'self'`. The failure mode is silent: the
CSP blocks the request and the glyph renders as an empty box, so the defect
would have surfaced as a cosmetic bug rather than as the policy violation it is.

## Decision

Import a scoped subset of the design system into `apps/desktop/src/design/`,
adapted so that the application still makes no external network calls.

### Scope

Six component groups are imported: `brand`, `code`, `core`, `data`, `evidence`,
and `forms` (26 components). Dependency analysis confirmed this subset is
self-contained: its only external module is `react`. The `layout`, `navigation`,
`overlays`, `states`, and `status` groups are deliberately **not** imported;
they will follow when a Desktop surface consumes them.

The full token layer is imported, because the components reference 79 custom
properties and render unstyled without it. The vector logo masters are imported
as static assets.

### Adaptations

1. **Icons are vendored, not fetched.** `scripts/desktop/generate-design-icons.mjs`
   extracts an explicit allowlist of 26 Lucide glyphs from the `lucide-static`
   devDependency and emits `src/design/icons/glyphs.ts`, which is committed. The
   `Icon` component renders inline SVG from that module. Lucide is ISC licensed;
   attribution is in `src/design/icons/LICENSE.md`.

   An unknown glyph name renders nothing rather than a placeholder, consistent
   with the honest-capability principle: the product does not show a synthetic
   value for something it does not have. Icons are decorative and the accessible
   name always lives on the control, so an absent glyph degrades the visual only.
   In development builds an unknown name logs a one-time console warning naming
   the script to re-run.

2. **Fonts are self-hosted.** Geist and JetBrains Mono are added as
   `@fontsource-variable` dependencies and bundled by Vite as local `woff2`
   assets. The token `--font-sans` and `--font-mono` stacks list the variable
   family names ahead of the static names the system was authored against.

3. **Components are TypeScript.** The source is JavaScript with sibling `.d.ts`
   files. Each component was converted to `.tsx` under the repository's strict
   compiler settings (`strict`, `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `NodeNext` resolution), with the `.d.ts`
   contracts becoming exported prop interfaces. Markup, inline styles, and the
   tone/status/trust constant maps are ports, not rewrites.

Three behavioural corrections were made during conversion, each because the
authored behaviour would misreport state to the user or leak:

- `CopyButton` entered its "Copied" state even when the clipboard write was
  unavailable or rejected. It now enters that state only after the write
  resolves. This matters beyond tidiness: telling a user something was copied
  when it was not is exactly the class of dishonest feedback the content rules
  forbid.
- `CopyButton` never cleared its reset timer, so it fired after unmount.
- Several form components called `useId()` on the right-hand side of `||`,
  making the hook call conditional. The call is now unconditional.

### Boundaries

The imported system is a library, not a migration. `App.tsx` is unchanged and
still renders its existing markup; `src/design/styles.css` is loaded before
`src/styles.css` so application styles win. Adopting the components into the
Desktop surfaces is separate work, done surface by surface.

## Consequences

### Positive

- Desktop gains a token layer, a component vocabulary, and vector brand assets
  without weakening the local-first boundary.
- The offline guarantee is now stronger than before this change: the packaged
  application renders identically with no network at all, including its fonts.
- The glyph allowlist keeps the icon surface small and makes each addition a
  reviewed change rather than an arbitrary runtime URL.
- Prop contracts are enforced at compile time; `pnpm typecheck` covers the
  component library.

### Negative

- Three new dependencies in `@intentloom/desktop`: two font packages (runtime)
  and `lucide-static` (development only).
- `glyphs.ts` is generated and committed, so adding a glyph is a two-step change
  (edit the allowlist, re-run the script). This is the same trade-off the
  repository already accepts for generated adapter output.
- The imported library and the Claude Design source can drift. The design
  project remains the design source of truth; this repository is the source of
  truth for what ships.

### Neutral

- `format:check` now covers `.tsx` and `.css`, which it did not before. This
  closed a pre-existing gap rather than one introduced here.
- Unused components are tree-shaken, so importing the library did not change the
  shipped bundle until a surface consumes it.

## Follow-up

- The static lockup and stacked SVG masters (`logo-lockup*.svg`,
  `logo-stacked*.svg`) contain live `<text>` set in Inter. They render with a
  fallback face wherever Inter is absent, which includes a clean packaged build.
  Outline the text before these are used anywhere that fixed metrics matter. The
  `Logo` and `Wordmark` components are unaffected: they are inline SVG and use
  `useId` for their gradient and mask identifiers, so they neither depend on
  Inter nor collide when several marks render in one document.
- `Combobox` uses `backdrop-filter` and `TextInput` uses `color-mix(in oklab, ...)`,
  both without a fallback. On an engine lacking `color-mix` the focus ring
  disappears entirely, which is an accessibility regression rather than a
  cosmetic one. Both were imported as authored; add fallbacks before either
  component ships in a user-facing surface.
