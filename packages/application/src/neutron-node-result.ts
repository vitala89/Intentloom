import { checksum } from "@intentloom/core";
import {
  NEUTRON_SUBAGENT_RESULT_SCHEMA_URN,
  NEUTRON_USAGE_BUDGET_SCHEMA_URN,
  type NeutronSubagentResult,
  type NeutronTaskGraph,
  type NeutronTaskNode,
  type NeutronTaskState,
  type NeutronUsageBudget,
} from "../../protocol/src/neutron-runtime.js";
import { validateNeutronSubagentResult } from "../../validator/src/neutron-runtime.js";
import { applyNeutronTaskStateTransition } from "./neutron-scheduler-transitions.js";
import type { NeutronN2LoopResult } from "./neutron-n2-loop.js";

export function replaceNeutronTaskNodeState(
  graph: NeutronTaskGraph,
  taskId: string,
  toState: NeutronTaskState,
): NeutronTaskGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.taskId !== taskId) return node;
      const state = applyNeutronTaskStateTransition(node.state, toState);
      return { ...node, state };
    }),
  };
}

export function requireGraphNode(
  graph: NeutronTaskGraph,
  taskId: string,
): NeutronTaskNode {
  const node = graph.nodes.find((entry) => entry.taskId === taskId);
  if (node === undefined) {
    throw new Error(`graph node not found: ${taskId}`);
  }
  return node;
}

export function digestNeutronNodeOutput(output: string): string {
  return `sha256:${checksum(output)}`;
}

export function mapSubagentStatus(
  nodeState: NeutronTaskState,
): NeutronSubagentResult["status"] {
  if (nodeState === "completed") return "completed";
  if (nodeState === "cancelled") return "cancelled";
  return "failed";
}

export function buildNeutronSubagentResult(input: {
  readonly taskId: string;
  readonly sessionId: string;
  readonly root: string;
  readonly nodeState: NeutronTaskState;
  readonly output: string;
}): NeutronSubagentResult {
  return validateNeutronSubagentResult({
    schemaVersion: NEUTRON_SUBAGENT_RESULT_SCHEMA_URN,
    taskId: input.taskId,
    sessionId: input.sessionId,
    root: input.root,
    status: mapSubagentStatus(input.nodeState),
    outputDigest: digestNeutronNodeOutput(input.output),
    mutationAttempted: false,
  });
}

export function mergeNeutronNodeUsage(
  sessionId: string,
  loop: NeutronN2LoopResult | undefined,
): NeutronUsageBudget | undefined {
  if (loop === undefined) return undefined;
  const context = loop.contextAssembly?.usage;
  return {
    schemaVersion: NEUTRON_USAGE_BUDGET_SCHEMA_URN,
    sessionId,
    inputTokens: loop.modelInputTokensEstimate,
    outputTokens: context?.outputTokens ?? 0,
    contextTokens: context?.contextTokens ?? loop.contextFramingTokens,
    tokenBudget: context?.tokenBudget ?? loop.modelInputTokensEstimate,
    limitExceeded: context?.limitExceeded ?? false,
  };
}
