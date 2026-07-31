# Intentloom Code Quality Standards

These standards apply to maintainers, contributors, and coding agents working in
this repository. They complement the architectural constitution in
`ENGINEERING_PRINCIPLES.md` and the delivery procedure in
`AI_AGENT_WORKFLOW.md`.

The purpose is not to maximize the number of abstractions. The purpose is to
keep behavior understandable, replaceable, testable, and safe to change.

## 1. Decision order

When rules appear to compete, use this order:

1. security, ownership, compatibility, and human-approval boundaries;
2. explicit specifications and accepted architecture decisions;
3. correctness and observable behavior;
4. maintainability and testability;
5. local style preferences.

SOLID, Clean Architecture, DRY, KISS, YAGNI, composition, and similar principles
are design heuristics, not permission to add unnecessary interfaces, classes,
packages, or layers. A new abstraction needs a real consumer, a stable boundary,
a test seam, lifecycle separation, or demonstrated duplication.

## 2. Cohesion and dependency direction

- One module should have one primary reason to change.
- Keep domain and application behavior independent from CLI, UI, transport,
  filesystem, network, provider, and framework details.
- Dependencies point toward stable contracts. Core and application code must not
  import Desktop, CLI, MCP transport, or provider-specific implementations.
- Put validation and authorization at boundaries. Do not duplicate business
  rules in every adapter.
- Prefer pure functions and explicit inputs for deterministic behavior.
- Keep side effects behind narrow, typed interfaces.
- Avoid generic `utils`, `helpers`, `common`, or `manager` modules that collect
  unrelated responsibilities.
- A barrel file may re-export cohesive public contracts, but it must not become
  the implementation home for unrelated subsystems.

## 3. Code size budgets

Line limits are guardrails. Do not satisfy them by compressing code, removing
useful names, combining statements, or moving unrelated behavior into a generic
helper.

Count formatted physical lines in hand-written files. Blank lines and comments
still count because they affect review and navigation cost.

### Hand-written production source

- Preferred target: no more than **250 lines** per file.
- Refactoring review begins above **300 lines**.
- Hard limit for a new file: **400 lines**.
- A new or substantially changed file must not exceed 400 lines without an
  approved, documented exception.

### Tests

- Preferred target: no more than **400 lines** per test file.
- Hard limit for a new test file: **700 lines**.
- Split tests by behavior, operation, boundary, or scenario. Do not split one
  coherent table-driven specification only to satisfy a number.

### Existing oversized files

Existing files above a limit are legacy debt, not precedent.

- Do not increase their formatted line count unless an approved exception
  explains why extraction would make the change less safe.
- A meaningful feature change touching an oversized file must extract at least
  one cohesive responsibility, or record a concrete decomposition follow-up.
- Prefer incremental, behavior-preserving extraction over a repository-wide
  rewrite.
- Start with modules that combine public contracts, domain behavior, I/O,
  orchestration, and rendering in one file.

### Exemptions

Generated files, vendored code, lockfiles, snapshots, machine-produced schemas,
and declarative data tables may exceed the limits. An exemption applies only
when the file contains little or no hand-written executable behavior and its
location or header makes that status clear.

## 4. Function and method budgets

- Preferred target: **40 lines** per function or method.
- Hard limit: **80 lines** unless a documented exception is approved.
- Preferred cyclomatic complexity: **10 or less**.
- Hard complexity review threshold: **15**.
- Preferred maximum nesting depth: **3**.
- Prefer no more than **4 positional parameters**. Use a typed options object
  when arguments form one concept.

A function above a budget should normally be split by named behavior, not by
arbitrary line ranges. Keep transaction steps visible when splitting would hide
ordering, rollback, or safety guarantees.

## 5. Testability requirements

- Every behavior change requires tests at the lowest reliable level.
- Every bug fix requires a regression test that fails before the fix when this
  can be expressed safely.
- Add integration or contract tests at process, protocol, filesystem, adapter,
  database, IPC, or UI boundaries.
- Test public behavior and invariants, not private implementation order.
- Keep time, randomness, filesystem, network, process execution, and provider
  access injectable or otherwise controllable in tests.
- Avoid hidden mutable globals and singleton state.
- A refactor must preserve existing behavior tests before adding new behavior.
- Do not use snapshot tests as the only evidence for security, authorization,
  transactions, compatibility, or error semantics.

