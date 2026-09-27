import { NEUTRON_MUTATION_CLASS } from "../../protocol/src/neutron-mutation.js";
import type { NeutronMutationReviewOutcome } from "../../protocol/src/neutron-mutation-review-view.js";
import type { NeutronMutationApprovalIntent } from "../../protocol/src/neutron-mutation-approval-intent.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import { digestNeutronMutationProposal } from "../../validator/src/neutron-mutation-digest.js";
import { assertCanonicalContentBoundPlanDigest } from "../../validator/src/neutron-mutation-review-artifact.js";
import { exactNeutronMutationPathSetsEqual } from "../../validator/src/neutron-mutation-path-set.js";
import {
  bindNeutronMutationReviewBundle,
  bindNeutronMutationReviewSession,
} from "./neutron-mutation-review-bind.js";
import { evaluateNeutronMutationReviewCurrentness } from "./neutron-mutation-review-current.js";
import { verifyMutationPayloadAgainstReviewArtifact } from "./neutron-mutation-review-payload.js";
import type { NeutronGraphMutationReviewBundle } from "./neutron-graph-mutation-store.js";
import { detectNeutronGraphStaleness } from "./neutron-scheduler-stale.js";
import type {
  EligibleReviewBundle,
  IssueNeutronMutationApprovalInput,
  NeutronMutationApprovalIssueOutcome,
} from "./neutron-mutation-approval-issue-types.js";

const BIND_OUTCOMES = [
  "session-mismatch",
  "root-mismatch",
  "project-mismatch",
  "graph-mismatch",
] as const;

export function resolveEligibleReviewBundle(
  input: IssueNeutronMutationApprovalInput,
  intent: NeutronMutationApprovalIntent,
): EligibleReviewBundle {
  const bound = bindNeutronMutationReviewSession({
    request: intent,
    session: input.session,
  });
  if (bound !== undefined) return { ok: false, outcome: bindOutcome(bound) };
  const loaded = loadAuthoritativeBundle(input, intent);
  if (!loaded.ok) return loaded;
  const mismatch = bindNeutronMutationReviewBundle({
    bundle: loaded.bundle,
    request: intent,
  });
  if (mismatch !== undefined) {
    return { ok: false, outcome: bindOutcome(mismatch) };
  }
  return acceptCurrentBundle(input, loaded.bundle);
}

function loadAuthoritativeBundle(
  input: IssueNeutronMutationApprovalInput,
  intent: NeutronMutationApprovalIntent,
): EligibleReviewBundle {
  if (isPreviewOnly(input, intent.proposalId)) {
    return { ok: false, outcome: "preview-not-authoritative" };
  }
  if (input.store === undefined) {
    return { ok: false, outcome: "review-unavailable" };
  }
  const bundle = input.store.get(intent.proposalId);
  if (bundle === undefined) return { ok: false, outcome: "proposal-not-found" };
  if (bundle.evidence.source !== "authoritative") {
    return { ok: false, outcome: "preview-not-authoritative" };
  }
  return { ok: true, bundle };
}

function acceptCurrentBundle(
  input: IssueNeutronMutationApprovalInput,
  bundle: NeutronGraphMutationReviewBundle,
): EligibleReviewBundle {
  const session = input.session;
  if (session === undefined) return { ok: false, outcome: "session-mismatch" };
  if (!payloadMatchesArtifact(bundle, session.root)) {
    return { ok: false, outcome: "payload-mismatch" };
  }
  const currentness = evaluateNeutronMutationReviewCurrentness({
    bundle,
    currentProjectFingerprint: input.currentProjectFingerprint,
    now: input.now,
    session,
  });
  if (currentness !== "current") return { ok: false, outcome: currentness };
  if (!sessionMayReceiveApproval(session) || !clockIsUsable(input.now)) {
    return { ok: false, outcome: "not-eligible" };
  }
  if (graphBaselineRejected(input))
    return { ok: false, outcome: "graph-stale" };
  if (!authoritativeFactsAlign(bundle)) {
    return { ok: false, outcome: "not-eligible" };
  }
  return { ok: true, bundle };
}

