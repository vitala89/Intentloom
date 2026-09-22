import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronMutationReviewCurrentness } from "../../protocol/src/neutron-mutation-review-view.js";
import { neutronGraphMutationProjectStateDigest } from "./neutron-graph-mutation-current.js";
import type { NeutronGraphMutationReviewBundle } from "./neutron-graph-mutation-store.js";

export function evaluateNeutronMutationReviewCurrentness(input: {
  readonly session: NeutronRuntimeSession;
  readonly bundle: NeutronGraphMutationReviewBundle;
  readonly currentProjectFingerprint: string;
  readonly now: number;
}): NeutronMutationReviewCurrentness {
  if (input.session.state === "cancelled") return "cancelled";
  const expiresAt = input.bundle.proposal.plan.expiresAt;
  if (expiresAt !== undefined && input.now >= expiresAt) return "expired";
  const expected = input.bundle.proposal.plan.projectStateDigest;
  const current = neutronGraphMutationProjectStateDigest(
    input.currentProjectFingerprint,
  );
  if (expected !== current) return "stale";
  if (input.bundle.artifact.projectStateDigest !== current) return "stale";
  return "current";
}
