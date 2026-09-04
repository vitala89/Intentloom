import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronAdapterCapability,
  NeutronTaskGraph,
  NeutronTaskNode,
  NeutronTaskState,
  NeutronToolEnvelope,
  NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import type { AssembleNeutronContextResult } from "./neutron-context-assembly.js";
import type { NeutronN2LoopResult } from "./neutron-n2-loop.js";
import {
  resolveNeutronNodeCapabilities,
  type ResolvedNeutronNodeCapabilities,
} from "./neutron-node-capabilities.js";
import {
  mapNeutronNodeFailure,
  NeutronNodeExecutionError,
  type NeutronNodeExecutionFailure,
} from "./neutron-node-errors.js";
import { assertNeutronNodePreflight } from "./neutron-node-preflight.js";
import {
  buildNeutronSubagentResult,
  mergeNeutronNodeUsage,
  replaceNeutronTaskNodeState,
  requireGraphNode,
} from "./neutron-node-result.js";
import {
  runNeutronNodeModelLoop,
  type ExecuteNeutronTaskNodeInput,
} from "./neutron-node-run.js";

export type { ExecuteNeutronTaskNodeInput } from "./neutron-node-run.js";

export interface NeutronNodeExecutionSuccess {
  readonly executed: true;
  readonly attempt: 1;
  readonly graph: NeutronTaskGraph;
  readonly node: NeutronTaskNode;
  readonly parentId: string | null;
  readonly role: string;
  readonly capabilities: AgentRoleCapabilities;
  readonly subagent: ReturnType<typeof buildNeutronSubagentResult>;
  readonly output: string;
  readonly error: NeutronNodeExecutionFailure | null;
  readonly context?: AssembleNeutronContextResult;
  readonly usage?: NeutronUsageBudget;
  readonly tool?: NeutronToolEnvelope;
  readonly adapter?: NeutronAdapterCapability;
  readonly projectFingerprintBefore: string;
  readonly projectFingerprintAfter: string;
}

export interface NeutronNodeExecutionRejected {
  readonly executed: false;
  readonly attempt: 1;
  readonly graph: NeutronTaskGraph;
  readonly error: NeutronNodeExecutionFailure;
}

export type ExecuteNeutronTaskNodeResult =
  NeutronNodeExecutionSuccess | NeutronNodeExecutionRejected;

export async function executeNeutronTaskNode(
  input: ExecuteNeutronTaskNodeInput,
): Promise<ExecuteNeutronTaskNodeResult> {
  let preflight;
  try {
    preflight = assertNeutronNodePreflight(input);
  } catch (error) {
    return {
      executed: false,
      attempt: 1,
      graph: input.graph,
      error: mapNeutronNodeFailure(error),
    };
  }

  const parent = parentRequiredCapabilities(preflight.graph, preflight.node);
  const resolved = resolveNeutronNodeCapabilities({
    sessionCapabilities: input.sessionCapabilities,
    nodeRequiredCapabilities: preflight.node.requiredCapabilities,
    ...(parent !== undefined ? { parentRequiredCapabilities: parent } : {}),
    ...(input.profileAllowedTools !== undefined
      ? { profileAllowedTools: input.profileAllowedTools }
      : {}),
  });

  const before = await input.fingerprintProject();
  let graph = startRunning(preflight.graph, input.taskId);
  try {
    const loop = await runNeutronNodeModelLoop(input, preflight, resolved);
    const after = await input.fingerprintProject();
    if (after !== before) {
      throw new NeutronNodeExecutionError(
        "validation-failed",
        "capability",
        "Node execution must not mutate project files",
      );
    }
    graph = replaceNeutronTaskNodeState(graph, input.taskId, "completed");
    return success(graph, input, resolved, before, after, loop, null);
  } catch (error) {
    const failure = mapNeutronNodeFailure(error);
    const after = await input.fingerprintProject();
    graph = replaceNeutronTaskNodeState(
      graph,
      input.taskId,
      terminalStateFor(failure),
    );
    return success(graph, input, resolved, before, after, undefined, failure);
  }
}

function startRunning(
  graph: NeutronTaskGraph,
  taskId: string,
): NeutronTaskGraph {
  const node = requireGraphNode(graph, taskId);
  let next = graph;
  if (node.state === "pending") {
    next = replaceNeutronTaskNodeState(next, taskId, "ready");
  }
  return replaceNeutronTaskNodeState(next, taskId, "running");
}

function parentRequiredCapabilities(
  graph: NeutronTaskGraph,
  node: NeutronTaskNode,
): readonly string[] | undefined {
  if (node.parentId === null) return undefined;
  const parent = graph.nodes.find((entry) => entry.taskId === node.parentId);
  return parent?.requiredCapabilities;
}

function success(
  graph: NeutronTaskGraph,
  input: ExecuteNeutronTaskNodeInput,
  resolved: ResolvedNeutronNodeCapabilities,
  before: string,
  after: string,
  loop: NeutronN2LoopResult | undefined,
  error: NeutronNodeExecutionFailure | null,
): NeutronNodeExecutionSuccess {
  const node = requireGraphNode(graph, input.taskId);
  const output = loop?.responseText ?? "";
  const usage = mergeNeutronNodeUsage(input.session.sessionId, loop);
  return {
    executed: true,
    attempt: 1,
    graph,
    node,
    parentId: node.parentId,
    role: node.role,
    capabilities: resolved.capabilities,
    subagent: buildNeutronSubagentResult({
      taskId: node.taskId,
      sessionId: input.session.sessionId,
      root: input.session.root,
      nodeState: node.state,
      output,
    }),
    output,
    error,
    ...(loop?.contextAssembly !== undefined
      ? { context: loop.contextAssembly }
      : {}),
    ...(usage !== undefined ? { usage } : {}),
    ...(loop !== undefined ? { tool: loop.tool, adapter: loop.adapter } : {}),
    projectFingerprintBefore: before,
    projectFingerprintAfter: after,
  };
}

function terminalStateFor(
  failure: NeutronNodeExecutionFailure,
): NeutronTaskState {
  if (failure.code === "cancelled") return "cancelled";
  if (failure.code === "timeout") return "timed-out";
  return "failed";
}
