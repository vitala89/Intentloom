import { describe, expect, it } from "vitest";
import {
  createInceptionSession,
  recordInceptionAnswer,
  generateAdaptiveInceptionQuestions,
  identifyInceptionConflicts,
  evaluateDiscoveryCompleteness,
} from "@intentloom/application";
import { validateInceptionConflict } from "@intentloom/validator";

describe("Project Inception Neutron Discovery Loop (Phase I2)", () => {
  it("evaluates discovery completeness based on required questions", () => {
    let session = createInceptionSession({
      root: "/tmp/discovery-test",
      idea: "High-performance logging framework",
    });

    let status = evaluateDiscoveryCompleteness(session);
    expect(status.isComplete).toBe(false);
    expect(status.remainingRequiredCount).toBeGreaterThan(0);

    const required = session.questions.filter((q) => q.required);
    for (const q of required) {
      session = recordInceptionAnswer(session, {
        questionId: q.id,
        value: "Confirmed choice",
        confidence: "confirmed",
        timestamp: Date.now(),
      });
    }

    status = evaluateDiscoveryCompleteness(session);
    expect(status.isComplete).toBe(true);
    expect(status.remainingRequiredCount).toBe(0);
    expect(status.missingRequiredQuestionIds).toEqual([]);
  });

  it("generates adaptive questions scaled by effort profile", async () => {
    const session = createInceptionSession({
      root: "/tmp/adaptive-test",
      idea: "Distributed task queue",
    });

    const lowQuestions = await generateAdaptiveInceptionQuestions(session, {
      effort: "low",
    });
    expect(lowQuestions).toEqual([]);

    const medQuestions = await generateAdaptiveInceptionQuestions(session, {
      effort: "medium",
    });
    expect(medQuestions.length).toBeGreaterThan(0);
    expect(medQuestions.every((q) => q.category === "security")).toBe(true);

    const highQuestions = await generateAdaptiveInceptionQuestions(session, {
      effort: "high",
    });
    expect(highQuestions.length).toBeGreaterThan(medQuestions.length);
  });

  it("identifies logical requirement conflicts in recorded answers", () => {
    let session = createInceptionSession({
      root: "/tmp/conflict-test",
      idea: "Conflicting project setup",
    });

    session = recordInceptionAnswer(session, {
      questionId: "q3_framework_neutrality",
      value: "yes",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    session = recordInceptionAnswer(session, {
      questionId: "q2_architecture_style",
      value: "web-product",
      confidence: "confirmed",
      timestamp: Date.now(),
    });

    const conflicts = identifyInceptionConflicts(session);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].questionId).toBe("q3_framework_neutrality");
    expect(conflicts[0].severity).toBe("warning");
  });

  it("validates inception conflict data shapes strictly", () => {
    expect(() => validateInceptionConflict(null)).toThrow("expected object");
    expect(() =>
      validateInceptionConflict({
        questionId: "q1",
        conflict: "test",
        severity: "invalid_severity",
      }),
    ).toThrow("Invalid conflict.severity");

    const valid = validateInceptionConflict({
      questionId: "q1",
      conflict: "Description of conflict",
      severity: "error",
    });
    expect(valid.questionId).toBe("q1");
    expect(valid.severity).toBe("error");
  });
});
