import type { HarnessScorecard } from "./harness.js";

export type HarnessAdoptionGateActionKind =
  | "activate-external-skill"
  | "mutate-agent-capability"
  | "execute-external-mcp";

export interface HarnessAdoptionGateRequest {
  readonly schemaVersion: 1;
  readonly targetResourceId: string;
  readonly actionKind: HarnessAdoptionGateActionKind;
  readonly scorecards: readonly HarnessScorecard[];
  readonly grantedApprovals: readonly string[];
  readonly maxScorecardAgeMs?: number;
}

export interface HarnessAdoptionGateResult {
  readonly schemaVersion: 1;
  readonly targetResourceId: string;
  readonly actionKind: HarnessAdoptionGateActionKind;
  readonly passed: boolean;
  readonly checkedScorecardsCount: number;
  readonly diagnostics: readonly string[];
  readonly safeNextAction: string;
}
