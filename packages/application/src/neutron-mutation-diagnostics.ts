import {
  NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
  type NeutronMutationPreflightRejectionReason,
  type NeutronMutationPreflightResult,
} from "../../protocol/src/neutron-mutation.js";
import { validateNeutronMutationPreflightResult } from "../../validator/src/neutron-mutation.js";

export interface NeutronMutationPreflightDiagnostics {
  readonly affectedPaths: readonly string[];
  readonly capabilityClass: "host" | "denied";
  readonly checkedAt: number;
}

export interface NeutronMutationPreflightOutcome {
  readonly result: NeutronMutationPreflightResult;
  readonly diagnostics: NeutronMutationPreflightDiagnostics;
}

export function buildNeutronMutationPreflightOutcome(input: {
  readonly decision: "eligible" | "rejected";
  readonly reasons: readonly NeutronMutationPreflightRejectionReason[];
  readonly proposalDigest: string;
  readonly approvalId: string;
  readonly affectedPaths: readonly string[];
  readonly capabilityClass: "host" | "denied";
  readonly checkedAt: number;
}): NeutronMutationPreflightOutcome {
  const result = validateNeutronMutationPreflightResult({
    schemaVersion: NEUTRON_MUTATION_PREFLIGHT_RESULT_SCHEMA_URN,
    decision: input.decision,
    reasons: input.reasons,
    proposalDigest: input.proposalDigest,
    approvalId: input.approvalId,
  });
  const diagnostics: NeutronMutationPreflightDiagnostics = {
    affectedPaths: input.affectedPaths,
    capabilityClass: input.capabilityClass,
    checkedAt: input.checkedAt,
  };
  return { result, diagnostics };
}

export function neutronMutationOutcomeLeaksToken(
  outcome: NeutronMutationPreflightOutcome,
  approvalToken: string,
): boolean {
  if (approvalToken.length === 0) return false;
  return JSON.stringify(outcome).includes(approvalToken);
}
