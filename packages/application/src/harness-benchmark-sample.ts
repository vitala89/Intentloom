import { createHash } from "node:crypto";
import type {
  HarnessBenchmarkStageId,
  HarnessBenchmarkStageRecord,
} from "@intentloom/protocol";
import { evaluateHarnessAdoptionGate } from "./harness-adoption-gate.js";
import {
  createInMemoryHarnessStateStore,
  replayHarnessEvents,
  resumeHarnessExecution,
  type HarnessCheckpointRecord,
  type HarnessStateStore,
} from "./harness-state.js";
// synchronizeGeneratedFiles and createMemoryFileSystem live only in the
// package barrel (index.ts). This import is circular in the module graph
// (index.ts re-exports harness.ts, which re-exports this file), but both
// functions are hoisted `function` declarations invoked only inside
// measureH9EvidenceStages, never at module-evaluation time, so the circular
// reference resolves safely. FileSystem is a type-only import, erased at
// compile time, so it carries no runtime circularity at all.
import {
  createMemoryFileSystem,
  synchronizeGeneratedFiles,
  type FileSystem,
} from "./index.js";
import {
  H9_DRILL_REQUEST,
  H9_DRILL_SCENARIO,
  H9_FAILING_SCORECARD,
  H9_PASSING_SCORECARD,
} from "./harness-benchmark-fixtures.js";

function digestEvidence(payload: Record<string, unknown>): string {
  const stable: Record<string, unknown> = {};
  // toSorted() is unavailable under this package's ES2022 target; Object.keys
  // always returns a fresh array, so sorting it in place mutates nothing else.
  for (const key of Object.keys(payload).sort()) stable[key] = payload[key];
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

async function runStage(
  clock: () => number,
  stage: HarnessBenchmarkStageId,
  operation: () => Promise<Record<string, unknown>>,
): Promise<HarnessBenchmarkStageRecord> {
  const start = clock();
  let status: "completed" | "failed" = "completed";
  let evidence: Record<string, unknown> = {};
  try {
    evidence = await operation();
  } catch {
    status = "failed";
  }
  const elapsedMs = clock() - start;
  const evidenceDigest = digestEvidence({ stage, status, ...evidence });
  return { stage, status, elapsedMs, evidenceDigest };
}

async function checkAdoptionGatePass(): Promise<Record<string, unknown>> {
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
  if (result.passed !== true)
    throw new Error("adoption-gate-pass: expected result.passed === true");
  return { passed: result.passed, diagnosticsCount: result.diagnostics.length };
}

async function checkAdoptionGateFail(): Promise<Record<string, unknown>> {
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
  if (result.passed !== false)
    throw new Error("adoption-gate-fail: expected result.passed === false");
  return { passed: result.passed, diagnosticsCount: result.diagnostics.length };
}

async function checkReplay(): Promise<Record<string, unknown>> {
  const result = replayHarnessEvents(H9_PASSING_SCORECARD.events);
  if (result.isDeterministic !== true)
    throw new Error("replay: expected isDeterministic === true");
  return {
    isDeterministic: result.isDeterministic,
    stepCount: result.stepCount,
  };
}

async function checkResumeCrossProjectReject(
  store: HarnessStateStore,
): Promise<Record<string, unknown>> {
  const checkpoint: HarnessCheckpointRecord = {
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
  await store.saveCheckpoint(checkpoint);
  const result = await resumeHarnessExecution({
    checkpointId: checkpoint.checkpointId,
    scenario: H9_DRILL_SCENARIO,
    request: {
      ...H9_DRILL_REQUEST,
      projectRoot: "/workspace/unauthorized-other-project",
    },
    expectedManifestDigest: "digest-h9-v1",
    store,
  });
  if (result.valid !== false)
    throw new Error("resume-cross-project-reject: expected valid === false");
  return {
    valid: result.valid,
    reasonKnown: typeof result.reason === "string",
  };
}

async function checkPurge(
  store: HarnessStateStore,
): Promise<Record<string, unknown>> {
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
  const count = await store.purge({ projectRoot: "/workspace/purge-target" });
  if (count !== 1)
    throw new Error(`purge: expected count === 1, received ${count}`);
  return { purgedCount: count };
}

async function checkRollback(
  fileSystem: FileSystem,
): Promise<Record<string, unknown>> {
  const result = await synchronizeGeneratedFiles(
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
  if (
    result.status !== "failed" ||
    result.rollbackAttempted !== true ||
    result.rollbackCompleted !== true
  )
    throw new Error("rollback: expected failed status with completed rollback");
  return {
    status: result.status,
    rollbackAttempted: result.rollbackAttempted,
    rollbackCompleted: result.rollbackCompleted,
  };
}

/**
 * Runs one full, isolated sample of the composed H9 evidence flow: a fresh
 * in-memory state store and a fresh in-memory filesystem, timing each of the
 * six stages individually with the injected clock. A stage's internal
 * exception is caught and recorded as `status: "failed"`; it never aborts the
 * remaining stages in the sample.
 */
export async function measureH9EvidenceStages(
  clock: () => number,
): Promise<HarnessBenchmarkStageRecord[]> {
  const store = createInMemoryHarnessStateStore();
  const fileSystem = createMemoryFileSystem({
    [`${H9_DRILL_REQUEST.projectRoot}/AGENTS.md`]: "project-owned content",
  });

  return [
    await runStage(clock, "adoption-gate-pass", checkAdoptionGatePass),
    await runStage(clock, "adoption-gate-fail", checkAdoptionGateFail),
    await runStage(clock, "replay", checkReplay),
    await runStage(clock, "resume-cross-project-reject", () =>
      checkResumeCrossProjectReject(store),
    ),
    await runStage(clock, "purge", () => checkPurge(store)),
    await runStage(clock, "rollback", () => checkRollback(fileSystem)),
  ];
}
