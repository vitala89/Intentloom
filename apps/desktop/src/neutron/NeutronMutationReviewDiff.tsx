import type { NeutronMutationReviewFileView } from "@intentloom/protocol";
import { DiffViewer } from "../design/components/code/DiffViewer.js";
import {
  MUTATION_REVIEW_BINARY_COPY,
  MUTATION_REVIEW_CONTENT_UNAVAILABLE_COPY,
  MUTATION_REVIEW_SECRET_COPY,
  MUTATION_REVIEW_TRUNCATED_COPY,
} from "./neutron-mutation-review-copy.js";
import { exactReviewFileDiff } from "./neutron-mutation-review-diff.js";

export interface NeutronMutationReviewDiffProps {
  readonly file: NeutronMutationReviewFileView | null;
}

export function NeutronMutationReviewDiff({
  file,
}: NeutronMutationReviewDiffProps) {
  if (file === null) {
    return <p role="status">Select a file to inspect its exact review.</p>;
  }
  const diff = exactReviewFileDiff(file);
  return (
    <section aria-label={`Exact diff for ${file.path}`}>
      <p>
        Path {file.path}. Operation {file.operation}. Status {file.status}.
      </p>
      <p>
        Proposed digest {file.proposedContentDigest}
        {file.currentContentDigest
          ? `. Current digest ${file.currentContentDigest}`
          : ""}
      </p>
      {diff.reason === "secret" ? (
        <p role="status">{MUTATION_REVIEW_SECRET_COPY}</p>
      ) : null}
      {diff.reason === "binary" ? (
        <p role="status">{MUTATION_REVIEW_BINARY_COPY}</p>
      ) : null}
      {diff.reason === "unavailable" ? (
        <p role="status">{MUTATION_REVIEW_CONTENT_UNAVAILABLE_COPY}</p>
      ) : null}
      {diff.reason === "truncated" ? (
        <p role="status">{MUTATION_REVIEW_TRUNCATED_COPY}</p>
      ) : null}
      {diff.reason === "exact" ? (
        <div>
          <div style={{ display: "flex" }}>
            <span style={{ flex: 1 }}>Current</span>
            <span style={{ flex: 1 }}>Proposed</span>
          </div>
          <p>
            Removed lines are marked removed. Added lines are marked added. A
            missing end-of-file newline is marked in the diff.
          </p>
          <DiffViewer hunks={[...diff.hunks]} mode="split" />
        </div>
      ) : null}
    </section>
  );
}
