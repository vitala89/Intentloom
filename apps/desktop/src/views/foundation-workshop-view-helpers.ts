import type {
  FoundationViewmodelPayload,
  VersionedFoundationWorkshop,
} from "@intentloom/protocol";
import type { StatusTone } from "../design/components/status/StatusChip.js";

export type FoundationClientSurfaceState =
  "empty" | "loading" | "ready" | "error" | "resume" | "deleted";

export interface FoundationQuestionRow {
  readonly id: string;
  readonly prompt: string;
  readonly required: boolean;
  readonly answered: boolean;
  readonly answerValue?: string;
  readonly confidence?: string;
}

export interface FoundationReadinessFindingRow {
  readonly id: string;
  readonly ruleGroup: string;
  readonly severity: string;
  readonly message: string;
  readonly resolved: boolean;
}

export interface FoundationWorkshopProgress {
  readonly workshopId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly readinessStatus: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly progressPercent: number;
  readonly conflictCount: number;
  readonly blockingFindings: number;
  readonly warningFindings: number;
  readonly questions: readonly FoundationQuestionRow[];
  readonly readinessFindings: readonly FoundationReadinessFindingRow[];
}

export function extractWorkshopViewmodel(
  payload: FoundationViewmodelPayload,
): VersionedFoundationWorkshop {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("workshop" in payload) ||
    !("retention" in payload) ||
    !("schemaVersion" in payload)
  ) {
    throw new Error("Invalid foundation workshop viewmodel");
  }
  return payload as unknown as VersionedFoundationWorkshop;
}

function countUnresolvedFindings(
  findings: readonly FoundationReadinessFindingRow[],
  severity: string,
): number {
  return findings.filter(
    (finding) => finding.severity === severity && !finding.resolved,
  ).length;
}

export function buildFoundationWorkshopProgress(
  workshop: VersionedFoundationWorkshop,
  conflictCount: number,
): FoundationWorkshopProgress {
  const answeredByQuestion = new Map(
    workshop.workshop.answers.map((answer) => [answer.questionId, answer]),
  );
  const totalQuestions = workshop.workshop.questions.length;
  const answeredQuestions = workshop.workshop.answers.length;
  const pendingQuestions = totalQuestions - answeredQuestions;
  const progressPercent =
    totalQuestions <= 0
      ? 0
      : Math.round((answeredQuestions / totalQuestions) * 100);
  const readinessFindings = workshop.workshop.readinessFindings.map(
    (finding) => ({
      id: finding.id,
      ruleGroup: finding.ruleGroup,
      severity: finding.severity,
      message: finding.message,
      resolved: finding.resolved,
    }),
  );

  return {
    workshopId: workshop.workshop.id,
    root: workshop.workshop.root,
    idea: workshop.workshop.idea,
    status: workshop.workshop.status,
    readinessStatus: workshop.workshop.readinessStatus,
    totalQuestions,
    answeredQuestions,
    pendingQuestions,
    progressPercent,
    conflictCount,
    blockingFindings: countUnresolvedFindings(readinessFindings, "blocking"),
    warningFindings: countUnresolvedFindings(readinessFindings, "warning"),
    questions: workshop.workshop.questions.map((question) => {
      const answer = answeredByQuestion.get(question.id);
      return {
        id: question.id,
        prompt: question.prompt,
        required: question.required,
        answered: answer !== undefined,
        ...(answer?.value !== undefined ? { answerValue: answer.value } : {}),
        ...(answer?.confidence !== undefined
          ? { confidence: answer.confidence }
          : {}),
      } satisfies FoundationQuestionRow;
    }),
    readinessFindings,
  };
}

export function foundationReadinessTone(readinessStatus: string): StatusTone {
  if (readinessStatus === "ready") return "success";
  if (readinessStatus === "ready-with-warnings") return "warning";
  if (readinessStatus === "blocked") return "error";
  return "neutral";
}
