import { NEUTRON_MUTATION_CLASS } from "../../protocol/src/neutron-mutation.js";
import { NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN } from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import {
  digestContentBoundApplyPlan,
  digestGeneratedFileContent,
  digestNeutronMutationProposal,
  materializeNeutronMutationReviewArtifact,
  validateNeutronMutationProposal,
} from "../../validator/src/neutron-mutation.js";
import { canonicalizeNeutronMutationPaths } from "../../validator/src/neutron-mutation-canonical.js";
import {
  assertNeutronGraphMutationMaterializationCurrent,
  neutronGraphMutationProjectStateDigest,
} from "./neutron-graph-mutation-current.js";
import { buildNeutronGraphMutationProposalEvidence } from "./neutron-graph-mutation-evidence.js";
import type { NeutronGraphStaleReport } from "./neutron-scheduler-stale.js";
import {
  generatedFilesFromCandidate,
  hostNeutronGraphMutationArtifactId,
  hostNeutronGraphMutationProposalId,
  hostNeutronGraphMutationTransactionId,
} from "./neutron-graph-mutation-identity.js";
import type { NeutronGraphMutationCandidateRecord } from "./neutron-graph-mutation-collect.js";
import type {
  NeutronGraphMutationPayloadStore,
  NeutronGraphMutationReviewBundle,
} from "./neutron-graph-mutation-store.js";

export interface MaterializeNeutronGraphMutationReviewInput {
  readonly session: NeutronRuntimeSession;
  readonly record: NeutronGraphMutationCandidateRecord;
  readonly currentProjectFingerprint: string;
  readonly stale?: NeutronGraphStaleReport | null;
  readonly now: () => number;
  readonly store: NeutronGraphMutationPayloadStore;
  readonly expiresAt?: number;
}

export function materializeNeutronGraphMutationReview(
  input: MaterializeNeutronGraphMutationReviewInput,
): NeutronGraphMutationReviewBundle {
  const execution = input.record.execution;
  if (
    execution.projectFingerprintBefore !== execution.projectFingerprintAfter
  ) {
    throw new Error("proposal generation must not mutate project files");
  }
  if (execution.subagent.mutationAttempted !== false) {
    throw new Error("proposal generation must not set mutationAttempted");
  }
  assertNeutronGraphMutationMaterializationCurrent({
    attemptFingerprint: execution.projectFingerprintAfter,
    currentFingerprint: input.currentProjectFingerprint,
    stale: input.stale ?? null,
  });
  const files = generatedFilesFromCandidate(input.record.candidate.files);
  const proposal = hostProposal(input, files);
  const artifact = materializeNeutronMutationReviewArtifact({
    proposal,
    files,
    artifactId: hostNeutronGraphMutationArtifactId(proposal.proposalId),
    transactionId: hostNeutronGraphMutationTransactionId(proposal.proposalId),
  });
  const bundle: NeutronGraphMutationReviewBundle = {
    artifact,
    evidence: buildNeutronGraphMutationProposalEvidence({
      proposal,
      artifact,
      graphId: input.record.graphId,
      taskId: input.record.taskId,
      attempt: input.record.attempt,
      outputDigest: input.record.outputDigest,
      materializedAt: input.now(),
    }),
    files,
    proposal,
  };
  input.store.put(bundle);
  return bundle;
}

function hostProposal(
  input: MaterializeNeutronGraphMutationReviewInput,
  files: ReturnType<typeof generatedFilesFromCandidate>,
): NeutronMutationProposal {
  const changedPaths = canonicalizeNeutronMutationPaths(
    files.map((file) => file.path),
    "candidate.files",
  );
  const fileBindings = files.map((file) => ({
    path: file.path,
    contentDigest: digestGeneratedFileContent(file.content),
  }));
  const planDigest = digestContentBoundApplyPlan({
    projectStateDigest: neutronGraphMutationProjectStateDigest(
      input.record.execution.projectFingerprintAfter,
    ),
    targetRoot: input.session.root,
    fileBindings,
  });
  const proposalId = hostNeutronGraphMutationProposalId({
    graphId: input.record.graphId,
    taskId: input.record.taskId,
    attempt: input.record.attempt,
    outputDigest: input.record.outputDigest,
    sessionId: input.session.sessionId,
    projectId: input.session.projectId,
    root: input.session.root,
  });
  const facts = {
    proposalId,
    sessionId: input.session.sessionId,
    projectId: input.session.projectId,
    root: input.session.root,
    taskId: input.record.taskId,
    graphId: input.record.graphId,
    mutationClass: NEUTRON_MUTATION_CLASS,
    plan: {
      schemaVersion: 1 as const,
      planDigest,
      projectStateDigest: neutronGraphMutationProjectStateDigest(
        input.record.execution.projectFingerprintAfter,
      ),
      targetRoot: input.session.root,
      changedPaths: [...changedPaths],
      ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
    },
  };
  return validateNeutronMutationProposal({
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    ...facts,
    proposalDigest: digestNeutronMutationProposal(facts),
  });
}
