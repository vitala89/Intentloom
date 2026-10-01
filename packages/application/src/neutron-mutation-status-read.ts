import type { NeutronMutationStatusResult } from "../../protocol/src/neutron-mutation-status-result.js";
import { closedNeutronMutationStatus } from "../../protocol/src/neutron-mutation-status-result.js";
import { createPersistentNeutronMutationApprovalStore } from "./neutron-mutation-apply-durable-store.js";
import {
  NeutronMutationStatusIndexError,
  readNeutronMutationStatusPointer,
  type NeutronMutationStatusIdentity,
} from "./neutron-mutation-status-index.js";
import { publicNeutronMutationStatus } from "./neutron-mutation-status-public.js";

export class NeutronMutationStatusReadCancelled extends Error {
  readonly code = "status-read-cancelled" as const;

  constructor() {
    super("status-read-cancelled");
    this.name = "NeutronMutationStatusReadCancelled";
  }
}

export interface NeutronMutationStatusReadInput extends NeutronMutationStatusIdentity {
  readonly directory: string | undefined;
  readonly transactionId?: string;
  readonly signal?: AbortSignal;
}

/**
 * Observational recovery. Reads the proposal index and the canonical
 * transaction record. Does not approve, claim, lock, or Apply.
 */
export async function readNeutronMutationStatus(
  input: NeutronMutationStatusReadInput,
): Promise<NeutronMutationStatusResult> {
  throwIfCancelled(input.signal);
  if (input.directory === undefined || input.directory.trim() === "") {
    return closedNeutronMutationStatus({
      outcome: "durable-state-unavailable",
      proposalId: input.proposalId,
    });
  }
  const pointer = await readNeutronMutationStatusPointer(input.directory, {
    graphId: input.graphId,
    projectId: input.projectId,
    proposalId: input.proposalId,
    root: input.root,
    sessionId: input.sessionId,
  });
  throwIfCancelled(input.signal);
  if (pointer === undefined) {
    return closedNeutronMutationStatus({
      outcome: "unknown",
      proposalId: input.proposalId,
      ...(input.transactionId === undefined
        ? {}
        : { transactionId: input.transactionId }),
    });
  }
  if (
    input.transactionId !== undefined &&
    input.transactionId !== pointer.transactionId
  ) {
    return closedNeutronMutationStatus({
      outcome: "transaction-mismatch",
      proposalId: input.proposalId,
      transactionId: input.transactionId,
    });
  }
  const record = await loadBoundRecord(input.directory, pointer);
  return publicNeutronMutationStatus({
    proposalId: input.proposalId,
    record,
  });
}

async function loadBoundRecord(
  directory: string,
  pointer: {
    readonly approvalId: string;
    readonly transactionId: string;
  },
) {
  try {
    const store = createPersistentNeutronMutationApprovalStore({ directory });
    const record = await store.getByApproval(pointer.approvalId);
    if (
      record === undefined ||
      record.approvalId !== pointer.approvalId ||
      record.transactionId !== pointer.transactionId
    ) {
      throw new NeutronMutationStatusIndexError("durable-status-corrupt");
    }
    return record;
  } catch (error) {
    if (error instanceof NeutronMutationStatusIndexError) throw error;
    throw new NeutronMutationStatusIndexError("durable-status-corrupt");
  }
}

function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw new NeutronMutationStatusReadCancelled();
}
