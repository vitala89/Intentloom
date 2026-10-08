import { PROTOCOL_VERSION } from "../../protocol/src/jsonrpc.js";
import { NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN } from "../../protocol/src/neutron-mutation-undo.js";
import type { NeutronMutationUndoRequest } from "../../protocol/src/neutron-mutation-undo-request.js";
import type { NeutronMutationTransactionRecord } from "./neutron-mutation-apply-store.js";
import { createPersistentNeutronMutationApprovalStore } from "./neutron-mutation-apply-durable-store.js";
import {
  NeutronMutationStatusIndexError,
  readNeutronMutationStatusPointer,
} from "./neutron-mutation-status-index.js";

export async function locateUndoApplyRecord(
  directory: string,
  intent: NeutronMutationUndoRequest,
): Promise<
  | {
      readonly kind: "record";
      readonly record: NeutronMutationTransactionRecord;
    }
  | { readonly kind: "missing" }
  | { readonly kind: "mismatch" }
  | { readonly kind: "corrupt" }
> {
  try {
    const pointer = await readNeutronMutationStatusPointer(directory, {
      root: intent.root,
      sessionId: intent.sessionId,
      projectId: intent.projectId,
      graphId: intent.graphId,
      proposalId: intent.proposalId,
    });
    if (pointer === undefined) return { kind: "missing" };
    if (pointer.transactionId !== intent.transactionId)
      return { kind: "mismatch" };
    const record = await loadRecord(directory, pointer.approvalId);
    if (
      record.transactionId !== pointer.transactionId ||
      record.approvalId !== pointer.approvalId
    ) {
      return { kind: "corrupt" };
    }
    return { kind: "record", record };
  } catch (error) {
    if (error instanceof NeutronMutationStatusIndexError)
      return { kind: "corrupt" };
    return { kind: "corrupt" };
  }
}

export function undoPreflightIntent(intent: NeutronMutationUndoRequest) {
  return {
    schemaVersion: NEUTRON_MUTATION_UNDO_INTENT_SCHEMA_URN,
    protocolVersion: PROTOCOL_VERSION,
    root: intent.root,
    sessionId: intent.sessionId,
    projectId: intent.projectId,
    graphId: intent.graphId,
    proposalId: intent.proposalId,
    transactionId: intent.transactionId,
  };
}

async function loadRecord(
  directory: string,
  approvalId: string,
): Promise<NeutronMutationTransactionRecord> {
  const store = createPersistentNeutronMutationApprovalStore({ directory });
  const record = await store.getByApproval(approvalId);
  if (record === undefined) {
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
  return record;
}
