import type { BoundedExecutionViewmodelPayload } from "@intentloom/protocol";

export interface BoundedExecutionPanelState {
  readonly executionGate: string;
  readonly mutationAllowed: boolean;
  readonly approvedRoot: string;
  readonly allowedPaths: readonly string[];
  readonly allowedCommands: readonly string[];
  readonly networkAccess: boolean;
  readonly processExecution: boolean;
  readonly checkpoints: readonly {
    readonly id: string;
    readonly label: string;
    readonly status: string;
  }[];
  readonly checkerCount: number;
  readonly architecturePassed: boolean;
  readonly proposedPaths: readonly string[];
  readonly outsideApprovedPaths: readonly string[];
  readonly applyAttempted: boolean;
  readonly applyApplied: boolean;
  readonly diagnostics: readonly string[];
  readonly harnessScorecardStatus: string;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function asCheckpoints(
  value: unknown,
): BoundedExecutionPanelState["checkpoints"] {
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

export function parseBoundedExecutionViewmodel(
  payload: BoundedExecutionViewmodelPayload,
): BoundedExecutionPanelState {
  const record = payload as Record<string, unknown>;
  return {
    executionGate: String(record.executionGate ?? "w11-blocked"),
    mutationAllowed: record.mutationAllowed === true,
    approvedRoot: String(record.approvedRoot ?? ""),
    allowedPaths: asStringArray(record.allowedPaths),
    allowedCommands: asStringArray(record.allowedCommands),
    networkAccess: false,
    processExecution: false,
    checkpoints: asCheckpoints(record.checkpoints),
    checkerCount: Number(record.checkerCount ?? 0),
    architecturePassed: record.architecturePassed === true,
    proposedPaths: asStringArray(record.proposedPaths),
    outsideApprovedPaths: asStringArray(record.outsideApprovedPaths),
    applyAttempted: record.applyAttempted === true,
    applyApplied: record.applyApplied === true,
    diagnostics: asStringArray(record.diagnostics),
    harnessScorecardStatus: String(record.harnessScorecardStatus ?? "not-run"),
  };
}

export function formatYesNo(value: boolean): string {
  return value ? "yes" : "no";
}

export function formatList(values: readonly string[]): string {
  return values.join(", ") || "none";
}
