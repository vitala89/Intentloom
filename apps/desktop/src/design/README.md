# Desktop design system

Token layer, component library, and brand assets for Intentloom Desktop.

Imported from the Claude Design project "Intentloom Design System"
(`ed22f0a4-9bf4-4200-8bf1-889f0f9979c1`). The rationale, scope, and the
deviations from the authored source are recorded in
[ADR-0044](../../../../docs/decisions/ADR-0044-desktop-design-system-import.md).

## Layout

| Path          | What it is                                                                 |
| ------------- | -------------------------------------------------------------------------- |
| `styles.css`  | Entry point. Imports every token file. Loaded once from `src/main.tsx`.    |
| `tokens/`     | Colours, typography, spacing, radius, elevation, effects, motion, base.    |
| `components/` | React components, grouped by concern.                                      |
| `fonts/`      | Self-hosted Geist and JetBrains Mono, bundled from `@fontsource-variable`. |
| `icons/`      | Vendored Lucide glyphs plus attribution.                                   |
| `assets/`     | Vector logo masters.                                                       |

Component groups present: `brand`, `code`, `core`, `data`, `evidence`, `forms`.
The `layout`, `navigation`, `overlays`, `states`, and `status` groups exist in
the design project but were not imported; add them when a surface needs them.

## No external network calls

This application makes no external network calls and ships a `default-src 'self'`
content security policy. Two parts of the authored design system violated that
and were adapted:

- Glyphs were fetched from a CDN per icon. They are now vendored into
  `icons/glyphs.ts` and rendered inline.
- Fonts were imported from Google Fonts. They are now bundled locally.

Do not reintroduce a remote URL here. A blocked request fails silently under the
content security policy, so the symptom looks like a missing glyph rather than a
policy violation.

## Adding an icon

`icons/glyphs.ts` is generated. Add the glyph name to the allowlist in
`scripts/desktop/generate-design-icons.mjs`, then:

```sh
node scripts/desktop/generate-design-icons.mjs
```

A name that is not in the set renders nothing, and logs a one-time warning in
development builds.

## Using a component

Relative imports resolve under `NodeNext`, so they carry a `.js` extension:

```tsx
import { Button } from "./design/components/core/Button.js";
import { EvidenceBadge } from "./design/components/evidence/EvidenceBadge.js";
```

There is no barrel file: import each component from its own module so unused
components stay out of the bundle.

## Conventions worth keeping

These come from the design system's written guidelines and are not arbitrary:

- Indigo is action and selection. Cyan is intelligence: model output, streaming,
  live evidence. Cyan never fills a control that writes; indigo never marks
  model output.
- Unavailable capability renders `Not configured`, `Not evaluated`,
  `Unsupported`, or `Future`. Never `0`, `N/A`, an em dash, or an empty card.
- Colour is never the only signal. Status carries an icon and a word; diff lines
  carry a sign, an edge marker, a tinted gutter, and a visually hidden label.
- Machine values keep their exact casing: `angular-tauri`, not `Angular-Tauri`.
- Counts, durations, timestamps, and line numbers use the `il-tnum` class for
  tabular figures.
