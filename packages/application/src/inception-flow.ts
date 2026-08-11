import type {
  InceptionFlowState,
  InceptionAnswer,
  BlueprintApproval,
  ScaffoldResult,
} from "@intentloom/protocol";
import {
  validateInceptionFlowState,
  validateBlueprintApproval,
} from "@intentloom/validator";
import { createInceptionSession, recordInceptionAnswer } from "./inception.js";
import { proposeProjectBlueprints } from "./inception-blueprint.js";
import { prepareProjectScaffoldPlan } from "./inception-scaffold-planner.js";
import { applyProjectScaffold } from "./inception-scaffold-apply.js";

export type InceptionFlowAction =
  | { readonly type: "record-answer"; readonly answer: InceptionAnswer }
  | { readonly type: "approve-blueprint"; readonly approval: BlueprintApproval }
  | {
      readonly type: "apply-scaffold";
      readonly fileWriter?: (path: string, content: string) => void;
      readonly existingFiles?: Record<string, string>;
    }
  | { readonly type: "cancel" };

export interface FlowReviewCard {
  readonly stepName: string;
  readonly summaryLines: readonly string[];
  readonly isActionRequired: boolean;
}

export function initializeInceptionFlow(
  root: string,
  idea: string,
): InceptionFlowState {
  const session = createInceptionSession({ root, idea });
  const now = Date.now();

  return validateInceptionFlowState({
    session,
    currentStep: "discovery",
    isComplete: false,
    updatedAt: now,
  });
}

export function advanceInceptionFlow(
  state: InceptionFlowState,
  action: InceptionFlowAction,
): InceptionFlowState {
  const current = validateInceptionFlowState(state);
  const now = Date.now();

  if (action.type === "cancel") {
    return validateInceptionFlowState({
      ...current,
      session: { ...current.session, status: "cancelled", updatedAt: now },
      currentStep: "cancelled",
      isComplete: true,
      updatedAt: now,
    });
  }

  if (current.currentStep === "discovery") {
    if (action.type !== "record-answer") {
      throw new Error(
        `Invalid flow action '${action.type}' for step 'discovery'`,
      );
    }

    const updatedSession = recordInceptionAnswer(
      current.session,
      action.answer,
    );

    if (updatedSession.status === "blueprinting") {
      const { recommended } = proposeProjectBlueprints(updatedSession);
      return validateInceptionFlowState({
        session: updatedSession,
        currentStep: "review",
        blueprint: recommended,
        isComplete: false,
        updatedAt: now,
      });
    }

    return validateInceptionFlowState({
      session: updatedSession,
      currentStep: "discovery",
      isComplete: false,
      updatedAt: now,
    });
  }

  if (current.currentStep === "review") {
    if (action.type !== "approve-blueprint") {
      throw new Error(`Invalid flow action '${action.type}' for step 'review'`);
    }

    if (!current.blueprint) {
      throw new Error(
        "Cannot approve blueprint: no blueprint present in flow state",
      );
    }

    const approval = validateBlueprintApproval(action.approval);
    const plan = prepareProjectScaffoldPlan(
      current.blueprint,
      current.session.root,
    );

    return validateInceptionFlowState({
      ...current,
      currentStep: "scaffold-planned",
      approval,
      plan,
      isComplete: false,
      updatedAt: now,
    });
  }

  if (current.currentStep === "scaffold-planned") {
    if (action.type !== "apply-scaffold") {
      throw new Error(
        `Invalid flow action '${action.type}' for step 'scaffold-planned'`,
      );
    }

    if (!current.plan || !current.approval) {
      throw new Error(
        "Cannot apply scaffold: missing plan or approval in flow state",
      );
    }

    const result: ScaffoldResult = applyProjectScaffold(
      current.plan,
      current.approval,
      {
        ...(action.fileWriter ? { fileWriter: action.fileWriter } : {}),
        ...(action.existingFiles
          ? { existingFiles: action.existingFiles }
          : {}),
      },
    );

    return validateInceptionFlowState({
      ...current,
      session: {
        ...current.session,
        status:
          result.status === "applied" ? "approved" : current.session.status,
        updatedAt: now,
      },
      currentStep: "scaffold-applied",
      result,
      isComplete: result.status === "applied",
      updatedAt: now,
    });
  }

  return current;
}

export function generateFlowReviewCard(
  state: InceptionFlowState,
): FlowReviewCard {
  const current = validateInceptionFlowState(state);

  if (current.currentStep === "discovery") {
    const answeredCount = current.session.answers.length;
    const totalQuestions = current.session.questions.length;
    return {
      stepName: "Discovery & Requirements",
      summaryLines: [
        `Idea: ${current.session.idea}`,
        `Progress: ${answeredCount}/${totalQuestions} questions answered`,
        `Status: ${current.session.status}`,
      ],
      isActionRequired: true,
    };
  }

  if (current.currentStep === "review") {
    return {
      stepName: "Architecture Blueprint Review",
      summaryLines: [
        `Blueprint Name: ${current.blueprint?.name ?? "N/A"}`,
        `Topology: ${current.blueprint?.topology ?? "N/A"}`,
        `Digest: ${current.blueprint?.digest ?? "N/A"}`,
      ],
      isActionRequired: true,
    };
  }

  if (current.currentStep === "scaffold-planned") {
    return {
      stepName: "Scaffold Plan Preview",
      summaryLines: [
        `Plan ID: ${current.plan?.planId ?? "N/A"}`,
        `Files to Create: ${current.plan?.files.length ?? 0}`,
        `Approval Status: ${current.approval?.status ?? "N/A"}`,
      ],
      isActionRequired: true,
    };
  }

  if (current.currentStep === "scaffold-applied") {
    return {
      stepName: "Scaffold Applied",
      summaryLines: [
        `Result Status: ${current.result?.status ?? "N/A"}`,
        `Written Files: ${current.result?.writtenFiles.length ?? 0}`,
        `Applied At: ${current.result?.appliedAt ?? 0}`,
      ],
      isActionRequired: false,
    };
  }

  return {
    stepName: "Cancelled",
    summaryLines: ["Inception flow was cancelled."],
    isActionRequired: false,
  };
}

export * from "./inception-w1.js";
