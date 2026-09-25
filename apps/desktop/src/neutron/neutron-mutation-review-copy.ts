import type {
  NeutronMutationReviewCurrentness,
  NeutronMutationReviewOutcome,
} from "@intentloom/protocol";

export const MUTATION_REVIEW_INSPECTION_COPY =
  "Inspection only. Mutation is not authorized." as const;

export const MUTATION_REVIEW_STALE_COPY =
  "Project state changed after this proposal was generated." as const;

export const MUTATION_REVIEW_EXPIRED_COPY =
  "This proposal is past its expiry." as const;

export const MUTATION_REVIEW_CANCELLED_COPY =
  "This proposal was cancelled." as const;

export const MUTATION_REVIEW_CURRENT_COPY =
  "Host reports this review as current." as const;

export const MUTATION_REVIEW_SECRET_COPY =
  "Body unavailable. This path is secret-like." as const;

export const MUTATION_REVIEW_BINARY_COPY =
  "Body unavailable. Non-text content is not shown." as const;

export const MUTATION_REVIEW_CONTENT_UNAVAILABLE_COPY =
  "Exact content is unavailable." as const;

export const MUTATION_REVIEW_TRUNCATED_COPY =
  "Presentation truncated. This view is not the full host payload." as const;

export const MUTATION_REVIEW_TRANSPORT_COPY =
  "The review could not be loaded." as const;

export const MUTATION_REVIEW_EMPTY_COPY =
  "No authoritative mutation proposals for this session." as const;

export const MUTATION_REVIEW_CHOOSE_COPY =
  "Select a proposal to inspect its exact review." as const;

const CURRENTNESS_LABEL: Record<NeutronMutationReviewCurrentness, string> = {
  current: "Current",
  stale: "Stale",
  expired: "Expired",
  cancelled: "Cancelled",
};

const OUTCOME_COPY: Record<NeutronMutationReviewOutcome, string> = {
  ok: "Review loaded.",
  "proposal-not-found": "Proposal not found.",
  "review-unavailable":
    "Authoritative review payload is unavailable. It was not reconstructed.",
  "preview-not-authoritative":
    "This preview is not an authoritative mutation review.",
  "root-mismatch": "This review does not belong to the current project root.",
  "project-mismatch": "This review does not belong to the current project.",
  "session-mismatch": "This review does not belong to the current session.",
  "graph-mismatch": "This review does not belong to the current graph.",
  "payload-mismatch": "The review payload does not match its artifact.",
  "path-security-failed": "The review path failed the host security check.",
  "review-too-large": "The review exceeds the host size bound.",
};

export function mutationReviewCurrentnessLabel(
  currentness: NeutronMutationReviewCurrentness,
): string {
  return CURRENTNESS_LABEL[currentness];
}

export function mutationReviewCurrentnessCopy(
  currentness: NeutronMutationReviewCurrentness,
): string {
  if (currentness === "stale") return MUTATION_REVIEW_STALE_COPY;
  if (currentness === "expired") return MUTATION_REVIEW_EXPIRED_COPY;
  if (currentness === "cancelled") return MUTATION_REVIEW_CANCELLED_COPY;
  return MUTATION_REVIEW_CURRENT_COPY;
}

export function mutationReviewOutcomeCopy(
  outcome: NeutronMutationReviewOutcome,
): string {
  return OUTCOME_COPY[outcome];
}

export function formatReviewExpiry(expiresAt: number | undefined): string {
  if (expiresAt === undefined) return "No expiry recorded";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Expiry unavailable";
  return date.toISOString();
}
