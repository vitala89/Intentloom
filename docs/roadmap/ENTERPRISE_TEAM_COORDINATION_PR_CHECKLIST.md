# Enterprise Team Coordination Review Checklist

Use this checklist before converting the enterprise coordination pull request
from draft or implementing any runtime capability.

## Product boundary

- [ ] The capability coordinates engineering work rather than monitoring people.
- [ ] Titles, responsibilities, ownership, permissions, approvals, and execution
      remain separate concepts.
- [ ] GitHub, GitLab, CI, issue trackers, deployment systems, and identity
      providers remain authoritative for actions they own.
- [ ] The first pilot is one pull-request workflow, not organization-wide
      automation.

## Routing

- [ ] Routes are determined by versioned scope, policy, risk, ownership,
      discipline, delegation, and provider evidence.
- [ ] Every requested participant has an explainable rule and source.
- [ ] Missing ownership, circular routes, duplicate requirements, expired
      delegation, and self-approval are detected.
- [ ] A senior title is not used as an automatic fallback.
- [ ] Product, design, QA, security, data, and architecture requirements remain
      distinct from code review.

## Notifications

- [ ] Notifications are generated from actionable requirements rather than every
      raw event.
- [ ] Deduplication, threading, acknowledgement, quiet hours, digest, and stop
      conditions are defined before broad fan-out.
- [ ] External destinations require explicit connection and capability grants.
- [ ] Notification delivery does not count as approval.
- [ ] Sensitive content is redacted for external channels.

## Privacy and trust

- [ ] No individual productivity score, activity leaderboard, keystroke,
      presence, screen, or IDE monitoring exists.
- [ ] No organization chart or manager relationship is inferred from Git
      activity.
- [ ] Personal data is minimized and retention, export, deletion, residency, and
      legal-hold behavior are specified before central storage.
- [ ] Small-group analytics are suppressed or access controlled.
- [ ] Local, self-hosted, managed, and hybrid trust boundaries are explicit.

## Security and identity

- [ ] OIDC, SAML, SCIM, RBAC, ABAC, service identities, and provider mappings are
      behind dedicated enterprise boundaries.
- [ ] Credentials and private identity data are never stored in project `.aif/`
      metadata.
- [ ] External writes use prepare, preview, explicit approval, revalidation,
      idempotency, audit, and truthful error reporting.
- [ ] Multi-tenant isolation, encryption, backup, recovery, offboarding, and
      revocation are specified before managed enterprise deployment.

## Architecture

- [ ] CLI, Desktop, TUI, daemon, MCP, and any hosted client share one application
      resolver and versioned protocol contracts.
- [ ] The responsibility graph does not duplicate the conformance engine.
- [ ] Provider adapters preserve original state, provenance, and uncertainty.
- [ ] Read-only exports precede live provider access.
- [ ] Live read-only access precedes provider mutations.

## Evidence and validation

- [ ] Organization, responsibility, work-case, route, notification, delegation,
      and audit schemas have accepted ADR and migration decisions.
- [ ] Deterministic fixtures cover matrix teams, cross-functional review,
      missing ownership, delegation, self-approval, and provider ambiguity.
- [ ] Equivalent exports and live evidence normalize to compatible cases.
- [ ] Cancellation and failure leave project and provider state unchanged for
      read-only operations.
- [ ] Duty Watch and project-state records are updated before merge.
