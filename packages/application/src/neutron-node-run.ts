import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type {
  NeutronRuntimeSession,
  NeutronTaskGraph,
} from "../../protocol/src/neutron-runtime.js";
import type { FileSystem } from "./index.js";
import { inspectProject } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import {
  runNeutronN2ReadOnlyLoop,
  type NeutronN2LoopResult,
} from "./neutron-n2-loop.js";
import type { ResolvedNeutronNodeCapabilities } from "./neutron-node-capabilities.js";
import { NeutronNodeExecutionError } from "./neutron-node-errors.js";
import {
  neutronNodeRole,
  type NeutronNodePreflight,
} from "./neutron-node-preflight.js";
import {
  createNeutronReadOnlyDispatch,
  routeNeutronToolInvocation,
} from "./neutron-tool-router.js";

export interface ExecuteNeutronTaskNodeInput {
  readonly graph: NeutronTaskGraph;
  readonly taskId: string;
  readonly session: NeutronRuntimeSession;
  readonly projectId: string;
  readonly adapter: ModelAdapter;
  readonly fs: FileSystem;
  readonly sessionCapabilities: AgentRoleCapabilities;
  readonly fingerprintProject: () => Promise<string>;
  readonly inspect?: (root: string) => Promise<unknown>;
  readonly profileName?: string;
  readonly profileAllowedTools?: readonly string[];
  readonly signal?: AbortSignal;
  readonly maxTokens?: number;
  readonly maxItems?: number;
  readonly allowConcurrentPeers?: boolean;
}

export async function runNeutronNodeModelLoop(
  input: ExecuteNeutronTaskNodeInput,
  preflight: NeutronNodePreflight,
  resolved: ResolvedNeutronNodeCapabilities,
): Promise<NeutronN2LoopResult> {
  const role = neutronNodeRole(preflight.node.role);
  const dispatch = createNeutronReadOnlyDispatch({
    fs: input.fs,
    inspect: input.inspect ?? ((root) => inspectProject(root, input.fs)),
  });
  return runNeutronN2ReadOnlyLoop({
    root: preflight.session.root,
    sessionId: preflight.session.sessionId,
    projectId: input.projectId,
    prompt: preflight.node.expectedOutput,
    contextQuery: preflight.node.expectedOutput,
    taskId: preflight.node.taskId,
    adapter: input.adapter,
    fs: input.fs,
    fingerprintProject: input.fingerprintProject,
    ...(input.profileName !== undefined
      ? { profileName: input.profileName }
      : {}),
    ...(role !== undefined ? { role } : {}),
    ...(input.maxTokens !== undefined ? { maxTokens: input.maxTokens } : {}),
    ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
    runTool: async (toolName, args) =>
      invokeRoutedTool(input, preflight, resolved, dispatch, toolName, args),
  });
}

async function invokeRoutedTool(
  input: ExecuteNeutronTaskNodeInput,
  preflight: NeutronNodePreflight,
  resolved: ResolvedNeutronNodeCapabilities,
  dispatch: ReturnType<typeof createNeutronReadOnlyDispatch>,
  toolName: Parameters<
    Parameters<typeof runNeutronN2ReadOnlyLoop>[0]["runTool"]
  >[0],
  args: Record<string, unknown>,
): Promise<unknown> {
  if (resolved.denyAllTools) {
    throw new NeutronNodeExecutionError(
      "capability-denied",
      "capability",
      `Tool ${toolName} is not in effective allowedTools`,
    );
  }
  const routed = await routeNeutronToolInvocation({
    invocation: {
      invocationId: `n5-${preflight.node.taskId}-${toolName}`,
      toolName,
      root: preflight.session.root,
      sessionId: preflight.session.sessionId,
      argumentsJson: JSON.stringify(args),
      timeoutMs: 15_000,
    },
    session: preflight.session,
    capabilities: resolved.capabilities,
    dispatch,
    ...(input.signal !== undefined ? { signal: input.signal } : {}),
  });
  if (!routed.envelope.result.ok) {
    const code = routed.envelope.result.errorCode ?? "operation-failed";
    throw new NeutronNodeExecutionError(
      code,
      code === "capability-denied" ? "capability" : "tool",
      `N4 denied or failed ${toolName}`,
    );
  }
  return JSON.parse(routed.envelope.result.payloadJson ?? "null") as unknown;
}
