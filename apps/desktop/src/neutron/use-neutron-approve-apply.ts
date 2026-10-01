import { useState } from "react";
import type { NeutronMutationApproveAndApplyResult } from "@intentloom/protocol";
import { desktopClient } from "../desktop-client.js";
import type { NeutronMutationReviewScope } from "./neutron-mutation-review-state.js";

export interface NeutronApproveApplyPort {
  approveAndApplyNeutronMutation(
    root: string,
    sessionId: string,
    projectId: string,
    graphId: string,
    proposalId: string,
    signal?: AbortSignal,
  ): Promise<NeutronMutationApproveAndApplyResult>;
}

export function useNeutronApproveApply(input: {
  readonly scope: NeutronMutationReviewScope;
  readonly proposalId: string;
  readonly graphId: string;
  readonly port?: NeutronApproveApplyPort;
}) {
  const [pending, setPending] = useState(false);
  const [settledProposalId, setSettledProposalId] = useState<string | null>(
    null,
  );
  const [result, setResult] =
    useState<NeutronMutationApproveAndApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const settled = settledProposalId === input.proposalId;
  async function submit(): Promise<void> {
    if (pending || settled) return;
    setPending(true);
    setError(null);
    try {
      const port = input.port ?? desktopClient;
      const next = await port.approveAndApplyNeutronMutation(
        input.scope.root,
        input.scope.sessionId,
        input.scope.projectId,
        input.graphId,
        input.proposalId,
      );
      setResult(next);
      setSettledProposalId(input.proposalId);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Host request failed.",
      );
      setSettledProposalId(input.proposalId);
    } finally {
      setPending(false);
    }
  }
  return { error, pending, result: settled ? result : null, settled, submit };
}
