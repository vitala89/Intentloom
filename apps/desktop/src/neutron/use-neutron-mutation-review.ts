import { useCallback, useEffect, useRef, useState } from "react";
import { desktopClient } from "../desktop-client.js";
import {
  loadSelectedReview,
  orchestrateMutationReviewLoad,
} from "./neutron-mutation-review-load.js";
import {
  dismissMutationReview,
  initialMutationReviewUiState,
  mutationReviewScopeKey,
  proposalIdToFetch,
  selectMutationProposal,
  selectMutationReviewFile,
  type NeutronMutationReviewPort,
  type NeutronMutationReviewScope,
  type NeutronMutationReviewUiState,
} from "./neutron-mutation-review-state.js";

const defaultPort: NeutronMutationReviewPort = {
  listNeutronMutationReviews: (root, sessionId, projectId, graphId, signal) =>
    desktopClient.listNeutronMutationReviews(
      root,
      sessionId,
      projectId,
      graphId,
      signal,
    ),
  getNeutronMutationReview: (
    root,
    sessionId,
    projectId,
    proposalId,
    graphId,
    signal,
  ) =>
    desktopClient.getNeutronMutationReview(
      root,
      sessionId,
      projectId,
      proposalId,
      graphId,
      signal,
    ),
};

export interface UseNeutronMutationReviewInput {
  readonly active: boolean;
  readonly scope: NeutronMutationReviewScope | null;
  readonly port?: NeutronMutationReviewPort;
}

export interface UseNeutronMutationReviewResult {
  readonly state: NeutronMutationReviewUiState;
  readonly refreshReview: () => void;
  readonly selectProposal: (proposalId: string) => void;
  readonly selectFile: (path: string) => void;
  readonly closeReview: () => void;
}

function startReviewLoad(
  generation: { current: number },
  publish: (next: NeutronMutationReviewUiState) => void,
  run: (signal: AbortSignal) => Promise<NeutronMutationReviewUiState>,
): AbortController {
  const token = generation.current + 1;
  generation.current = token;
  const controller = new AbortController();
  void run(controller.signal).then((next) => {
    if (generation.current !== token || controller.signal.aborted) return;
    publish(next);
  });
  return controller;
}

export function useNeutronMutationReview(
  input: UseNeutronMutationReviewInput,
): UseNeutronMutationReviewResult {
  const port = input.port ?? defaultPort;
  const [state, setState] = useState(initialMutationReviewUiState);
  const stateRef = useRef(state);
  const generation = useRef(0);
  const scopeRef = useRef(input.scope);
  scopeRef.current = input.scope;
  const scopeKey =
    input.scope === null ? "" : mutationReviewScopeKey(input.scope);

  const publish = useCallback((next: NeutronMutationReviewUiState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const refreshReview = useCallback(() => {
    const scope = scopeRef.current;
    if (!input.active || scope === null) return;
    startReviewLoad(generation, publish, (signal) =>
      orchestrateMutationReviewLoad({
        port,
        scope,
        previous: stateRef.current,
        signal,
      }),
    );
  }, [input.active, port, publish]);

  useEffect(() => {
    const cleared = initialMutationReviewUiState();
    publish(cleared);
    const scope = scopeRef.current;
    if (!input.active || scope === null) return;
    const controller = startReviewLoad(generation, publish, (signal) =>
      orchestrateMutationReviewLoad({
        port,
        scope,
        previous: cleared,
        signal,
      }),
    );
    return () => {
      generation.current += 1;
      controller.abort();
    };
  }, [input.active, port, publish, scopeKey]);

  const selectProposal = useCallback(
    (proposalId: string) => {
      const scope = scopeRef.current;
      const next = selectMutationProposal(stateRef.current, proposalId);
      publish(next);
      const proposal = proposalIdToFetch(next);
      if (!input.active || scope === null || proposal === null) return;
      startReviewLoad(generation, publish, (signal) =>
        loadSelectedReview({
          port,
          scope,
          state: next,
          proposalId: proposal,
          signal,
        }),
      );
    },
    [input.active, port, publish],
  );

  const selectFile = useCallback(
    (path: string) => {
      publish(selectMutationReviewFile(stateRef.current, path));
    },
    [publish],
  );

  const closeReview = useCallback(() => {
    generation.current += 1;
    publish(dismissMutationReview(stateRef.current));
  }, [publish]);

  return { state, refreshReview, selectProposal, selectFile, closeReview };
}
