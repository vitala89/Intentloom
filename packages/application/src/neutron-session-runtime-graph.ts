import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type { NeutronTaskNode } from "../../protocol/src/neutron-runtime.js";
import type { NeutronSessionViewmodel } from "../../protocol/src/neutron-session-rpc.js";
import type { FileSystem } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import {
  executeStoredNeutronGraph,
  refreshStoredNeutronGraph,
  requireStoredGraph,
  storedGraphView,
} from "./neutron-session-graph.js";
import {
  neutronBindingError,
  NeutronSessionOperationError,
  unknownNeutronSessionError,
} from "./neutron-session-errors.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";

export interface NeutronGraphRuntimeContext {
  readonly sessions: Map<string, StoredNeutronSession>;
  readonly fs: FileSystem;
  readonly fingerprint: (root: string) => Promise<string>;
  readonly createAdapter: () => ModelAdapter | null;
  readonly capabilities?: AgentRoleCapabilities;
  readonly emptyView: (stored: StoredNeutronSession) => NeutronSessionViewmodel;
  readonly requireBound: (input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
  }) => StoredNeutronSession;
  readonly persist: (
    stored: StoredNeutronSession,
    session: StoredNeutronSession["session"],
  ) => StoredNeutronSession;
  readonly beginInFlight: (stored: StoredNeutronSession) => {
    readonly controller: AbortController;
    readonly settle: () => void;
  };
}

function requireAdapter(
  createAdapter: () => ModelAdapter | null,
): ModelAdapter {
  const adapter = createAdapter();
  if (adapter === null) {
    throw new NeutronSessionOperationError(
      "adapter-unconfigured",
      "Neutron provider is not configured",
    );
  }
  return adapter;
}

export async function getRuntimeGraph(
  ctx: NeutronGraphRuntimeContext,
  input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly graphId?: string;
  },
): Promise<NeutronSessionViewmodel> {
  const stored = ctx.requireBound(input);
  requireStoredGraph(stored, input.graphId);
  const refreshed = await refreshStoredNeutronGraph(
    stored,
    ctx.fingerprint,
    input.graphId,
  );
  ctx.sessions.set(stored.session.sessionId, refreshed);
  return ctx.emptyView(refreshed);
}

export async function cancelRuntimeGraph(
  ctx: NeutronGraphRuntimeContext,
  input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly graphId?: string;
  },
): Promise<NeutronSessionViewmodel> {
  const stored = ctx.requireBound(input);
  if (stored.inFlight !== undefined) {
    stored.inFlight.controller.abort();
    await stored.inFlight.done;
    const latest = ctx.sessions.get(input.sessionId);
    if (latest === undefined) {
      throw unknownNeutronSessionError(input.sessionId);
    }
    if (latest.storedGraph !== undefined) {
      requireStoredGraph(latest, input.graphId);
    }
    const acknowledged = storedGraphView(latest, true);
    ctx.sessions.set(input.sessionId, acknowledged);
    return {
      ...ctx.emptyView(acknowledged),
      cancellationAcknowledged: true,
    };
  }
  requireStoredGraph(stored, input.graphId);
  return ctx.emptyView(stored);
}

export async function executeRuntimeGraph(
  ctx: NeutronGraphRuntimeContext,
  input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly nodes: readonly NeutronTaskNode[];
    readonly graphId?: string;
    readonly maxConcurrency?: number;
  },
): Promise<NeutronSessionViewmodel> {
  const stored = ctx.requireBound(input);
  if (stored.session.state === "cancelled") {
    throw neutronBindingError("neutron session is no longer active");
  }
  if (stored.inFlight !== undefined) {
    throw neutronBindingError("neutron session already has in-flight work");
  }
  const adapter = requireAdapter(ctx.createAdapter);
  const inflight = ctx.beginInFlight(stored);
  ctx.persist(stored, { ...stored.session, state: "planning" });
  try {
    const completed = await executeStoredNeutronGraph({
      adapter,
      fingerprint: ctx.fingerprint,
      fs: ctx.fs,
      nodes: input.nodes,
      signal: inflight.controller.signal,
      stored,
      ...(input.graphId === undefined ? {} : { graphId: input.graphId }),
      ...(input.maxConcurrency === undefined
        ? {}
        : { maxConcurrency: input.maxConcurrency }),
      ...(ctx.capabilities === undefined
        ? {}
        : { capabilities: ctx.capabilities }),
    });
    ctx.sessions.set(stored.session.sessionId, completed);
    return ctx.emptyView(completed);
  } catch (error) {
    if (!inflight.controller.signal.aborted) {
      const failed = {
        ...stored,
        errorCode: "operation-failed" as const,
        errorMessage: error instanceof Error ? error.message : String(error),
        session: {
          ...stored.session,
          state: "failed" as const,
        },
      };
      ctx.sessions.set(stored.session.sessionId, failed);
    } else {
      ctx.persist(stored, { ...stored.session, state: "cancelled" });
    }
    throw error;
  } finally {
    inflight.settle();
    const latest = ctx.sessions.get(stored.session.sessionId);
    if (latest !== undefined) latest.inFlight = undefined;
  }
}
