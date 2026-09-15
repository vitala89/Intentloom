import type { GeneratedFile } from "@intentloom/core";
import type { AgentRoleCapabilities } from "../../protocol/src/index.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronMutationAuthorizationInput } from "./neutron-mutation-authorization.js";
import type { NeutronMutationApprovalStore } from "./neutron-mutation-apply-store.js";
import type { FileSystem, TransactionStage } from "./index.js";
import type {
  NeutronGraphStaleBaseline,
  NeutronGraphStaleSnapshot,
} from "./neutron-scheduler-stale.js";

export interface NeutronMutationApplyInput {
  readonly proposal: unknown;
  readonly approval: unknown;
  readonly artifact: unknown;
  readonly files: readonly GeneratedFile[];
  readonly transactionId: string;
  readonly authorization: NeutronMutationAuthorizationInput;
  readonly fs: FileSystem;
  readonly now?: () => number;
  readonly signal?: AbortSignal;
  readonly session?: NeutronRuntimeSession;
  readonly actualRoot?: string;
  readonly evaluateProjectStateDigest?: (root: string) => Promise<string>;
  readonly graphStale?: {
    readonly baseline: NeutronGraphStaleBaseline;
    readonly current: NeutronGraphStaleSnapshot;
  };
  readonly store?: NeutronMutationApprovalStore;
  readonly failAt?: TransactionStage;
  readonly rollbackFailPaths?: readonly string[];
  readonly roleCapabilities?: AgentRoleCapabilities;
  readonly delegatedRole?: string;
}
