import { useRef } from "react";
import type { KeyboardEvent } from "react";
import type { NeutronMutationReviewSummary } from "@intentloom/protocol";
import { StatusChip } from "../design/components/status/StatusChip.js";
import {
  formatReviewExpiry,
  mutationReviewCurrentnessLabel,
} from "./neutron-mutation-review-copy.js";
import { mutationReviewMoveIndex } from "./neutron-mutation-review-keyboard.js";

export interface NeutronMutationReviewSelectorProps {
  readonly summaries: readonly NeutronMutationReviewSummary[];
  readonly selectedProposalId: string | null;
  readonly onSelect: (proposalId: string) => void;
}

export function NeutronMutationReviewSelector({
  summaries,
  selectedProposalId,
  onSelect,
}: NeutronMutationReviewSelectorProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = summaries.findIndex(
      (item) => item.proposalId === event.currentTarget.dataset.proposalId,
    );
    const next = mutationReviewMoveIndex(index, summaries.length, event.key);
    if (next === null) return;
    event.preventDefault();
    const proposal = summaries[next];
    if (proposal === undefined) return;
    refs.current[proposal.proposalId]?.focus();
  };
  return (
    <div role="listbox" aria-label="Authoritative mutation proposals">
      {summaries.map((summary) => {
        const selected = summary.proposalId === selectedProposalId;
        return (
          <button
            key={summary.proposalId}
            ref={(node) => {
              refs.current[summary.proposalId] = node;
            }}
            type="button"
            role="option"
            data-proposal-id={summary.proposalId}
            aria-selected={selected}
            tabIndex={
              selected ||
              (selectedProposalId === null &&
                summary.proposalId === summaries[0]?.proposalId)
                ? 0
                : -1
            }
            onClick={() => onSelect(summary.proposalId)}
            onKeyDown={onKeyDown}
          >
            <span>Proposal {summary.proposalId}</span>
            <StatusChip
              label={mutationReviewCurrentnessLabel(summary.currentness)}
              tone={currentnessTone(summary.currentness)}
              size="sm"
            />
            <span>Graph {summary.graphId}</span>
            <span>Task {summary.taskId}</span>
            <span>Changed paths {summary.changedPathCount}</span>
            <span>Class {summary.mutationClass}</span>
            <span>Expiry {formatReviewExpiry(summary.expiresAt)}</span>
          </button>
        );
      })}
    </div>
  );
}

function currentnessTone(
  currentness: NeutronMutationReviewSummary["currentness"],
): "success" | "warning" | "error" | "neutral" {
  if (currentness === "current") return "success";
  if (currentness === "stale") return "warning";
  if (currentness === "expired") return "error";
  return "neutral";
}
