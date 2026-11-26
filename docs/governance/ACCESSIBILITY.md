# Accessibility

This is the repository-development rule for accessibility of user-facing
interfaces. It does not change Desktop runtime behavior, add dependencies, or
claim that Intentloom conforms to a statute.

Desktop interaction techniques that are already specific to this codebase stay
in `REACT_BEST_PRACTICES.md` section 3. The 2026-07-27 read-only Desktop audit
stays in `docs/desktop/A11Y_AUDIT.md` as historical evidence. Neither document
is a second policy.

## When an assessment is required

A new or modified user-facing interface needs an Accessibility Impact
Assessment in the System Design or, for a small interface change, in the pull
request. Record which checks apply, which ran, and the observed result, using
the statuses in `ENGINEERING_LIFECYCLE.md`.

A critical accessibility barrier, or a mandatory check that is FAIL, PENDING,
or BLOCKED, blocks release readiness for the affected functionality. Merge of
an unrelated change is not that release decision.

Accessibility is part of the interface itself. Do not limit it to a paid tier.

## Engineering target

For web interfaces, including the web content of the Desktop shell, the target
is the Web Content Accessibility Guidelines (WCAG) 2.2, Level AA. Level AA
means every Level A and every Level AA success criterion, or a conforming
alternate version where WCAG allows one. The W3C Recommendation of 12 December
2024 is `https://www.w3.org/TR/WCAG22/`. Conformance is explained at
`https://www.w3.org/WAI/WCAG22/Understanding/conformance`. The World Wide Web
Consortium (W3C) does not certify claims made against that document.

Content that meets WCAG 2.2 also meets WCAG 2.1 and WCAG 2.0. The historical
Desktop audit used “WCAG 2.x”. That audit is not a WCAG 2.2 conformance claim.

For Desktop and any future mobile surface, use the current accessibility
guidance from the platform vendor and the WCAG criteria that describe the same
interaction. Where a native control and a web criterion differ, record which
one was applied and why. Do not copy a web-only technique onto a native control
that already exposes the platform accessibility API.

## Legal and standards applicability

This section records scope that was checked against primary public texts. It is
not legal advice and it is not a conformance claim.

- Directive (EU) 2019/882, the European Accessibility Act, applies to listed
  products placed on the market after 28 June 2025 and listed consumer services
  provided after that date. The list covers consumer general-purpose computer
  hardware and the operating systems for that hardware, specified self-service
  terminals, consumer terminal equipment for electronic communications and for
  audiovisual media, e-readers, electronic communications services, access to
  audiovisual media, specified elements of passenger transport, consumer
  banking, e-books and dedicated software, and e-commerce services. Text:
  `https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng`.
- In Germany, the act that implements the directive is the
  Barrierefreiheitsstärkungsgesetz (BFSG). The federal accessibility office
  states that companies are obliged by that national statute, not directly by
  the directive. Statute:
  `https://www.gesetze-im-internet.de/bfsg/BJNR297010021.html`. Office
  explanation:
  `https://www.bundesfachstelle-barrierefreiheit.de/DE/Fachwissen/Produkte-und-Dienstleistungen/European-Accessibility-Act/european-accessibility-act`.
- EN 301 549 is the European standard for information and communications
  technology accessibility. These three things are not the same document, and
  this policy does not treat them as one:
  - Published standard. On 26 November 2026 the federal accessibility office
    described EN 301 549 V3.2.1 (2021-03) as the current technical reference.
    It said web requirements are in clause 9 and that this published version
    points at WCAG 2.1.
  - Later revision. The same page, read the same day, described a revision
    that would point at WCAG 2.2 and said that updated version was expected to
    become legally effective around 2027. That is the office’s description of
    work that was not yet the published V3.2.1 text. It is not cited here as a
    finished standard.
  - Harmonised standard. Presumption of conformity under BFSG §4 applies to
    harmonised standards, or parts of them, whose references have been
    published in the Official Journal of the European Union. This policy does
    not assert that publication for V3.2.1 or for any draft revision, and it
    does not assert that Intentloom meets either.
    Office note, read 26 November 2026:
    `https://www.bundesfachstelle-barrierefreiheit.de/DE/Barrierefreiheitsstaerkungsgesetz/Normen-und-Standards/normen-und-standards_node`.

Intentloom is documented as a local open-source developer tool. Whether a given
distribution, hosted offer, or commercial service falls inside the directive or
the BFSG is a decision for the Project Owner with legal advice. Other
jurisdictions need the same treatment: name the instrument, cite it, and do not
declare compliance without evidence.

## Assessment contents

Cover the items that the change can affect:

- Semantic HTML (HyperText Markup Language).
- Accessible names.
- Keyboard navigation and focus management.
- Screen reader support.
- Color contrast, including equivalent light and dark themes.
- Text scaling and responsive reflow.
- Reduced motion.
- Alternative text.
- Forms and error messages.
- Touch target size, checked against WCAG 2.2 success criterion 2.5.8 for web
  targets.
- Dialogs.
- Dragging movements, checked against WCAG 2.2 success criterion 2.5.7. When
  web content uses a dragging movement to operate a function, the same
  function must also be achievable with a single pointer and without dragging,
  unless dragging is essential or the dragging behaviour is determined by the
  user agent and not modified by the author. The W3C understanding document,
  updated 10 August 2026, is
  `https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements`.
  This is not the keyboard requirement. Success criteria 2.1.1 and 2.1.3 still
  require a keyboard path, and a keyboard path does not by itself meet 2.5.7
  unless that path also gives controls a pointer can click or tap. A
  single-pointer alternative must not itself be only a path-based gesture such
  as a swipe. Scrolling that the user agent provides, including ordinary
  overflow scrolling, is the user-agent exception. Content that replaces that
  scrolling with its own dragging behaviour is in scope.
- Captions and transcripts for time-based media.
- Charts and other data visualization.
- AI streaming, progress, and agent status, exposed as text or another
  non-visual status, not by animation alone.

Prefer native semantics. Use Accessible Rich Internet Applications (ARIA) only
when native semantics cannot express the role, name, or state.

## Evidence

`axe-core` is not installed. `docs/desktop/A11Y_AUDIT.md` already records that
adding it needs maintainer authorization. Do not add it in a documentation
change. If a later change installs it, its report is one input, not the whole
assessment.

Manual checks are required for the affected UI: keyboard-only use, and one
assistive technology appropriate to the platform (VoiceOver, NVDA, TalkBack, or
another tool the pull request names). Record the tool, the build or commit, and
what was observed.

Automated checks alone do not establish accessibility conformance.
