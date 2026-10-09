export interface NeutronMutationLockAcquisition {
  readonly ok: true;
  readonly key: string;
  readonly transactionId: string;
}

export interface NeutronMutationLockConflict {
  readonly ok: false;
  readonly key: string;
  readonly ownerTransactionId: string;
}

const holders = new Map<string, string>();

export function neutronMutationLockKey(canonicalRoot: string): string {
  return canonicalRoot;
}

export function acquireNeutronMutationProjectLock(input: {
  readonly canonicalRoot: string;
  readonly transactionId: string;
}): NeutronMutationLockAcquisition | NeutronMutationLockConflict {
  const key = neutronMutationLockKey(input.canonicalRoot);
  const owner = holders.get(key);
  if (owner !== undefined && owner !== input.transactionId) {
    return { ok: false, key, ownerTransactionId: owner };
  }
  holders.set(key, input.transactionId);
  return { ok: true, key, transactionId: input.transactionId };
}

export function releaseNeutronMutationProjectLock(input: {
  readonly key: string;
  readonly transactionId: string;
}): boolean {
  const owner = holders.get(input.key);
  if (owner !== input.transactionId) return false;
  holders.delete(input.key);
  return true;
}

export function inspectNeutronMutationProjectLock(
  canonicalRoot: string,
): string | undefined {
  return holders.get(neutronMutationLockKey(canonicalRoot));
}
