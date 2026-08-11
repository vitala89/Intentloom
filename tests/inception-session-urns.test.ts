import { afterEach, describe, expect, it } from "vitest";
import {
  clearInceptionSessionStore,
  createInceptionSession,
  getInceptionSession,
  getInceptionSessionViewmodel,
  listInceptionQuestions,
  summarizeInceptionSessionViewmodel,
} from "@intentloom/application";
import {
  INCEPTION_QUESTION_LIST_SCHEMA_URN,
  INCEPTION_SESSION_SCHEMA_URN,
  INCEPTION_SUMMARY_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateVersionedInceptionSession,
  validateVersionedInceptionSummary,
} from "@intentloom/validator";

afterEach(() => {
  clearInceptionSessionStore();
});

describe("Engineering Workspace W1: inception schema URNs", () => {
  it("wraps stored sessions with versioned schema URNs", () => {
    const session = createInceptionSession({
      root: "/tmp/inception-urn-test",
      idea: "URN contract test session",
      sessionId: "inc_fixture_urn_test",
    });
    const wrapped = validateVersionedInceptionSession(
      getInceptionSessionViewmodel(session.id),
    );
    expect(wrapped.schemaVersion).toBe(INCEPTION_SESSION_SCHEMA_URN);
    expect(getInceptionSession(session.id).id).toBe(session.id);
  });

  it("lists pending questions with a versioned question-list envelope", () => {
    const session = createInceptionSession({
      root: "/tmp/inception-questions-test",
      idea: "Question list test",
      sessionId: "inc_fixture_questions_test",
    });
    const questions = listInceptionQuestions(session.id);
    expect(questions.schemaVersion).toBe(INCEPTION_QUESTION_LIST_SCHEMA_URN);
    expect(questions.pendingQuestionIds.length).toBeGreaterThan(0);
  });

  it("validates versioned summary envelopes", () => {
    const summary = validateVersionedInceptionSummary({
      schemaVersion: INCEPTION_SUMMARY_SCHEMA_URN,
      sessionId: "inc_fixture_summary_complete",
      root: "/tmp/inception-fixture-summary",
      idea: "Deterministic fixture: summary complete",
      status: "blueprinting",
      totalQuestions: 4,
      answeredQuestions: 4,
      pendingQuestions: 0,
      confirmedAnswers: 2,
      assumptionsCount: 0,
      constraintsCount: 0,
      alternativesCount: 0,
    });
    expect(summary.pendingQuestions).toBe(0);
  });

  it("summarizes a stored session through the versioned summary contract", () => {
    const session = createInceptionSession({
      root: "/tmp/inception-summary-test",
      idea: "Summary test",
      sessionId: "inc_fixture_summary_test",
    });
    const summary = summarizeInceptionSessionViewmodel(session.id);
    expect(summary.schemaVersion).toBe(INCEPTION_SUMMARY_SCHEMA_URN);
    expect(summary.sessionId).toBe(session.id);
  });
});
