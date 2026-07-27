# Intentloom Desktop v0.6 Design Brief

Status: approved by maintainer on 2026-07-27.

Product stage: `v0.6.0-beta.1`.

Primary platforms: macOS, Windows, and Linux.

Default direction: dark-first with an equivalent light theme.

Product language: English.

## Assignment

Create the product-design foundation for the first official Intentloom Desktop
application.

The handoff must include:

- a refined Intentloom identity and production-ready logo set;
- a token-based design system with equivalent light and dark modes;
- information architecture and desktop navigation;
- high-fidelity screens for the `v0.6 MVP`;
- clearly labelled future product surfaces;
- component variants and all interaction states;
- clickable prototypes for the main journeys;
- accessibility annotations;
- implementation-ready assets, variables, measurements, and behavior notes.

The design must represent the current architecture honestly. Do not invent
metrics or imply that a hosted agent, marketplace, live provider connection,
unrestricted terminal, or automatic repository mutation already exists.

## Product definition

Intentloom is a local-first and provider-neutral control layer for reliable
agentic software engineering. It helps developers preserve engineering intent,
inspect a project, diagnose health and drift, review exact evidence and diffs,
understand engineering history, create reviewable plans, and keep mutation
authority with the human.

Desktop is a client of Intentloom:

```text
Desktop UI
    ↓
versioned local protocol
    ↓
authenticated intentloomd
    ↓
shared application operations
    ↓
core, validation, evidence, conformance, and transactions
```

## Target users

Primary users:

- frontend, backend, QA, AI, mobile, DevOps, platform, and security engineers;
- senior engineers, technical leads, and open-source maintainers;
- developers using Claude Code, Codex, Cursor, Copilot, or several tools;
- developers who want local data, visible permissions, and explicit approval.

The interface should feel calm, precise, technical, trustworthy, and
inspectable. It should resemble a well-designed developer tool rather than a
generic analytics dashboard.

## Design principles

### Evidence first

Important results show source, trust, freshness, project root, and uncertainty.
Verified, inferred, missing, stale, unsupported, and conflicting information
must look different.

### Human authority

Model output, prompts, external evidence, and recommendations never look like
approval. Mutation controls are visually and behaviorally separate.

### Local-first visibility

The selected root, daemon connection, read-only state, provider network mode,
and data-retention state remain discoverable.

### Dense but calm

Support code, diff, timeline, table, graph, and inspector surfaces without
turning every page into a grid of decorative cards.

### Progressive disclosure

Start with project health and findings. Reveal provenance, raw evidence,
identifiers, hashes, and protocol details when requested.

### Honest capability

Unavailable capabilities display `Not configured`, `Not evaluated`,
`Unsupported`, or `Future`, never synthetic values.

## Visual direction

Preserve the strongest qualities of the approved reference:

- dark navy work surfaces;
- restrained indigo and blue accents;
- compact semantic status chips;
- left-side product navigation;
- master-detail layouts;
- code, diff, timeline, table, and inspector panels;
- an interwoven loop mark;
- a light brand canvas for identity and documentation.

Avoid:

- excessive neon glow;
- gradients used as semantic status;
- fake token, cost, success-rate, or productivity metrics;
- large empty dashboard cards;
- AI sparkles, robot heads, brains, or shields;
- red and green as the only diff distinction.

## Logo

The interwoven loop is the approved conceptual direction.

It represents several streams of engineering intent, tools, agents, evidence,
and workflows connected through one canonical system.

Required assets:

- primary horizontal lockup;
- symbol-only mark;
- stacked lockup;
- monochrome black and white;
- light and dark theme variants;
- macOS, Windows, and Linux application icons;
- menu-bar and tray icon;
- favicon and exports from 16 to 1024 pixels;
- simplified 16 to 24 pixel symbol;
- safe-area, minimum-size, and incorrect-use rules;
- editable SVG masters.

The mark must remain recognizable in one color. Refine line thickness,
crossings, corner radii, optical balance, and negative space without changing
the woven concept.

## Typography

Production recommendation:

- headings and display: Inter Variable with display optical sizing;
- body and controls: Inter Variable;
- code, paths, hashes, metrics, and shortcuts: JetBrains Mono.

Both families support an open-source distribution model and provide consistent
Latin and Cyrillic coverage.

| Token        | Size / line height | Weight | Use                       |
| ------------ | -----------------: | -----: | ------------------------- |
| `display-lg` |            40 / 48 |    700 | Onboarding hero only      |
| `heading-xl` |            32 / 40 |    700 | Major page title          |
| `heading-lg` |            24 / 32 |    650 | Workspace or modal title  |
| `heading-md` |            20 / 28 |    650 | Major section             |
| `heading-sm` |            16 / 24 |    650 | Card or panel title       |
| `body-lg`    |            16 / 24 |    400 | Introductory text         |
| `body-md`    |            14 / 20 |    400 | Default UI copy           |
| `body-sm`    |            13 / 18 |    400 | Dense tables and panels   |
| `label-md`   |            13 / 16 |    600 | Control label             |
| `label-sm`   |            12 / 16 |    600 | Chip and metadata         |
| `caption`    |            11 / 16 |    500 | Timestamps and provenance |
| `code-md`    |            13 / 20 |    400 | Code and diff             |
| `code-sm`    |            12 / 18 |    400 | Paths, hashes, and logs   |

