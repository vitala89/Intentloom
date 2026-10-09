import type { NeutronMutationStatusQuery } from "../../../../protocol/src/neutron-mutation-status-rpc.js";
import {
  closedNeutronMutationStatus,
  type NeutronMutationStatusResult,
} from "../../../../protocol/src/neutron-mutation-status-result.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";
import { readNeutronMutationStatus } from "../mutation/status/neutron-mutation-status-read.js";

export function bindNeutronSessionStatusOperations(input: {
  readonly sessions: Map<string, StoredNeutronSession>;
  readonly durableStateDirectory: string | undefined;
}): {
  getNeutronMutationStatus(
    query: NeutronMutationStatusQuery,
    signal?: AbortSignal,
  ): Promise<NeutronMutationStatusResult>;
} {
  return {
    async getNeutronMutationStatus(query, signal) {
      const mismatch = neutronMutationLiveBindingOutcome(input.sessions, query);
      if (mismatch !== undefined) return mismatch;
      return readNeutronMutationStatus({
        directory: input.durableStateDirectory,
        graphId: query.graphId,
        projectId: query.projectId,
        proposalId: query.proposalId,
        root: query.root,
        sessionId: query.sessionId,
        ...(query.transactionId === undefined
          ? {}
          : { transactionId: query.transactionId }),
        ...(signal === undefined ? {} : { signal }),
      });
    },
  };
}

export function neutronMutationLiveBindingOutcome(
  sessions: Map<string, StoredNeutronSession>,
  query: NeutronMutationStatusQuery,
): NeutronMutationStatusResult | undefined {
  const stored = sessions.get(query.sessionId);
  if (stored === undefined) return undefined;
  if (stored.session.root !== query.root) {
    return closed(query, "root-mismatch");
  }
  if (stored.session.projectId !== query.projectId) {
    return closed(query, "project-mismatch");
  }
  if (stored.session.sessionId !== query.sessionId) {
    return closed(query, "session-mismatch");
  }
  const graphId = stored.storedGraph?.snapshot.graphId;
  if (graphId !== undefined && graphId !== query.graphId) {
    return closed(query, "graph-mismatch");
  }
  return undefined;
}

function closed(
  query: NeutronMutationStatusQuery,
  outcome:
    | "root-mismatch"
    | "project-mismatch"
    | "session-mismatch"
    | "graph-mismatch",
): NeutronMutationStatusResult {
  return closedNeutronMutationStatus({
    outcome,
    proposalId: query.proposalId,
    ...(query.transactionId === undefined
      ? {}
      : { transactionId: query.transactionId }),
  });
}
