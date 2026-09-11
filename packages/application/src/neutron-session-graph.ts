import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import {
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronTaskNode,
} from "../../protocol/src/neutron-runtime.js";
import { ProtocolValidationError } from "../../protocol/src/protocol-validation-error.js";
import type { FileSystem } from "./index.js";
import { inspectProject } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import { projectNeutronGraphSnapshot } from "./neutron-graph-projection.js";
import { NeutronSchedulerError } from "./neutron-scheduler-errors.js";
import {
  executeReadyNeutronTaskNodes,
  neutronGraphExecutionId,
  reconcileNeutronTaskGraphExecution,
} from "./neutron-scheduler.js";
import {
  neutronBindingError,
  NeutronSessionOperationError,
} from "./neutron-session-errors.js";
import {
  NEUTRON_SESSION_READ_ONLY_CAPS,
  type StoredNeutronSession,
} from "./neutron-session-turn.js";
import { validateNeutronRuntimeSession } from "../../validator/src/neutron-runtime.js";
import { validateNeutronGraphSnapshot } from "../../validator/src/neutron-graph.js";

export function unknownNeutronGraphError(
  graphId: string | undefined,
): ProtocolValidationError {
  return new ProtocolValidationError(
    -32602,
    graphId === undefined
      ? "unknown neutron graph"
      : `unknown neutron graph '${graphId}'`,
  );
}

export function storedGraphView(
  stored: StoredNeutronSession,
  cancellationAcknowledged = false,
): StoredNeutronSession {
  if (stored.graphSnapshot === null) return stored;
  return {
    ...stored,
    graphSnapshot: {
      ...stored.graphSnapshot,
      cancellationAcknowledged,
    },
  };
}

export function requireStoredGraph(
  stored: StoredNeutronSession,
  graphId?: string,
): NonNullable<StoredNeutronSession["storedGraph"]> {
  const record = stored.storedGraph;
  if (record === undefined) {
    throw unknownNeutronGraphError(graphId);
  }
  if (graphId !== undefined && record.snapshot.graphId !== graphId) {
    throw unknownNeutronGraphError(graphId);
  }
  return record;
}

export async function refreshStoredNeutronGraph(
  stored: StoredNeutronSession,
  fingerprint: (root: string) => Promise<string>,
  graphId?: string,
): Promise<StoredNeutronSession> {
  const record = requireStoredGraph(stored, graphId);
  const current = await fingerprint(stored.session.root);
  const result = reconcileNeutronTaskGraphExecution({
    baseline: record.baseline,
    current: { projectFingerprint: current },
    graph: record.graph,
    graphId: record.snapshot.graphId,
    outcomes: record.outcomes,
    session: stored.session,
  });
  const snapshot = validateNeutronGraphSnapshot(
    projectNeutronGraphSnapshot({
      cancellationAcknowledged:
        stored.graphSnapshot?.cancellationAcknowledged === true,
      plan: record.plan,
      result,
    }),
  );
  return {
    ...stored,
    graphSnapshot: snapshot,
    storedGraph: { ...record, snapshot },
  };
}

export async function executeStoredNeutronGraph(input: {
  readonly stored: StoredNeutronSession;
  readonly nodes: readonly NeutronTaskNode[];
  readonly adapter: ModelAdapter;
  readonly fs: FileSystem;
  readonly fingerprint: (root: string) => Promise<string>;
  readonly signal: AbortSignal;
  readonly maxConcurrency?: number;
  readonly graphId?: string;
  readonly capabilities?: AgentRoleCapabilities;
}): Promise<StoredNeutronSession> {
  const session = validateNeutronRuntimeSession({
    ...input.stored.session,
    state: "planning",
  });
  const graph = {
    nodes: input.nodes,
    root: session.root,
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    sessionId: session.sessionId,
  };
  const graphId = neutronGraphExecutionId(graph);
  if (input.graphId !== undefined && input.graphId !== graphId) {
    throw neutronBindingError("neutron graphId does not match graph identity");
  }
  const before = await input.fingerprint(session.root);
  const capabilities = input.capabilities ?? NEUTRON_SESSION_READ_ONLY_CAPS;
  try {
    const wave = await executeReadyNeutronTaskNodes({
      adapter: input.adapter,
      fingerprintProject: () => input.fingerprint(session.root),
      fs: input.fs,
      graph,
      inspect: (root) => inspectProject(root, input.fs),
      projectId: session.projectId,
      session,
      sessionCapabilities: capabilities,
      signal: input.signal,
      ...(input.maxConcurrency === undefined
        ? {}
        : { maxConcurrency: input.maxConcurrency }),
    });
    const after = await input.fingerprint(session.root);
    const result = reconcileNeutronTaskGraphExecution({
      baseline: { projectFingerprint: before },
      current: { projectFingerprint: after },
      graph: wave.graph,
      graphId,
      outcomes: wave.outcomes,
      session,
    });
    const snapshot = validateNeutronGraphSnapshot(
      projectNeutronGraphSnapshot({
        cancellationAcknowledged: input.signal.aborted,
        plan: wave.plan,
        result,
      }),
    );
    return {
      ...input.stored,
      graphSnapshot: snapshot,
      projectFingerprintAfter: after,
      projectFingerprintBefore: before,
      session: validateNeutronRuntimeSession({
        ...session,
        state: sessionStateFor(snapshot.status, input.signal.aborted),
      }),
      storedGraph: {
        baseline: { projectFingerprint: before },
        graph: wave.graph,
        outcomes: wave.outcomes,
        plan: wave.plan,
        snapshot,
      },
    };
  } catch (error) {
    throw mapGraphError(error);
  }
}

function sessionStateFor(
  status: string,
  aborted: boolean,
): "cancelled" | "timed-out" | "failed" | "completed" {
  if (aborted || status === "cancelled") return "cancelled";
  if (status === "timed-out") return "timed-out";
  if (status === "failed") return "failed";
  return "completed";
}

function mapGraphError(error: unknown): unknown {
  if (error instanceof NeutronSchedulerError) {
    if (error.code === "invalid-concurrency") {
      return new ProtocolValidationError(-32602, error.message);
    }
    return new NeutronSessionOperationError("validation-failed", error.message);
  }
  return error;
}
