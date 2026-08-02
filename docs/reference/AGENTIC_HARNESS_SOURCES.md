# Agentic Harness Reference Sources

## Purpose

Record the external repositories and official documentation reviewed for
Intentloom's Agentic Evaluation and Execution Harness architecture. This is a
provenance ledger, not an installed dependency lock, endorsement, certification,
or legal guarantee.

The reviewed snapshots do not add source, binaries, packages, hooks, containers,
models, telemetry, or network behavior to Intentloom.

## Reviewed repository snapshots

Revisions were resolved from each repository's `HEAD` on 2026-08-02.

| Source                                                                                           | Reviewed revision                                                                                                                                        | License    | Relevant patterns                                                                                |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| [Visa Vulnerability Agentic Harness](https://github.com/visa/visa-vulnerability-agentic-harness) | [`d91b28d3af7ee46f9cc1827a9377cbdedd1f6b7e`](https://github.com/visa/visa-vulnerability-agentic-harness/commit/d91b28d3af7ee46f9cc1827a9377cbdedd1f6b7e) | Apache-2.0 | deterministic stages, SARIF flow, run manifests, remediation validation, multi-agent aggregation |
| [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai)                                     | [`1ea01a9e1b3c94db3cdf93ce5583ffebf86e159f`](https://github.com/UKGovernmentBEIS/inspect_ai/commit/1ea01a9e1b3c94db3cdf93ce5583ffebf86e159f)             | MIT        | dataset/solver/scorer composition, provider adapters, sandboxes, logs, scoring, checkpoints      |
| [SWE-agent](https://github.com/SWE-agent/swe-agent)                                              | [`3ea751c087f32b16e039a2233dd6eefecef325d5`](https://github.com/SWE-agent/swe-agent/commit/3ea751c087f32b16e039a2233dd6eefecef325d5)                     | MIT        | constrained agent-computer interfaces, trajectories, reproducible task configuration             |
| [SWE-ReX](https://github.com/SWE-agent/swe-rex)                                                  | [`5c995c365dfb1fd5bc56fda688be5d8538f9931f`](https://github.com/SWE-agent/swe-rex/commit/5c995c365dfb1fd5bc56fda688be5d8538f9931f)                       | MIT        | execution-runtime abstraction, local/container/remote backends, interactive process handling     |
| [Agentic Security Harness](https://github.com/krivonosoff161/agentic-security-harness)           | [`372ce4161b1e9232215835b8dc4f3014d4726f34`](https://github.com/krivonosoff161/agentic-security-harness/commit/372ce4161b1e9232215835b8dc4f3014d4726f34) | Apache-2.0 | deterministic security scenarios, event authority categories, traces, scorecards, comparisons    |
| [LangGraph](https://github.com/langchain-ai/langgraph)                                           | [`b2926a0ff9589c28c7e01fe7cdbb337b86d5a4b4`](https://github.com/langchain-ai/langgraph/commit/b2926a0ff9589c28c7e01fe7cdbb337b86d5a4b4)                  | MIT        | durable graph execution, persistence, human-in-the-loop, resumable state                         |
| [AutoGen](https://github.com/microsoft/autogen)                                                  | [`027ecf0a379bcc1d09956d46d12d44a3ad9cee14`](https://github.com/microsoft/autogen/commit/027ecf0a379bcc1d09956d46d12d44a3ad9cee14)                       | MIT        | runtime/agent separation, message passing, teams, lifecycle and distributed adapters             |
| [Semantic Kernel](https://github.com/microsoft/semantic-kernel)                                  | [`383d102346b7b29c929e0257ef672a48898b5f66`](https://github.com/microsoft/semantic-kernel/commit/383d102346b7b29c929e0257ef672a48898b5f66)               | MIT        | concurrent, sequential, handoff, group-chat, and manager orchestration patterns                  |
| [LlamaIndex Workflows](https://github.com/run-llama/workflows-py)                                | [`c713fb700917ff79d9920c11703609a8948e4c7b`](https://github.com/run-llama/workflows-py/commit/c713fb700917ff79d9920c11703609a8948e4c7b)                  | MIT        | event-driven async steps, branching, looping, parallelism, persistence and recovery              |

License identifiers reflect the repository license declarations reviewed with
these snapshots. If code or substantial text is later bundled or copied, the
exact source paths, copyright notices, permission notices, modifications, and
redistribution obligations require a new review.

## Official documentation reviewed

- [Inspect AI overview](https://inspect.aisi.org.uk/),
  [scoring](https://inspect.aisi.org.uk/scoring.html), and
  [checkpointing](https://inspect.aisi.org.uk/checkpointing.html);
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview);
- [AutoGen runtime architecture](https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/core-concepts/architecture.html)
  and
  [agent teams](https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/tutorial/teams.html);
- [Semantic Kernel agent orchestration](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-orchestration/);
- the README and documentation links in each pinned repository snapshot.

## Retained concepts

- scenario/task inputs separated from agent/solver behavior and scoring;
- deterministic stage gates around non-deterministic model execution;
- explicit execution-runtime and provider adapter boundaries;
- constrained agent-computer interfaces instead of broad ambient authority;
- append-only traces, manifests, checkpoints, replay, and scorecards;
- baseline/protected comparisons using the same scenario contract;
- graph or event-driven orchestration with explicit state transitions;
- risk-triggered adversarial roles and deterministic aggregation;
- capability negotiation and explicit unsupported states.

## Intentloom adaptations

- first-party schemas and application operations remain canonical;
- no reference framework becomes a workflow or authority owner;
- policy evaluation and OS/container isolation are named separately;
- deterministic checks outrank model consensus;
- state is local, bounded, redacted, deletable, and outside target projects by
  default;
- provider/model support is capability-based and optional;
- multi-agent operation is justified by risk and evidence, not enabled by
  default;
- every product surface reuses the same control-plane result.

## Important caveats

- Visa VVAH's default full pipeline can reach remediation steps that edit a
  target. Detection-only use requires an explicit earlier stop. Its current
  remediation and validation paths also retain provider-specific assumptions.
- Inspect AI documents multiple sandbox backends and an extension API. The
  reviewed official material did not establish built-in WASM support, so WASM
  is not recorded as an existing Inspect guarantee.
- SWE-agent now recommends mini-SWE-agent for many new uses. Intentloom retains
  only the ACI and trajectory design lessons, not a dependency choice.
- SWE-ReX can expose powerful command execution. Intentloom will not map that
  capability to a generic host-shell product surface.
- Agentic Security Harness describes a synthetic defensive benchmark, not a
  production safety or compliance certification.
- AutoGen's own guidance favors a single agent when it is sufficient. Intentloom
  therefore treats teams and voting as risk-triggered options.
- Semantic Kernel labels agent orchestration functionality as experimental in
  the reviewed documentation; its patterns are references, not compatibility
  promises.
- Framework claims, supported backends, APIs, and licenses can change after the
  pinned revisions.

## Rejected or deferred mechanics

- direct installation of a reference harness into the canonical core;
- provider-specific schemas as the Intentloom protocol;
- automatic remediation or mutation during a default evaluation;
- unrestricted host shell, inherited credentials, or implicit network access;
- opaque model voting that hides dissent or overrides hard failures;
- hosted state, background uploads, or telemetry by default;
- automatic upstream tracking or dependency updates;
- safety or compliance certification claims derived from a synthetic score.

## Update policy

These are evidence snapshots, not subscriptions. A future review must resolve a
new exact revision, compare behavior and licenses, reassess capabilities and
security, and update this ledger through normal review. No upstream change is
inherited automatically.
