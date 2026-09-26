import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type { NeutronTaskNode } from "../../protocol/src/neutron-runtime.js";
import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
} from "../../protocol/src/neutron-mutation-review-view.js";
import type { NeutronSessionViewmodel } from "../../protocol/src/neutron-session-rpc.js";
import type { FileSystem } from "./index.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { IssueNeutronMutationApprovalResult } from "./neutron-mutation-approval-issue.js";

export interface NeutronSessionRuntimeOptions {
  readonly createAdapter: () => ModelAdapter | null;
  readonly fs?: FileSystem;
  readonly fingerprintProject?: (root: string) => Promise<string>;
  readonly now?: () => Date;
  readonly randomId?: () => string;
  readonly capabilities?: AgentRoleCapabilities;
  readonly sessionProposalCapabilities?: readonly string[];
  readonly profileProposalCapabilities?: readonly string[];
  readonly capabilityCeiling?: readonly string[];
}

export interface NeutronSessionRuntime {
  create(input: {
    readonly root: string;
    readonly projectId?: string;
  }): Promise<NeutronSessionViewmodel>;
  get(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
  }): NeutronSessionViewmodel;
  cancel(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
  }): Promise<NeutronSessionViewmodel>;
  executeTurn(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly prompt: string;
  }): Promise<NeutronSessionViewmodel>;
  getGraph(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly graphId?: string;
  }): Promise<NeutronSessionViewmodel>;
  executeGraph(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly nodes: readonly NeutronTaskNode[];
    readonly graphId?: string;
    readonly maxConcurrency?: number;
  }): Promise<NeutronSessionViewmodel>;
  cancelGraph(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly graphId?: string;
  }): Promise<NeutronSessionViewmodel>;
  listMutationReviews(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly graphId?: string;
  }): Promise<NeutronMutationReviewListResult>;
  getMutationReview(input: {
    readonly root: string;
    readonly sessionId: string;
    readonly projectId: string;
    readonly proposalId: string;
    readonly graphId?: string;
  }): Promise<NeutronMutationReviewGetResult>;
  /**
   * In-process host approval issuance. Not an RPC. The approval token stays
   * inside this process.
   */
  issueMutationApproval(
    intent: unknown,
  ): Promise<IssueNeutronMutationApprovalResult>;
  clear(): void;
}
