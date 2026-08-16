# ADR-0055: Neutron N2 first model adapter

## Status

Accepted as the N2 adapter decision. Implementation is a later pull request
after N1 contracts land. This ADR does not authorize Desktop model calls,
hosted-provider credentials, a new package, or mutation.

## Context

Neutron Runtime N1 defines versioned, root-bound, offline contract snapshots
(`@intentloom/protocol/neutron-runtime`). ADR-0054 already defined the
provider-neutral `ModelAdapter` boundary and the offline
`DeterministicTestModelAdapter`. That adapter is a fixture. It does not
satisfy the N2 exit gate.

`NEUTRON_RUNTIME_ROADMAP.md` N2 requires one real provider, end to end, for
one read-only loop:

```text
client
→ Neutron session
→ model request
→ typed tool request
→ Intentloom application operation
→ structured tool result
→ model response
```

The first adapter needs an explicit decision for credentials, network
disclosure, streaming, cancellation, retention, errors, limits, and tests.
Local-first and fail-closed defaults apply. Hosted vendors can wait.

## Decision

### Provider

The first real N2 adapter is **Ollama**, reached only at a caller-supplied
local base URL (default `http://127.0.0.1:11434`). No second hosted adapter
ships in the N2 increment.

Reasons:

- the user already runs the process; Intentloom does not download a model;
- no cloud account or API token is required for the default local daemon;
- network is explicit localhost egress, not a hidden hosted call;
- the same `ModelAdapter` and N1 envelopes stay provider-neutral.

`deterministic-test` remains the CI fixture. It does not count as N2
completion.

### Package and consumer boundary

Reuse `@intentloom/application/model-adapter` and
`@intentloom/protocol/neutron-runtime`. Do not add `packages/neutron-runtime`.
Do not grow oversized root barrels; keep subpath exports.

N2 consumers are application + focused tests, then an optional CLI inspect
helper if a real caller exists in the same increment. Desktop, TUI, MCP, and
daemon RPC must not call models in N2. Desktop model UI stays N6.

### Credentials

- Default Ollama local daemon: no credential.
- If a later optional token appears, resolve it only from an explicit
  invocation argument or a documented process environment variable. Never
  from project metadata, `.aif/`, git, or Desktop settings files.
- Do not persist tokens. Treat empty/cleared input as locally revoked.
- N2 does not add a secrets store.

### Network disclosure

- `networkMode` is `explicit-egress` only when the caller configures a base
  URL. Unconfigured stays `offline` / `unconfigured` and fails closed.
- Disclose scheme, host, and port. Do not send the repository, env files, or
  credentials in the disclosure record.
- Refuse non-loopback hosts in N2 unless a later ADR expands the allowlist.
- No telemetry, no implicit DNS to vendor APIs, no model pull.

### Streaming

- Streaming is optional and must use the existing cancellable turn boundary.
- N2 may buffer a complete turn for the first inspect/discuss loop.
- Partial tokens are not approval, evidence, or tool results.

### Cancellation, timeouts, and limits

- Honor `AbortSignal`. A cancelled turn emits N1 `cancelled` and writes
  nothing.
- Enforce caller timeout and adapter capability `maxOutputTokens`.
- Bound request body, response body, tool-argument JSON, and context tokens
  using N1 `NeutronUsageBudget`. Exceeding a limit is `budget-exceeded`.
- One in-flight turn per session in N2. No background retry storm.

### Data retention

- Prompts, completions, and tool payloads are ephemeral process memory.
- Do not write model transcripts into the project tree.
- Existing Neutron subagent JSON records stay the only on-disk Neutron
  artifacts, and N2 must not put raw model text there unless a later
  retention ADR says so.
- `dataHandling` for Ollama N2 is `ephemeral`.

### Tools and mutation

N2 may invoke only N1 read-only tools (`inspect`, `doctor`, `memorySearch`,
`timeline`, `conformance`, `securityAudit`, `projectDiff`) through existing
application operations. Generic shell, arbitrary filesystem, apply, sync
write, and Git mutation stay forbidden. Model output cannot approve a plan.

### Errors

Normalize provider/transport failures to N1 `NeutronErrorCode`:

- unreachable daemon → `adapter-unconfigured` or `timeout`;
- refused host → `network-forbidden`;
- invalid tool → `unsupported-tool`;
- schema failure → `validation-failed`.

Do not leak raw HTTP bodies that may contain secrets.

### Test strategy

- Contract tests keep using `deterministic-test` and frozen fixtures.
- Ollama adapter unit tests use a local fake HTTP listener or recorded
  fixtures. CI must not require a live Ollama process or a pulled model.
- One optional maintainer-manual live path may be documented; it is not a
  merge gate.
- Prove the inspect/discuss loop leaves project bytes unchanged.

## Consequences

- N2 has one authorized real adapter and a written threat boundary.
- Hosted OpenAI/Anthropic/Gemini adapters remain out of scope until their
  own ADR.
- Desktop still does not call models.
- Users who do not run Ollama keep the offline/unconfigured path.

## Follow-up

1. Implement the Ollama adapter and the read-only discuss/inspect loop in a
   dedicated PR after N1 merges. Done on `feat/neutron-n2-ollama-adapter`.
2. Keep N3 context assembly and N4 tool routing on their roadmap gates.
3. Do not start N6 Desktop Neutron Workspace from this ADR.
