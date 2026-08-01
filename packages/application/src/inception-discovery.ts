import type {
  InceptionSessionState,
  InceptionQuestion,
  InceptionConflict,
  InceptionDiscoveryOptions,
} from "@intentloom/protocol";
import {
  validateInceptionSessionState,
  validateInceptionConflict,
} from "@intentloom/validator";

export interface DiscoveryCompleteness {
  readonly isComplete: boolean;
  readonly remainingRequiredCount: number;
  readonly missingRequiredQuestionIds: readonly string[];
}

const HIGH_EFFORT_SECURITY_QUESTIONS: readonly InceptionQuestion[] = [
  {
    id: "q_sec_isolation",
    prompt: "What sandboxing or process isolation boundaries must be enforced?",
    category: "security",
    required: false,
    options: ["ipc-only", "sandboxed-frame", "node-process-isolation", "none"],
  },
  {
    id: "q_sec_data_privacy",
    prompt:
      "Is external telemetry or cloud-assisted inference strictly forbidden?",
    category: "security",
    required: false,
    options: ["strict-zero-network", "opt-in-cloud", "unrestricted"],
  },
];

const HIGH_EFFORT_TOOLING_QUESTIONS: readonly InceptionQuestion[] = [
  {
    id: "q_tool_ci_automation",
    prompt:
      "What CI workflows should be generated for multi-platform compatibility?",
    category: "tooling",
    required: false,
    options: ["github-actions", "gitlab-ci", "none"],
  },
];

export async function generateAdaptiveInceptionQuestions(
  session: InceptionSessionState,
  options?: InceptionDiscoveryOptions,
): Promise<readonly InceptionQuestion[]> {
  const validated = validateInceptionSessionState(session);
  const effort = options?.effort ?? "medium";
  const existingIds = new Set(validated.questions.map((q) => q.id));

  const adaptive: InceptionQuestion[] = [];

  if (effort === "high") {
    for (const q of [
      ...HIGH_EFFORT_SECURITY_QUESTIONS,
      ...HIGH_EFFORT_TOOLING_QUESTIONS,
    ]) {
      if (!existingIds.has(q.id)) {
        adaptive.push(q);
      }
    }
  } else if (effort === "medium") {
    for (const q of HIGH_EFFORT_SECURITY_QUESTIONS) {
      if (!existingIds.has(q.id)) {
        adaptive.push(q);
      }
    }
  }

  return adaptive;
}

export function identifyInceptionConflicts(
  session: InceptionSessionState,
): readonly InceptionConflict[] {
  const validated = validateInceptionSessionState(session);
  const conflicts: InceptionConflict[] = [];

  const answersMap = new Map(
    validated.answers.map((a) => [a.questionId, a.value]),
  );

  const frameworkNeutral = answersMap.get("q3_framework_neutrality");
  const topology = answersMap.get("q2_architecture_style");

  if (frameworkNeutral === "yes" && topology === "web-product") {
    conflicts.push(
      validateInceptionConflict({
        questionId: "q3_framework_neutrality",
        conflict:
          "Framework-neutral core was requested, but web-product topology binds the architecture to a UI framework.",
        severity: "warning",
      }),
    );
  }

  return conflicts;
}

export function evaluateDiscoveryCompleteness(
  session: InceptionSessionState,
): DiscoveryCompleteness {
  const validated = validateInceptionSessionState(session);
  const answeredQuestionIds = new Set(
    validated.answers.map((a) => a.questionId),
  );

  const missingRequired = validated.questions
    .filter((q) => q.required && !answeredQuestionIds.has(q.id))
    .map((q) => q.id);

  return {
    isComplete: missingRequired.length === 0,
    remainingRequiredCount: missingRequired.length,
    missingRequiredQuestionIds: missingRequired,
  };
}
