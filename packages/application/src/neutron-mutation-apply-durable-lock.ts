import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  exclusiveCreateUtf8File,
  readUtf8FileIfPresent,
  removeUtf8File,
} from "./neutron-mutation-apply-durable-fs.js";
import {
  acquireNeutronMutationProjectLock,
  neutronMutationLockKey,
  releaseNeutronMutationProjectLock,
  type NeutronMutationLockAcquisition,
  type NeutronMutationLockConflict,
} from "./neutron-mutation-apply-lock.js";

export async function acquireNeutronMutationApplyLock(input: {
  readonly canonicalRoot: string;
  readonly transactionId: string;
  readonly durableStateDirectory?: string;
}): Promise<NeutronMutationLockAcquisition | NeutronMutationLockConflict> {
  if (input.durableStateDirectory === undefined) {
    return acquireNeutronMutationProjectLock(input);
  }
  const key = neutronMutationLockKey(input.canonicalRoot);
  const path = durableLockPath(input.durableStateDirectory, key);
  const created = await exclusiveCreateUtf8File(
    path,
    `${JSON.stringify({
      transactionId: input.transactionId,
      lockKey: key,
    })}\n`,
  );
  if (created === "created") {
    return { ok: true, key, transactionId: input.transactionId };
  }
  const owner = await readLockOwner(path);
  if (owner === input.transactionId) {
    return { ok: true, key, transactionId: input.transactionId };
  }
  return { ok: false, key, ownerTransactionId: owner ?? "unknown" };
}

export async function releaseNeutronMutationApplyLock(input: {
  readonly key: string;
  readonly transactionId: string;
  readonly durableStateDirectory?: string;
}): Promise<boolean> {
  if (input.durableStateDirectory === undefined) {
    return releaseNeutronMutationProjectLock(input);
  }
  const path = durableLockPath(input.durableStateDirectory, input.key);
  const owner = await readLockOwner(path);
  if (owner !== input.transactionId) return false;
  await removeUtf8File(path);
  return true;
}

function durableLockPath(directory: string, lockKey: string): string {
  const digest = createHash("sha256").update(lockKey).digest("hex");
  return join(directory, "locks", `${digest}.lock`);
}

async function readLockOwner(path: string): Promise<string | undefined> {
  const raw = await readUtf8FileIfPresent(path);
  if (raw === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return undefined;
    const transactionId = (parsed as { transactionId?: unknown }).transactionId;
    return typeof transactionId === "string" ? transactionId : undefined;
  } catch {
    return undefined;
  }
}
