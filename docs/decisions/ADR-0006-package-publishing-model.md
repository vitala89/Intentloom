# ADR-0006: Publish one CLI package for the alpha

## Status

Accepted for `0.1.0-alpha.1` publication planning.

## Decision

Publish one unscoped public package, `aif-core`, exposing the `aif` command.
Keep the root workspace and `@aif/core`, `@aif/adapters`, and
`@aif/validator` private implementation packages. The public package bundles
the runtime, catalog, profiles, and schemas; it exposes no programmatic API in
this alpha, except its exported `package.json` metadata.

## Rationale

This avoids version skew, workspace dependency publication, publish ordering,
and accidental API commitments while giving users one installation target.
`aif` is already registered on npm, so it remains the binary name rather than
the package name. The exact `aif-core` registry lookup returned 404 on
2026-07-15; the fallback is `aif-framework`, also 404 at that time.

## Alternatives rejected

- Multiple `@aif/*` public packages: scope ownership is not verified and the
  current libraries are not a supported public API.
- Public CLI plus core API: would create an unsupported alpha API commitment.
- `aif`: already registered by an unrelated package.
- Long-form names: available but less memorable and harder to type.

## Consequences

Future modular packages require a new ADR and public API contract. A legal or
trademark review remains necessary before publication; registry availability is
not a trademark clearance.
