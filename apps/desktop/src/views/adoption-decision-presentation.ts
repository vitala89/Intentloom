import {
  adoptionDecisionKindLabel,
  supportedAdoptionDecisionKinds,
  type AdoptionDecisionEvaluation,
  type AdoptionDecisionKind,
  type AdoptionPreviewItem,
  type ExistingProjectAdoptionDecisionViewModel,
} from "@intentloom/protocol";

export function adoptionDecisionChoiceLabel(
  kind: AdoptionDecisionKind,
): string {
  return adoptionDecisionKindLabel(kind);
}

export function evaluationForPath(
  result: ExistingProjectAdoptionDecisionViewModel | null,
  path: string,
): AdoptionDecisionEvaluation | null {
  return (
    result?.evaluations.find((evaluation) => evaluation.path === path) ?? null
  );
}

export function renderAdoptionDecisionText(options: {
  readonly item: AdoptionPreviewItem;
  readonly selectedKind: AdoptionDecisionKind | null;
  readonly evaluation: AdoptionDecisionEvaluation | null;
}): string {
  const choices = supportedAdoptionDecisionKinds(options.item);
  const lines = [
    `Requires decision ${options.item.path}`,
    `Current classification: ${options.item.currentClassification}`,
    `Selected decision: ${
      options.selectedKind === null
        ? "none"
        : adoptionDecisionKindLabel(options.selectedKind)
    }`,
    `Supported choices: ${
      choices.length === 0
        ? "none"
        : choices.map(adoptionDecisionKindLabel).join(", ")
    }`,
    "This decision is not applied to the project.",
  ];
  if (
    options.evaluation?.status === "valid" &&
    options.evaluation.resolvedItem
  ) {
    lines.push(
      `Proposed resolution: ${options.evaluation.resolvedItem.action}`,
      `Resolved classification: ${options.evaluation.resolvedItem.proposedClassification}`,
      "Valid decision ready for a future prepared plan.",
    );
  }
  if (options.evaluation?.status === "invalid") {
    lines.push(`Invalid decision: ${options.evaluation.reason ?? "rejected"}`);
  }
  return lines.join("\n");
}

export function renderAdoptionDecisionSummary(options: {
  readonly decisionsPrepared: number;
  readonly changesApplied: number;
}): string {
  return [
    `Decisions prepared: ${options.decisionsPrepared}`,
    `Changes applied: ${options.changesApplied}`,
  ].join("\n");
}
