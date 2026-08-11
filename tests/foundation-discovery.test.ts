import { afterEach, describe, expect, it } from "vitest";
import {
  clearFoundationWorkshopStore,
  createFoundationWorkshop,
  discoverFoundationAdaptiveQuestions,
  evaluateFoundationDiscoveryCompletenessForWorkshop,
  getFoundationWorkshop,
  recordFoundationWorkshopAnswer,
  runFoundationDiscoveryTurn,
  runFoundationCliCommand,
  summarizeFoundationUnderstandingViewmodel,
} from "@intentloom/application";
import {
  FOUNDATION_DISCOVERY_COMPLETENESS_SCHEMA_URN,
  FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
  FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
} from "@intentloom/protocol";

afterEach(() => {
  clearFoundationWorkshopStore();
});

describe("Engineering Workspace W3: foundation Neutron discovery", () => {
  it("generates effort-scaled adaptive questions without mutating workshop state", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-discovery-test",
      idea: "Local-first project planning tool",
      workshopId: "fnd_fixture_discovery_effort",
    });
    const before = getFoundationWorkshop(workshop.id);

    const low = discoverFoundationAdaptiveQuestions(workshop.id, {
      effort: "low",
    });
    expect(low.schemaVersion).toBe(
      FOUNDATION_DISCOVERY_QUESTION_LIST_SCHEMA_URN,
    );
    expect(low.questions).toHaveLength(0);

    const medium = discoverFoundationAdaptiveQuestions(workshop.id, {
      effort: "medium",
    });
    expect(medium.questions.length).toBe(2);
    expect(medium.questions.map((question) => question.id)).toEqual([
      "fq9_compliance",
      "fq10_accessibility",
    ]);

    const high = discoverFoundationAdaptiveQuestions(workshop.id, {
      effort: "high",
    });
    expect(high.questions.length).toBe(4);

    const after = getFoundationWorkshop(workshop.id);
    expect(after).toEqual(before);
  });

  it("evaluates discovery completeness against required foundation questions", () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-discovery-complete",
      idea: "Completeness test",
      workshopId: "fnd_fixture_discovery_complete",
    });
    const initial = evaluateFoundationDiscoveryCompletenessForWorkshop(
      workshop.id,
    );
    expect(initial.schemaVersion).toBe(
      FOUNDATION_DISCOVERY_COMPLETENESS_SCHEMA_URN,
    );
    expect(initial.isComplete).toBe(false);
    expect(initial.remainingRequiredCount).toBeGreaterThan(0);

    recordFoundationWorkshopAnswer(workshop.id, {
      questionId: "fq1_problem",
      value: "Reduce planning friction",
      confidence: "confirmed",
      timestamp: Date.now(),
    });
    const partial = evaluateFoundationDiscoveryCompletenessForWorkshop(
      workshop.id,
    );
    expect(partial.isComplete).toBe(false);
    expect(partial.remainingRequiredCount).toBeLessThan(
      initial.remainingRequiredCount,
    );
  });

  it("runs a bounded discovery turn with visible provider metadata and no workshop mutation", async () => {
    const workshop = createFoundationWorkshop({
      root: "/tmp/foundation-discovery-turn",
      idea: "Discovery turn test",
      workshopId: "fnd_fixture_discovery_turn",
    });
    const before = getFoundationWorkshop(workshop.id);

    const turn = await runFoundationDiscoveryTurn(workshop.id, {
      effort: "medium",
      turnIndex: 0,
      modelProfile: "offline-deterministic",
    });

    expect(turn.schemaVersion).toBe(FOUNDATION_DISCOVERY_TURN_SCHEMA_URN);
    expect(turn.workshopUnchanged).toBe(true);
    expect(turn.agentStatus).toBe("completed");
    expect(turn.visibility.adapterId).toBe("fake-offline-neutron-discovery");
    expect(turn.visibility.networkMode).toBe("disabled");
    expect(turn.proposedQuestions.length).toBe(2);
    expect(
      turn.proposedQuestions.every((entry) => entry.source === "deterministic"),
    ).toBe(true);

    const after = getFoundationWorkshop(workshop.id);
    expect(after).toEqual(before);
  });

  it("reaches a reviewed understanding summary after human-recorded answers via CLI", async () => {
    const started = await runFoundationCliCommand("start", {
      root: "/tmp/foundation-discovery-cli",
      idea: "CLI discovery flow",
      json: true,
    });
    expect(started.exitCode).toBe(0);
    const workshopId = (
      JSON.parse(started.stdout) as { workshop: { id: string } }
    ).workshop.id;

    const turn = await runFoundationCliCommand("discover-turn", {
      workshopId,
      effort: "high",
      json: true,
    });
    expect(turn.exitCode).toBe(0);
    const turnPayload = JSON.parse(turn.stdout) as {
      schemaVersion: string;
      proposedQuestions: readonly unknown[];
    };
    expect(turnPayload.schemaVersion).toBe(
      FOUNDATION_DISCOVERY_TURN_SCHEMA_URN,
    );
    expect(turnPayload.proposedQuestions.length).toBe(4);

    const summary = await runFoundationCliCommand("summarize", {
      workshopId,
      json: true,
    });
    expect(summary.exitCode).toBe(0);
    expect(summarizeFoundationUnderstandingViewmodel(workshopId)).toEqual(
      JSON.parse(summary.stdout),
    );
  });
});
