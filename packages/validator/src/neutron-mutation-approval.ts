import { NEUTRON_MUTATION_CLASS } from "../../protocol/src/neutron-mutation.js";
import {
  NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
  NEUTRON_MUTATION_APPROVAL_SOURCE,
  type NeutronMutationApproval,
} from "../../protocol/src/neutron-mutation-approval.js";
import {
  assertNeutronMutationDigest,
  canonicalizeNeutronMutationPaths,
} from "./neutron-mutation-canonical.js";
import {
  digestNeutronMutationApproval,
  expectedNeutronMutationApprovalToken,
} from "./neutron-mutation-digest.js";
import {
  finiteInt,
  isObject,
  nonEmpty,
  oneOf,
} from "./neutron-runtime-helpers.js";

function optionalId(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return nonEmpty(value, field);
}

export function validateNeutronMutationApproval(
  value: unknown,
): NeutronMutationApproval {
  if (!isObject(value)) throw new Error("mutation approval must be an object");
  if (value.schemaVersion !== NEUTRON_MUTATION_APPROVAL_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation approval schema");
  }
  if (Object.hasOwn(value, "grantedApprovals")) {
    throw new Error("mutation approval must not accept grantedApprovals");
  }
  if (
    Object.hasOwn(value, "approved") ||
    Object.hasOwn(value, "mutationAllowed")
  ) {
    throw new Error("mutation approval must not include model grant flags");
  }
  const proposalDigest = assertNeutronMutationDigest(
    value.proposalDigest,
    "proposalDigest",
  );
  const approvalToken = nonEmpty(value.approvalToken, "approvalToken");
  if (approvalToken !== expectedNeutronMutationApprovalToken(proposalDigest)) {
    throw new Error("approvalToken must bind approved:<proposalDigest>");
  }
  if (
    !Array.isArray(value.changedPaths) ||
    !value.changedPaths.every((path) => typeof path === "string")
  ) {
    throw new Error("changedPaths must be an array of strings");
  }
  const changedPaths = canonicalizeNeutronMutationPaths(
    value.changedPaths,
    "changedPaths",
  );
  const approvedAt = finiteInt(value.approvedAt, "approvedAt");
  const approvalValidUntil = finiteInt(
    value.approvalValidUntil,
    "approvalValidUntil",
  );
  if (approvalValidUntil < approvedAt) {
    throw new Error("approvalValidUntil must not precede approvedAt");
  }
  const taskId = optionalId(value.taskId, "taskId");
  const graphId = optionalId(value.graphId, "graphId");
  const unsigned = {
    schemaVersion: NEUTRON_MUTATION_APPROVAL_SCHEMA_URN,
    approvalId: nonEmpty(value.approvalId, "approvalId"),
    approvalToken,
    approvalSource: oneOf(
      value.approvalSource,
      [NEUTRON_MUTATION_APPROVAL_SOURCE] as const,
      "approvalSource",
    ),
    approvingActor: nonEmpty(value.approvingActor, "approvingActor"),
    root: nonEmpty(value.root, "root"),
    projectId: nonEmpty(value.projectId, "projectId"),
    sessionId: nonEmpty(value.sessionId, "sessionId"),
    ...(taskId !== undefined ? { taskId } : {}),
    ...(graphId !== undefined ? { graphId } : {}),
    proposalId: nonEmpty(value.proposalId, "proposalId"),
    proposalDigest,
    planDigest: assertNeutronMutationDigest(value.planDigest, "planDigest"),
    projectStateDigest: assertNeutronMutationDigest(
      value.projectStateDigest,
      "projectStateDigest",
    ),
    changedPaths,
    mutationClass: oneOf(
      value.mutationClass,
      [NEUTRON_MUTATION_CLASS] as const,
      "mutationClass",
    ),
    approvedAt,
    approvalValidUntil,
  };
  const approvalDigest = assertNeutronMutationDigest(
    value.approvalDigest,
    "approvalDigest",
  );
  if (approvalDigest !== digestNeutronMutationApproval(unsigned)) {
    throw new Error("approvalDigest does not match bound approval facts");
  }
  return { ...unsigned, approvalDigest };
}
