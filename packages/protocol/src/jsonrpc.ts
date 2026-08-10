export const PROTOCOL_VERSION = 1 as const;
export const DAEMON_INFO_METHOD = "intentloom.daemon.info.v1" as const;
export const DOCTOR_METHOD = "intentloom.project.doctor.v1" as const;
export const INSPECT_METHOD = "intentloom.project.inspect.v1" as const;
export const PROJECT_DIFF_METHOD = "intentloom.project.diff.v1" as const;
export const PROJECT_TIMELINE_METHOD =
  "intentloom.project.timeline.v1" as const;
export const SECURITY_AUDIT_METHOD = "intentloom.security.audit.v1" as const;
export const MEMORY_SEARCH_METHOD = "intentloom.memory.search.v1" as const;
export const MEMORY_EVALUATIONS_LIST_METHOD =
  "intentloom.memory.evaluations.list.v1" as const;
export const ENGINEERING_CONFORMANCE_METHOD =
  "intentloom.engineering.conformance.v1" as const;
export const WORKFLOW_VARIANT_SUMMARY_METHOD =
  "intentloom.workflow.variants.summary.v1" as const;
export const WORKFLOW_DURATION_SUMMARY_METHOD =
  "intentloom.workflow.durations.summary.v1" as const;
export const CONFORMANCE_TREND_SUMMARY_METHOD =
  "intentloom.conformance.trend.summary.v1" as const;
export const WORKFLOW_REPETITION_SUMMARY_METHOD =
  "intentloom.workflow.repetitions.summary.v1" as const;
export const WORKFLOW_TRANSITION_INTERVALS_METHOD =
  "intentloom.workflow.transitions.intervals.v1" as const;
export const SESSION_GET_METHOD = "intentloom.session.get.v1" as const;
export const APPROVED_APPLY_METHOD =
  "intentloom.project.approvedApply.v1" as const;
export const QUALITY_STANDARDS_METHOD =
  "intentloom.quality.standards.v1" as const;
export const QUALITY_CATALOG_METHOD = "intentloom.quality.catalog.v1" as const;
export const QUALITY_CHECKERS_METHOD =
  "intentloom.quality.checkers.v1" as const;
export const QUALITY_GRAPH_METHOD = "intentloom.quality.graph.v1" as const;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type RequestId = number | string;
export interface JsonRpcRequest<
  Method extends string = string,
  Params extends object = JsonObject,
> {
  readonly jsonrpc: "2.0";
  readonly id: RequestId;
  readonly method: Method;
  readonly params: Params;
}
export interface JsonRpcSuccess<Result extends object = JsonObject> {
  readonly jsonrpc: "2.0";
  readonly id: RequestId;
  readonly result: Result;
}
export interface JsonRpcFailure {
  readonly jsonrpc: "2.0";
  readonly id: RequestId | null;
  readonly error: {
    readonly code: -32600 | -32601 | -32602;
    readonly message: string;
    readonly data?: JsonObject;
  };
}
