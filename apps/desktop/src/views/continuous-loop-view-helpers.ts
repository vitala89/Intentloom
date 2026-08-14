import type {
  ContinuousLoopChangeKind,
  ContinuousLoopSnapshot,
  ContinuousLoopViewmodelPayload,
} from "@intentloom/protocol";

export const CONTINUOUS_LOOP_CHANGE_KINDS = [
  "code",
  "policy",
  "evidence",
  "model-interpretation",
] as const satisfies readonly ContinuousLoopChangeKind[];

export interface ContinuousLoopPanelState {
  readonly loopGate: string;
  readonly mutationAllowed: boolean;
  readonly changeKind: string;
  readonly compatible: boolean;
  readonly newFindingCount: number;
  readonly fixedFindingCount: number;
  readonly memoryLifecycleState: string;
  readonly applyAttempted: boolean;
  readonly applyApplied: boolean;
  readonly nextFeatureTitle: string;
  readonly diagnostics: readonly string[];
  readonly checkpoints: readonly {
    readonly id: string;
    readonly label: string;
    readonly status: string;
  }[];
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asCheckpoints(
  value: unknown,
): ContinuousLoopPanelState["checkpoints"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];
    const row = entry as Record<string, unknown>;
    return [
      {
        id: String(row.id ?? ""),
        label: String(row.label ?? ""),
        status: String(row.status ?? ""),
      },
    ];
  });
}

export function parseContinuousLoopViewmodel(
  payload: ContinuousLoopViewmodelPayload,
): ContinuousLoopPanelState {
  const record = payload as Record<string, unknown>;
  return {
    loopGate: String(record.loopGate ?? "w12-blocked"),
    mutationAllowed: record.mutationAllowed === true,
    changeKind: String(record.changeKind ?? "code"),
    compatible: record.compatible === true,
    newFindingCount: Number(record.newFindingCount ?? 0),
    fixedFindingCount: Number(record.fixedFindingCount ?? 0),
    memoryLifecycleState: String(record.memoryLifecycleState ?? "draft"),
    applyAttempted: record.applyAttempted === true,
    applyApplied: record.applyApplied === true,
    nextFeatureTitle: String(record.nextFeatureTitle ?? ""),
    diagnostics: asStringArray(record.diagnostics),
    checkpoints: asCheckpoints(record.checkpoints),
  };
}

export function formatYesNo(value: boolean): string {
  return value ? "yes" : "no";
}

export function formatList(values: readonly string[]): string {
  return values.join(", ") || "none";
}

function requiredInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${field} must be an integer`);
  }
  return value;
}

export function parseSnapshotJson(text: string): ContinuousLoopSnapshot {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("snapshot must be a JSON object");
  }
  const record = parsed as Record<string, unknown>;
  if (!Array.isArray(record.findingIds)) {
    throw new Error("findingIds must be a string array");
  }
  return {
    projectId: String(record.projectId ?? ""),
    schemaVersion: String(record.schemaVersion ?? ""),
    findingIds: record.findingIds.map(String),
    technicalDebtItemCount: requiredInteger(
      record.technicalDebtItemCount,
      "technicalDebtItemCount",
    ),
    architectureViolationCount: requiredInteger(
      record.architectureViolationCount,
      "architectureViolationCount",
    ),
  };
}

export const DEFAULT_PREVIOUS_SNAPSHOT = `{
  "projectId": "loop-ready",
  "schemaVersion": "1",
  "findingIds": ["finding-old", "finding-keep"],
  "technicalDebtItemCount": 2,
  "architectureViolationCount": 1
}`;

export const DEFAULT_CURRENT_SNAPSHOT = `{
  "projectId": "loop-ready",
  "schemaVersion": "1",
  "findingIds": ["finding-keep", "finding-new"],
  "technicalDebtItemCount": 1,
  "architectureViolationCount": 0
}`;
