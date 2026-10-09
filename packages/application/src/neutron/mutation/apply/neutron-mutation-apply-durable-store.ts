import {
  acquireDirectoryGate,
  exclusiveCreateUtf8File,
  readUtf8FileIfPresent,
  releaseDirectoryGate,
  replaceUtf8FileAtomic,
} from "./neutron-mutation-apply-durable-fs.js";
import {
  decodeDurableTransactionRecord,
  durableApprovalGatePath,
  durableApprovalRecordPath,
  encodeDurableTransactionRecord,
} from "./neutron-mutation-apply-durable-record.js";
import {
  classifyExistingClaim,
  verificationSnapshotCurrent,
  type NeutronMutationApprovalStore,
  type NeutronMutationClaimOutcome,
  type NeutronMutationTransactionRecord,
  type NeutronMutationTransitionInput,
} from "./neutron-mutation-apply-store.js";

export function createPersistentNeutronMutationApprovalStore(options: {
  readonly directory: string;
}): NeutronMutationApprovalStore {
  const directory = options.directory;
  return {
    async getByApproval(approvalId) {
      const loaded = await loadRecord(directory, approvalId);
      if (loaded.kind === "missing") return undefined;
      if (loaded.kind === "corrupt") throw new Error("durable-store-corrupt");
      return loaded.record;
    },
    async claim(record) {
      const path = durableApprovalRecordPath(directory, record.approvalId);
      const created = await exclusiveCreateUtf8File(
        path,
        encodeDurableTransactionRecord(record),
      );
      if (created === "created") return { kind: "claimed", record };
      return classifyLoadedClaim(directory, record);
    },
    async transition(input) {
      const path = durableApprovalRecordPath(directory, input.approvalId);
      const gate = durableApprovalGatePath(path);
      if (!(await acquireDirectoryGate(gate))) return undefined;
      try {
        return await replaceIfExpected(directory, path, input);
      } finally {
        await releaseDirectoryGate(gate);
      }
    },
  };
}

async function classifyLoadedClaim(
  directory: string,
  incoming: NeutronMutationTransactionRecord,
): Promise<NeutronMutationClaimOutcome> {
  const loaded = await loadRecord(directory, incoming.approvalId);
  if (loaded.kind === "missing" || loaded.kind === "corrupt") {
    return { kind: "storage-failed" };
  }
  return classifyExistingClaim(loaded.record, incoming);
}

async function replaceIfExpected(
  directory: string,
  path: string,
  input: NeutronMutationTransitionInput,
): Promise<NeutronMutationTransactionRecord | undefined> {
  const loaded = await loadRecord(directory, input.approvalId);
  if (
    loaded.kind !== "ok" ||
    !verificationSnapshotCurrent(loaded.record, input)
  ) {
    return undefined;
  }
  const next: NeutronMutationTransactionRecord = {
    ...loaded.record,
    state: input.next,
    updatedAt: input.updatedAt,
    ...(input.result !== undefined ? { result: input.result } : {}),
    ...(input.undoRestoration !== undefined
      ? { undoRestoration: input.undoRestoration }
      : {}),
  };
  await replaceUtf8FileAtomic(path, encodeDurableTransactionRecord(next));
  return next;
}

async function loadRecord(
  directory: string,
  approvalId: string,
): Promise<
  | { readonly kind: "missing" }
  | { readonly kind: "corrupt" }
  | { readonly kind: "ok"; readonly record: NeutronMutationTransactionRecord }
> {
  const raw = await readUtf8FileIfPresent(
    durableApprovalRecordPath(directory, approvalId),
  );
  if (raw === undefined) return { kind: "missing" };
  try {
    return { kind: "ok", record: decodeDurableTransactionRecord(raw) };
  } catch {
    return { kind: "corrupt" };
  }
}
