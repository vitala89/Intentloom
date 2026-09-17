import type { NeutronGraphMutationApplyEvidence } from "../../protocol/src/neutron-graph-mutation.js";
import type { NeutronMutationApplyResult } from "../../protocol/src/neutron-mutation-apply.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { applyApprovedNeutronMutation } from "./neutron-mutation-apply.js";
import type { NeutronMutationApplyInput } from "./neutron-mutation-apply-types.js";
import { buildNeutronGraphMutationApplyEvidence } from "./neutron-graph-mutation-evidence.js";
import type { NeutronGraphMutationPayloadStore } from "./neutron-graph-mutation-store.js";
import {
  detectNeutronGraphStaleness,
  type NeutronGraphStaleBaseline,
  type NeutronGraphStaleReport,
  type NeutronGraphStaleSnapshot,
} from "./neutron-scheduler-stale.js";

export type NeutronGraphMutationApplyFailureCode =
  | "preview-not-authoritative"
  | "proposal-not-found"
  | "graph-stale"
  | "cancelled-before-write";

export interface ApplyApprovedNeutronGraphMutationInput {
  readonly proposalId: string;
  readonly store: NeutronGraphMutationPayloadStore;
  readonly approval: unknown;
  readonly session: NeutronRuntimeSession;
  readonly graphStale: {
    readonly baseline: NeutronGraphStaleBaseline;
    readonly current: NeutronGraphStaleSnapshot;
  };
  readonly apply: Omit<
    NeutronMutationApplyInput,
    "proposal" | "artifact" | "files" | "approval" | "transactionId"
  >;
}

export interface ApplyApprovedNeutronGraphMutationResult {
  readonly applied: boolean;
  readonly stale: NeutronGraphStaleReport;
  readonly failureCode?:
    | NeutronGraphMutationApplyFailureCode
    | NeutronMutationApplyResult["failureCode"];
  readonly apply?: NeutronMutationApplyResult;
  readonly evidence?: NeutronGraphMutationApplyEvidence;
  readonly diagnostics: readonly string[];
}

export async function applyApprovedNeutronGraphMutation(
  input: ApplyApprovedNeutronGraphMutationInput,
): Promise<ApplyApprovedNeutronGraphMutationResult> {
  if (input.apply.signal?.aborted === true) {
    return rejected("cancelled-before-write", emptyStale());
  }
  const bundle = input.store.get(input.proposalId);
  if (bundle === undefined) {
    return rejected("proposal-not-found", emptyStale());
  }
  if (bundle.evidence.source !== "authoritative") {
    return rejected("preview-not-authoritative", emptyStale());
  }
  const stale = detectNeutronGraphStaleness(input.graphStale);
  if (!stale.accepted) {
    return rejected("graph-stale", stale);
  }
  const apply = await applyApprovedNeutronMutation({
    ...input.apply,
    approval: input.approval,
    artifact: bundle.artifact,
    files: bundle.files,
    graphStale: input.graphStale,
    proposal: bundle.proposal,
    session: input.session,
    transactionId: bundle.artifact.transactionId,
  });
  return {
    applied: apply.applied,
    apply,
    diagnostics: apply.diagnostics,
    evidence: buildNeutronGraphMutationApplyEvidence({
      apply,
      proposalEvidence: bundle.evidence,
    }),
    ...(apply.failureCode === undefined
      ? {}
      : { failureCode: apply.failureCode }),
    stale,
  };
}

function rejected(
  failureCode: NeutronGraphMutationApplyFailureCode,
  stale: NeutronGraphStaleReport,
): ApplyApprovedNeutronGraphMutationResult {
  return {
    applied: false,
    diagnostics: [failureCode],
    failureCode,
    stale,
  };
}

function emptyStale(): NeutronGraphStaleReport {
  return {
    accepted: true,
    kinds: [],
    mismatches: [],
    rerunAttempted: false,
  };
}
