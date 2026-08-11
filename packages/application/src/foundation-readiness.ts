import type {
  FoundationWorkshopState,
  FoundationReadinessFinding,
  FoundationReadinessStatus,
} from "@intentloom/protocol";
import { validateFoundationReadinessFinding } from "@intentloom/validator";

function finding(
  id: string,
  ruleGroup: string,
  severity: FoundationReadinessFinding["severity"],
  message: string,
  resolved: boolean,
): FoundationReadinessFinding {
  return validateFoundationReadinessFinding({
    id,
    ruleGroup,
    severity,
    message,
    resolved,
  });
}

function answerValue(
  workshop: FoundationWorkshopState,
  questionId: string,
): string | undefined {
  return workshop.answers.find((answer) => answer.questionId === questionId)
    ?.value;
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function evaluateFoundationReadinessFindings(
  workshop: FoundationWorkshopState,
): readonly FoundationReadinessFinding[] {
  const findings: FoundationReadinessFinding[] = [];

  const problemRecorded =
    hasText(workshop.problemStatement) ||
    hasText(answerValue(workshop, "fq1_problem"));
  findings.push(
    finding(
      "required-understanding-problem",
      "required-understanding",
      problemRecorded ? "info" : "blocking",
      problemRecorded
        ? "Primary problem is recorded."
        : "Primary problem must be recorded.",
      problemRecorded,
    ),
  );

  const outcomeRecorded =
    hasText(workshop.smallestOutcome) ||
    hasText(answerValue(workshop, "fq2_outcome"));
  findings.push(
    finding(
      "required-understanding-outcome",
      "required-understanding",
      outcomeRecorded ? "info" : "blocking",
      outcomeRecorded
        ? "Smallest useful outcome is recorded."
        : "Smallest useful outcome must be recorded.",
      outcomeRecorded,
    ),
  );

  const actorPresent =
    workshop.actors.length > 0 ||
    hasText(answerValue(workshop, "fq4_primary_actor"));
  findings.push(
    finding(
      "required-understanding-actor",
      "required-understanding",
      actorPresent ? "info" : "blocking",
      actorPresent
        ? "At least one primary actor is identified."
        : "At least one primary actor must be identified.",
      actorPresent,
    ),
  );

  const nonGoalsVisible =
    workshop.nonGoals.length > 0 ||
    hasText(answerValue(workshop, "fq3_non_goals"));
  findings.push(
    finding(
      "required-understanding-non-goals",
      "required-understanding",
      nonGoalsVisible ? "info" : "warning",
      nonGoalsVisible
        ? "First-release non-goals are visible."
        : "First-release non-goals should be recorded.",
      nonGoalsVisible,
    ),
  );

  const workflowPresent =
    workshop.workflows.length > 0 ||
    hasText(answerValue(workshop, "fq5_workflow"));
  findings.push(
    finding(
      "required-domain-workflow",
      "required-domain-evidence",
      workflowPresent ? "info" : "blocking",
      workflowPresent
        ? "Primary workflow is represented."
        : "Primary workflow must be represented.",
      workflowPresent,
    ),
  );

  const qualityClassified =
    workshop.qualityScenarios.some(
      (scenario) => scenario.sensitivity !== "unclassified",
    ) || hasText(answerValue(workshop, "fq6_security"));
  findings.push(
    finding(
      "required-quality-evidence",
      "required-quality-evidence",
      qualityClassified ? "info" : "blocking",
      qualityClassified
        ? "Quality sensitivity is classified."
        : "Security/privacy or quality sensitivity must be classified.",
      qualityClassified,
    ),
  );

  const changeReviewed =
    workshop.changeScenarios.some((scenario) => scenario.reviewed) ||
    hasText(answerValue(workshop, "fq7_change_scenario"));
  findings.push(
    finding(
      "required-change-evidence",
      "required-future-change-evidence",
      changeReviewed ? "info" : "blocking",
      changeReviewed
        ? "At least one change scenario is reviewed."
        : "At least one strategically important change scenario must be reviewed.",
      changeReviewed,
    ),
  );

  const hardConstraints = workshop.constraints.filter(
    (constraint) => constraint.kind === "hard",
  );
  const conflictingHard = hardConstraints.some((left) =>
    hardConstraints.some(
      (right) =>
        left.id !== right.id &&
        left.scope === right.scope &&
        left.description !== right.description,
    ),
  );
  findings.push(
    finding(
      "blocking-hard-constraints",
      "blocking-rules",
      conflictingHard ? "blocking" : "info",
      conflictingHard
        ? "Conflicting hard constraints detected in the same scope."
        : "No conflicting hard constraints detected.",
      !conflictingHard,
    ),
  );

  const answeredRequired = new Set(
    workshop.answers.map((answer) => answer.questionId),
  );
  const missingRequired = workshop.questions
    .filter(
      (question) => question.required && !answeredRequired.has(question.id),
    )
    .map((question) => question.id);
  const requiredComplete = missingRequired.length === 0;
  findings.push(
    finding(
      "required-questions-complete",
      "required-understanding",
      requiredComplete ? "info" : "blocking",
      requiredComplete
        ? "All required foundation questions are answered."
        : `Missing required answers: ${missingRequired.join(", ")}`,
      requiredComplete,
    ),
  );

  return findings;
}

export function resolveFoundationReadinessStatus(
  findings: readonly FoundationReadinessFinding[],
): FoundationReadinessStatus {
  const unresolvedBlocking = findings.some(
    (entry) => entry.severity === "blocking" && !entry.resolved,
  );
  if (unresolvedBlocking) return "blocked";
  const unresolvedWarning = findings.some(
    (entry) => entry.severity === "warning" && !entry.resolved,
  );
  if (unresolvedWarning) return "ready-with-warnings";
  return "ready";
}
