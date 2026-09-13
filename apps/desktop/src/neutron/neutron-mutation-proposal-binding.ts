import type { NeutronGraphSnapshot } from "@intentloom/protocol";
import type { NeutronMutationProposal } from "@intentloom/protocol/neutron-session";
import type { NeutronRuntimeSession } from "@intentloom/protocol";
import { DesktopBridgeError } from "../desktop-client.js";

export function assertNeutronMutationProposalBinding(input: {
  readonly session: Pick<
    NeutronRuntimeSession,
    "sessionId" | "projectId" | "root"
  >;
  readonly proposal: NeutronMutationProposal;
  readonly graphSnapshot: NeutronGraphSnapshot | null;
}): void {
  const { session, proposal } = input;
  if (proposal.sessionId !== session.sessionId) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal sessionId must match the current session",
      "bounded_validation_failed",
    );
  }
  if (proposal.projectId !== session.projectId) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal projectId must match the current session",
      "bounded_validation_failed",
    );
  }
  if (proposal.root !== session.root) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal root must match the current session",
      "bounded_validation_failed",
    );
  }
  if (
    input.graphSnapshot !== null &&
    proposal.graphId !== undefined &&
    proposal.graphId !== input.graphSnapshot.graphId
  ) {
    throw new DesktopBridgeError(
      "Neutron mutation proposal graphId must match the current graph snapshot",
      "bounded_validation_failed",
    );
  }
}
