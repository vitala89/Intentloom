import type { AdoptionPreviewItem } from "./adoption-plan.js";

export const ADOPTION_DECISION_KINDS = [
  "keep-project-owned",
  "map-existing-compatible-document",
] as const;

export type AdoptionDecisionKind = (typeof ADOPTION_DECISION_KINDS)[number];

export const ADOPTION_DECISION_LABELS: Record<AdoptionDecisionKind, string> = {
  "keep-project-owned": "Keep project-owned",
  "map-existing-compatible-document": "Map existing compatible document",
};

export const ADOPTION_DECISION_INVALID_REASONS = [
  "stale-preview",
  "unknown-item",
  "decision-not-required",
  "unsupported-decision",
  "duplicate-decision",
  "invalid-mapping",
  "resolution-failed",
] as const;

export type AdoptionDecisionInvalidReason =
  (typeof ADOPTION_DECISION_INVALID_REASONS)[number];

export const MAX_ADOPTION_DECISIONS = 256;
export const MAX_ADOPTION_DECISION_PATH_LENGTH = 4_096;

export interface SelectedAdoptionDecision {
  readonly path: string;
  readonly kind: AdoptionDecisionKind;
}

export interface AdoptionDecisionEvaluation {
  readonly path: string;
  readonly kind: AdoptionDecisionKind;
  readonly status: "valid" | "invalid";
  readonly reason: AdoptionDecisionInvalidReason | null;
  readonly supportedChoices: readonly AdoptionDecisionKind[];
  readonly resolvedItem: AdoptionPreviewItem | null;
}

export interface ExistingProjectAdoptionDecisionViewModel {
  readonly readOnly: true;
  readonly classification: "read-only";
  readonly applied: false;
  readonly changesApplied: 0;
  readonly root: string;
  readonly projectId: string;
  readonly previewIdentity: string;
  readonly stalePreview: boolean;
  readonly decisionsPrepared: number;
  readonly evaluations: readonly AdoptionDecisionEvaluation[];
  readonly remainingManualDecisionPaths: readonly string[];
}

export function supportedAdoptionDecisionKinds(
  item: AdoptionPreviewItem,
): readonly AdoptionDecisionKind[] {
  if (!item.manualDecisionRequired || item.writeEligible) return [];
  if (
    item.action === "map-existing-project-owned" &&
    item.currentClassification === "project-owned"
  ) {
    return ["keep-project-owned"];
  }
  if (
    item.action === "manual-decision-required" &&
    item.proposedClassification === "project-owned-documentation"
  ) {
    return ["map-existing-compatible-document"];
  }
  return [];
}

export function adoptionDecisionKindLabel(kind: AdoptionDecisionKind): string {
  return ADOPTION_DECISION_LABELS[kind];
}
