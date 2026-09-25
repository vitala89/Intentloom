import type { NeutronMutationReviewView } from "@intentloom/protocol";
import { StatusChip } from "../design/components/status/StatusChip.js";
import { shortenDigest } from "./neutron-digest-display.js";
import {
  MUTATION_REVIEW_INSPECTION_COPY,
  formatReviewExpiry,
  mutationReviewCurrentnessCopy,
  mutationReviewCurrentnessLabel,
} from "./neutron-mutation-review-copy.js";

export interface NeutronMutationReviewSummaryHeaderProps {
  readonly review: NeutronMutationReviewView;
  readonly headingRef?: (node: HTMLHeadingElement | null) => void;
}

export function NeutronMutationReviewSummaryHeader({
  review,
  headingRef,
}: NeutronMutationReviewSummaryHeaderProps) {
  return (
    <header>
      <h3 ref={headingRef} tabIndex={-1}>
        Exact mutation review
      </h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <StatusChip
          label={mutationReviewCurrentnessLabel(review.currentness)}
          tone={toneFor(review.currentness)}
        />
        <StatusChip label="Inspection only" tone="neutral" />
        <StatusChip label={review.mutationClass} tone="info" size="sm" />
      </div>
      <p role="status">{mutationReviewCurrentnessCopy(review.currentness)}</p>
      <p>{MUTATION_REVIEW_INSPECTION_COPY}</p>
      <dl>
        <div>
          <dt>Proposal id</dt>
          <dd>{review.proposalId}</dd>
        </div>
        <div>
          <dt>Graph id</dt>
          <dd>{review.graphId}</dd>
        </div>
        <div>
          <dt>Task id</dt>
          <dd>{review.taskId}</dd>
        </div>
        <div>
          <dt>Attempt</dt>
          <dd className="il-tnum">{review.attempt}</dd>
        </div>
        <div>
          <dt>Expiry</dt>
          <dd>{formatReviewExpiry(review.expiresAt)}</dd>
        </div>
        <Digest label="Proposal digest" value={review.proposalDigest} />
        <Digest
          label="Review artifact digest"
          value={review.reviewArtifactDigest}
        />
        <Digest
          label="Project state digest"
          value={review.projectStateDigest}
        />
        <Digest label="Plan digest" value={review.planDigest} />
      </dl>
    </header>
  );
}

function Digest({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd title={value}>{shortenDigest(value)}</dd>
    </div>
  );
}

function toneFor(
  currentness: NeutronMutationReviewView["currentness"],
): "success" | "warning" | "error" | "neutral" {
  if (currentness === "current") return "success";
  if (currentness === "stale") return "warning";
  if (currentness === "expired") return "error";
  return "neutral";
}
