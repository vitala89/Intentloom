import {
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PREFLIGHT_DECISIONS,
  NEUTRON_MUTATION_PREFLIGHT_REJECTION_REASONS,
  NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
  NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationPreflightRequest,
  type NeutronMutationPreflightResult,
  type NeutronMutationProposal,
} from "../../protocol/src/neutron-mutation.js";
import { NEUTRON_SESSION_STATES } from "../../protocol/src/neutron-runtime.js";
import { validateApprovedApplyPlan } from "./approved-apply.js";
import { validateNeutronMutationApproval } from "./neutron-mutation-approval.js";
import {
  assertNeutronMutationDigest,
  canonicalizeNeutronMutationPaths,
} from "./neutron-mutation-canonical.js";
import { digestNeutronMutationProposal } from "./neutron-mutation-digest.js";
import { isObject, nonEmpty, oneOf } from "./neutron-runtime-helpers.js";

const PROPOSAL_AUTHORITY_KEYS = [
  "approved",
  "mutationAllowed",
  "grantWrite",
  "grantedApprovals",
  "approvalToken",
  "approvalDigest",
  "approvalId",
  "approvalSource",
] as const;

export {
  canonicalizeNeutronMutationPaths,
  compareNeutronMutationPaths,
} from "./neutron-mutation-canonical.js";
export {
  digestNeutronMutationApproval,
  digestNeutronMutationProposal,
  expectedNeutronMutationApprovalToken,
} from "./neutron-mutation-digest.js";
export { validateNeutronMutationApproval } from "./neutron-mutation-approval.js";

function rejectProposalAuthority(value: Record<string, unknown>): void {
  for (const key of PROPOSAL_AUTHORITY_KEYS) {
    if (Object.hasOwn(value, key)) {
      throw new Error(`mutation proposal must not include ${key}`);
    }
  }
}

function optionalId(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return nonEmpty(value, field);
}

export function validateNeutronMutationProposal(
  value: unknown,
): NeutronMutationProposal {
  if (!isObject(value)) throw new Error("mutation proposal must be an object");
  if (value.schemaVersion !== NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation proposal schema");
  }
  rejectProposalAuthority(value);
  const plan = validateApprovedApplyPlan(value.plan);
  assertNeutronMutationDigest(plan.planDigest, "plan.planDigest");
  assertNeutronMutationDigest(
    plan.projectStateDigest,
    "plan.projectStateDigest",
  );
  const changedPaths = canonicalizeNeutronMutationPaths(
    plan.changedPaths,
    "plan.changedPaths",
  );
  const root = nonEmpty(value.root, "root");
  if (root !== plan.targetRoot) {
    throw new Error("proposal.root must equal plan.targetRoot");
  }
  const taskId = optionalId(value.taskId, "taskId");
  const graphId = optionalId(value.graphId, "graphId");
  const facts = {
    proposalId: nonEmpty(value.proposalId, "proposalId"),
    sessionId: nonEmpty(value.sessionId, "sessionId"),
    projectId: nonEmpty(value.projectId, "projectId"),
    root,
    ...(taskId !== undefined ? { taskId } : {}),
    ...(graphId !== undefined ? { graphId } : {}),
    mutationClass: oneOf(
      value.mutationClass,
      [NEUTRON_MUTATION_CLASS] as const,
      "mutationClass",
    ),
    plan: { ...plan, changedPaths },
  };
  const proposalDigest = assertNeutronMutationDigest(
    value.proposalDigest,
    "proposalDigest",
  );
  if (proposalDigest !== digestNeutronMutationProposal(facts)) {
    throw new Error("proposalDigest does not match bound proposal facts");
  }
  return {
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    ...facts,
    proposalDigest,
  };
}

export function validateNeutronMutationPreflightRequest(
  value: unknown,
): NeutronMutationPreflightRequest {
  if (!isObject(value)) {
    throw new Error("mutation preflight request must be an object");
  }
  if (value.schemaVersion !== NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation preflight request schema");
  }
  const proposal = validateNeutronMutationProposal(value.proposal);
  const approval = validateNeutronMutationApproval(value.approval);
  const currentProjectStateDigest = assertNeutronMutationDigest(
    value.currentProjectStateDigest,
    "currentProjectStateDigest",
  );
  const sessionState =
    value.sessionState === undefined
      ? undefined
      : oneOf(value.sessionState, NEUTRON_SESSION_STATES, "sessionState");
  return {
    schemaVersion: NEUTRON_MUTATION_PREFLIGHT_REQUEST_SCHEMA_URN,
    proposal,
    approval,
    currentProjectStateDigest,
    ...(sessionState !== undefined ? { sessionState } : {}),
  };
}

export function validateNeutronMutationPreflightResult(
  value: unknown,
): NeutronMutationPreflightResult {
  if (!isObject(value)) {
    throw new Error("mutation preflight result must be an object");
  }
  if (value.schemaVersion !== NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN) {
    throw new Error("unsupported neutron mutation preflight result schema");
  }
  const decision = oneOf(
    value.decision,
    NEUTRON_MUTATION_PREFLIGHT_DECISIONS,
    "decision",
  );
  if (!Array.isArray(value.reasons)) {
    throw new Error("reasons must be an array");
  }
  const reasons = value.reasons.map((reason, index) =>
    oneOf(
      reason,
      NEUTRON_MUTATION_PREFLIGHT_REJECTION_REASONS,
      `reasons[${String(index)}]`,
    ),
  );
  if (decision === "eligible" && reasons.length > 0) {
    throw new Error("eligible preflight result must not include reasons");
  }
  if (decision === "rejected" && reasons.length === 0) {
    throw new Error(
      "rejected preflight result must include structured reasons",
    );
  }
  return {
    schemaVersion: NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
    decision,
    reasons,
    proposalDigest: assertNeutronMutationDigest(
      value.proposalDigest,
      "proposalDigest",
    ),
    approvalId: nonEmpty(value.approvalId, "approvalId"),
  };
}
