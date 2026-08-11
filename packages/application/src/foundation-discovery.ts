import type {
  FoundationWorkshopState,
  FoundationConflict,
} from "@intentloom/protocol";
import { validateFoundationConflict } from "@intentloom/validator";

function answerValue(
  workshop: FoundationWorkshopState,
  questionId: string,
): string | undefined {
  return workshop.answers.find((answer) => answer.questionId === questionId)
    ?.value;
}

export function identifyFoundationConflicts(
  workshop: FoundationWorkshopState,
): readonly FoundationConflict[] {
  const conflicts: FoundationConflict[] = [];

  const offlineRequired = answerValue(workshop, "fq8_offline_required");
  const cloudOnly = workshop.constraints.some(
    (constraint) =>
      constraint.kind === "hard" &&
      constraint.description.toLowerCase().includes("cloud-only"),
  );
  if (offlineRequired === "yes" && cloudOnly) {
    conflicts.push(
      validateFoundationConflict({
        questionId: "fq8_offline_required",
        conflict:
          "Offline/local-first requirement conflicts with a hard cloud-only constraint.",
        severity: "error",
      }),
    );
  }

  const securitySensitivity = answerValue(workshop, "fq6_security");
  const noSecurityScenario = !workshop.qualityScenarios.some(
    (scenario) =>
      scenario.category === "security" &&
      scenario.sensitivity !== "unclassified",
  );
  if (securitySensitivity === "high" && noSecurityScenario) {
    conflicts.push(
      validateFoundationConflict({
        questionId: "fq6_security",
        conflict:
          "High security sensitivity was declared but no classified security quality scenario exists.",
        severity: "warning",
      }),
    );
  }

  return conflicts;
}
