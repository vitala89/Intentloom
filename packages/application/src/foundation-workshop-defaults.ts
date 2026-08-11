import { randomBytes } from "node:crypto";
import type {
  FoundationWorkshopState,
  FoundationQuestion,
  FoundationAnswer,
  FoundationActor,
  FoundationWorkflow,
  FoundationQualityScenario,
  FoundationChangeScenario,
} from "@intentloom/protocol";

export const DEFAULT_FOUNDATION_QUESTIONS: readonly FoundationQuestion[] = [
  {
    id: "fq1_problem",
    prompt: "What primary problem or need does this initiative address?",
    category: "intent",
    required: true,
  },
  {
    id: "fq2_outcome",
    prompt: "What is the smallest useful outcome for the first release?",
    category: "intent",
    required: true,
  },
  {
    id: "fq3_non_goals",
    prompt: "What is explicitly out of scope for the first release?",
    category: "intent",
    required: false,
  },
  {
    id: "fq4_primary_actor",
    prompt: "Who is the primary user or actor?",
    category: "actors",
    required: true,
  },
  {
    id: "fq5_workflow",
    prompt: "Describe the primary workflow this initiative must support.",
    category: "domain",
    required: true,
  },
  {
    id: "fq6_security",
    prompt: "What is the security and privacy sensitivity level?",
    category: "quality",
    required: true,
    options: ["not-applicable", "low", "medium", "high"],
  },
  {
    id: "fq7_change_scenario",
    prompt: "Name one strategically important future change scenario.",
    category: "change",
    required: true,
  },
  {
    id: "fq8_offline_required",
    prompt: "Must the solution work offline or local-first?",
    category: "quality",
    required: false,
    options: ["yes", "no", "partial"],
  },
];

export function createDefaultFoundationWorkshopId(now: number): string {
  return `fnd_${randomBytes(4).toString("hex")}_${now}`;
}

export function applyAnswerToWorkshopState(
  workshop: FoundationWorkshopState,
  answer: FoundationAnswer,
): FoundationWorkshopState {
  const value = answer.value.trim();
  let next: FoundationWorkshopState = { ...workshop, updatedAt: Date.now() };

  if (answer.questionId === "fq1_problem" && value.length > 0) {
    next = { ...next, problemStatement: value };
  }
  if (answer.questionId === "fq2_outcome" && value.length > 0) {
    next = { ...next, smallestOutcome: value };
  }
  if (answer.questionId === "fq3_non_goals" && value.length > 0) {
    const goals = value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    next = {
      ...next,
      nonGoals: goals.length > 0 ? goals : [value],
    };
  }
  if (answer.questionId === "fq4_primary_actor" && value.length > 0) {
    const actor: FoundationActor = {
      id: "actor_primary",
      name: value,
      role: "primary-user",
      description: value,
    };
    next = {
      ...next,
      actors: next.actors.some((entry) => entry.id === actor.id)
        ? next.actors
        : [...next.actors, actor],
    };
  }
  if (answer.questionId === "fq5_workflow" && value.length > 0) {
    const workflow: FoundationWorkflow = {
      id: "workflow_primary",
      name: "Primary workflow",
      description: value,
      primaryActorId: "actor_primary",
    };
    next = {
      ...next,
      workflows: next.workflows.some((entry) => entry.id === workflow.id)
        ? next.workflows
        : [...next.workflows, workflow],
    };
  }
  if (answer.questionId === "fq6_security" && value.length > 0) {
    const sensitivity =
      value === "not-applicable" ||
      value === "low" ||
      value === "medium" ||
      value === "high"
        ? value
        : "unclassified";
    const scenario: FoundationQualityScenario = {
      id: "quality_security_primary",
      category: "security",
      description: "Primary security and privacy sensitivity",
      sensitivity,
      expectation: `Sensitivity classified as ${sensitivity}`,
    };
    next = {
      ...next,
      qualityScenarios: next.qualityScenarios.some(
        (entry) => entry.id === scenario.id,
      )
        ? next.qualityScenarios.map((entry) =>
            entry.id === scenario.id ? scenario : entry,
          )
        : [...next.qualityScenarios, scenario],
    };
  }
  if (answer.questionId === "fq7_change_scenario" && value.length > 0) {
    const scenario: FoundationChangeScenario = {
      id: "change_primary",
      name: value,
      description: value,
      importance: "strategic",
      reviewed: true,
    };
    next = {
      ...next,
      changeScenarios: next.changeScenarios.some(
        (entry) => entry.id === scenario.id,
      )
        ? next.changeScenarios
        : [...next.changeScenarios, scenario],
    };
  }

  return next;
}
