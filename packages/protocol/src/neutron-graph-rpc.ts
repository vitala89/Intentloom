import {
  PROTOCOL_VERSION,
  NEUTRON_GRAPH_CANCEL_METHOD,
  NEUTRON_GRAPH_EXECUTE_METHOD,
  NEUTRON_GRAPH_GET_METHOD,
} from "./jsonrpc.js";
import type { JsonRpcRequest, RequestId } from "./jsonrpc.js";
import {
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "./neutron-runtime.js";
import {
  boundGraphParams,
  parseGraphMaxConcurrency,
  parseGraphNodes,
  type NeutronGraphBoundParams,
} from "./neutron-graph-rpc-parse.js";

export {
  NEUTRON_GRAPH_ATTEMPT_STATES,
  NEUTRON_GRAPH_DEFAULT_CONCURRENCY,
  NEUTRON_GRAPH_HARD_MAX_CONCURRENCY,
  NEUTRON_GRAPH_MAX_ATTEMPTS,
  NEUTRON_GRAPH_RETRY_REASONS,
  NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
  NEUTRON_GRAPH_STATUSES,
  NEUTRON_GRAPH_STATUS_PRECEDENCE,
  NEUTRON_GRAPH_STALE_KINDS,
  type NeutronGraphAttemptSnapshot,
  type NeutronGraphAttemptState,
  type NeutronGraphCapabilitySummary,
  type NeutronGraphConcurrency,
  type NeutronGraphNodeCounts,
  type NeutronGraphNodeSnapshot,
  type NeutronGraphRetryReason,
  type NeutronGraphSnapshot,
  type NeutronGraphStaleKind,
  type NeutronGraphStaleMismatch,
  type NeutronGraphStaleSnapshot,
  type NeutronGraphStatus,
} from "./neutron-graph.js";

export type { NeutronGraphBoundParams } from "./neutron-graph-rpc-parse.js";

export interface NeutronGraphExecuteParams extends NeutronGraphBoundParams {
  readonly nodes: readonly NeutronTaskNode[];
  readonly maxConcurrency?: number;
}

export type NeutronGraphGetRequest = JsonRpcRequest<
  typeof NEUTRON_GRAPH_GET_METHOD,
  NeutronGraphBoundParams
>;
export type NeutronGraphCancelRequest = JsonRpcRequest<
  typeof NEUTRON_GRAPH_CANCEL_METHOD,
  NeutronGraphBoundParams
>;
export type NeutronGraphExecuteRequest = JsonRpcRequest<
  typeof NEUTRON_GRAPH_EXECUTE_METHOD,
  NeutronGraphExecuteParams
>;

export type NeutronGraphDaemonRequest =
  | NeutronGraphGetRequest
  | NeutronGraphCancelRequest
  | NeutronGraphExecuteRequest;

type NeutronGraphMethod =
  | typeof NEUTRON_GRAPH_GET_METHOD
  | typeof NEUTRON_GRAPH_CANCEL_METHOD
  | typeof NEUTRON_GRAPH_EXECUTE_METHOD;

export function isNeutronGraphDaemonMethod(
  method: string,
): method is NeutronGraphMethod {
  return (
    method === NEUTRON_GRAPH_GET_METHOD ||
    method === NEUTRON_GRAPH_CANCEL_METHOD ||
    method === NEUTRON_GRAPH_EXECUTE_METHOD
  );
}

export function createNeutronGraphGetRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
  graphId?: string,
): NeutronGraphGetRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_GRAPH_GET_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      sessionId,
      projectId,
      ...(graphId === undefined ? {} : { graphId }),
    },
  };
}

export function createNeutronGraphCancelRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
  graphId?: string,
): NeutronGraphCancelRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_GRAPH_CANCEL_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      sessionId,
      projectId,
      ...(graphId === undefined ? {} : { graphId }),
    },
  };
}

export function createNeutronGraphExecuteRequest(
  id: RequestId,
  root: string,
  sessionId: string,
  projectId: string,
  nodes: readonly NeutronTaskNode[],
  options: { readonly graphId?: string; readonly maxConcurrency?: number } = {},
): NeutronGraphExecuteRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: NEUTRON_GRAPH_EXECUTE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root,
      sessionId,
      projectId,
      nodes,
      ...(options.graphId === undefined ? {} : { graphId: options.graphId }),
      ...(options.maxConcurrency === undefined
        ? {}
        : { maxConcurrency: options.maxConcurrency }),
    },
  };
}

export function parseNeutronGraphDaemonRequest(
  method: string,
  params: Record<string, unknown>,
  id: RequestId,
): NeutronGraphDaemonRequest | null {
  if (!isNeutronGraphDaemonMethod(method)) return null;
  const bound = boundGraphParams(params);
  if (method === NEUTRON_GRAPH_GET_METHOD) {
    return createNeutronGraphGetRequest(
      id,
      bound.root,
      bound.sessionId,
      bound.projectId,
      bound.graphId,
    );
  }
  if (method === NEUTRON_GRAPH_CANCEL_METHOD) {
    return createNeutronGraphCancelRequest(
      id,
      bound.root,
      bound.sessionId,
      bound.projectId,
      bound.graphId,
    );
  }
  const maxConcurrency = parseGraphMaxConcurrency(params.maxConcurrency);
  return createNeutronGraphExecuteRequest(
    id,
    bound.root,
    bound.sessionId,
    bound.projectId,
    parseGraphNodes(params.nodes),
    {
      ...(bound.graphId === undefined ? {} : { graphId: bound.graphId }),
      ...(maxConcurrency === undefined ? {} : { maxConcurrency }),
    },
  );
}

export function neutronGraphInput(
  root: string,
  sessionId: string,
  nodes: readonly NeutronTaskNode[],
): NeutronTaskGraph {
  return {
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    root,
    sessionId,
    nodes,
  };
}
