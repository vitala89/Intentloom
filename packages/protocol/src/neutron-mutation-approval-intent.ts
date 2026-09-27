import { PROTOCOL_VERSION } from "./jsonrpc.js";

export const NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-approval-intent:1" as const;

/**
 * Human request that the trusted host consider issuing approval.
 * This literal is not authority. `approved: true` is not this value.
 */
export const NEUTRON_MUTATION_APPROVAL_INTENT_ACTION =
  "request-host-approval" as const;

export const NEUTRON_MUTATION_APPROVAL_INTENT_FIELDS = [
  "schemaVersion",
  "protocolVersion",
  "action",
  "root",
  "sessionId",
  "projectId",
  "graphId",
  "proposalId",
] as const;

/**
 * Caller-supplied authority. These keys are rejected, not ignored.
 * The host derives every binding from the authoritative review bundle.
 */
export const NEUTRON_MUTATION_APPROVAL_INTENT_AUTHORITY_KEYS = [
  "approvalToken",
  "approvalDigest",
  "approvalId",
  "proposalDigest",
  "reviewArtifactDigest",
  "projectStateDigest",
  "planDigest",
  "grantedApprovals",
  "approved",
  "authorized",
  "mutationAllowed",
  "files",
  "content",
  "paths",
  "changedPaths",
  "proposedContent",
  "currentContent",
  "previousContent",
  "expiresAt",
  "expiry",
  "approvalValidUntil",
  "approvedAt",
  "mutationClass",
  "approvingActor",
  "approvalSource",
  "filesToApply",
  "taskId",
] as const;

/**
 * Identifies the exact authoritative proposal a human asked the host to
 * approve. It carries no digests, bodies, tokens, expiry, or grant flags.
 * A valid intent is not itself a `NeutronMutationApproval`.
 */
export interface NeutronMutationApprovalIntent {
  readonly schemaVersion: typeof NEUTRON_MUTATION_APPROVAL_INTENT_SCHEMA_URN;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly action: typeof NEUTRON_MUTATION_APPROVAL_INTENT_ACTION;
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId: string;
  readonly proposalId: string;
}
