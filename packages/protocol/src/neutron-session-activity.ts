import type {
  NeutronContextSource,
  NeutronErrorCode,
  NeutronReadOnlyTool,
  NeutronSkillLoadingLevel,
} from "./neutron-runtime.js";

export const NEUTRON_TURN_ACTIVITY_SUMMARY_MAX_CHARS = 240;
export const NEUTRON_TURN_SECRET_PATH_LIMIT = 32;

export const NEUTRON_TOOL_ACTIVITY_STATUSES = [
  "completed",
  "denied",
  "failed",
] as const;
export type NeutronToolActivityStatus =
  (typeof NEUTRON_TOOL_ACTIVITY_STATUSES)[number];

export interface NeutronTurnContextSourceRow {
  readonly sourceId: string;
  readonly kind: NeutronContextSource["kind"];
  readonly trustClass: NeutronContextSource["trustClass"];
  readonly provenance: string;
  readonly included: boolean;
  readonly exclusionReason?: string;
  readonly path?: string;
  readonly loadingLevel?: NeutronSkillLoadingLevel;
}

export interface NeutronTurnContextSummary {
  readonly sessionId: string;
  readonly root: string;
  readonly itemCount: number;
  readonly includedCount: number;
  readonly excludedCount: number;
  readonly estimatedTokens: number;
  readonly tokenBudget: number;
  readonly contextTokens: number;
  readonly limitExceeded: boolean;
  readonly excludedSecretLikePaths: readonly string[];
  readonly sources: readonly NeutronTurnContextSourceRow[];
}

export interface NeutronTurnToolActivity {
  readonly invocationId: string;
  readonly toolName: NeutronReadOnlyTool;
  readonly status: NeutronToolActivityStatus;
  readonly allowed: boolean;
  readonly ok: boolean;
  readonly errorCode: NeutronErrorCode | null;
  readonly capability: string;
  readonly inputSummary: string;
  readonly resultSummary: string;
}
