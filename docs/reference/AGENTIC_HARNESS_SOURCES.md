# Agentic Harness Reference Sources

## Purpose

This is a small provenance ledger for the external projects that informed the
Intentloom Agentic Evaluation and Execution Harness. It is reference-only: no
source, binary, package, hook, container, model, telemetry, or network behavior
is bundled or required by Intentloom.

## Core harness references

These sources are pinned because their execution, evaluation, or security
patterns directly influence the accepted Intentloom design. Revisions were
resolved from repository `HEAD` on 2026-08-02.

| Source                                                                                           | Reviewed revision                                                                                                                                        | License    | Retained design signal                                                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- |
| [Visa Vulnerability Agentic Harness](https://github.com/visa/visa-vulnerability-agentic-harness) | [`d91b28d3af7ee46f9cc1827a9377cbdedd1f6b7e`](https://github.com/visa/visa-vulnerability-agentic-harness/commit/d91b28d3af7ee46f9cc1827a9377cbdedd1f6b7e) | Apache-2.0 | deterministic stages, manifests, SARIF, remediation validation, aggregation           |
| [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai)                                     | [`1ea01a9e1b3c94db3cdf93ce5583ffebf86e159f`](https://github.com/UKGovernmentBEIS/inspect_ai/commit/1ea01a9e1b3c94db3cdf93ce5583ffebf86e159f)             | MIT        | task/solver/scorer composition, provider adapters, sandbox and checkpoint boundaries  |
| [SWE-agent](https://github.com/SWE-agent/swe-agent)                                              | [`3ea751c087f32b16e039a2233dd6eefecef325d5`](https://github.com/SWE-agent/swe-agent/commit/3ea751c087f32b16e039a2233dd6eefecef325d5)                     | MIT        | constrained agent-computer interface and reproducible trajectories                    |
| [SWE-ReX](https://github.com/SWE-agent/swe-rex)                                                  | [`5c995c365dfb1fd5bc56fda688be5d8538f9931f`](https://github.com/SWE-agent/swe-rex/commit/5c995c365dfb1fd5bc56fda688be5d8538f9931f)                       | MIT        | executor/runtime abstraction across local, container, and remote environments         |
| [Agentic Security Harness](https://github.com/krivonosoff161/agentic-security-harness)           | [`372ce4161b1e9232215835b8dc4f3014d4726f34`](https://github.com/krivonosoff161/agentic-security-harness/commit/372ce4161b1e9232215835b8dc4f3014d4726f34) | Apache-2.0 | synthetic security scenarios, authority-aware events, traces, scorecards, comparisons |

The ledger records licenses as declared by the reviewed repositories. If
Intentloom later copies code or substantial text, the exact source paths,
copyright notices, modifications, and redistribution obligations require a new
review; conceptual adaptation alone does not make these projects dependencies.

## Orchestration alternatives considered

These projects were compared at the pattern level only and are deliberately
not pinned as supported Intentloom backends:

- [LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) — durable
  graph execution, persistence, and human-in-the-loop transitions;
- [AutoGen](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/core-concepts/architecture.html)
  — separated runtimes, message passing, and optional agent teams;
- [Semantic Kernel orchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/)
  — sequential, concurrent, handoff, and group-chat patterns;
- [LlamaIndex Workflows](https://github.com/run-llama/workflows-py) — event-driven
  asynchronous steps, branching, looping, and recovery.

These alternatives support the general direction but do not define Intentloom's
protocol, authority, storage, provider, or executor contracts. Their APIs and
feature status must be rechecked if a future implementation proposes an actual
dependency.

## Intentloom boundary

- first-party schemas and application operations remain canonical;
- deterministic gates outrank model consensus;
- policy evaluation is not described as OS or container isolation;
- state is bounded, redacted, deletable, and outside target projects by default;
- providers and executors are optional capability-declaring adapters;
- multi-agent validation is risk-triggered, not enabled by default;
- synthetic benchmark scores are not production safety or compliance
  certification;
- no automatic remediation, mutation, hosted state, telemetry, or upstream
  updates are adopted from these references.

## Update policy

This file is an evidence snapshot, not an update subscription. A future review
must resolve a new exact revision for any source that materially influences the
design, compare behavior and licenses, and update this ledger through normal
review. No upstream change is inherited automatically.
