import type { HarnessTerminalStatus } from "./harness.js";

export interface HarnessInspectionView {
  readonly schemaVersion: 1;
  readonly viewType: "inspect";
  readonly scenarioId: string;
  readonly requestId: string;
  readonly status: HarnessTerminalStatus;
  readonly overallScore: number;
  readonly passedAssertions: number;
  readonly totalAssertions: number;
  readonly durationMs: number;
  readonly diagnosticCount: number;
  readonly eventCount: number;
  readonly artifactCount: number;
  readonly replayAvailable: boolean;
  readonly readOnly: true;
}

export interface HarnessReplayView {
  readonly schemaVersion: 1;
  readonly viewType: "replay";
  readonly scenarioId: string;
  readonly requestId: string;
  readonly mode: "simulate" | "strict";
  readonly totalEvents: number;
  readonly stepCount: number;
  readonly failedSteps: readonly string[];
  readonly isDeterministic: boolean;
  readonly readOnly: true;
}
