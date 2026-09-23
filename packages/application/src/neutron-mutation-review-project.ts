import { PROTOCOL_VERSION } from "../../protocol/src/jsonrpc.js";
import { NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN } from "../../protocol/src/neutron-mutation-review-view.js";
import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
  NeutronMutationReviewSummary,
  NeutronMutationReviewView,
} from "../../protocol/src/neutron-mutation-review-view.js";
import { NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN } from "../../protocol/src/neutron-mutation-review-view.js";
import { NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN } from "../../protocol/src/neutron-mutation-review-view.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import {
  validateNeutronMutationReviewGetResult,
  validateNeutronMutationReviewListResult,
} from "../../validator/src/neutron-mutation.js";
import { verifyMutationPayloadAgainstReviewArtifact } from "./neutron-mutation-review-payload.js";
import type { FileSystem } from "./index.js";
import type { NeutronGraphMutationPayloadStore } from "./neutron-graph-mutation-store.js";
import type { NeutronGraphMutationReviewBundle } from "./neutron-graph-mutation-store.js";
import {
  bindNeutronMutationReviewBundle,
  bindNeutronMutationReviewSession,
  type NeutronMutationReviewBinding,
} from "./neutron-mutation-review-bind.js";
import { evaluateNeutronMutationReviewCurrentness } from "./neutron-mutation-review-current.js";
import { projectNeutronMutationReviewFiles } from "./neutron-mutation-review-files.js";
import {
  emptyNeutronMutationReviewList,
  failedNeutronMutationReviewGet,
} from "./neutron-mutation-review-result.js";

export interface ProjectNeutronMutationReviewInput {
  readonly request: NeutronMutationReviewBinding;
  readonly session: NeutronRuntimeSession | undefined;
  readonly store: NeutronGraphMutationPayloadStore | undefined;
  readonly previewProposal?: NeutronMutationProposal | null;
  readonly previewSource?: "preview" | "authoritative" | "ambiguous" | null;
  readonly currentProjectFingerprint: string;
  readonly now: number;
  readonly fs: FileSystem;
}

export function listNeutronMutationReviews(
  input: ProjectNeutronMutationReviewInput,
): NeutronMutationReviewListResult {
  const bound = bindNeutronMutationReviewSession(input);
  if (bound !== undefined) return emptyNeutronMutationReviewList(bound);
  const session = input.session;
  if (session === undefined) {
    return emptyNeutronMutationReviewList("session-mismatch");
  }
  if (input.store === undefined) {
    return emptyNeutronMutationReviewList("ok");
  }
  const reviews: NeutronMutationReviewSummary[] = [];
  for (const bundle of input.store.list()) {
    if (bindNeutronMutationReviewBundle({ bundle, request: input.request })) {
      continue;
    }
    reviews.push(summarizeReviewBundle({ ...input, session }, bundle));
  }
  return validateNeutronMutationReviewListResult({
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_LIST_SCHEMA_URN,
    outcome: "ok",
    reviews,
  });
}

