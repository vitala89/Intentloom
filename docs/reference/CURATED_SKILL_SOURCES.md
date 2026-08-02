# Curated Skill Method Sources

## Purpose

Record the external engineering-method sources reviewed for Intentloom's
first-party curated skills. This is provenance and compatibility evidence, not
an installed extension lock or a legal guarantee.

No third-party plugin, script, asset, hook, or runtime is bundled by the initial
curated skill slice. The canonical `aif-*` wording and control flow are authored
for Intentloom.

## Reviewed sources

| Source                                                    | Reviewed revision                                                                                                                              | License                                                                                           | Reviewed areas                                                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| [obra/superpowers](https://github.com/obra/superpowers)   | [`44c9b2d6e889982ac18c27d05a19fefe335194e1`](https://github.com/obra/superpowers/commit/44c9b2d6e889982ac18c27d05a19fefe335194e1), 2026-07-28  | [MIT](https://github.com/obra/superpowers/blob/44c9b2d6e889982ac18c27d05a19fefe335194e1/LICENSE)  | brainstorming, planning, debugging, TDD, verification, review, worktrees, subagent development, bootstrap and telemetry behavior       |
| [mattpocock/skills](https://github.com/mattpocock/skills) | [`2ab958093e83e0ec752e6c1c5932da465bf23e0c`](https://github.com/mattpocock/skills/commit/2ab958093e83e0ec752e6c1c5932da465bf23e0c), 2026-07-28 | [MIT](https://github.com/mattpocock/skills/blob/2ab958093e83e0ec752e6c1c5932da465bf23e0c/LICENSE) | grill flows, domain modeling, bug diagnosis, TDD, planning, implementation, code review, setup, issue-tracker and subagent assumptions |

## Retained methods

- inspect repository context before design or implementation;
- use focused questions to expose purpose, constraints, and success criteria;
- compare materially different approaches and state trade-offs;
- use reproducible feedback loops and falsifiable debugging hypotheses;
- apply red-green-refactor where a real behavior seam exists;
- review standards and specification compliance independently;
- require fresh verification evidence before completion claims;
- keep reusable procedures small and composable.

## Intentloom adaptations

- extended discovery is risk-based rather than mandatory for every edit;
- the feature interview never writes or commits unless the user requested it;
- TDD is required when it provides honest behavior evidence, not when it would
  manufacture a meaningless failing test;
- existing Intentloom specifications, ADRs, state, and Duty Watch replace an
  external `CONTEXT.md` or plugin-owned documentation hierarchy;
- Neutron capability and delegation contracts replace plugin-controlled
  subagent authority;
- all procedures stop at existing human-approval and transaction boundaries;
- one canonical catalog generates provider-specific derivatives.

## Rejected or deferred mechanics

- mandatory skill invocation based on a minimal probability threshold;
- mandatory brainstorming and committed design documents for trivial changes;
- automatic session-start hooks or user-level configuration changes;
- remote visual-companion assets and version-bearing telemetry;
- `npx ...@latest` or another unpinned installer as an adoption path;
- unconditional commits at the end of an implementation skill;
- automatic plugin updates;
- fresh mutating subagents for every plan step;
- periodic architecture rewrites without a task or roadmap trigger;
- issue-tracker publication without explicit authorization.

## License handling

Both reviewed repositories use the MIT License. The initial Intentloom slice
adapts engineering concepts and does not copy their scripts, assets, plugin
runtime, or substantial skill text. If a future change bundles or substantially
copies third-party material, it must preserve the applicable copyright and
permission notice, record exact source paths and digests, and pass
`aif-extension-review` before approval.

## Update policy

These revisions are evidence snapshots, not update subscriptions. A future
upstream review must compare the new revision with the pinned source, repeat
license and capability analysis, and create a new inactive proposal. No upstream
change is inherited automatically.
