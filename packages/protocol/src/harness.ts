export type HarnessTerminalStatus =
  "passed" | "failed" | "cancelled" | "timed-out" | "budget-exceeded" | "error";

export type HarnessErrorCode =
  | "E_HARNESS_INVALID_SCENARIO"
  | "E_HARNESS_CAPABILITY_DENIED"
  | "E_HARNESS_BUDGET_EXCEEDED"
  | "E_HARNESS_UNTRUSTED_PROVENANCE"
  | "E_HARNESS_INVALID_DIGEST"
  | "E_HARNESS_INCOMPATIBLE_COMPARISON";

export interface HarnessCapabilities {
  readonly readonlyFs: boolean;
  readonly writeFs: boolean;
  readonly processExecution: boolean;
  readonly networkAccess: boolean;
  readonly maxDurationMs: number;
  readonly maxMemoryMb: number;
}

export interface HarnessScenarioStep {
  readonly id: string;
  readonly name: string;
  readonly action: string;
  readonly params?: Record<string, unknown>;
  readonly expectedOutcome?: string;
}

export interface HarnessScenario {
  readonly schemaVersion: 1;
  readonly scenarioId: string;
  readonly title: string;
  readonly description: string;
  readonly requiredCapabilities: HarnessCapabilities;
  readonly steps: readonly HarnessScenarioStep[];
  readonly tags?: readonly string[];
}

export interface HarnessExecutionRequest {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly scenarioId: string;
  readonly projectRoot: string;
  readonly executorType: "local-readonly" | "container" | "fake";
  readonly requestedCapabilities: HarnessCapabilities;
  readonly createdTimestamp: number;
}

export interface HarnessScenarioManifest {
  readonly schemaVersion: 1;
  readonly manifestId: string;
  readonly scenario: HarnessScenario;
  readonly request: HarnessExecutionRequest;
  readonly environmentHash: string;
}

export interface HarnessExecutionEvent {
  readonly eventId: string;
  readonly timestamp: number;
  readonly stepId?: string;
  readonly type:
    | "info"
    | "step-start"
    | "step-complete"
    | "step-fail"
    | "gate-trigger"
    | "error";
  readonly message: string;
  readonly payload?: Record<string, unknown>;
}

export interface HarnessArtifactRecord {
  readonly artifactId: string;
  readonly path: string;
  readonly sizeBytes: number;
  readonly sha256: string;
  readonly mimeType: string;
}

export interface HarnessScorecard {
  readonly schemaVersion: 1;
  readonly scorecardId: string;
  readonly scenarioId: string;
  readonly requestId: string;
  readonly status: HarnessTerminalStatus;
  readonly overallScore: number;
  readonly passedAssertions: number;
  readonly totalAssertions: number;
  readonly durationMs: number;
  readonly diagnostics: readonly string[];
  readonly events: readonly HarnessExecutionEvent[];
  readonly artifacts: readonly HarnessArtifactRecord[];
}

export interface HarnessComparison {
  readonly schemaVersion: 1;
  readonly comparisonId: string;
  readonly scenarioId: string;
  readonly baselineScorecardId: string;
  readonly protectedScorecardId: string;
  readonly scoreDelta: number;
  readonly regressionDetected: boolean;
  readonly notes?: string;
}

export * from "./harness-agent.js";
export * from "./harness-voting.js";
export * from "./harness-scenarios.js";
