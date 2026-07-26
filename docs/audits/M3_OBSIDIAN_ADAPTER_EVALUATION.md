# M3 Obsidian-Compatible Adapter Evaluation

Date: 2026-07-26

## Outcome

No Obsidian adapter is introduced in M3. The current JSON record store remains
canonical because it preserves stable identifiers, lifecycle state, approval
evidence, redaction, project isolation, and transactional behavior.

An optional future Markdown adapter is viable only as a derivative: it must
write inside an explicit memory root, map records by stable ID, preserve
human-readable links, support preview/diff/rollback, and never install
Obsidian, plugins, QMD, models, hooks, or dependencies. Its index must remain
rebuildable derived state.

## Decision

Defer implementation until there is a demonstrated user-owned Markdown-vault
consumer. This preserves provider neutrality and avoids creating a second
canonical memory authority.
