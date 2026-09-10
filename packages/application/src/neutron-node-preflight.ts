import {
  NEUTRON_DELEGATED_AGENT_ROLES,
  NEUTRON_SESSION_STATES,
  type NeutronDelegatedAgentRole,
  type NeutronRuntimeSession,
  type NeutronSessionState,
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "../../protocol/src/neutron-runtime.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import { planNeutronTaskScheduling } from "./neutron-scheduler-select.js";
import { validateNeutronTaskGraphForExecution } from "./neutron-scheduler-validate.js";
import { NeutronNodeExecutionError } from "./neutron-node-errors.js";

const ACTIVE_SESSION_STATES: readonly NeutronSessionState[] = [
  "created",
  "discussing",
  "inspecting",
  "planning",
];

export interface NeutronNodePreflight {
  readonly graph: NeutronTaskGraph;
  readonly node: NeutronTaskNode;
  readonly session: NeutronRuntimeSession;
}

export function assertNeutronNodePreflight(input: {
  readonly graph: NeutronTaskGraph;
  readonly taskId: string;
  readonly session: NeutronRuntimeSession;
  readonly projectId: string;
  readonly signal?: AbortSignal;
  readonly allowConcurrentPeers?: boolean;
}): NeutronNodePreflight {
  if (input.signal?.aborted === true) {
    throw new NeutronNodeExecutionError(
      "cancelled",
      "cancellation",
      "Node execution was cancelled before start",
    );
  }

  let graph: NeutronTaskGraph;
  try {
    graph = validateNeutronTaskGraphForExecution(input.graph);
  } catch (error) {
    if (error instanceof NeutronSchedulerError) {
      throw new NeutronNodeExecutionError(
        "validation-failed",
        "scheduling",
        error.message,
      );
    }
    throw error;
  }

  const session = validateNeutronRuntimeSession(input.session);
  if (!NEUTRON_SESSION_STATES.includes(session.state)) {
    throw new NeutronNodeExecutionError(
      "validation-failed",
      "scheduling",
      "Session state is invalid",
    );
  }
  if (session.sessionId !== graph.sessionId) {
    throw new NeutronNodeExecutionError(
      "validation-failed",
      "scheduling",
      "Session id must match the task graph",
    );
  }
  if (session.root !== graph.root) {
    throw new NeutronNodeExecutionError(
      "root-mismatch",
      "scheduling",
      "Session root must match the task graph",
    );
  }
  if (session.projectId !== input.projectId) {
    throw new NeutronNodeExecutionError(
      "validation-failed",
      "scheduling",
      "Session projectId must match the execution project",
    );
  }
  if (session.mutationAllowed !== false) {
    throw new NeutronNodeExecutionError(
      "capability-denied",
      "capability",
      "Node execution forbids mutationAllowed sessions",
    );
  }
  if (!ACTIVE_SESSION_STATES.includes(session.state)) {
    throw new NeutronNodeExecutionError(
      "validation-failed",
      "scheduling",
      `Session state ${session.state} cannot execute a node`,
    );
  }

  const node = graph.nodes.find((entry) => entry.taskId === input.taskId);
  if (node === undefined) {
    throw new NeutronNodeExecutionError(
      "validation-failed",
      "scheduling",
      `Unknown taskId ${input.taskId}`,
    );
  }

  const plan = planNeutronTaskScheduling({
    graph,
    maxConcurrency: 1,
  });
  if (plan.runningCount > 0 && input.allowConcurrentPeers !== true) {
    throw new NeutronNodeExecutionError(
      "node-not-runnable",
      "scheduling",
      "Single-worker execution refuses a second node while one is running",
    );
  }
  const classification = plan.classifications.find(
    (entry) => entry.taskId === input.taskId,
  );
  if (classification?.classification !== "ready") {
    throw new NeutronNodeExecutionError(
      "node-not-runnable",
      "scheduling",
      `Task ${input.taskId} is not currently runnable`,
    );
  }
  if (node.state !== "pending" && node.state !== "ready") {
    throw new NeutronNodeExecutionError(
      "node-not-runnable",
      "scheduling",
      `Task ${input.taskId} state ${node.state} cannot start execution`,
    );
  }

  return { graph, node, session };
}

export function neutronNodeRole(
  role: string,
): NeutronDelegatedAgentRole | undefined {
  if ((NEUTRON_DELEGATED_AGENT_ROLES as readonly string[]).includes(role)) {
    return role as NeutronDelegatedAgentRole;
  }
  return undefined;
}
