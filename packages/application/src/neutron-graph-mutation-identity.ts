import { checksum, type GeneratedFile } from "@intentloom/core";
import type { NeutronMutationProposalCandidateFile } from "../../protocol/src/neutron-mutation-proposal-candidate.js";
import {
  canonicalNeutronMutationJson,
  neutronMutationContentDigest,
} from "../../validator/src/neutron-mutation-canonical.js";

export function generatedFilesFromCandidate(
  files: readonly NeutronMutationProposalCandidateFile[],
): readonly GeneratedFile[] {
  return files.map((file) => ({
    path: file.path,
    content: file.content,
    sources: [...(file.sources ?? ["neutron-mutation-proposal-candidate"])],
    checksum: checksum(file.content),
  }));
}

export function hostNeutronGraphMutationProposalId(input: {
  readonly graphId: string;
  readonly taskId: string;
  readonly attempt: number;
  readonly outputDigest: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly root: string;
}): string {
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      kind: "neutron-graph-mutation-proposal-id",
      attempt: input.attempt,
      graphId: input.graphId,
      outputDigest: input.outputDigest,
      projectId: input.projectId,
      root: input.root,
      sessionId: input.sessionId,
      taskId: input.taskId,
    }),
  );
}

export function hostNeutronGraphMutationArtifactId(proposalId: string): string {
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      kind: "neutron-graph-mutation-artifact-id",
      proposalId,
    }),
  );
}

export function hostNeutronGraphMutationTransactionId(
  proposalId: string,
): string {
  return neutronMutationContentDigest(
    canonicalNeutronMutationJson({
      kind: "neutron-graph-mutation-transaction-id",
      proposalId,
    }),
  );
}
