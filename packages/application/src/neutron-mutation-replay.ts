export interface NeutronMutationReplayCheckInput {
  readonly approvalId: string;
  readonly approvalDigest: string;
}

/**
 * Read-only consumption check. Slice 2 does not persist consumption.
 * Durable replay protection remains a later slice unless a store already exists.
 */
export interface NeutronMutationReplayChecker {
  isApprovalConsumed(
    input: NeutronMutationReplayCheckInput,
  ): boolean | Promise<boolean>;
}

export async function neutronMutationApprovalIsConsumed(
  checker: NeutronMutationReplayChecker | undefined,
  input: NeutronMutationReplayCheckInput,
): Promise<boolean> {
  if (checker === undefined) return false;
  return checker.isApprovalConsumed(input);
}