Use tabular numerals for counts and durations. Truncated paths and hashes must
offer the complete value through a tooltip and copy action.

## Color foundations

Figma components must bind to semantic variables, never directly to primitive
palette values.

### Light mode

| Semantic token         | Value     |
| ---------------------- | --------- |
| `canvas`               | `#F7F8FC` |
| `surface`              | `#FFFFFF` |
| `surface-subtle`       | `#F0F2F7` |
| `surface-raised`       | `#FFFFFF` |
| `border`               | `#DDE2EC` |
| `border-strong`        | `#C3CBD9` |
| `text-primary`         | `#101426` |
| `text-secondary`       | `#45516B` |
| `text-tertiary`        | `#69758C` |
| `action-primary`       | `#4F46E5` |
| `action-primary-hover` | `#4338CA` |
| `brand-subtle`         | `#EEF2FF` |
| `focus`                | `#2563EB` |

### Dark mode

| Semantic token         | Value     |
| ---------------------- | --------- |
| `canvas`               | `#090D18` |
| `surface`              | `#0F1524` |
| `surface-subtle`       | `#131B2C` |
| `surface-raised`       | `#1A2336` |
| `border`               | `#27324A` |
| `border-strong`        | `#3A4660` |
| `text-primary`         | `#F4F7FF` |
| `text-secondary`       | `#B7C0D4` |
| `text-tertiary`        | `#8793AA` |
| `action-primary`       | `#6D72F6` |
| `action-primary-hover` | `#858AF8` |
| `brand-subtle`         | `#1B2140` |
| `focus`                | `#60A5FA` |

### Semantic status

Use color, icon, and text together:

- healthy or verified: green;
- running or active: blue;
- waiting or planned: violet;
- degraded or attention: amber;
- stopped, unknown, or not evaluated: slate;
- error or blocked: red;
- information: cyan.

Define separate foreground, border, and subtle-background tokens for every
status in both themes.

### Diff

Additions and deletions require more than green and red:

- prefix symbols and line markers;
- different background patterns or edge markers;
- accessible text labels;
- high-contrast focused line and selected hunk states.

## Layout

Design first for common laptop windows:

- minimum supported content size: 1024 by 700;
- reference canvas: 1440 by 900;
- wide canvas: 1728 by 1117.

Recommended shell:

- title bar and connection state;
- 224 to 256 pixel collapsible sidebar;
- project switcher at the top of the sidebar;
- main content with optional right inspector;
- bottom status area only when it carries useful project, daemon, or task state.

Use an 8 pixel spacing system with 4 pixel fine adjustments. Suggested radii:
6, 8, 12, and 16 pixels. Dense engineering tables should not use oversized
card radii.

## Information architecture

### `v0.6 MVP`

1. Launch and daemon connection
2. Welcome and onboarding
3. Local project selection
4. Project-root confirmation and read-only scope
5. Overview
6. Project Inspect
7. Doctor
8. Diff Review
9. Timeline and Releases
10. Command Palette
11. Settings
12. Loading, empty, stale, disconnected, cancelled, protocol-mismatch, and
    error states

### `v0.6 follow-up`

1. Workspace Sessions
2. Discuss
3. Inspect mode
4. Plan mode
5. Review mode
6. Local session export and delete
7. TUI parity views

### `future`

- Conformance
- Security Center
- Memory and Knowledge
- Workflow Graph
- Process Intelligence
- Skills
- MCP Servers
- Knowledge Providers
- Extension Manager
- Providers and Routing
- Agents and Subagent Tasks
- Policies
- Evaluations
- Approval and Permission dialogs
- Apply Approved Plan

Each future frame must display `Future` or `Concept only`. Do not place future
actions in the active MVP navigation.

## MVP screen requirements

### Launch and daemon connection

Show:

- Intentloom identity;
- `Connecting`, `Connected`, `Starting daemon`, `Protocol mismatch`,
  `Authentication failed`, and `Unavailable` states;
- safe retry;
- technical details disclosure;
- a clear exit path.

Do not expose the session token in the UI, logs, screenshots, or copy actions.

### Project selection

Show recent local projects and a native directory picker. Before connection,
display the canonical root and requested read-only capability. Require the user
to confirm the selected root.

Handle:

- path not found;
- unreadable directory;
- root outside an allowed boundary;
- symlink or canonical-root change;
- missing Intentloom metadata;
- protocol or daemon failure.

### Overview

Use real data:

- project identity and root;
- readiness or `Not evaluated`;
- Doctor finding counts;
- adapter and profile state;
- daemon and protocol state;
- data freshness;
- recent sessions when available;
- read-only state.

Do not invent daily tasks, active loops, cost, success rate, or token usage.

### Inspect

Use a master-detail layout for:

