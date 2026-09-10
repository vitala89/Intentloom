import type { NeutronMutationClass } from "./neutron-mutation.js";

export const NEUTRON_MUTATION_APPROVAL_SCHEMA_URN =
  "urn:intentloom:schema:neutron-mutation-approval:1" as const;

export const NEUTRON_MUTATION_APPROVAL_SOURCE = "local-interactive" as const;
export type NeutronMutationApprovalSource =
  typeof NEUTRON_MUTATION_APPROVAL_SOURCE;

/**
 * Host-issued bound approval. Model/tool JSON cannot become this record by
 * setting `approved: true` or `grantedApprovals`. Token format follows
 * adoption: `approved:<proposalDigest>`. Digest covers the unsigned facts.
 */
export interface NeutronMutationApproval {
  readonly schemaVersion: typeof NEUTRON_MUTATION_APPROVAL_SCHEMA_URN;
  readonly approvalId: string;
  readonly approvalDigest: string;
  readonly approvalToken: string;
  readonly approvalSource: NeutronMutationApprovalSource;
  readonly approvingActor: string;
  readonly root: string;
  readonly projectId: string;
  readonly sessionId: string;
  readonly taskId?: string;
  readonly graphId?: string;
  readonly proposalId: string;
  readonly proposalDigest: string;
  readonly planDigest: string;
  readonly projectStateDigest: string;
  readonly changedPaths: readonly string[];
  readonly mutationClass: NeutronMutationClass;
  readonly approvedAt: number;
  readonly approvalValidUntil: number;
}
