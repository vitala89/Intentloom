import type {
  FoundationReadinessReport,
  FoundationUnderstandingSummary,
  VersionedFoundationWorkshop,
} from "@intentloom/protocol";
import {
  getFoundationWorkshopViewmodel,
  identifyFoundationWorkshopConflicts,
  summarizeFoundationUnderstandingViewmodel,
} from "./foundation-workshop.js";

export type FoundationClientSurfaceState =
  "empty" | "loading" | "ready" | "error" | "resume" | "deleted";

export interface FoundationQuestionRowViewModel {
  readonly id: string;
  readonly prompt: string;
  readonly category: string;
  readonly required: boolean;
  readonly answered: boolean;
  readonly answerValue?: string;
  readonly confidence?: string;
}

export interface FoundationReadinessFindingRowViewModel {
  readonly id: string;
  readonly ruleGroup: string;
  readonly severity: string;
  readonly message: string;
  readonly resolved: boolean;
}

export interface FoundationWorkshopProgressViewModel {
  readonly workshopId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly retentionStatus: string;
  readonly readinessStatus: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly conflictCount: number;
  readonly blockingFindings: number;
  readonly warningFindings: number;
  readonly progressPercent: number;
  readonly questions: readonly FoundationQuestionRowViewModel[];
  readonly readinessFindings: readonly FoundationReadinessFindingRowViewModel[];
  readonly surfaceState: FoundationClientSurfaceState;
}

export interface FoundationWorkshopShellViewModel {
  readonly headline: string;
  readonly description: string;
  readonly canStart: boolean;
  readonly resumeWorkshopId?: string;
  readonly surfaceState: FoundationClientSurfaceState;
}

function progressPercent(answered: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((answered / total) * 100);
}

function questionRows(
  workshop: VersionedFoundationWorkshop,
): readonly FoundationQuestionRowViewModel[] {
  const answeredByQuestion = new Map(
    workshop.workshop.answers.map((answer) => [answer.questionId, answer]),
  );
  return workshop.workshop.questions.map((question) => {
    const answer = answeredByQuestion.get(question.id);
    return {
      id: question.id,
      prompt: question.prompt,
      category: question.category,
      required: question.required,
      answered: answer !== undefined,
      ...(answer?.value !== undefined ? { answerValue: answer.value } : {}),
      ...(answer?.confidence !== undefined
        ? { confidence: answer.confidence }
        : {}),
    } satisfies FoundationQuestionRowViewModel;
  });
}

function readinessFindingRows(
  workshop: VersionedFoundationWorkshop,
): readonly FoundationReadinessFindingRowViewModel[] {
  return workshop.workshop.readinessFindings.map((finding) => ({
    id: finding.id,
    ruleGroup: finding.ruleGroup,
    severity: finding.severity,
    message: finding.message,
    resolved: finding.resolved,
  }));
}

function countUnresolvedFindings(
  findings: readonly {
    readonly severity: string;
    readonly resolved: boolean;
  }[],
  severity: string,
): number {
  return findings.filter(
    (finding) => finding.severity === severity && !finding.resolved,
  ).length;
}

export function buildFoundationWorkshopProgressViewModel(input: {
  readonly workshop: VersionedFoundationWorkshop;
  readonly summary?: FoundationUnderstandingSummary;
  readonly conflictCount?: number;
  readonly surfaceState?: FoundationClientSurfaceState;
}): FoundationWorkshopProgressViewModel {
  const summary =
    input.summary ??
    summarizeFoundationUnderstandingViewmodel(input.workshop.workshop.id);
  const conflictCount =
    input.conflictCount ??
    identifyFoundationWorkshopConflicts(input.workshop.workshop.id).conflicts
      .length;
  const findings = input.workshop.workshop.readinessFindings;

  return {
    workshopId: input.workshop.workshop.id,
    root: input.workshop.workshop.root,
    idea: input.workshop.workshop.idea,
    status: input.workshop.workshop.status,
    retentionStatus: input.workshop.retention.status,
    readinessStatus: input.workshop.workshop.readinessStatus,
    totalQuestions: summary.totalQuestions,
    answeredQuestions: summary.answeredQuestions,
    pendingQuestions: summary.pendingQuestions,
    conflictCount,
    blockingFindings: countUnresolvedFindings(findings, "blocking"),
    warningFindings: countUnresolvedFindings(findings, "warning"),
    progressPercent: progressPercent(
      summary.answeredQuestions,
      summary.totalQuestions,
    ),
    questions: questionRows(input.workshop),
    readinessFindings: readinessFindingRows(input.workshop),
    surfaceState: input.surfaceState ?? "ready",
  };
}

export function buildFoundationWorkshopProgressFromId(
  workshopId: string,
  surfaceState: FoundationClientSurfaceState = "ready",
): FoundationWorkshopProgressViewModel {
  return buildFoundationWorkshopProgressViewModel({
    workshop: getFoundationWorkshopViewmodel(workshopId),
    surfaceState,
  });
}

export function buildFoundationWorkshopShellViewModel(input: {
  readonly resumeWorkshopId?: string;
  readonly surfaceState?: FoundationClientSurfaceState;
}): FoundationWorkshopShellViewModel {
  const surfaceState = input.surfaceState ?? "empty";
  const shell: FoundationWorkshopShellViewModel = {
    headline: "Foundation workshop",
    description:
      "Establish actors, workflows, quality scenarios, and readiness before blueprinting.",
    canStart: surfaceState !== "loading",
    surfaceState,
  };
  if (input.resumeWorkshopId) {
    return { ...shell, resumeWorkshopId: input.resumeWorkshopId };
  }
  return shell;
}

export function buildFoundationReadinessSummaryViewModel(
  report: FoundationReadinessReport,
) {
  return {
    workshopId: report.workshopId,
    readinessStatus: report.readinessStatus,
    blockingCount: report.blockingCount,
    warningCount: report.warningCount,
    findings: report.findings.map((finding) => ({
      id: finding.id,
      ruleGroup: finding.ruleGroup,
      severity: finding.severity,
      message: finding.message,
      resolved: finding.resolved,
    })),
  };
}
