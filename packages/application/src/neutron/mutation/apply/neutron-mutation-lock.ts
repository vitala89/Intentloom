/**
 * Observational boundary for a future project mutation lock.
 * Slice 2 must not acquire a transaction lock or claim concurrency safety.
 */
export interface NeutronMutationLockObserver {
  isProjectMutationActive?(input: {
    readonly projectId: string;
    readonly root: string;
  }): boolean | Promise<boolean>;
}

export async function observeNeutronMutationLock(
  observer: NeutronMutationLockObserver | undefined,
  input: { readonly projectId: string; readonly root: string },
): Promise<boolean | undefined> {
  if (observer?.isProjectMutationActive === undefined) return undefined;
  return observer.isProjectMutationActive(input);
}
