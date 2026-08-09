import type {
  AssessmentHistoricalComparison,
  AssessmentRemediationProposal,
  RemediationRoadmap,
  RemediationRoadmapPhase,
  TargetStateOption,
} from "@intentloom/protocol";
import { isObject, stringArray } from "./common.js";

export function validateTargetStateOption(value: unknown): TargetStateOption {
  if (!isObject(value)) {
    throw new Error("target state option must be an object");
  }
  if (typeof value.optionId !== "string" || !value.optionId.trim()) {
    throw new Error("targetStateOption.optionId must be a non-empty string");
  }
  if (typeof value.title !== "string" || !value.title.trim()) {
    throw new Error("targetStateOption.title must be a non-empty string");
  }
  if (typeof value.description !== "string" || !value.description.trim()) {
    throw new Error("targetStateOption.description must be a non-empty string");
  }
  if (!["low", "medium", "high"].includes(value.complexity as string)) {
    throw new Error(
      "targetStateOption.complexity must be low, medium, or high",
    );
  }
  const risks = stringArray(value.risks, "targetStateOption.risks");
  if (
    !["recommended", "alternative", "optional"].includes(
      value.recommendationLevel as string,
    )
  ) {
    throw new Error(
      "targetStateOption.recommendationLevel must be recommended, alternative, or optional",
    );
  }
  return {
    optionId: value.optionId,
    title: value.title,
    description: value.description,
    complexity: value.complexity as TargetStateOption["complexity"],
    risks,
    recommendationLevel:
      value.recommendationLevel as TargetStateOption["recommendationLevel"],
  };
}

function validateRemediationRoadmapPhase(
  value: unknown,
): RemediationRoadmapPhase {
  if (!isObject(value)) {
    throw new Error("remediation roadmap phase must be an object");
  }
  if (!["Immediate", "Next", "Later"].includes(value.phaseName as string)) {
    throw new Error("roadmapPhase.phaseName must be Immediate, Next, or Later");
  }
  const items = stringArray(value.items, "roadmapPhase.items");
  return {
    phaseName: value.phaseName as RemediationRoadmapPhase["phaseName"],
    items,
  };
}

export function validateRemediationRoadmap(value: unknown): RemediationRoadmap {
  if (!isObject(value)) {
    throw new Error("remediation roadmap must be an object");
  }
  if (
    typeof value.targetStateOptionId !== "string" ||
    !value.targetStateOptionId.trim()
  ) {
    throw new Error(
      "remediationRoadmap.targetStateOptionId must be a non-empty string",
    );
  }
  if (!Array.isArray(value.phases)) {
    throw new Error("remediationRoadmap.phases must be an array");
  }
  const phases = value.phases.map(validateRemediationRoadmapPhase);
  return {
    targetStateOptionId: value.targetStateOptionId,
    phases,
  };
}

export function validateAssessmentHistoricalComparison(
  value: unknown,
): AssessmentHistoricalComparison {
  if (!isObject(value)) {
    throw new Error("assessment historical comparison must be an object");
  }
  if (typeof value.previousId !== "string" || !value.previousId.trim()) {
    throw new Error("comparison.previousId must be a non-empty string");
  }
  if (typeof value.currentId !== "string" || !value.currentId.trim()) {
    throw new Error("comparison.currentId must be a non-empty string");
  }
  if (typeof value.isCompatible !== "boolean") {
    throw new Error("comparison.isCompatible must be a boolean");
  }
  const newFindingIds = stringArray(value.newFindingIds, "newFindingIds");
  const fixedFindingIds = stringArray(value.fixedFindingIds, "fixedFindingIds");
  const unchangedFindingIds = stringArray(
    value.unchangedFindingIds,
    "unchangedFindingIds",
  );
  if (
    typeof value.technicalDebtItemDelta !== "number" ||
    !Number.isInteger(value.technicalDebtItemDelta)
  ) {
    throw new Error("comparison.technicalDebtItemDelta must be an integer");
  }
  if (
    typeof value.architectureDriftDelta !== "number" ||
    !Number.isInteger(value.architectureDriftDelta)
  ) {
    throw new Error("comparison.architectureDriftDelta must be an integer");
  }
  return {
    previousId: value.previousId,
    currentId: value.currentId,
    isCompatible: value.isCompatible,
    newFindingIds,
    fixedFindingIds,
    unchangedFindingIds,
    technicalDebtItemDelta: value.technicalDebtItemDelta,
    architectureDriftDelta: value.architectureDriftDelta,
  };
}

export function validateAssessmentRemediationProposal(
  value: unknown,
): AssessmentRemediationProposal {
  if (!isObject(value)) {
    throw new Error("assessment remediation proposal must be an object");
  }
  if (typeof value.proposalId !== "string" || !value.proposalId.trim()) {
    throw new Error("proposal.proposalId must be a non-empty string");
  }
  if (typeof value.findingId !== "string" || !value.findingId.trim()) {
    throw new Error("proposal.findingId must be a non-empty string");
  }
  if (
    typeof value.targetOptionId !== "string" ||
    !value.targetOptionId.trim()
  ) {
    throw new Error("proposal.targetOptionId must be a non-empty string");
  }
  const affectedPaths = stringArray(value.affectedPaths, "affectedPaths");
  if (typeof value.policyImpact !== "string" || !value.policyImpact.trim()) {
    throw new Error("proposal.policyImpact must be a non-empty string");
  }
  if (
    typeof value.rollbackStrategy !== "string" ||
    !value.rollbackStrategy.trim()
  ) {
    throw new Error("proposal.rollbackStrategy must be a non-empty string");
  }
  if (typeof value.requiresApproval !== "boolean") {
    throw new Error("proposal.requiresApproval must be a boolean");
  }
  return {
    proposalId: value.proposalId,
    findingId: value.findingId,
    targetOptionId: value.targetOptionId,
    affectedPaths,
    policyImpact: value.policyImpact,
    rollbackStrategy: value.rollbackStrategy,
    requiresApproval: value.requiresApproval,
  };
}