- capability state;
- profile and adapters;
- instruction and configuration files;
- ownership and generated-file state;
- readiness findings;
- provenance and freshness.

### Doctor

Support:

- severity and category filters;
- keyboard traversal;
- finding list and detail inspector;
- affected path and evidence;
- remediation guidance;
- unsupported and uncertain states;
- copyable technical details.

### Diff Review

Support unified and side-by-side modes, file navigation, hunk navigation,
whitespace visibility, copy, search, collapse unchanged sections, and large
diff virtualization.

The first slice is review-only. Do not include `Apply all`.

### Timeline and Releases

Show event order, source, trust state, timestamp, case identity, and evidence
quality. Provide a table alternative to every graphical timeline.

Do not infer bottlenecks, rework, causality, or individual performance unless a
separately approved capability provides that evidence.

### Settings

MVP settings:

- theme: system, light, or dark;
- reduced motion;
- density;
- default project behavior;
- daemon diagnostics;
- local data location;
- privacy and network explanation;
- version and protocol information.

Provider credentials and routing may be designed as future frames but are not
part of the first implementation.

## Components

Create production-ready variants for:

- application shell and sidebar;
- project switcher;
- page header and toolbar;
- buttons, icon buttons, segmented controls, and links;
- text input, search, select, checkbox, radio, switch, and combobox;
- status chip and capability badge;
- banner, inline alert, toast, and callout;
- tabs and breadcrumbs;
- table, tree, list, and virtualized list;
- card, panel, split view, and resizable inspector;
- modal, confirmation dialog, drawer, popover, tooltip, and context menu;
- command palette;
- empty, loading, skeleton, stale, error, and disconnected states;
- code block, file path, copy control, and keyboard key;
- diff file tree, diff line, hunk header, and comment-free review controls;
- timeline event, evidence badge, and provenance detail;
- workspace message, plan item, review item, and permission summary for
  follow-up screens.

Every interactive component requires default, hover, active, focus-visible,
disabled, selected, loading, error, and high-contrast considerations where
applicable.

## Figma structure

Create these pages:

1. `00 Cover & Principles`
2. `01 Brand & Logo`
3. `02 Foundations`
4. `03 Tokens & Variables`
5. `04 Components`
6. `05 Patterns & States`
7. `06 MVP Light`
8. `07 MVP Dark`
9. `08 Workspace Prototype`
10. `09 Future Product Surfaces`
11. `10 Accessibility`
12. `11 Engineering Handoff`
13. `99 Archive & Explorations`

Variables must include light and dark modes plus spacing, radius, typography,
elevation, density, and motion.

## Required prototypes

1. First launch and project connection
2. Doctor finding investigation
3. Diff review
4. Timeline and release evidence
5. Discuss to Inspect to Plan to Review
6. Daemon recovery:

```text
disconnected
→ warning
→ retry
→ protocol details
→ reconnect, restart, or safe exit
```

The Workspace prototype is a follow-up design. Any Apply prototype is future
work and must be visibly marked `Do not implement in the read-only slice`.

## Accessibility

Target WCAG 2.2 AA.

Required:

- complete keyboard navigation;
- visible and consistent focus;
- logical reading and tab order;
- minimum 24 by 24 pixel interactive targets;
- 4.5:1 normal-text contrast;
- 3:1 control, focus, and large-text contrast;
- 200 percent zoom and text scaling;
- reduced motion;
- screen-reader names and state annotations;
- a table or list alternative to graphs and timelines;
- non-color diff and status communication;
- accessible resizers, menus, dialogs, and command palette;
- no keyboard traps.

## Motion

Keep motion short and functional:

- control feedback: 80 to 120 ms;
- panel transition: 140 to 180 ms;
- modal transition: 160 to 220 ms.

Respect reduced-motion settings. Do not use looping ambient animations in the
main product surface.

## Engineering handoff

The final handoff must contain:

- named semantic variables and their light/dark values;
- component properties and states;
- responsive and minimum-size behavior;
- spacing and alignment measurements;
- icon names and SVG exports;
- font files and license references;
- empty, loading, error, disconnected, stale, cancelled, and unsupported
  examples;
- keyboard interactions;
- accessibility annotations;
- sample realistic data;
- explicit `MVP`, `follow-up`, `future`, and `concept only` labels;
- asset-export rules;
- a change log for approved design revisions.

The implementation agent must not infer missing behavior from static frames.
Complex behavior belongs in prototype notes or the handoff specification.

## Design acceptance checklist

- [ ] Both themes are complete and use semantic variables.
- [ ] The logo works at 16 pixels and in one color.
- [ ] All MVP pages and recovery states exist.
- [ ] Desktop frames use realistic Intentloom data.
- [ ] No fake product metrics are present.
- [ ] Future capabilities are labelled and absent from active MVP navigation.
- [ ] Keyboard and focus behavior is annotated.
- [ ] Diff and status meaning does not rely only on color.
- [ ] Five core journeys and daemon recovery are clickable.
- [ ] Engineering assets and token values are exportable.
- [ ] WCAG 2.2 AA review findings are resolved or documented.
