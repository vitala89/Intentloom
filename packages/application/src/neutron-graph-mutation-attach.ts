import type { NeutronGraphMutationApplyEvidence } from "../../protocol/src/neutron-graph-mutation.js";
import type { NeutronGraphMutationProposalEvidence } from "../../protocol/src/neutron-graph-mutation.js";
import { digestGraphMutationEvidence } from "./neutron-graph-mutation-evidence.js";
import { digestNeutronGraphExecution } from "./neutron-scheduler-graph-result.js";
import type { NeutronGraphExecutionResult } from "./neutron-scheduler-graph-result.js";
import { sortNeutronTaskIds } from "./neutron-scheduler-sort.js";

export function attachNeutronGraphMutationEvidence(
  result: NeutronGraphExecutionResult,
  input: {
    readonly proposals?: readonly NeutronGraphMutationProposalEvidence[];
    readonly applyOutcomes?: readonly NeutronGraphMutationApplyEvidence[];
  },
): NeutronGraphExecutionResult {
  const mutationProposals = sortProposals(input.proposals ?? []);
  const mutationOutcomes = sortApplyOutcomes(input.applyOutcomes ?? []);
  const pendingReviewCount = mutationProposals.filter(
    (item) => item.reviewRequired,
  ).length;
  const next: NeutronGraphExecutionResult = {
    ...result,
    mutationOutcomes,
    mutationProposalEvidenceDigest:
      mutationProposals.length === 0
        ? null
        : digestGraphMutationEvidence({
            kind: "neutron-graph-mutation-proposal-evidence-digest",
            digests: mutationProposals.map((item) => item.evidenceDigest),
          }),
    mutationProposals,
    pendingReviewCount,
  };
  return {
    ...next,
    digest: digestNeutronGraphExecution({
      graphId: next.graphId,
      nodes: next.nodes,
      session: {
        projectId: next.projectId,
        root: next.root,
        sessionId: next.sessionId,
      },
      stale: next.stale,
      status: next.status,
      usage: next.usage,
      mutationProposals: next.mutationProposals,
      mutationOutcomes: next.mutationOutcomes,
    }),
  };
}

function sortProposals(
  proposals: readonly NeutronGraphMutationProposalEvidence[],
): readonly NeutronGraphMutationProposalEvidence[] {
  const taskOrder = sortNeutronTaskIds(proposals.map((item) => item.taskId));
  return [...proposals].sort((left, right) => {
    const task =
      taskOrder.indexOf(left.taskId) - taskOrder.indexOf(right.taskId);
    if (task !== 0) return task;
    return left.attempt - right.attempt;
  });
}

function sortApplyOutcomes(
  outcomes: readonly NeutronGraphMutationApplyEvidence[],
): readonly NeutronGraphMutationApplyEvidence[] {
  const taskOrder = sortNeutronTaskIds(outcomes.map((item) => item.taskId));
  return [...outcomes].sort((left, right) => {
    const task =
      taskOrder.indexOf(left.taskId) - taskOrder.indexOf(right.taskId);
    if (task !== 0) return task;
    return left.attempt - right.attempt;
  });
}
