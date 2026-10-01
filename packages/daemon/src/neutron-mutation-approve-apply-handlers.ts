import type { DaemonCapability } from "@intentloom/protocol";
import type {
  NeutronMutationApproveAndApplyRequest,
  NeutronMutationApproveAndApplyResponse,
  NeutronMutationApproveAndApplyResult,
} from "@intentloom/protocol";
import {
  NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
  createNeutronMutationApproveAndApplyResponse,
  isNeutronMutationApproveAndApplyMethod,
} from "@intentloom/protocol";
import type { NeutronSessionRuntime } from "../../application/src/neutron-session-runtime.js";

export interface NeutronMutationApproveAndApplyDaemonOptions {
  readonly neutronMutationApproveAndApply?: (
    request: NeutronMutationApproveAndApplyRequest,
  ) => Promise<NeutronMutationApproveAndApplyResult>;
}

export function neutronMutationApproveAndApplyCapabilities(
  options: NeutronMutationApproveAndApplyDaemonOptions,
): readonly DaemonCapability[] {
  if (!options.neutronMutationApproveAndApply) return [];
  return [
    {
      classification: "mutating",
      method: NEUTRON_MUTATION_APPROVE_AND_APPLY_METHOD,
      operation: "neutron.mutation.approveAndApply",
    },
  ];
}

export function bindNeutronMutationApproveAndApplyHandlers(
  runtime: NeutronSessionRuntime,
): Required<NeutronMutationApproveAndApplyDaemonOptions> {
  return {
    neutronMutationApproveAndApply: async (request) =>
      runtime.approveAndApplyNeutronMutation(request.params),
  };
}

export function isNeutronMutationApproveAndApplyRequest(request: {
  readonly method: string;
}): request is NeutronMutationApproveAndApplyRequest {
  return isNeutronMutationApproveAndApplyMethod(request.method);
}

export async function dispatchNeutronMutationApproveAndApplyRequest(
  request: NeutronMutationApproveAndApplyRequest,
  options: NeutronMutationApproveAndApplyDaemonOptions,
  canonicalProjectRoot: (root: string) => Promise<string>,
): Promise<NeutronMutationApproveAndApplyResponse | null> {
  const handler = options.neutronMutationApproveAndApply;
  if (!handler) return null;
  const root = await canonicalProjectRoot(request.params.root);
  const result = await handler({
    ...request,
    params: { ...request.params, root },
  });
  return createNeutronMutationApproveAndApplyResponse(request.id, result);
}
