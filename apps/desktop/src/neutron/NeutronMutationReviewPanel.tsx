import { useEffect, useRef } from "react";
import type { NeutronMutationReviewFileView } from "@intentloom/protocol";
import { Button } from "../design/components/core/Button.js";
import { Card } from "../design/components/layout/Card.js";
import { EmptyState } from "../design/components/states/EmptyState.js";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { NeutronMutationReviewDiff } from "./NeutronMutationReviewDiff.js";
import { NeutronMutationReviewFiles } from "./NeutronMutationReviewFiles.js";
import { NeutronMutationReviewSelector } from "./NeutronMutationReviewSelector.js";
import { NeutronMutationReviewSummaryHeader } from "./NeutronMutationReviewSummary.js";
import {
  MUTATION_REVIEW_CHOOSE_COPY,
  MUTATION_REVIEW_EMPTY_COPY,
  MUTATION_REVIEW_INSPECTION_COPY,
  MUTATION_REVIEW_TRANSPORT_COPY,
  mutationReviewOutcomeCopy,
} from "./neutron-mutation-review-copy.js";
import type {
  NeutronMutationReviewPort,
  NeutronMutationReviewScope,
  NeutronMutationReviewUiState,
} from "./neutron-mutation-review-state.js";
import { useNeutronMutationReview } from "./use-neutron-mutation-review.js";

export interface NeutronMutationReviewPanelProps {
  readonly active: boolean;
  readonly scope: NeutronMutationReviewScope | null;
  readonly port?: NeutronMutationReviewPort;
}

export function NeutronMutationReviewPanel({
  active,
  scope,
  port,
}: NeutronMutationReviewPanelProps) {
  const review = useNeutronMutationReview({
    active,
    scope,
    ...(port === undefined ? {} : { port }),
  });
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const proposalId = review.state.review?.proposalId ?? null;
  useEffect(() => {
    headingRef.current?.focus();
  }, [proposalId]);
  const file =
    review.state.review?.files.find(
      (item) => item.path === review.state.selectedPath,
    ) ?? null;
  return (
    <Card
      title="Exact mutation review"
      action={
        <Button variant="secondary" onClick={review.refreshReview}>
          Refresh review
        </Button>
      }
    >
      <StatusChip label="Inspection only" tone="neutral" />
      <p>{MUTATION_REVIEW_INSPECTION_COPY}</p>
      <NeutronMutationReviewView
        state={review.state}
        file={file}
        headingRef={(node) => {
          headingRef.current = node;
        }}
        onSelectProposal={review.selectProposal}
        onSelectFile={review.selectFile}
        onClose={review.closeReview}
      />
    </Card>
  );
}

export function NeutronMutationReviewView({
  state,
  file,
  headingRef,
  onSelectProposal,
  onSelectFile,
  onClose,
}: {
  readonly state: NeutronMutationReviewUiState;
  readonly file: NeutronMutationReviewFileView | null;
  readonly headingRef: (node: HTMLHeadingElement | null) => void;
  readonly onSelectProposal: (proposalId: string) => void;
  readonly onSelectFile: (path: string) => void;
  readonly onClose: () => void;
}) {
  if (state.listPhase === "loading" || state.listPhase === "idle") {
    return <p role="status">Loading mutation reviews.</p>;
  }
  if (state.listPhase === "error") {
    return <p role="alert">{MUTATION_REVIEW_TRANSPORT_COPY}</p>;
  }
  if (state.listOutcome !== null && state.listOutcome !== "ok") {
    return <p role="alert">{mutationReviewOutcomeCopy(state.listOutcome)}</p>;
  }
  if (state.summaries.length === 0) {
    return (
      <EmptyState
        title="No authoritative proposals"
        description={MUTATION_REVIEW_EMPTY_COPY}
      />
    );
  }
  return (
    <div>
      <NeutronMutationReviewSelector
        summaries={state.summaries}
        selectedProposalId={state.selectedProposalId}
        onSelect={onSelectProposal}
      />
      {state.review === null ? (
        <AwaitingReview state={state} />
      ) : (
        <div>
          <NeutronMutationReviewSummaryHeader
            review={state.review}
            headingRef={headingRef}
          />
          <NeutronMutationReviewFiles
            files={state.review.files}
            selectedPath={state.selectedPath}
            onSelect={onSelectFile}
          />
          <NeutronMutationReviewDiff file={file} />
          <Button variant="ghost" onClick={onClose}>
            Close review
          </Button>
        </div>
      )}
    </div>
  );
}

function AwaitingReview({
  state,
}: {
  readonly state: NeutronMutationReviewUiState;
}) {
  if (state.reviewPhase === "loading") {
    return <p role="status">Loading exact review.</p>;
  }
  if (state.reviewPhase === "error") {
    return <p role="alert">{MUTATION_REVIEW_TRANSPORT_COPY}</p>;
  }
  if (state.reviewOutcome === "scope-mismatch") {
    return (
      <p role="alert">This review does not belong to the current session.</p>
    );
  }
  if (state.reviewOutcome !== null && state.reviewOutcome !== "ok") {
    return <p role="alert">{mutationReviewOutcomeCopy(state.reviewOutcome)}</p>;
  }
  return <p role="status">{MUTATION_REVIEW_CHOOSE_COPY}</p>;
}
