import { describe, expect, it } from "vitest";
import type {
  HarnessExecutionRequest,
  HarnessScenario,
  HarnessScorecard,
} from "@intentloom/protocol";
import {
  assertProjectStateUnchanged,
  snapshotProjectState,
} from "./project-state.js";
import {
  createInMemoryHarnessStateStore,
  createMemoryFileSystem,
  evaluateHarnessAdoptionGate,
  replayHarnessEvents,
  resumeHarnessExecution,
  synchronizeGeneratedFiles,
  type HarnessCheckpointRecord,
} from "../packages/application/src/index.js";
import {
  validateHarnessAdoptionGateRequest,
  validateHarnessAdoptionGateResult,
} from "@intentloom/validator";

/**
 * Phase H9 Deterministic Fixtures
 */
const H9_PASSING_SCORECARD: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-h9-pass-001",
  scenarioId: "scenario:h9-evidence-drill",
  requestId: "req-h9-pass-101",
  status: "passed",
  overallScore: 100,
  passedAssertions: 5,
  totalAssertions: 5,
  durationMs: 120,
  diagnostics: [],
  events: [
    {
      eventId: "evt-h9-1",
      timestamp: 1_000_000,
      type: "step-start",
      stepId: "step-1",
      message: "Start inspection step",
    },
    {
      eventId: "evt-h9-2",
      timestamp: 1_000_050,
      type: "step-complete",
      stepId: "step-1",
      message: "Completed inspection step",
    },
    {
      eventId: "evt-h9-3",
      timestamp: 1_000_120,
      type: "info",
      message: "Scenario evaluation passed successfully",
    },
  ],
  artifacts: [],
};

const H9_FAILING_SCORECARD: HarnessScorecard = {
  schemaVersion: 1,
  scorecardId: "scorecard-h9-fail-002",
  scenarioId: "scenario:h9-evidence-drill",
  requestId: "req-h9-fail-102",
  status: "failed",
  overallScore: 0,
  passedAssertions: 1,
  totalAssertions: 5,
  durationMs: 90,
  diagnostics: ["assertion-failed:step-2-verification-failed"],
  events: [
    {
      eventId: "evt-h9-4",
      timestamp: 2_000_000,
      type: "step-start",
      stepId: "step-1",
      message: "Start inspection step",
    },
    {
      eventId: "evt-h9-5",
      timestamp: 2_000_030,
      type: "step-complete",
      stepId: "step-1",
      message: "Completed inspection step",
    },
    {
      eventId: "evt-h9-6",
      timestamp: 2_000_040,
      type: "step-start",
      stepId: "step-2",
      message: "Start verification step",
    },
    {
      eventId: "evt-h9-7",
      timestamp: 2_000_090,
      type: "step-fail",
      stepId: "step-2",
      message: "Verification failed: security assertion error",
    },
  ],
  artifacts: [],
};

const H9_DRILL_SCENARIO: HarnessScenario = {
  schemaVersion: 1,
  scenarioId: "scenario:h9-evidence-drill",
  title: "Phase H9 Readiness Audit Evidence Drill",
  description:
    "Composes adoption gate, state replay, purge, and rollback recovery terminal states",
  requiredCapabilities: {
    readonlyFs: true,
    writeFs: false,
    processExecution: false,
    networkAccess: false,
    maxDurationMs: 30_000,
    maxMemoryMb: 512,
  },
  steps: [
    { id: "step-1", name: "Inspection Step", action: "inspect" },
    { id: "step-2", name: "Verification Step", action: "validate" },
  ],
};

const H9_DRILL_REQUEST: HarnessExecutionRequest = {
  schemaVersion: 1,
  requestId: "req-h9-pass-101",
  scenarioId: "scenario:h9-evidence-drill",
  projectRoot: "/workspace/h9-evidence-target",
  executorType: "local-readonly",
  requestedCapabilities: H9_DRILL_SCENARIO.requiredCapabilities,
  createdTimestamp: 1_000_000,
};

