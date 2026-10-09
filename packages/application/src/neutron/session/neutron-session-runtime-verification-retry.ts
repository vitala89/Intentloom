import type { NeutronMutationVerificationRetryQuery } from "../../../../protocol/src/neutron/mutation/verification/neutron-mutation-verification-retry-rpc.js";
import type { NeutronMutationVerificationRetryResult } from "../../../../protocol/src/neutron/mutation/verification/neutron-mutation-verification-retry-result.js";
import type { FileSystem } from "../../index.js";
import { nodeFileSystem } from "../../index.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";
import { neutronMutationLiveBindingOutcome } from "./neutron-session-runtime-status.js";
import { retryAppliedNeutronMutationVerification } from "../mutation/verification/neutron-mutation-verification-retry-run.js";

export function bindNeutronSessionVerificationRetryOperations(input: {
  readonly sessions: Map<string, StoredNeutronSession>;
  readonly durableStateDirectory: string | undefined;
  readonly fs?: FileSystem;
  readonly now?: () => Date;
}): {
  retryNeutronMutationVerification(
    query: NeutronMutationVerificationRetryQuery,
    signal?: AbortSignal,
  ): Promise<NeutronMutationVerificationRetryResult>;
} {
  return {
    async retryNeutronMutationVerification(query, signal) {
      const mismatch = neutronMutationLiveBindingOutcome(input.sessions, {
        ...query,
        schemaVersion: "urn:intentloom:schema:neutron-mutation-status:1",
      });
      if (mismatch !== undefined) return mismatch;
      return retryAppliedNeutronMutationVerification({
        directory: input.durableStateDirectory,
        fs: input.fs ?? nodeFileSystem,
        query,
        ...(signal === undefined ? {} : { signal }),
        ...(input.now === undefined
          ? {}
          : { now: () => input.now?.().getTime() ?? Date.now() }),
      });
    },
  };
}