export async function getNeutronMutationReview(
  input: ProjectNeutronMutationReviewInput & { readonly proposalId: string },
): Promise<NeutronMutationReviewGetResult> {
  const bound = bindNeutronMutationReviewSession(input);
  if (bound !== undefined) return failedNeutronMutationReviewGet(bound);
  const session = input.session;
  if (session === undefined) {
    return failedNeutronMutationReviewGet("session-mismatch");
  }
  if (
    isPreviewProposalId(input, input.proposalId) &&
    input.store?.get(input.proposalId) === undefined
  ) {
    return failedNeutronMutationReviewGet("preview-not-authoritative");
  }
  if (input.store === undefined) {
    return failedNeutronMutationReviewGet("review-unavailable");
  }
  const bundle = input.store.get(input.proposalId);
  if (bundle === undefined) {
    return failedNeutronMutationReviewGet("proposal-not-found");
  }
  if (bundle.evidence.source !== "authoritative") {
    return failedNeutronMutationReviewGet("preview-not-authoritative");
  }
  const mismatch = bindNeutronMutationReviewBundle({
    bundle,
    request: input.request,
  });
  if (mismatch !== undefined) return failedNeutronMutationReviewGet(mismatch);
  const verified = verifyMutationPayloadAgainstReviewArtifact({
    artifact: bundle.artifact,
    files: bundle.files,
    root: input.request.root,
    artifactDigest: bundle.artifact.artifactDigest,
  });
  if (!verified.ok) return failedNeutronMutationReviewGet("payload-mismatch");
  const files = await projectNeutronMutationReviewFiles({
    files: bundle.files,
    fs: input.fs,
    root: input.request.root,
  });
  if (!files.ok) return failedNeutronMutationReviewGet(files.outcome);
  return validateNeutronMutationReviewGetResult({
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: NEUTRON_MUTATION_REVIEW_GET_SCHEMA_URN,
    outcome: "ok",
    review: buildReviewView({ ...input, session }, bundle, files.files),
  });
}

function summarizeReviewBundle(
  input: ProjectNeutronMutationReviewInput & {
    readonly session: NeutronRuntimeSession;
  },
  bundle: NeutronGraphMutationReviewBundle,
): NeutronMutationReviewSummary {
  return {
    proposalId: bundle.evidence.proposalId,
    proposalDigest: bundle.proposal.proposalDigest,
    planDigest: bundle.proposal.plan.planDigest,
    reviewArtifactDigest: bundle.artifact.artifactDigest,
    projectStateDigest: bundle.proposal.plan.projectStateDigest,
    mutationClass: bundle.proposal.mutationClass,
    graphId: bundle.evidence.graphId,
    taskId: bundle.evidence.taskId,
    attempt: bundle.evidence.attempt,
    changedPathCount: bundle.artifact.changedPaths.length,
    currentness: evaluateNeutronMutationReviewCurrentness({
      bundle,
      currentProjectFingerprint: input.currentProjectFingerprint,
      now: input.now,
      session: input.session,
    }),
    ...(bundle.proposal.plan.expiresAt === undefined
      ? {}
      : { expiresAt: bundle.proposal.plan.expiresAt }),
  };
}

function buildReviewView(
  input: ProjectNeutronMutationReviewInput & {
    readonly session: NeutronRuntimeSession;
  },
  bundle: NeutronGraphMutationReviewBundle,
  files: NeutronMutationReviewView["files"],
): NeutronMutationReviewView {
  return {
    schemaVersion: NEUTRON_MUTATION_REVIEW_VIEW_SCHEMA_URN,
    sessionId: bundle.proposal.sessionId,
    projectId: bundle.proposal.projectId,
    root: bundle.proposal.root,
    graphId: bundle.evidence.graphId,
    taskId: bundle.evidence.taskId,
    attempt: bundle.evidence.attempt,
    proposalId: bundle.proposal.proposalId,
    proposalDigest: bundle.proposal.proposalDigest,
    planDigest: bundle.proposal.plan.planDigest,
    reviewArtifactDigest: bundle.artifact.artifactDigest,
    projectStateDigest: bundle.proposal.plan.projectStateDigest,
    mutationClass: bundle.proposal.mutationClass,
    currentness: evaluateNeutronMutationReviewCurrentness({
      bundle,
      currentProjectFingerprint: input.currentProjectFingerprint,
      now: input.now,
      session: input.session,
    }),
    files,
    ...(bundle.proposal.plan.expiresAt === undefined
      ? {}
      : { expiresAt: bundle.proposal.plan.expiresAt }),
  };
}

function isPreviewProposalId(
  input: ProjectNeutronMutationReviewInput,
  proposalId: string,
): boolean {
  return (
    input.previewSource === "preview" &&
    input.previewProposal?.proposalId === proposalId
  );
}
