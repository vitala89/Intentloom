import type {
  HarnessRiskLevel,
  HarnessTerminalStatus,
  HarnessScenario,
} from "./harness.js";

export type HarnessScenarioCategory =
  "positive" | "negative" | "adversarial" | "regression";

export type HarnessScenarioTarget =
  | "skill-routing"
  | "external-mcp"
  | "provider-evidence"
  | "capability-negotiation"
  | "approval"
  | "memory-state"
  | "path-boundary"
  | "voting";

export interface HarnessScenarioCase {
  readonly schemaVersion: 1;
  readonly caseId: string;
  readonly title: string;
  readonly category: HarnessScenarioCategory;
  readonly target: HarnessScenarioTarget;
  readonly riskLevel: HarnessRiskLevel;
  readonly fixtureRef: string;
  readonly scenario: HarnessScenario;
  readonly expectedStatus: HarnessTerminalStatus;
  readonly expectedDiagnostics?: readonly string[];
}

export interface HarnessScenarioCorpus {
  readonly schemaVersion: 1;
  readonly corpusId: string;
  readonly version: string;
  readonly cases: readonly HarnessScenarioCase[];
}
