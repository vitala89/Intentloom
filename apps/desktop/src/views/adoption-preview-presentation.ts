import {
  adoptionDecisionKindLabel,
  supportedAdoptionDecisionKinds,
  type AdoptionPreviewItem,
  type ExistingProjectAdoptionPlanViewModel,
} from "@intentloom/protocol";
import {
  adoptionPreviewHasManualDecisions,
  groupAdoptionPlanItems,
} from "./adoption-preview-grouping.js";
import type { AdoptionPreviewSurfaceState } from "./adoption-preview-controller.js";

export interface AdoptionPreviewFocusTarget {
  readonly id: string;
  readonly label: string;
}

export function futureResolutionLabel(item: AdoptionPreviewItem): string {
  const choices = supportedAdoptionDecisionKinds(item);
  if (choices.length > 0) {
    return choices.map(adoptionDecisionKindLabel).join(", ");
  }
  if (item.manualDecisionRequired) {
    return "No supported Desktop decision";
  }
  if (item.writeEligible) {
    return "Would be write-eligible only after a future approved apply";
  }
  return "No write in this preview";
}

export function adoptionPreviewFocusOrder(
  status: AdoptionPreviewSurfaceState,
  plan: ExistingProjectAdoptionPlanViewModel | null,
): readonly AdoptionPreviewFocusTarget[] {
  const targets: AdoptionPreviewFocusTarget[] = [
    { id: "adoption-preview-heading", label: "Adoption preview" },
  ];
  if (status === "idle" || status === "error" || status === "disconnected") {
    targets.push({
      id: "adoption-preview-primary-action",
      label: status === "idle" ? "Select project" : "Retry preview",
    });
    return targets;
  }
  targets.push({
    id: "adoption-preview-primary-action",
    label: "Retry preview",
  });
  targets.push({
    id: "adoption-prepare-plan",
    label: "Prepare plan",
  });
  targets.push({
    id: "adoption-revalidate-plan",
    label: "Revalidate plan",
  });
  targets.push({
    id: "adoption-approve-plan",
    label: "Approve prepared plan",
  });
  if (!plan) return targets;
  const decisions = plan.items.filter((item) => item.manualDecisionRequired);
  decisions.forEach((item, index) => {
    targets.push({
      id: `adoption-decision-${index}`,
      label: `Requires decision ${item.path}`,
    });
    supportedAdoptionDecisionKinds(item).forEach((kind) => {
      targets.push({
        id: `adoption-decision-${index}-${kind}`,
        label: `${adoptionDecisionKindLabel(kind)} for ${item.path}`,
      });
    });
  });
  return targets;
}

export function renderAdoptionPreviewText(options: {
  readonly status: AdoptionPreviewSurfaceState;
  readonly selectedRoot: string | null;
  readonly plan: ExistingProjectAdoptionPlanViewModel | null;
  readonly errorMessage: string | null;
}): string {
  const lines = [
    "Adoption preview",
    "This is a read-only preview. No changes have been applied.",
    `Selected project: ${options.selectedRoot ?? "none"}`,
    `Status: ${options.status}`,
  ];
  if (options.errorMessage) {
    lines.push(`Error: ${options.errorMessage}`);
  }
  const plan = options.plan;
  if (!plan) {
    return lines.join("\n");
  }
  lines.push(`Canonical root: ${plan.root}`);
  lines.push(`Project: ${plan.projectId}`);
  lines.push(`Engineering profile: ${plan.profile}`);
  lines.push(`Workspace topology: ${plan.workspaceTopology}`);
  lines.push(
    `Adapters: ${
      plan.detectedAdapters.length > 0
        ? plan.detectedAdapters.join(", ")
        : "none reported"
    }`,
  );
  lines.push(`Readiness: ${plan.readiness}`);
  lines.push(
    adoptionPreviewHasManualDecisions(plan)
      ? "Manual decisions required"
      : "No manual decisions required",
  );
  lines.push("Decisions prepared: 0");
  lines.push("Changes applied: 0");
  for (const group of groupAdoptionPlanItems(plan.items)) {
    lines.push(group.heading);
    for (const item of group.items) {
      lines.push(renderAdoptionItemText(item));
    }
  }
  if (plan.diagnostics.length > 0) {
    lines.push("Diagnostics");
    for (const diagnostic of plan.diagnostics) {
      lines.push(`Diagnostic: ${diagnostic}`);
    }
  }
  if (plan.nextActions.length > 0) {
    lines.push("Safe next actions");
    for (const action of plan.nextActions) {
      lines.push(`Next action: ${action}`);
    }
  }
  const focus = adoptionPreviewFocusOrder(options.status, plan)
    .map((target) => target.label)
    .join(", ");
  lines.push(`Keyboard order: ${focus}`);
  return lines.join("\n");
}

function renderAdoptionItemText(item: AdoptionPreviewItem): string {
  const parts = [
    item.path,
    `Action: ${item.action}`,
    `Current classification: ${item.currentClassification}`,
    `Reason: ${item.reason}`,
    `Available future resolution: ${futureResolutionLabel(item)}`,
  ];
  if (item.manualDecisionRequired) {
    parts.unshift("Requires decision");
  }
  if (item.conflictDetails.length > 0) {
    parts.push(`Conflict details: ${item.conflictDetails.join("; ")}`);
  }
  parts.push(`Safe next action: ${item.safeNextAction}`);
  return parts.join(" | ");
}
