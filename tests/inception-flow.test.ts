import { describe, expect, it } from "vitest";
import {
  initializeInceptionFlow,
  advanceInceptionFlow,
  generateFlowReviewCard,
  approveBlueprint,
} from "@intentloom/application";
import { validateInceptionFlowState } from "@intentloom/validator";

describe("Project Inception Desktop & TUI Product Flow (Phase I9)", () => {
  it("orchestrates full guided flow from discovery to scaffold-applied", () => {
    let flow = initializeInceptionFlow("/tmp/flow-test", "Flow Test Product");
    expect(flow.currentStep).toBe("discovery");
    expect(flow.isComplete).toBe(false);

    // Answer required questions
    for (const q of flow.session.questions) {
      if (q.required) {
        flow = advanceInceptionFlow(flow, {
          type: "record-answer",
          answer: {
            questionId: q.id,
            value: q.options?.[0] ?? "default",
            confidence: "confirmed",
            timestamp: Date.now(),
          },
        });
      }
    }

    // Should transition to review with proposed blueprint
    expect(flow.currentStep).toBe("review");
    expect(flow.blueprint).toBeDefined();

    const reviewCard = generateFlowReviewCard(flow);
    expect(reviewCard.stepName).toBe("Architecture Blueprint Review");
    expect(reviewCard.isActionRequired).toBe(true);

    // Approve blueprint
    const approval = approveBlueprint(flow.blueprint!);
    flow = advanceInceptionFlow(flow, {
      type: "approve-blueprint",
      approval,
    });

    expect(flow.currentStep).toBe("scaffold-planned");
    expect(flow.plan).toBeDefined();

    // Apply scaffold
    const writtenFiles: Record<string, string> = {};
    flow = advanceInceptionFlow(flow, {
      type: "apply-scaffold",
      fileWriter: (path, content) => {
        writtenFiles[path] = content;
      },
    });

    expect(flow.currentStep).toBe("scaffold-applied");
    expect(flow.isComplete).toBe(true);
    expect(flow.result?.status).toBe("applied");
    expect(Object.keys(writtenFiles).length).toBeGreaterThan(0);

    const finalCard = generateFlowReviewCard(flow);
    expect(finalCard.stepName).toBe("Scaffold Applied");
    expect(finalCard.isActionRequired).toBe(false);
  });

  it("supports cancelling the flow safely at any step", () => {
    let flow = initializeInceptionFlow(
      "/tmp/cancel-test",
      "Cancel Test Product",
    );
    expect(flow.currentStep).toBe("discovery");

    flow = advanceInceptionFlow(flow, { type: "cancel" });
    expect(flow.currentStep).toBe("cancelled");
    expect(flow.session.status).toBe("cancelled");
    expect(flow.isComplete).toBe(true);

    const card = generateFlowReviewCard(flow);
    expect(card.stepName).toBe("Cancelled");
    expect(card.isActionRequired).toBe(false);
  });

  it("validates inception flow state strictly", () => {
    expect(() => validateInceptionFlowState(null)).toThrow("expected object");
    expect(() =>
      validateInceptionFlowState({
        session: {
          id: "s1",
          root: "/tmp",
          idea: "test",
          status: "discovering",
          questions: [],
          answers: [],
          constraints: [],
          assumptions: [],
          alternatives: [],
          createdAt: 1000,
          updatedAt: 1000,
        },
        currentStep: "invalid_step",
        isComplete: false,
        updatedAt: 1000,
      }),
    ).toThrow("Invalid flow.currentStep");
  });
});
