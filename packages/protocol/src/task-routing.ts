export type TaskRouteKind =
  | "direct"
  | "clarify"
  | "discover"
  | "diagnose"
  | "plan"
  | "implement"
  | "review"
  | "adopt";

export interface TaskRouteRequestOptions {
  readonly profile?: string;
  readonly maxSkills?: number;
}

export interface TaskRouteRequest {
  readonly schemaVersion: 1;
  readonly taskDescription: string;
  readonly projectRoot?: string;
  readonly options?: TaskRouteRequestOptions;
}

export interface TaskRouteDecision {
  readonly schemaVersion: 1;
  readonly routeKind: TaskRouteKind;
  readonly recommendedSkills: readonly string[];
  readonly reasons: readonly string[];
  readonly requiredApprovals: readonly string[];
  readonly expectedChecks: readonly string[];
  readonly firstAction: string;
  readonly readOnly: boolean;
}