function isPreviewOnly(
  input: IssueNeutronMutationApprovalInput,
  proposalId: string,
): boolean {
  return (
    input.previewSource === "preview" &&
    input.previewProposal?.proposalId === proposalId &&
    input.store?.get(proposalId) === undefined
  );
}

function payloadMatchesArtifact(
  bundle: NeutronGraphMutationReviewBundle,
  root: string,
): boolean {
  return verifyMutationPayloadAgainstReviewArtifact({
    artifact: bundle.artifact,
    artifactDigest: bundle.artifact.artifactDigest,
    files: bundle.files,
    root,
  }).ok;
}

function sessionMayReceiveApproval(session: NeutronRuntimeSession): boolean {
  if (session.mutationAllowed !== false) return false;
  return (
    session.state === "created" ||
    session.state === "discussing" ||
    session.state === "inspecting" ||
    session.state === "planning" ||
    session.state === "completed"
  );
}

function graphBaselineRejected(
  input: IssueNeutronMutationApprovalInput,
): boolean {
  if (input.graphStale === undefined) return false;
  return !detectNeutronGraphStaleness(input.graphStale).accepted;
}

function clockIsUsable(now: number): boolean {
  return Number.isInteger(now) && now >= 0;
}

function authoritativeFactsAlign(
  bundle: NeutronGraphMutationReviewBundle,
): boolean {
  return (
    identitiesAlign(bundle) &&
    digestsAlign(bundle) &&
    pathsAlign(bundle) &&
    planDigestAligns(bundle)
  );
}

function identitiesAlign(bundle: NeutronGraphMutationReviewBundle): boolean {
  const { artifact, evidence, proposal } = bundle;
  return (
    proposal.proposalId === artifact.proposalId &&
    proposal.proposalId === evidence.proposalId &&
    proposal.mutationClass === NEUTRON_MUTATION_CLASS &&
    proposal.mutationClass === artifact.mutationClass &&
    proposal.sessionId === artifact.sessionId &&
    proposal.projectId === artifact.projectId &&
    proposal.root === artifact.root &&
    proposal.taskId === artifact.taskId &&
    proposal.taskId === evidence.taskId &&
    proposal.graphId === artifact.graphId &&
    proposal.graphId === evidence.graphId
  );
}

function digestsAlign(bundle: NeutronGraphMutationReviewBundle): boolean {
  const { artifact, evidence, proposal } = bundle;
  return (
    proposal.proposalDigest === evidence.proposalDigest &&
    proposal.proposalDigest === digestNeutronMutationProposal(proposal) &&
    proposal.plan.planDigest === artifact.planDigest &&
    proposal.plan.planDigest === evidence.planDigest &&
    artifact.artifactDigest === evidence.reviewArtifactDigest &&
    proposal.plan.projectStateDigest === artifact.projectStateDigest
  );
}

function pathsAlign(bundle: NeutronGraphMutationReviewBundle): boolean {
  return exactNeutronMutationPathSetsEqual(
    bundle.artifact.changedPaths,
    bundle.proposal.plan.changedPaths,
  );
}

function planDigestAligns(bundle: NeutronGraphMutationReviewBundle): boolean {
  try {
    assertCanonicalContentBoundPlanDigest(
      bundle.proposal.plan.planDigest,
      bundle.artifact.fileBindings,
      bundle.artifact.projectStateDigest,
      bundle.proposal.plan.targetRoot,
    );
    return true;
  } catch {
    return false;
  }
}

function bindOutcome(
  value: NeutronMutationReviewOutcome,
): NeutronMutationApprovalIssueOutcome {
  if ((BIND_OUTCOMES as readonly string[]).includes(value)) {
    return value as NeutronMutationApprovalIssueOutcome;
  }
  return "not-eligible";
}
