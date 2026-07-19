# ADR-0007: Private application-operation boundary

## Status

Accepted

## Context

Intentloom's public `intentloom` CLI currently contains both process-facing
command adaptation and reusable project operations. The operation surface plans
and applies deterministic, local project state while enforcing ownership,
filesystem, transaction, validation, rollback, and post-write-consistency
invariants. Keeping it inside the CLI blocks future local callers from using it
without inheriting argument parsing, working-directory defaults, output
formatting, or process exit semantics.

The existing Core, Validator, and Adapters packages are private implementation
packages. The public alpha package deliberately has no programmatic import
contract under ADR-0006.

## Decision

Introduce a private `@intentloom/application` workspace package when the
Core/CLI extraction verification gate is satisfied. It will own the existing
project-operation surface and its explicit domain contracts: root, filesystem,
planning, transaction, validation, ownership, and result types.

`@intentloom/application` may depend on `@intentloom/core`,
`@intentloom/validator`, and `@intentloom/adapters`. It must not depend on the
CLI package or process globals. The CLI retains argument syntax, current-working-
directory defaulting, catalog/profile discovery, JSON and human rendering, and
exit-code mapping. The existing `intentloom` binary, package identity, and
no-programmatic-public-API policy remain unchanged.

This decision neither defines a transport protocol nor starts a daemon. Those
are later Platform Foundation phases and require separate contracts and
verification.

## Consequences

The first source extraction is limited to moving existing behavior behind a
private boundary. It must preserve direct CLI output, exit codes, safety gates,
and packed-package behavior. Equivalence tests cover every existing command
route, including plans, conflicts, transactions, doctor findings, and JSON/human
rendering where applicable.

The application package intentionally does not introduce a broad IO abstraction,
public exports, network access, telemetry, credential handling, hooks, or
dependency installation. Any change to those constraints needs a separate ADR
and explicit authorization.
