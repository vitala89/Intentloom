import type {
  InceptionSessionState,
  InceptionQuestion,
  InceptionAnswer,
} from "@intentloom/protocol";
import {
  validateInceptionQuestion,
  validateInceptionAnswer,
  validateInceptionSessionState,
} from "@intentloom/validator";
import {
  deleteInceptionSessionStoreEntry,
  getInceptionSessionStoreEntry,
  registerInceptionSession,
  updateInceptionSessionStoreEntry,
} from "./inception-session-store.js";
import {
  buildInceptionConflictList,
  buildInceptionQuestionList,
  buildInceptionSessionDeleteResult,
  buildInceptionSessionExport,
  buildInceptionSessionViewmodel,
  buildVersionedInceptionSummary,
} from "./inception-viewmodel.js";
import { identifyInceptionConflicts } from "./inception-discovery.js";

export interface CreateInceptionSessionParams {
  readonly root: string;
  readonly idea: string;
  readonly initialQuestions?: readonly InceptionQuestion[];
  readonly sessionId?: string;
}

export interface InceptionSummary {
  readonly sessionId: string;
  readonly root: string;
  readonly idea: string;
  readonly status: string;
  readonly totalQuestions: number;
  readonly answeredQuestions: number;
  readonly pendingQuestions: number;
  readonly confirmedAnswers: number;
  readonly assumptionsCount: number;
  readonly constraintsCount: number;
  readonly alternativesCount: number;
}

const DEFAULT_STARTER_QUESTIONS: readonly InceptionQuestion[] = [
  {
    id: "q1_target_audience",
    prompt: "Who is the primary audience or consumer for this project?",
    category: "product",
    required: true,
  },
  {
    id: "q2_architecture_style",
    prompt:
      "What is the intended architectural topology (single package, monorepo, CLI, web app)?",
    category: "architecture",
    required: true,
    options: [
      "single-package",
      "pnpm-workspace",
      "cli-tool",
      "web-product",
      "desktop-product",
    ],
  },
  {
    id: "q3_framework_neutrality",
    prompt:
      "Should core business logic remain independent of UI or external framework dependencies?",
    category: "architecture",
    required: true,
    options: ["yes", "no"],
  },
  {
    id: "q4_testing_strategy",
    prompt:
      "What testing framework and quality verification strategy should be configured?",
    category: "tooling",
    required: false,
    options: ["vitest", "jest", "custom"],
  },
];

export function createInceptionSession(
  params: CreateInceptionSessionParams,
): InceptionSessionState {
  if (typeof params.root !== "string" || params.root.trim().length === 0) {
    throw new Error("createInceptionSession requires a non-empty root path");
  }
  if (typeof params.idea !== "string" || params.idea.trim().length === 0) {
    throw new Error(
      "createInceptionSession requires a non-empty idea statement",
    );
  }

  const questions = (params.initialQuestions ?? DEFAULT_STARTER_QUESTIONS).map(
    validateInceptionQuestion,
  );
  const now = Date.now();
  const id =
    params.sessionId ??
    `inc_${Math.random().toString(36).substring(2, 10)}_${now}`;

  const session: InceptionSessionState = {
    id,
    root: params.root,
    idea: params.idea,
    status: "discovering",
    questions,
    answers: [],
    constraints: [],
    assumptions: [],
    alternatives: [],
    createdAt: now,
    updatedAt: now,
  };

  return registerInceptionSession(validateInceptionSessionState(session));
}

export function getInceptionSession(sessionId: string): InceptionSessionState {
  const session = getInceptionSessionStoreEntry(sessionId);
  if (session === undefined) {
    throw new Error(`unknown inception session '${sessionId}'`);
  }
  return validateInceptionSessionState(session);
}

export function listInceptionQuestions(
  sessionId: string,
  options?: { readonly pendingOnly?: boolean },
) {
  const session = getInceptionSession(sessionId);
  const list = buildInceptionQuestionList({
    sessionId: session.id,
    questions: session.questions,
    answers: session.answers,
  });
  if (options?.pendingOnly) {
    const pending = new Set(list.pendingQuestionIds);
    return {
      ...list,
      questions: list.questions.filter((question) => pending.has(question.id)),
    };
  }
  return list;
}

export function deleteInceptionSession(sessionId: string) {
  deleteInceptionSessionStoreEntry(sessionId);
  return buildInceptionSessionDeleteResult(sessionId);
}

export function exportInceptionSessionJson(sessionId: string) {
  const session = getInceptionSession(sessionId);
  return buildInceptionSessionExport(session);
}

