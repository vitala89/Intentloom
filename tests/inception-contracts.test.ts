import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  recordInceptionAnswer,
  summarizeInceptionState,
  exportInceptionSessionMarkdown,
} from "@intentloom/application";
import {
  validateInceptionQuestion,
  validateInceptionAnswer,
  validateInceptionSessionState,
} from "@intentloom/validator";

describe("Project Inception Read-Only Contracts & Operations (Phase I1)", () => {
  it("initializes an inception session with default starter questions", () => {
    const session = createInceptionSession({
      root: "/tmp/new-library",
      idea: "A lightweight state management library for TypeScript",
    });

    expect(session.id).toMatch(/^inc_[a-z0-9]+_\d+$/);
    expect(session.root).toBe("/tmp/new-library");
    expect(session.idea).toBe(
      "A lightweight state management library for TypeScript",
    );
    expect(session.status).toBe("discovering");
    expect(session.questions.length).toBeGreaterThanOrEqual(4);
    expect(session.answers).toEqual([]);
    expect(session.constraints).toEqual([]);
    expect(session.assumptions).toEqual([]);
    expect(session.alternatives).toEqual([]);
  });

  it("throws when creating session with empty root or empty idea", () => {
    expect(() =>
      createInceptionSession({ root: "", idea: "Some idea" }),
    ).toThrow("requires a non-empty root path");

    expect(() =>
      createInceptionSession({ root: "/tmp/foo", idea: "   " }),
    ).toThrow("requires a non-empty idea statement");
  });

  it("records answers and transitions to blueprinting status when required questions are answered", () => {
    let session = createInceptionSession({
      root: "/tmp/new-app",
      idea: "CLI developer tool for AST manipulation",
    });

    expect(session.status).toBe("discovering");

    const requiredQuestions = session.questions.filter((q) => q.required);

    for (let i = 0; i < requiredQuestions.length; i++) {
      const q = requiredQuestions[i];
      session = recordInceptionAnswer(session, {
        questionId: q.id,
        value: `Answer for ${q.id}`,
        confidence: "confirmed",
        timestamp: Date.now(),
      });

      if (i < requiredQuestions.length - 1) {
        expect(session.status).toBe("discovering");
      }
    }

    expect(session.status).toBe("blueprinting");
    expect(session.answers.length).toBe(requiredQuestions.length);
  });

  it("throws error when recording answer for non-existent question ID", () => {
    const session = createInceptionSession({
      root: "/tmp/test",
      idea: "Test idea",
    });

    expect(() =>
      recordInceptionAnswer(session, {
        questionId: "q_non_existent_123",
        value: "value",
        confidence: "confirmed",
        timestamp: Date.now(),
      }),
    ).toThrow("question 'q_non_existent_123' does not exist");
  });

  it("summarizes inception state accurately", () => {
    let session = createInceptionSession({
      root: "/tmp/summary-test",
      idea: "Summary test project",
    });

    session = recordInceptionAnswer(session, {
      questionId: session.questions[0].id,
      value: "Developers",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const summary = summarizeInceptionState(session);
    expect(summary.sessionId).toBe(session.id);
    expect(summary.root).toBe("/tmp/summary-test");
    expect(summary.totalQuestions).toBe(session.questions.length);
    expect(summary.answeredQuestions).toBe(1);
    expect(summary.pendingQuestions).toBe(session.questions.length - 1);
    expect(summary.confirmedAnswers).toBe(1);
  });

  it("exports session state into structured Markdown format", () => {
    let session = createInceptionSession({
      root: "/tmp/markdown-test",
      idea: "Markdown export test project",
    });

    session = recordInceptionAnswer(session, {
      questionId: session.questions[0].id,
      value: "Frontend developers",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const md = exportInceptionSessionMarkdown(session);
    expect(md).toContain(`# Project Inception Session: ${session.id}`);
    expect(md).toContain("- **Root Target:** `/tmp/markdown-test`");
    expect(md).toContain("## Questions & Answers");
    expect(md).toContain("- **Answer:** Frontend developers");
  });

  it("validates question, answer, and session types strictly", () => {
    expect(() => validateInceptionQuestion(null)).toThrow("expected object");
    expect(() =>
      validateInceptionQuestion({
        id: "q1",
        prompt: "test",
        category: "invalid_category",
        required: true,
      }),
    ).toThrow("Invalid question category");

    expect(() => validateInceptionAnswer("invalid")).toThrow("expected object");
    expect(() =>
      validateInceptionAnswer({
        questionId: "q1",
        value: "val",
        confidence: "invalid_confidence",
        timestamp: 1000,
      }),
    ).toThrow("Invalid answer confidence");

    expect(() => validateInceptionSessionState({})).toThrow(
      "Invalid inception field",
    );
  });
});
