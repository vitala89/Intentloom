import { afterEach, describe, expect, it } from "vitest";
import {
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  evaluateFoundationWorkshopReadiness,
  getFoundationWorkshopViewmodel,
  listFoundationQuestions,
  summarizeFoundationUnderstandingViewmodel,
} from "@intentloom/application";
import {
  FOUNDATION_QUESTION_LIST_SCHEMA_URN,
  FOUNDATION_READINESS_REPORT_SCHEMA_URN,
  FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN,
  FOUNDATION_WORKSHOP_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateFoundationReadinessReport,
  validateVersionedFoundationWorkshop,
} from "@intentloom/validator";

afterEach(() => {
  clearFoundationWorkshopStore();
});

describe("Engineering Workspace W2: foundation schema URNs", () => {
  it("wraps stored workshops with versioned schema URNs", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-urn-test",
      idea: "URN contract test workshop",
      workshopId: "fnd_fixture_urn_test",
    });
    const wrapped = validateVersionedFoundationWorkshop(
      getFoundationWorkshopViewmodel(workshop.id),
    );
    expect(wrapped.schemaVersion).toBe(FOUNDATION_WORKSHOP_SCHEMA_URN);
    expect(wrapped.workshop.id).toBe(workshop.id);
  });

  it("lists pending questions with a versioned question-list envelope", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-questions-test",
      idea: "Question list test",
      workshopId: "fnd_fixture_questions_test",
    });
    const questions = listFoundationQuestions(workshop.id);
    expect(questions.schemaVersion).toBe(FOUNDATION_QUESTION_LIST_SCHEMA_URN);
    expect(questions.pendingQuestionIds.length).toBeGreaterThan(0);
  });

  it("summarizes understanding through the versioned summary contract", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-summary-test",
      idea: "Summary test",
      workshopId: "fnd_fixture_summary_test",
    });
    const summary = summarizeFoundationUnderstandingViewmodel(workshop.id);
    expect(summary.schemaVersion).toBe(
      FOUNDATION_UNDERSTANDING_SUMMARY_SCHEMA_URN,
    );
    expect(summary.workshopId).toBe(workshop.id);
  });

  it("evaluates readiness through the versioned readiness report contract", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-readiness-test",
      idea: "Readiness test",
      workshopId: "fnd_fixture_readiness_test",
    });
    const report = evaluateFoundationWorkshopReadiness(workshop.id);
    const validated = validateFoundationReadinessReport(report);
    expect(validated.schemaVersion).toBe(
      FOUNDATION_READINESS_REPORT_SCHEMA_URN,
    );
    expect(validated.readinessStatus).toBe("blocked");
  });
});
