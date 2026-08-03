import { describe, expect, it } from "vitest";
import type {
  HarnessExecutionRequest,
  HarnessScenario,
} from "@intentloom/protocol";
import {
  createInMemoryHarnessStateStore,
  replayHarnessEvents,
  resumeHarnessExecution,
  type HarnessCheckpointRecord,
} from "../packages/application/src/harness-state.js";

describe("harness durable state, tracing, resume, and replay (Phase H4)", () => {
  const mockScenario: HarnessScenario = {
    schemaVersion: 1,
    scenarioId: "scenario-h4-test",
    title: "Phase H4 Test Scenario",
    description: "Testing state resume and event replay",
    requiredCapabilities: {
      readonlyFs: true,
      writeFs: false,
      processExecution: false,
      networkAccess: false,
      maxDurationMs: 60_000,
      maxMemoryMb: 512,
    },
    steps: [
      { id: "step-1", name: "Step One", action: "inspect" },
      { id: "step-2", name: "Step Two", action: "analyze" },
      { id: "step-3", name: "Step Three", action: "validate" },
    ],
  };

  const mockRequest: HarnessExecutionRequest = {
    schemaVersion: 1,
    requestId: "req-h4-123",
    scenarioId: "scenario-h4-test",
    projectRoot: "/workspace/project-alpha",
    executorType: "local-readonly",
    requestedCapabilities: mockScenario.requiredCapabilities,
    createdTimestamp: 1000,
  };

  describe("state store and checkpoint persistence", () => {
    it("persists checkpoints and queries latest by scenario and project root", async () => {
      const store = createInMemoryHarnessStateStore();

      const cp1: HarnessCheckpointRecord = {
        checkpointId: "cp-1",
        scenarioId: "scenario-h4-test",
        requestId: "req-h4-123",
        projectRoot: "/workspace/project-alpha",
        manifestDigest: "digest-v1",
        timestamp: 1000,
        completedStepIds: ["step-1"],
        status: "passed",
        events: [],
        artifacts: [],
      };

      const cp2: HarnessCheckpointRecord = {
        checkpointId: "cp-2",
        scenarioId: "scenario-h4-test",
        requestId: "req-h4-124",
        projectRoot: "/workspace/project-alpha",
        manifestDigest: "digest-v1",
        timestamp: 2000,
        completedStepIds: ["step-1", "step-2"],
        status: "passed",
        events: [],
        artifacts: [],
      };

      await store.saveCheckpoint(cp1);
      await store.saveCheckpoint(cp2);

      const latest = await store.getLatestCheckpoint(
        "scenario-h4-test",
        "/workspace/project-alpha",
      );
      expect(latest?.checkpointId).toBe("cp-2");
      expect(latest?.completedStepIds).toEqual(["step-1", "step-2"]);
    });

    it("purges checkpoints matching criteria", async () => {
      const store = createInMemoryHarnessStateStore();

      await store.saveCheckpoint({
        checkpointId: "cp-purge-1",
        scenarioId: "sc-1",
        requestId: "req-1",
        projectRoot: "/workspace/purge-me",
        manifestDigest: "dig",
        timestamp: 500,
        completedStepIds: [],
        status: "passed",
        events: [],
        artifacts: [],
      });

      const purgedCount = await store.purge({
        projectRoot: "/workspace/purge-me",
      });
      expect(purgedCount).toBe(1);

      const fetched = await store.getCheckpoint("cp-purge-1");
      expect(fetched).toBeNull();
    });
  });

  describe("resume execution gating", () => {
    it("resumes execution identifying remaining unexecuted steps", async () => {
      const store = createInMemoryHarnessStateStore();
      await store.saveCheckpoint({
        checkpointId: "cp-valid-resume",
        scenarioId: mockScenario.scenarioId,
        requestId: mockRequest.requestId,
        projectRoot: mockRequest.projectRoot,
        manifestDigest: "digest-match",
        timestamp: 1500,
        completedStepIds: ["step-1"],
        status: "passed",
        events: [],
        artifacts: [],
      });

      const result = await resumeHarnessExecution({
        checkpointId: "cp-valid-resume",
        scenario: mockScenario,
        request: mockRequest,
        expectedManifestDigest: "digest-match",
        store,
      });

      expect(result.valid).toBe(true);
      expect(result.completedStepIds).toEqual(["step-1"]);
      expect(result.remainingSteps.map((s) => s.id)).toEqual([
        "step-2",
        "step-3",
      ]);
    });

    it("forbids cross-project resume attempts", async () => {
      const store = createInMemoryHarnessStateStore();
      await store.saveCheckpoint({
        checkpointId: "cp-cross-project",
        scenarioId: mockScenario.scenarioId,
        requestId: mockRequest.requestId,
        projectRoot: "/workspace/other-project",
        manifestDigest: "digest-match",
        timestamp: 1500,
        completedStepIds: ["step-1"],
        status: "passed",
        events: [],
        artifacts: [],
      });

      const result = await resumeHarnessExecution({
        checkpointId: "cp-cross-project",
        scenario: mockScenario,
        request: mockRequest,
        expectedManifestDigest: "digest-match",
        store,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Cross-project resume forbidden");
    });

    it("rejects manifest digest mismatches", async () => {
      const store = createInMemoryHarnessStateStore();
      await store.saveCheckpoint({
        checkpointId: "cp-digest-mismatch",
        scenarioId: mockScenario.scenarioId,
        requestId: mockRequest.requestId,
        projectRoot: mockRequest.projectRoot,
        manifestDigest: "old-digest-v1",
        timestamp: 1500,
        completedStepIds: ["step-1"],
        status: "passed",
        events: [],
        artifacts: [],
      });

      const result = await resumeHarnessExecution({
        checkpointId: "cp-digest-mismatch",
        scenario: mockScenario,
        request: mockRequest,
        expectedManifestDigest: "new-digest-v2",
        store,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Manifest digest mismatch");
    });
  });

  describe("event replay simulation", () => {
    it("replays recorded events deterministically", () => {
      const result = replayHarnessEvents([
        {
          eventId: "e-1",
          timestamp: 1,
          type: "step-start",
          message: "Start step 1",
        },
        {
          eventId: "e-2",
          timestamp: 2,
          type: "step-complete",
          message: "Done step 1",
        },
        {
          eventId: "e-3",
          timestamp: 3,
          type: "step-start",
          message: "Start step 2",
        },
        {
          eventId: "e-4",
          timestamp: 4,
          type: "step-fail",
          stepId: "step-2",
          message: "Failed step 2",
        },
      ]);

      expect(result.totalEvents).toBe(4);
      expect(result.stepCount).toBe(2);
      expect(result.failedSteps).toEqual(["step-2"]);
      expect(result.isDeterministic).toBe(true);
    });
  });
});
