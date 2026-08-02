# ADR-0052: Agentic evaluation and execution harness

## Status

Accepted as an architecture and sequencing decision. Runtime implementation is
planned and requires the phase gates in this ADR.

## Context

Intentloom already has deterministic validation, path and command capability
checks, security findings and policies, approval digests, transactional apply,
audit reports, and project-scoped checkpoints. It also has provider-neutral
tooling contracts and curated task procedures.

Those controls do not yet form an agent evaluation and execution harness.
Intentloom cannot currently run a versioned scenario, isolate its execution,
capture a replayable event journal, compare baseline and protected behavior, or
produce a unified scorecard. Its application-level sandbox evaluator is a
policy gate, not an operating-system or container sandbox. Neutron task records
also do not yet execute independent model-backed generator, critic, or judge
roles.

Projects such as Visa Vulnerability Agentic Harness, Inspect AI, SWE-agent,
SWE-ReX, Agentic Security Harness, LangGraph, AutoGen, Semantic Kernel, and
LlamaIndex Workflows provide useful reference patterns. Directly adopting one
as Intentloom's canonical runtime would import different authority, mutation,
provider, storage, and lifecycle assumptions.

## Decision

Intentloom will develop a first-party, provider-neutral Agentic Evaluation and
Execution Harness after the active read-only evidence hardening gate.

1. The harness is a control and evidence plane. It does not grant an agent,
   model, scorer, imported skill, or external server any new authority.
2. Deterministic pre-processing, post-processing, policy gates, budgets, and
   scorers remain authoritative. Model-based grades are labeled advisory and
   cannot override a failed deterministic gate.
3. Execution is hidden behind capability-declaring executor adapters. A local
   read-only executor is not described as an OS sandbox. Container isolation is
   a later adapter with separate evidence; WASM remains a feasibility candidate.
4. Agent and model providers are adapters selected by declared capabilities,
   not names. Missing capabilities produce `unsupported` or `inconclusive`, not
   silent fallback to broader permissions.
5. Run state, checkpoints, event journals, and artifacts are stored outside the
   target repository by default. They are bounded, redacted, exportable, and
   deletable under explicit retention policy.
6. Multi-agent validation is risk-triggered, not universal. Generator, critic,
   and judge roles receive intentionally independent evidence where required;
   deterministic aggregation exposes disagreement, abstention, and insufficient
   evidence.
7. Baseline and protected runs use the same scenario and scoring contract.
   Every verdict retains scenario, adapter, policy, artifact, and scorer
   provenance plus a digest of the run manifest.
8. The target repository and all model/tool output are untrusted inputs. The
   harness must test prompt injection, malicious tools, memory poisoning, path
   escape, secret exfiltration, stale approval, unauthorized mutation,
   capability mismatch, and false consensus.
9. CLI, CI, daemon, MCP, TUI, Desktop, and Neutron surfaces reuse canonical
   application operations. No surface implements an independent runner or
   scoring authority.
10. No external harness framework becomes a required dependency through this
    decision. Substantial future reuse requires a separate dependency, license,
    security, and maintenance review.

The intended deep-module surface is deliberately small:

```text
runScenario(request, dependencies) -> HarnessRunResult
scoreRun(run, scorers)              -> HarnessScorecard
compareRuns(baseline, candidate)    -> HarnessComparison
replayRun(manifest, dependencies)   -> HarnessReplayResult
```

The full interface includes scenario schemas, executor and agent capabilities,
state ownership, budgets, events, artifacts, scoring rules, and failure
semantics. Package placement is decided in the contract phase only after at
least two real consumers are committed. Harness code must not expand the
existing oversized application, protocol, or CLI entry files.

## Required sequencing

1. Finish the active read-only provider and external-MCP evidence hardening
   gate.
2. Run curated-skill adapter dogfooding and turn its cases into initial harness
   scenarios.
3. Approve versioned harness protocol and threat-model contracts.
4. Implement a deterministic fake-adapter runner and baseline comparison.
5. Add execution isolation, durable state, resume, and replay.
6. Add model/provider adapters, then adversarial validation and voting.
7. Require harness evidence before managed external skill activation or any
   broader mutating agent/MCP capability.

## Consequences

### Positive

- Evaluation, security testing, execution, replay, and comparisons share one
  evidence model.
- Provider and executor choices remain replaceable.
- Deterministic failures remain visible even when model reviewers agree.
- Existing skill dogfooding can become reproducible product evidence.
- Dangerous execution and state ownership are explicit adapter boundaries.

### Negative

- A trustworthy harness requires more contracts and fixtures before useful
  model-backed execution is available.
- Container and provider matrices will increase CI cost and maintenance.
- Independent adversarial roles consume more time and model budget.
- A first-party control plane must be maintained even when external reference
  frameworks evolve faster.

## Rejected alternatives

- **Install Visa VVAH or Inspect AI as the Intentloom core.** Their concepts are
  useful, but their providers, execution modes, mutation defaults, schemas, and
  release lifecycles are not Intentloom authority contracts.
- **Treat the current sandbox policy evaluator as process isolation.** It checks
  proposals but does not isolate processes, environment variables, filesystem
  mounts, resources, or network access at the OS boundary.
- **Use model voting as the primary safety gate.** Agreement can reproduce the
  same blind spot; deterministic checks and explicit uncertainty remain
  authoritative.
- **Add harness logic to existing entry files.** This would deepen current
  oversized modules and make the evaluation boundary harder to reuse and test.
- **Enable unrestricted shell or background execution.** This conflicts with
  local-first capability, approval, and non-destructive adoption invariants.

## Compatibility

This ADR changes documentation and future sequencing only. It introduces no
runtime dependency, command, schema, network request, telemetry, sandbox claim,
provider credential, automatic hook, or mutation capability.

## Related documents

- [Agentic Harness Specification](../specs/AGENTIC_HARNESS_SPEC.md)
- [Agentic Harness Development Plan](../roadmap/AGENTIC_HARNESS_PLAN.md)
- [Agentic Harness Reference Sources](../reference/AGENTIC_HARNESS_SOURCES.md)
- [Threat Model](../security/THREAT_MODEL.md)
- [ADR-0030](ADR-0030-controlled-agentic-security-sandbox.md)
- [ADR-0051](ADR-0051-curated-skill-routing-and-external-method-adaptation.md)
