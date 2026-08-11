import type {
  FoundationWorkshopState,
  FoundationQuestion,
  FoundationConflict,
  FoundationDiscoveryOptions,
  FoundationDiscoveryEffort,
  FoundationDiscoveryAdaptiveQuestionList,
  FoundationDiscoveryCompleteness,
} from "@intentloom/protocol";
import {
  FOUNDATION_DISCOVERY_COMPLETENESS_SCHEMA_URN,
  FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateFoundationConflict,
  validateFoundationQuestion,
  validateFoundationDiscoveryAdaptiveQuestionList,
  validateFoundationDiscoveryCompleteness,
} from "@intentloom/validator";
import { getFoundationWorkshop } from "./foundation-workshop.js";

const MEDIUM_EFFORT_QUESTIONS: readonly FoundationQuestion[] = [
  {
    id: "fq9_compliance",
    prompt:
      "Are there regulatory, licensing, or compliance constraints that shape delivery?",
    category: "constraints",
    required: false,
  },
  {
    id: "fq10_accessibility",
    prompt: "What accessibility standard or audience must be supported?",
    category: "quality",
    required: false,
    options: ["none", "wcag-2.x", "section-508", "custom"],
  },
];

const HIGH_EFFORT_QUESTIONS: readonly FoundationQuestion[] = [
  ...MEDIUM_EFFORT_QUESTIONS,
  {
    id: "fq11_performance",
    prompt:
      "What performance or scale expectations matter in the first release?",
    category: "quality",
    required: false,
    options: ["none", "low-latency", "high-throughput", "resource-constrained"],
  },
  {
    id: "fq12_integration",
    prompt: "Which external systems or integrations must be planned for early?",
    category: "domain",
    required: false,
  },
];

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

export function generateAdaptiveFoundationQuestions(
  workshop: FoundationWorkshopState,
  options?: FoundationDiscoveryOptions,
): readonly FoundationQuestion[] {
  const effort: FoundationDiscoveryEffort = options?.effort ?? "medium";
  const existingIds = new Set(
    workshop.questions.map((question) => question.id),
  );
  const adaptive: FoundationQuestion[] = [];

  const candidates =
    effort === "high"
      ? HIGH_EFFORT_QUESTIONS
      : effort === "medium"
        ? MEDIUM_EFFORT_QUESTIONS
        : [];

  for (const question of candidates) {
    if (!existingIds.has(question.id)) {
      adaptive.push(validateFoundationQuestion(question));
    }
  }

  return adaptive;
}

export function evaluateFoundationDiscoveryCompleteness(
  workshop: FoundationWorkshopState,
): FoundationDiscoveryCompleteness {
  const answeredQuestionIds = new Set(
    workshop.answers.map((answer) => answer.questionId),
  );
  const missingRequired = workshop.questions
    .filter(
      (question) => question.required && !answeredQuestionIds.has(question.id),
    )
    .map((question) => question.id);

  return validateFoundationDiscoveryCompleteness({
    schemaVersion: FOUNDATION_DISCOVERY_COMPLETENESS_SCHEMA_URN,
    workshopId: workshop.id,
    isComplete: missingRequired.length === 0,
    remainingRequiredCount: missingRequired.length,
    missingRequiredQuestionIds: missingRequired,
  });
}

export function buildFoundationDiscoveryAdaptiveQuestionList(
  workshopId: string,
  effort: FoundationDiscoveryEffort,
  questions: readonly FoundationQuestion[],
): FoundationDiscoveryAdaptiveQuestionList {
  return validateFoundationDiscoveryAdaptiveQuestionList({
    schemaVersion: FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
    workshopId,
    effort,
    questions,
  });
}

export function discoverFoundationAdaptiveQuestions(
  workshopId: string,
  options?: FoundationDiscoveryOptions,
): FoundationDiscoveryAdaptiveQuestionList {
  const workshop = getFoundationWorkshop(workshopId);
  const effort: FoundationDiscoveryEffort = options?.effort ?? "medium";
  const questions = generateAdaptiveFoundationQuestions(workshop, options);
  return buildFoundationDiscoveryAdaptiveQuestionList(
    workshopId,
    effort,
    questions,
  );
}

export function evaluateFoundationDiscoveryCompletenessForWorkshop(
  workshopId: string,
): FoundationDiscoveryCompleteness {
  return evaluateFoundationDiscoveryCompleteness(
    getFoundationWorkshop(workshopId),
  );
}
