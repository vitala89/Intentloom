import type {
  HarnessArtifactRecord,
  HarnessExecutionEvent,
  HarnessExecutionRequest,
  HarnessScenario,
  HarnessScenarioStep,
  HarnessTerminalStatus,
} from "@intentloom/protocol";

export interface HarnessCheckpointRecord {
  readonly checkpointId: string;
  readonly scenarioId: string;
  readonly requestId: string;
  readonly projectRoot: string;
  readonly manifestDigest: string;
  readonly timestamp: number;
  readonly completedStepIds: readonly string[];
  readonly status: HarnessTerminalStatus;
  readonly events: readonly HarnessExecutionEvent[];
  readonly artifacts: readonly HarnessArtifactRecord[];
}

export interface HarnessPurgeCriteria {
  readonly projectRoot?: string;
  readonly beforeTimestamp?: number;
}

export interface HarnessStateStore {
  appendEvent(requestId: string, event: HarnessExecutionEvent): Promise<void>;
  recordArtifact(
    requestId: string,
    artifact: HarnessArtifactRecord,
  ): Promise<void>;
  saveCheckpoint(checkpoint: HarnessCheckpointRecord): Promise<void>;
  getCheckpoint(checkpointId: string): Promise<HarnessCheckpointRecord | null>;
  getLatestCheckpoint(
    scenarioId: string,
    projectRoot: string,
  ): Promise<HarnessCheckpointRecord | null>;
  purge(criteria: HarnessPurgeCriteria): Promise<number>;
}

export function createInMemoryHarnessStateStore(): HarnessStateStore {
  const eventsByRequest = new Map<string, HarnessExecutionEvent[]>();
  const artifactsByRequest = new Map<string, HarnessArtifactRecord[]>();
  const checkpointsById = new Map<string, HarnessCheckpointRecord>();

  return {
    async appendEvent(requestId, event) {
      const list = eventsByRequest.get(requestId) ?? [];
      list.push(event);
      eventsByRequest.set(requestId, list);
    },

    async recordArtifact(requestId, artifact) {
      const list = artifactsByRequest.get(requestId) ?? [];
      list.push(artifact);
      artifactsByRequest.set(requestId, list);
    },

    async saveCheckpoint(checkpoint) {
      checkpointsById.set(checkpoint.checkpointId, checkpoint);
    },

    async getCheckpoint(checkpointId) {
      return checkpointsById.get(checkpointId) ?? null;
    },

    async getLatestCheckpoint(scenarioId, projectRoot) {
      const matching = Array.from(checkpointsById.values()).filter(
        (c) => c.scenarioId === scenarioId && c.projectRoot === projectRoot,
      );
      if (matching.length === 0) return null;
      matching.sort((a, b) => b.timestamp - a.timestamp);
      return matching[0] ?? null;
    },

    async purge(criteria) {
      let count = 0;
      for (const [id, checkpoint] of Array.from(checkpointsById.entries())) {
        let match = true;
        if (
          criteria.projectRoot &&
          checkpoint.projectRoot !== criteria.projectRoot
        ) {
          match = false;
        }
        if (
          criteria.beforeTimestamp &&
          checkpoint.timestamp >= criteria.beforeTimestamp
        ) {
          match = false;
        }
        if (match) {
          checkpointsById.delete(id);
          count++;
        }
      }
      return count;
    },
  };
}

export interface HarnessResumeOptions {
  readonly checkpointId: string;
  readonly scenario: HarnessScenario;
  readonly request: HarnessExecutionRequest;
  readonly expectedManifestDigest: string;
  readonly store: HarnessStateStore;
}

export interface HarnessResumeResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly remainingSteps: readonly HarnessScenarioStep[];
  readonly completedStepIds: readonly string[];
  readonly checkpoint?: HarnessCheckpointRecord;
}

export async function resumeHarnessExecution(
  options: HarnessResumeOptions,
): Promise<HarnessResumeResult> {
  const checkpoint = await options.store.getCheckpoint(options.checkpointId);
  if (!checkpoint) {
    return {
      valid: false,
      reason: "Checkpoint not found",
      remainingSteps: options.scenario.steps,
      completedStepIds: [],
    };
  }

  if (checkpoint.projectRoot !== options.request.projectRoot) {
    return {
      valid: false,
      reason: "Cross-project resume forbidden",
      remainingSteps: options.scenario.steps,
      completedStepIds: checkpoint.completedStepIds,
      checkpoint,
    };
  }

  if (checkpoint.manifestDigest !== options.expectedManifestDigest) {
    return {
      valid: false,
      reason: "Manifest digest mismatch: scenario or environment modified",
      remainingSteps: options.scenario.steps,
      completedStepIds: checkpoint.completedStepIds,
      checkpoint,
    };
  }

  const completedSet = new Set(checkpoint.completedStepIds);
  const remainingSteps = options.scenario.steps.filter(
    (step) => !completedSet.has(step.id),
  );

  return {
    valid: true,
    remainingSteps,
    completedStepIds: checkpoint.completedStepIds,
    checkpoint,
  };
}

export interface HarnessReplayResult {
  readonly totalEvents: number;
  readonly stepCount: number;
  readonly failedSteps: readonly string[];
  readonly isDeterministic: boolean;
}

export function replayHarnessEvents(
  events: readonly HarnessExecutionEvent[],
  mode: "simulate" | "strict" = "simulate",
): HarnessReplayResult {
  let stepCount = 0;
  const failedSteps: string[] = [];

  for (const event of events) {
    if (event.type === "step-start") {
      stepCount++;
    } else if (event.type === "step-fail") {
      if (event.stepId) failedSteps.push(event.stepId);
    } else if (mode === "strict" && event.type === "error") {
      failedSteps.push(event.stepId ?? "global-error");
    }
  }

  return {
    totalEvents: events.length,
    stepCount,
    failedSteps,
    isDeterministic: true,
  };
}