## 6. Domain guidance

Domain rules supplement these shared standards. They do not override Intentloom
security and architecture boundaries.

### TypeScript and frontend

- Keep TypeScript strict and avoid weakening types with broad casts or `any`.
- Separate stateful orchestration from presentational rendering and pure
  transformations.
- Keep components focused. Extract reusable behavior only after a real reuse or
  stable boundary appears.
- Model asynchronous states explicitly. Do not hide loading, error,
  cancellation, or stale-data behavior.
- Prefer feature-oriented organization over folders that group every file only
  by technical type.

### Angular

- Follow the current official Angular style guide for naming, file organization,
  dependency injection, and component structure.
- Keep components focused on presentation and interaction. Move domain and
  application behavior into framework-independent services or operations.
- Prefer explicit reactive state and test observable behavior.
- Do not add Angular-specific dependencies to canonical core packages.

### Rust

- Run `cargo fmt` and the relevant test suite.
- Run Clippy for changed Rust crates. Treat correctness, suspicious,
  complexity, style, and performance findings seriously.
- Enable stricter Clippy lints selectively. Do not enable the complete
  `restriction` group.
- Keep ownership, error, and capability boundaries explicit. Avoid `unwrap` or
  `expect` in production paths unless the invariant is proven and documented.

### Tauri 2

- Use explicit capabilities, permissions, and scopes with least privilege.
- Keep the native command allowlist narrow and typed.
- Do not expose generic shell, filesystem, network, process, or arbitrary command
  bridges to the webview.
- Validate every IPC input and bind operations to an explicit project root.
- Rust owns secrets, tokens, daemon lifecycle, and privileged operations. The
  webview receives only the minimum structured result it needs.

### Backend and service boundaries

- Keep transport handlers thin. Put business rules in application/domain
  operations.
- Validate untrusted input at the boundary and return typed, stable errors.
- Define timeouts, cancellation, retries, and idempotency explicitly where they
  apply.
- Keep database and provider models from leaking into domain contracts.
- Add contract and integration tests for persistence, queues, APIs, and external
  adapters.

## 7. Exceptions

An exception is allowed only when following the default rule would reduce
correctness, safety, clarity, or compatibility.

The pull request must record:

- the exact file, function, or rule;
- the measured value and configured limit;
- why splitting or simplifying is unsafe now;
- why the exception is narrower than the alternatives;
- an owner or responsible area;
- an expiry, review trigger, or concrete follow-up.

Exceptions must not be silent, permanent by default, or copied into unrelated
code. A future machine-readable allowlist should use stable paths and rule IDs
and should be reviewed like any other compatibility contract.

## 8. Agent preflight

Before writing implementation code, an agent must:

1. inspect the relevant specification, ADRs, package boundaries, existing tests,
   and neighboring modules;
2. identify the responsibilities being changed and the intended dependency
   direction;
3. check the current line count and likely growth of every touched production
   file;
4. name planned extraction points before adding behavior to an oversized file;
5. choose the relevant TypeScript, Angular, Rust, Tauri, backend, security, or
   testing guidance;
6. state the required unit, contract, integration, compatibility, or UI tests;
7. identify any requested exception before implementation, not after the limit
   is exceeded.

## 9. Pull request evidence

A pull request with implementation changes must state:

- which architectural boundary changed;
- which files were split or intentionally kept together;
- whether any source or function budget was exceeded;
- tests and static checks run;
- exceptions and follow-up work;
- compatibility and migration impact.

No pull request should describe SOLID or Clean Architecture as satisfied merely
because new interfaces or folders were added. The evidence is lower coupling,
clearer responsibility, stable dependency direction, and focused tests.

## 10. Reference sources

Domain packs and future automated checks should be based on versioned primary
sources, including:

- Angular style guide: https://angular.dev/style-guide
- Rust Clippy documentation: https://doc.rust-lang.org/stable/clippy/
- Tauri 2 capabilities and permissions:
  https://v2.tauri.app/security/capabilities/
- Model Context Protocol specification:
  https://modelcontextprotocol.io/specification/

References must be reviewed and pinned by compatibility range before their rules
become an enforced project contract.