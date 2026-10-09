import type { DaemonCapability } from "@intentloom/protocol";
import type {
  NeutronMutationVerificationRetryRequest,
  NeutronMutationVerificationRetryResponse,
  NeutronMutationVerificationRetryResult,
} from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
  createNeutronMutationVerificationRetryResponse,
  isNeutronMutationVerificationRetryMethod,
} from "@intentloom/protocol";
import type { NeutronSessionRuntime } from "../../application/src/neutron/session/neutron-session-runtime.js";

export interface NeutronMutationVerificationRetryDaemonOptions {
  readonly neutronMutationVerificationRetry?: (
    request: NeutronMutationVerificationRetryRequest,
  ) => Promise<NeutronMutationVerificationRetryResult>;
}

/**
 * Capability taxonomy is only `read-only` | `mutating`. `mutating` is the
 * project-write class used by approveAndApply. This operation updates
 * durable verification metadata and has zero project-write authority, so
 * it is `read-only` and a distinct operation. It is not status.get and
 * it is not Apply.
 */
export function neutronMutationVerificationRetryCapabilities(
  options: NeutronMutationVerificationRetryDaemonOptions,
): readonly DaemonCapability[] {
  if (!options.neutronMutationVerificationRetry) return [];
  return [
    {
      classification: "read-only",
      method: NEUTRON_MUTATION_VERIFICATION_RETRY_METHOD,
      operation: "neutron.mutation.verification.retry",
    },
  ];
}

export function bindNeutronMutationVerificationRetryHandlers(
  runtime: NeutronSessionRuntime,
): Required<NeutronMutationVerificationRetryDaemonOptions> {
  return {
    neutronMutationVerificationRetry: async (request) =>
      runtime.retryNeutronMutationVerification(request.params),
  };
}

export function isNeutronMutationVerificationRetryRequest(request: {
  readonly method: string;
}): request is NeutronMutationVerificationRetryRequest {
  return isNeutronMutationVerificationRetryMethod(request.method);
}

export async function dispatchNeutronMutationVerificationRetryRequest(
  request: NeutronMutationVerificationRetryRequest,
  options: NeutronMutationVerificationRetryDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<NeutronMutationVerificationRetryResponse | null> {
  const handler = options.neutronMutationVerificationRetry;
  if (!handler) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const result = await handler({
    ...request,
    params: { ...request.params, root },
  });
  return createNeutronMutationVerificationRetryResponse(request.id, result);
}
