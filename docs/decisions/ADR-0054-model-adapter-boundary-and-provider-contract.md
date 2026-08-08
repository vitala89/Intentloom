# ADR-0054: Model Adapter boundary and provider contract

## Status

Accepted as the provider-neutral model-adapter boundary foundation.

This ADR does not complete Neutron Runtime stage N2. `N2` requires one real
provider adapter and a separate review of credentials, network behavior, data
handling, streaming, cancellation, provider errors, limits, and test strategy.

## Context

Neutron coordinates Intentloom's existing project, evidence, memory, skill,
planning, review, approval, and transaction capabilities. It must not bind the
application layer directly to one model vendor SDK or transport.

A shared model boundary is needed before a real provider can be connected. The
boundary must remain useful offline so contracts and callers can be tested
without credentials, network access, or provider availability.

The repository also has legacy root barrel files that are already above the
normal production-file budget. New Neutron work must not keep expanding those
files merely to expose another domain. This increment therefore uses explicit
package subpath exports for the model-adapter domain.

## Decision

Introduce a narrow Model Adapter Boundary across the existing private workspace
packages:

```text
@intentloom/protocol/model-adapter
        ↓
@intentloom/validator/model-adapter
        ↓
@intentloom/application/model-adapter
```

The root package barrels remain unchanged.

### Protocol contract

The protocol subpath defines:

- provider and model identity;
- adapter capabilities;
- model configuration without raw credentials;
- message and tool definitions;
- normalized model turn requests and results;
- output/context capability limits;
- usage records and diagnostics.

The first provider identifiers are compatibility values for known adapter
families plus `deterministic-test`. Adding a real provider still requires its own
adapter implementation and security/data-handling review.

### Validation boundary

Runtime validators reject malformed identities, invalid message/tool shapes,
non-finite configuration numbers, invalid token budgets, inconsistent usage
accounting, and unsupported provider identifiers.

Validation preserves optional request controls such as `temperature` and
`maxTokens`. It does not pretend to know provider-specific tokenizer semantics or
pricing.

### Application boundary

`ModelAdapter` exposes capability discovery and one cancellable model-turn
operation. A `DeterministicTestModelAdapter` is included only as an offline
reference and CI/test fixture.

The deterministic adapter:

- performs no network access;
- reads no credentials;
- invokes no shell or project command;
- validates all requests/results through the same boundary;
- rejects requested output budgets above its declared capability;
- labels its locally estimated usage with `synthetic-token-usage` so the numbers
  cannot be mistaken for provider-reported token accounting.

It is not a real model provider and does not satisfy the N2 exit gate.

## Consequences

### Positive

- Neutron callers can depend on one typed provider-neutral boundary.
- Provider SDKs remain outside canonical application logic.
- Tests can exercise model-turn orchestration without secrets or network access.
- New model-adapter code does not grow the oversized protocol, validator, or
  application root barrel files.
- Output-budget capability checks are deterministic where the adapter has an
  explicit declared maximum.

### Costs and limitations

- Root imports such as `@intentloom/protocol` do not expose these new contracts;
  consumers use the explicit `/model-adapter` subpath.
- Context-token enforcement cannot be exact without provider/tokenizer-specific
  measurement. Real adapters must report or validate this honestly.
- Streaming transport, normalized provider errors, timeout policy, credentials,
  and data-handling disclosure remain N2 work.
- No daemon, CLI, MCP, Desktop, TUI, Agent Workspace, or mutation surface is
  added by this ADR.

## Security and privacy

This increment adds no network permission and no credential storage. Model
configuration must never persist raw API keys or secrets in project metadata.
Any real hosted-provider adapter requires explicit network/data-handling state,
least-privilege credential resolution, redaction, cancellation, bounded inputs
and outputs, and a separate threat review before activation.

Model output remains untrusted input. It cannot grant permissions, approve a
plan, mutate project files, or bypass existing evidence, policy, sandbox,
approval, revalidation, transaction, and rollback boundaries.

## Compatibility

The model-adapter domain is new. Its package subpath exports are internal
workspace contracts until a later public compatibility decision explicitly says
otherwise. No published CLI command, daemon protocol method, MCP tool, persisted
project schema, package version, release, or publication contract changes in
this increment.

## Follow-up

1. Keep N1 broader runtime/context/tool/task contracts separate from this bounded
   foundation.
2. Implement N2 through one real provider adapter with a dedicated ADR and
   security/privacy evidence.
3. Build N3 bounded context assembly over canonical intent, evidence, accepted
   memory, and selected skills.
4. Build N4 typed tool routing without generic shell or arbitrary filesystem
   authority.