export function getInceptionSessionViewmodel(sessionId: string) {
  const session = getInceptionSession(sessionId);
  return buildInceptionSessionViewmodel(session);
}

export function summarizeInceptionSessionViewmodel(sessionId: string) {
  return buildVersionedInceptionSummary(
    summarizeInceptionState(getInceptionSession(sessionId)),
  );
}

export function identifyInceptionSessionConflicts(sessionId: string) {
  const session = getInceptionSession(sessionId);
  return buildInceptionConflictList({
    sessionId: session.id,
    conflicts: identifyInceptionConflicts(session),
  });
}

export function recordInceptionSessionAnswer(
  sessionId: string,
  rawAnswer: InceptionAnswer,
): InceptionSessionState {
  return recordInceptionAnswer(getInceptionSession(sessionId), rawAnswer);
}

export function recordInceptionAnswer(
  session: InceptionSessionState,
  rawAnswer: InceptionAnswer,
): InceptionSessionState {
  const validatedSession = validateInceptionSessionState(session);
  const validatedAnswer = validateInceptionAnswer(rawAnswer);

  const questionExists = validatedSession.questions.some(
    (q) => q.id === validatedAnswer.questionId,
  );
  if (!questionExists) {
    throw new Error(
      `Cannot record answer: question '${validatedAnswer.questionId}' does not exist in session`,
    );
  }

  const updatedAnswers = [
    ...validatedSession.answers.filter(
      (a) => a.questionId !== validatedAnswer.questionId,
    ),
    validatedAnswer,
  ];

  const allRequiredAnswered = validatedSession.questions
    .filter((q) => q.required)
    .every((q) => updatedAnswers.some((a) => a.questionId === q.id));

  const updatedSession: InceptionSessionState = {
    ...validatedSession,
    answers: updatedAnswers,
    status: allRequiredAnswered ? "blueprinting" : "discovering",
    updatedAt: Date.now(),
  };

  return updateInceptionSessionStoreEntry(
    validateInceptionSessionState(updatedSession),
  );
}

export function summarizeInceptionState(
  session: InceptionSessionState,
): InceptionSummary {
  const validated = validateInceptionSessionState(session);
  const totalQuestions = validated.questions.length;
  const answeredQuestions = validated.answers.length;
  const pendingQuestions = totalQuestions - answeredQuestions;
  const confirmedAnswers = validated.answers.filter(
    (a) => a.confidence === "confirmed",
  ).length;

  return {
    sessionId: validated.id,
    root: validated.root,
    idea: validated.idea,
    status: validated.status,
    totalQuestions,
    answeredQuestions,
    pendingQuestions,
    confirmedAnswers,
    assumptionsCount: validated.assumptions.length,
    constraintsCount: validated.constraints.length,
    alternativesCount: validated.alternatives.length,
  };
}

export function exportInceptionSessionMarkdown(
  session: InceptionSessionState,
): string {
  const validated = validateInceptionSessionState(session);
  const lines: string[] = [];

  lines.push(`# Project Inception Session: ${validated.id}`);
  lines.push("");
  lines.push(`- **Root Target:** \`${validated.root}\``);
  lines.push(`- **Status:** \`${validated.status}\``);
  lines.push(`- **Idea Statement:** ${validated.idea}`);
  lines.push(`- **Created:** ${new Date(validated.createdAt).toISOString()}`);
  lines.push(`- **Updated:** ${new Date(validated.updatedAt).toISOString()}`);
  lines.push("");
  lines.push("## Questions & Answers");
  lines.push("");

  for (const q of validated.questions) {
    const ans = validated.answers.find((a) => a.questionId === q.id);
    lines.push(`### ${q.prompt}`);
    lines.push(
      `- **Category:** \`${q.category}\` | **Required:** \`${q.required}\``,
    );
    if (ans) {
      lines.push(`- **Answer:** ${ans.value}`);
      lines.push(`- **Confidence:** \`${ans.confidence}\``);
    } else {
      lines.push("- **Answer:** *(Pending)*");
    }
    lines.push("");
  }

  if (validated.constraints.length > 0) {
    lines.push("## Confirmed Constraints");
    lines.push("");
    for (const c of validated.constraints) {
      lines.push(
        `- **[${c.kind.toUpperCase()}]** (${c.scope}): ${c.description}`,
      );
    }
    lines.push("");
  }

  if (validated.assumptions.length > 0) {
    lines.push("## Working Assumptions");
    lines.push("");
    for (const a of validated.assumptions) {
      lines.push(`- **[${a.status.toUpperCase()}]** ${a.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