describe("Phase H9 Agentic Harness Deterministic Evidence Contract", () => {
  describe("Adoption Gate & Fail-Closed Verification", () => {
    it("validates request and result schemas for adoption gate", () => {
      const req = validateHarnessAdoptionGateRequest({
        schemaVersion: 1,
        targetResourceId: "skill:external-skill-pack",
        actionKind: "activate-external-skill",
        scorecards: [H9_PASSING_SCORECARD],
        grantedApprovals: ["managed-extension-activation-approval"],
      });

      expect(req.targetResourceId).toBe("skill:external-skill-pack");

      const res = validateHarnessAdoptionGateResult({
        schemaVersion: 1,
        targetResourceId: "skill:external-skill-pack",
        actionKind: "activate-external-skill",
        passed: true,
        checkedScorecardsCount: 1,
        diagnostics: [],
        safeNextAction: "grant requested action",
      });

      expect(res.passed).toBe(true);
    });

    it("passes adoption gate when valid scorecards and required approvals are present", () => {
      const result = evaluateHarnessAdoptionGate(
        {
          schemaVersion: 1,
          targetResourceId: "skill:external-skill-pack",
          actionKind: "activate-external-skill",
          scorecards: [H9_PASSING_SCORECARD],
          grantedApprovals: ["managed-extension-activation-approval"],
          maxScorecardAgeMs: 10_000_000,
        },
        { now: () => 1_000_150 },
      );

      expect(result.passed).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.checkedScorecardsCount).toBe(1);
    });

    it("fails closed when scorecard indicates failure", () => {
      const result = evaluateHarnessAdoptionGate(
        {
          schemaVersion: 1,
          targetResourceId: "skill:external-skill-pack",
          actionKind: "activate-external-skill",
          scorecards: [H9_FAILING_SCORECARD],
          grantedApprovals: ["managed-extension-activation-approval"],
        },
        { now: () => 2_000_100 },
      );

      expect(result.passed).toBe(false);
      expect(result.diagnostics).toContain(
        `harness-scorecard-failed:${H9_FAILING_SCORECARD.scorecardId}:failed`,
      );
    });
  });

  describe("Checkpoint Persistence, Replay, and Purge Operations", () => {
    it("persists checkpoint, replays events, and enforces resume security boundary", async () => {
      const store = createInMemoryHarnessStateStore();

      const passCheckpoint: HarnessCheckpointRecord = {
        checkpointId: "cp-h9-pass-001",
        scenarioId: H9_DRILL_SCENARIO.scenarioId,
        requestId: H9_DRILL_REQUEST.requestId,
        projectRoot: H9_DRILL_REQUEST.projectRoot,
        manifestDigest: "digest-h9-v1",
        timestamp: 1_000_050,
        completedStepIds: ["step-1"],
        status: "passed",
        events: H9_PASSING_SCORECARD.events,
        artifacts: [],
      };

      await store.saveCheckpoint(passCheckpoint);

      // Replay events
      const replayResult = replayHarnessEvents(passCheckpoint.events);
      expect(replayResult.totalEvents).toBe(3);
      expect(replayResult.stepCount).toBe(1);
      expect(replayResult.failedSteps).toHaveLength(0);
      expect(replayResult.isDeterministic).toBe(true);

      // Valid resume
      const resumeResult = await resumeHarnessExecution({
        checkpointId: passCheckpoint.checkpointId,
        scenario: H9_DRILL_SCENARIO,
        request: H9_DRILL_REQUEST,
        expectedManifestDigest: "digest-h9-v1",
        store,
      });

      expect(resumeResult.valid).toBe(true);
      expect(resumeResult.remainingSteps.map((s) => s.id)).toEqual(["step-2"]);

      // Cross-project resume attempt must fail
      const crossProjectRequest: HarnessExecutionRequest = {
        ...H9_DRILL_REQUEST,
        projectRoot: "/workspace/unauthorized-other-project",
      };

      const crossProjectResume = await resumeHarnessExecution({
        checkpointId: passCheckpoint.checkpointId,
        scenario: H9_DRILL_SCENARIO,
        request: crossProjectRequest,
        expectedManifestDigest: "digest-h9-v1",
        store,
      });

      expect(crossProjectResume.valid).toBe(false);
      expect(crossProjectResume.reason).toContain(
        "Cross-project resume forbidden",
      );
    });

    it("purges checkpoints deterministically and verifies unretrievability", async () => {
      const store = createInMemoryHarnessStateStore();

      await store.saveCheckpoint({
        checkpointId: "cp-h9-to-purge-1",
        scenarioId: H9_DRILL_SCENARIO.scenarioId,
        requestId: "req-purge-1",
        projectRoot: "/workspace/purge-target",
        manifestDigest: "digest-purge",
        timestamp: 500,
        completedStepIds: [],
        status: "passed",
        events: [],
        artifacts: [],
      });

      const count = await store.purge({
        projectRoot: "/workspace/purge-target",
      });
      expect(count).toBe(1);

      const fetched = await store.getCheckpoint("cp-h9-to-purge-1");
      expect(fetched).toBeNull();
    });
  });

  describe("Composed Terminal State Matrix (Adoption Gate + Replay + Rollback Recovery)", () => {
    it("composes execution, event replay, failing checkpoint, and fail-closed adoption gate without mutating state", async () => {
      const store = createInMemoryHarnessStateStore();
      const fileSystem = createMemoryFileSystem({
        "/workspace/h9-evidence-target/AGENTS.md": "project-owned content",
      });
      const beforeRollback = await snapshotProjectState(fileSystem);

      const failCheckpoint: HarnessCheckpointRecord = {
        checkpointId: "cp-h9-fail-002",
        scenarioId: H9_DRILL_SCENARIO.scenarioId,
        requestId: H9_FAILING_SCORECARD.requestId,
        projectRoot: H9_DRILL_REQUEST.projectRoot,
        manifestDigest: "digest-h9-v1",
        timestamp: 2_000_090,
        completedStepIds: ["step-1"],
        status: "failed",
        events: H9_FAILING_SCORECARD.events,
        artifacts: [],
      };

      await store.saveCheckpoint(failCheckpoint);

      // Replay events from failed run
      const replayResult = replayHarnessEvents(failCheckpoint.events);
      expect(replayResult.totalEvents).toBe(4);
      expect(replayResult.stepCount).toBe(2);
      expect(replayResult.failedSteps).toEqual(["step-2"]);

      // Evaluate adoption gate for resource activation based on the failed scorecard
      const gateResult = evaluateHarnessAdoptionGate(
        {
          schemaVersion: 1,
          targetResourceId: "skill:external-skill-pack",
          actionKind: "activate-external-skill",
          scorecards: [H9_FAILING_SCORECARD],
          grantedApprovals: ["managed-extension-activation-approval"],
        },
        { now: () => 2_000_150 },
      );

      // Assert fail closed
      expect(gateResult.passed).toBe(false);
      expect(gateResult.safeNextAction).toContain("fail closed");

      const rollbackResult = await synchronizeGeneratedFiles(
        H9_DRILL_REQUEST.projectRoot,
        [
          {
            path: "AGENTS.md",
            content: "generated content",
            sources: ["harness:h9-evidence-drill"],
            checksum: "fixture checksum is normalized by the operation",
          },
        ],
        fileSystem,
        { failAt: "source-map-finalize" },
      );

      expect(rollbackResult.status).toBe("failed");
      expect(rollbackResult.rollbackAttempted).toBe(true);
      expect(rollbackResult.rollbackCompleted).toBe(true);
      assertProjectStateUnchanged(
        beforeRollback,
        await snapshotProjectState(fileSystem),
      );

      // Purge state after failure rollback handling
      const purged = await store.purge({
        scenarioId: H9_DRILL_SCENARIO.scenarioId,
      });
      expect(purged).toBe(1);

      const remaining = await store.getLatestCheckpoint(
        H9_DRILL_SCENARIO.scenarioId,
        H9_DRILL_REQUEST.projectRoot,
      );
      expect(remaining).toBeNull();
    });
  });
});
