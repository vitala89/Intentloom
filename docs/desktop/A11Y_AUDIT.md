# Desktop A11y Audit — v0.6 Beta

**Date:** 2026-07-27
**Branch:** `codex/desktop-v06-stack-adr`
**Scope:** All five read-only views (Overview, Inspect, Doctor, Diff Review, Timeline)

## Implemented — WCAG 2.x baseline

| Criterion                  | Technique                                                                               | Location            |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------- |
| 2.4.1 Bypass Blocks        | Skip-to-content link (`<a href="#workspace-content">`)                                  | App.tsx render root |
| 2.4.3 Focus Order          | Overlay autoFocus on primary action; focus returns to trigger via useEffect cleanup     | ConfirmRootChange   |
| 2.4.7 Focus Visible        | `:focus-visible` outlines on all interactive elements                                   | styles.css          |
| 2.1.1 Keyboard             | Escape closes confirm overlay; ArrowUp/Down for Doctor, Diff, Timeline listboxes        | App.tsx             |
| 1.3.1 Info & Relationships | `aria-current="page"` on active nav item                                                | App.tsx nav         |
| 4.1.3 Status Messages      | `role="status"` + `aria-live="polite"` offscreen span announces connection changes      | App.tsx topbar      |
| 4.1.3 Status Messages      | `role="status"` on reconnect-notice, timeline quality notices, doctor/diff empty states | App.tsx             |
| 1.3.1 Info & Relationships | `aria-activedescendant` + id on Doctor finding-item-{n}                                 | DoctorView          |
| 1.3.1 Info & Relationships | `aria-activedescendant` + id on Diff change-item-{n}                                    | DiffView            |
| 1.3.1 Info & Relationships | `aria-activedescendant` + id on Timeline timeline-row-{n}                               | TimelineView        |
| 2.4.6 Headings and Labels  | All sections use aria-labelledby pointing to real h2                                    | all views           |
| 1.1.1 Non-text Content     | Decorative icons use aria-hidden="true"                                                 | all views           |
| 4.1.2 Name, Role, Value    | role="dialog" + aria-modal + aria-labelledby + aria-describedby on confirm overlay      | ConfirmRootChange   |
| 1.3.6 Identify Purpose     | id="workspace-content" landmark for skip link target                                    | App.tsx             |
| 1.3.1 Info & Relationships | dl/dt/dd for all metadata panels                                                        | all views           |
| 1.3.1 Info & Relationships | scope="col" on Timeline table column headers                                            | TimelineView        |

## Known gaps (not blocking v0.6 beta)

| Gap                                                     | WCAG  | Priority | Notes                                                |
| ------------------------------------------------------- | ----- | -------- | ---------------------------------------------------- |
| Color contrast: tertiary text may fall below 4.5:1      | 1.4.3 | Medium   | Needs axe-core / Lighthouse measurement              |
| Dialog focus trap: Tab/Shift+Tab can escape the overlay | 2.1.1 | Medium   | Real fix: native dialog element or focus-trap-react  |
| role="option" on button elements inside role="listbox"  | 4.1.2 | Low      | Widely supported; fix requires li items or grid role |
| role="option" on tr elements inside role="listbox"      | 4.1.2 | Low      | role="row" is correct for tr                         |
| aria-busy on loading containers                         | 1.3.1 | Low      | Status chips already communicate loading             |
| @media (prefers-reduced-motion) guard on transitions    | 2.3.3 | Low      | Transitions are short (<200ms)                       |

## Path to automated testing

Adding axe-core + Playwright on CI would automate WCAG validation each build.
This requires maintainer authorization per AGENTS.md (new devDependencies).

## Manual keyboard test matrix

| Flow                           | Expected                          | Status |
| ------------------------------ | --------------------------------- | ------ |
| Tab to project-switcher, Enter | Confirm overlay (if data loaded)  | PASS   |
| Escape in overlay              | Closes, focus returns to switcher | PASS   |
| Tab to nav item, Enter         | View changes                      | PASS   |
| ArrowDown/Up in Doctor list    | aria-activedescendant updates     | PASS   |
| ArrowDown/Up in Diff list      | aria-activedescendant updates     | PASS   |
| ArrowDown/Up in Timeline list  | aria-activedescendant updates     | PASS   |
| Shift+Tab from first element   | Skip link visible at page top     | PASS   |
| Connection status change       | Polite live region fires          | PASS   |
