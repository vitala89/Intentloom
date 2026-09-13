import {
  NEUTRON_MUTATION_CLASS,
  NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
  type NeutronMutationProposal,
} from "../../protocol/src/neutron-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronTaskNode } from "../../protocol/src/neutron-runtime.js";
import {
  digestNeutronMutationProposal,
  validateNeutronMutationProposal,
} from "../../validator/src/neutron-mutation.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";

export const NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX =
  "urn:intentloom:structured:neutron-mutation-proposal:v1:" as const;

export interface NeutronStructuredMutationProposalSeed {
  readonly proposalId: string;
  readonly planDigest: string;
  readonly projectStateDigest: string;
  readonly changedPaths: readonly string[];
  readonly expiresAt: number;
}

export function resolveNeutronSessionMutationProposal(
  stored: StoredNeutronSession,
): NeutronMutationProposal | null {
  return stored.mutationProposal ?? null;
}

export function resolveNeutronMutationProposalFromGraphNodes(input: {
  readonly session: NeutronRuntimeSession;
  readonly graphId: string;
  readonly nodes: readonly NeutronTaskNode[];
}): NeutronMutationProposal | null {
  for (const node of input.nodes) {
    if (node.role !== "feature-builder") continue;
    const proposal = bindStructuredNeutronMutationProposal({
      expectedOutput: node.expectedOutput,
      graphId: input.graphId,
      session: input.session,
      taskId: node.taskId,
    });
    if (proposal !== null) return proposal;
  }
  return null;
}

export function bindStructuredNeutronMutationProposal(input: {
  readonly expectedOutput: string;
  readonly session: NeutronRuntimeSession;
  readonly graphId: string;
  readonly taskId: string;
}): NeutronMutationProposal | null {
  if (
    !input.expectedOutput.startsWith(
      NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX,
    )
  ) {
    return null;
  }
  const payload = input.expectedOutput.slice(
    NEUTRON_STRUCTURED_MUTATION_PROPOSAL_PREFIX.length,
  );
  let seed: NeutronStructuredMutationProposalSeed;
  try {
    seed = JSON.parse(payload) as NeutronStructuredMutationProposalSeed;
  } catch {
    return null;
  }
  if (
    typeof seed.proposalId !== "string" ||
    typeof seed.planDigest !== "string" ||
    typeof seed.projectStateDigest !== "string" ||
    !Array.isArray(seed.changedPaths) ||
    typeof seed.expiresAt !== "number"
  ) {
    return null;
  }
  const root = input.session.root;
  const facts = {
    proposalId: seed.proposalId,
    sessionId: input.session.sessionId,
    projectId: input.session.projectId,
    root,
    taskId: input.taskId,
    graphId: input.graphId,
    mutationClass: NEUTRON_MUTATION_CLASS,
    plan: {
      schemaVersion: 1 as const,
      planDigest: seed.planDigest,
      projectStateDigest: seed.projectStateDigest,
      targetRoot: root,
      changedPaths: [...seed.changedPaths],
      expiresAt: seed.expiresAt,
    },
  };
  const proposalDigest = digestNeutronMutationProposal(facts);
  return validateNeutronMutationProposal({
    schemaVersion: NEUTRON_MUTATION_PROPOSAL_SCHEMA_URN,
    ...facts,
    proposalDigest,
  });
}
