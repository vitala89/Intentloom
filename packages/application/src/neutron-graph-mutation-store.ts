import type { GeneratedFile } from "@intentloom/core";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationReviewArtifact } from "../../protocol/src/neutron-mutation-review-artifact.js";
import type { NeutronGraphMutationProposalEvidence } from "../../protocol/src/neutron-graph-mutation.js";
import { compareNeutronTaskIds } from "./neutron-scheduler-sort.js";

export interface NeutronGraphMutationReviewBundle {
  readonly evidence: NeutronGraphMutationProposalEvidence;
  readonly proposal: NeutronMutationProposal;
  readonly artifact: NeutronMutationReviewArtifact;
  readonly files: readonly GeneratedFile[];
}

export interface NeutronGraphMutationPayloadStore {
  put(bundle: NeutronGraphMutationReviewBundle): void;
  get(proposalId: string): NeutronGraphMutationReviewBundle | undefined;
  list(): readonly NeutronGraphMutationReviewBundle[];
}

export function createMemoryNeutronGraphMutationPayloadStore(): NeutronGraphMutationPayloadStore {
  const records = new Map<string, NeutronGraphMutationReviewBundle>();
  return {
    put(bundle) {
      records.set(bundle.evidence.proposalId, {
        artifact: bundle.artifact,
        evidence: bundle.evidence,
        files: Object.freeze([...bundle.files]),
        proposal: bundle.proposal,
      });
    },
    get(proposalId) {
      return records.get(proposalId);
    },
    list() {
      return [...records.values()].sort((left, right) => {
        const task = compareNeutronTaskIds(
          left.evidence.taskId,
          right.evidence.taskId,
        );
        if (task !== 0) return task;
        return left.evidence.attempt - right.evidence.attempt;
      });
    },
  };
}
