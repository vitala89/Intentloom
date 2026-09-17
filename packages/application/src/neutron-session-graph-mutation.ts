import { attachNeutronGraphMutationEvidence } from "./neutron-graph-mutation-attach.js";
import { collectNeutronGraphMutationCandidates } from "./neutron-graph-mutation-collect.js";
import { materializeNeutronGraphMutationReview } from "./neutron-graph-mutation-materialize.js";
import {
  createMemoryNeutronGraphMutationPayloadStore,
  type NeutronGraphMutationPayloadStore,
} from "./neutron-graph-mutation-store.js";
import { NEUTRON_MUTATION_PROPOSAL_CAPABILITY } from "./neutron-mutation-proposal-capability.js";
import type { NeutronGraphExecutionResult } from "./neutron-scheduler-graph-result.js";
import type { NeutronReadyNodeOutcome } from "./neutron-scheduler-wave-types.js";
import { selectSessionMutationProposal } from "./neutron-session-mutation-proposal.js";
import type { NeutronMutationProposal } from "../../protocol/src/neutron-mutation.js";
import type { NeutronRuntimeSession } from "../../protocol/src/neutron-runtime.js";
import type { NeutronTaskGraph } from "../../protocol/src/neutron-runtime.js";
import type { StoredNeutronSession } from "./neutron-session-turn.js";

export interface MaterializeStoredGraphMutationProposalsInput {
  readonly session: NeutronRuntimeSession;
  readonly graph: NeutronTaskGraph;
  readonly graphId: string;
  readonly outcomes: readonly NeutronReadyNodeOutcome[];
  readonly result: NeutronGraphExecutionResult;
  readonly store: NeutronGraphMutationPayloadStore;
  readonly projectStateDigest: string;
  readonly now: () => number;
  readonly sessionProposalCapabilities: readonly string[];
  readonly preview: NeutronMutationProposal | null;
}

export function materializeStoredGraphMutationProposals(
  input: MaterializeStoredGraphMutationProposalsInput,
): {
  readonly result: NeutronGraphExecutionResult;
  readonly proposal: NeutronMutationProposal | null;
  readonly source: "authoritative" | "preview" | "ambiguous" | null;
} {
  const candidates = collectNeutronGraphMutationCandidates({
    graph: input.graph,
    graphId: input.graphId,
    outcomes: input.outcomes,
    permission: {
      sessionProposalCapabilities: input.sessionProposalCapabilities,
    },
    session: input.session,
  });
  const bundles = candidates.map((record) =>
    materializeNeutronGraphMutationReview({
      now: input.now,
      projectStateDigest: input.projectStateDigest,
      record,
      session: input.session,
      store: input.store,
    }),
  );
  const selected = selectSessionMutationProposal({
    authoritative: bundles.map((bundle) => bundle.proposal),
    preview: input.preview,
  });
  return {
    proposal: selected.proposal,
    result: attachNeutronGraphMutationEvidence(input.result, {
      proposals: bundles.map((bundle) => bundle.evidence),
    }),
    source: selected.source,
  };
}

export function bindExecutedGraphMutationState(input: {
  readonly session: NeutronRuntimeSession;
  readonly graph: NeutronTaskGraph;
  readonly graphId: string;
  readonly outcomes: readonly NeutronReadyNodeOutcome[];
  readonly result: NeutronGraphExecutionResult;
  readonly preview: NeutronMutationProposal | null;
  readonly stored: StoredNeutronSession;
  readonly projectStateDigest: string;
  readonly now?: () => number;
  readonly sessionProposalCapabilities?: readonly string[];
  readonly mutationPayloadStore?: NeutronGraphMutationPayloadStore;
}): {
  readonly result: NeutronGraphExecutionResult;
  readonly mutationProposal: NeutronMutationProposal | null;
  readonly mutationProposalSource: StoredNeutronSession["mutationProposalSource"];
  readonly mutationPayloadStore?: NeutronGraphMutationPayloadStore;
} {
  const capabilities = input.sessionProposalCapabilities ?? [];
  if (!capabilities.includes(NEUTRON_MUTATION_PROPOSAL_CAPABILITY)) {
    return {
      mutationProposal: input.preview,
      mutationProposalSource: input.preview !== null ? "preview" : null,
      ...(input.stored.mutationPayloadStore === undefined
        ? {}
        : { mutationPayloadStore: input.stored.mutationPayloadStore }),
      result: input.result,
    };
  }
  const store =
    input.mutationPayloadStore ??
    input.stored.mutationPayloadStore ??
    createMemoryNeutronGraphMutationPayloadStore();
  const materialized = materializeStoredGraphMutationProposals({
    graph: input.graph,
    graphId: input.graphId,
    now: input.now ?? Date.now,
    outcomes: input.outcomes,
    preview: input.preview,
    projectStateDigest: input.projectStateDigest,
    result: input.result,
    session: input.session,
    sessionProposalCapabilities: capabilities,
    store,
  });
  return {
    mutationPayloadStore: store,
    mutationProposal: materialized.proposal,
    mutationProposalSource: materialized.source,
    result: materialized.result,
  };
}
