import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import { parseNeutronMutationApplyEnvelope } from "./neutron-mutation-apply-parse.js";
import { rejectBeforeClaim } from "./neutron-mutation-apply-persist.js";
import { createPersistentNeutronMutationApprovalStore } from "./neutron-mutation-apply-durable-store.js";
import type { NeutronMutationApprovalStore } from "./neutron-mutation-apply-store.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { resumeReadOnlyVerification } from "./neutron-mutation-apply-verify.js";

export async function retryNeutronMutationVerification(
  input: NeutronMutationApplyInput,
): Promise<NeutronMutationApplyResult> {
  const parsed = parseNeutronMutationApplyEnvelope(input);
  if (parsed.request === undefined) {
    return rejectBeforeClaim({
      ...input,
      failureCode: parsed.reason ?? "approval-invalid",
    });
  }
  const store = resolveStore(input);
  if (store === undefined) {
    return rejectBeforeClaim({
      ...input,
      failureCode: "mutation-state-unknown",
    });
  }
  const record = await store.getByApproval(parsed.request.approval.approvalId);
  if (record === undefined) {
    return rejectBeforeClaim({
      ...input,
      failureCode: "mutation-state-unknown",
    });
  }
  return resumeReadOnlyVerification(input, parsed.request, store, record, true);
}

function resolveStore(
  input: NeutronMutationApplyInput,
): NeutronMutationApprovalStore | undefined {
  if (input.store !== undefined) return input.store;
  if (input.durableStateDirectory === undefined) return undefined;
  return createPersistentNeutronMutationApprovalStore({
    directory: input.durableStateDirectory,
  });
}
