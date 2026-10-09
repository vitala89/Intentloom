import type {
  NeutronMutationReviewGetResult,
  NeutronMutationReviewListResult,
  NeutronMutationReviewSummary,
  NeutronMutationReviewView,
} from "@intentloom/protocol";

export interface NeutronMutationReviewScope {
  readonly root: string;
  readonly sessionId: string;
  readonly projectId: string;
  readonly graphId?: string;
}

export interface NeutronMutationReviewPort {
  listNeutronMutationReviews(
    root: string,
    sessionId: string,
    projectId: string,
    graphId?: string,
    signal?: AbortSignal,
  ): Promise<NeutronMutationReviewListResult>;
  getNeutronMutationReview(
    root: string,
    sessionId: string,
    projectId: string,
    proposalId: string,
    graphId?: string,
    signal?: AbortSignal,
  ): Promise<NeutronMutationReviewGetResult>;
}

export interface NeutronMutationReviewUiState {
  readonly summaries: readonly NeutronMutationReviewSummary[];
  readonly listPhase: "idle" | "loading" | "ready" | "error";
  readonly listOutcome: NeutronMutationReviewListResult["outcome"] | null;
  readonly selectedProposalId: string | null;
  readonly detailDismissed: boolean;
  readonly reviewPhase: "idle" | "loading" | "ready" | "error";
  readonly reviewOutcome:
    NeutronMutationReviewGetResult["outcome"] | "scope-mismatch" | null;
  readonly review: NeutronMutationReviewView | null;
  readonly selectedPath: string | null;
}

export function mutationReviewScopeKey(
  scope: NeutronMutationReviewScope,
): string {
  return [
    scope.root,
    scope.sessionId,
    scope.projectId,
    scope.graphId ?? "",
  ].join("\0");
}

export function initialMutationReviewUiState(): NeutronMutationReviewUiState {
  return {
    summaries: [],
    listPhase: "idle",
    listOutcome: null,
    selectedProposalId: null,
    detailDismissed: false,
    reviewPhase: "idle",
    reviewOutcome: null,
    review: null,
    selectedPath: null,
  };
}

export function proposalIdToFetch(
  state: NeutronMutationReviewUiState,
): string | null {
  if (state.detailDismissed || state.listPhase !== "ready") return null;
  if (state.listOutcome !== "ok") return null;
  if (state.selectedProposalId !== null) {
    return listedProposal(state.summaries, state.selectedProposalId);
  }
  if (state.summaries.length !== 1) return null;
  return state.summaries[0]?.proposalId ?? null;
}

export function applyListedReviews(
  state: NeutronMutationReviewUiState,
  result: NeutronMutationReviewListResult,
): NeutronMutationReviewUiState {
  const summaries = result.outcome === "ok" ? result.reviews : [];
  const retained = listedProposal(summaries, state.selectedProposalId);
  const selectedProposalId =
    retained ??
    (summaries.length === 1 && !state.detailDismissed
      ? (summaries[0]?.proposalId ?? null)
      : null);
  const sameReview = state.review?.proposalId === selectedProposalId;
  return {
    ...state,
    summaries,
    listPhase: "ready",
    listOutcome: result.outcome,
    selectedProposalId,
    review: sameReview ? state.review : null,
    reviewPhase: sameReview ? state.reviewPhase : "idle",
    reviewOutcome: sameReview ? state.reviewOutcome : null,
    selectedPath: sameReview ? state.selectedPath : null,
  };
}

export function selectMutationProposal(
  state: NeutronMutationReviewUiState,
  proposalId: string,
): NeutronMutationReviewUiState {
  if (listedProposal(state.summaries, proposalId) === null) return state;
  return {
    ...state,
    selectedProposalId: proposalId,
    detailDismissed: false,
    review: null,
    reviewPhase: "loading",
    reviewOutcome: null,
    selectedPath: null,
  };
}

export function dismissMutationReview(
  state: NeutronMutationReviewUiState,
): NeutronMutationReviewUiState {
  return {
    ...state,
    detailDismissed: true,
    review: null,
    reviewPhase: "idle",
    reviewOutcome: null,
    selectedPath: null,
  };
}

export function selectMutationReviewFile(
  state: NeutronMutationReviewUiState,
  path: string,
): NeutronMutationReviewUiState {
  if (!state.review?.files.some((file) => file.path === path)) return state;
  return { ...state, selectedPath: path };
}

export function failMutationReviewList(
  state: NeutronMutationReviewUiState,
): NeutronMutationReviewUiState {
  return {
    ...initialMutationReviewUiState(),
    listPhase: "error",
    detailDismissed: state.detailDismissed,
  };
}

export function applyLoadedReview(
  state: NeutronMutationReviewUiState,
  scope: NeutronMutationReviewScope,
  proposalId: string,
  result: NeutronMutationReviewGetResult,
): NeutronMutationReviewUiState {
  if (state.selectedProposalId !== proposalId) return state;
  const review = result.review;
  if (result.outcome !== "ok" || review === undefined) {
    return {
      ...state,
      review: null,
      reviewPhase: "ready",
      reviewOutcome: result.outcome,
      selectedPath: null,
    };
  }
  if (!reviewMatchesRequest(review, scope, proposalId)) {
    return {
      ...state,
      review: null,
      reviewPhase: "ready",
      reviewOutcome: "scope-mismatch",
      selectedPath: null,
    };
  }
  return {
    ...state,
    review,
    reviewPhase: "ready",
    reviewOutcome: "ok",
    selectedPath: initialFilePath(review, state.selectedPath),
  };
}

export function failMutationReviewGet(
  state: NeutronMutationReviewUiState,
  proposalId: string,
): NeutronMutationReviewUiState {
  if (state.selectedProposalId !== proposalId) return state;
  return {
    ...state,
    review: null,
    reviewPhase: "error",
    reviewOutcome: null,
    selectedPath: null,
  };
}

export function reviewMatchesRequest(
  review: NeutronMutationReviewView,
  scope: NeutronMutationReviewScope,
  proposalId: string,
): boolean {
  if (review.proposalId !== proposalId) return false;
  if (review.sessionId !== scope.sessionId) return false;
  if (review.projectId !== scope.projectId) return false;
  if (review.root !== scope.root) return false;
  if (scope.graphId !== undefined && review.graphId !== scope.graphId) {
    return false;
  }
  return true;
}

function listedProposal(
  summaries: readonly NeutronMutationReviewSummary[],
  proposalId: string | null,
): string | null {
  if (proposalId === null) return null;
  return summaries.some((item) => item.proposalId === proposalId)
    ? proposalId
    : null;
}

function initialFilePath(
  review: NeutronMutationReviewView,
  selectedPath: string | null,
): string | null {
  if (
    selectedPath !== null &&
    review.files.some((file) => file.path === selectedPath)
  ) {
    return selectedPath;
  }
  return review.files[0]?.path ?? null;
}
