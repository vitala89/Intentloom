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
export const SPECIALIZED_PACKS_CATALOG_METHOD =
  "intentloom.specialized-packs.catalog.v1" as const;
export const SPECIALIZED_PACKS_DETECT_METHOD =
  "intentloom.specialized-packs.detect.v1" as const;
export const SPECIALIZED_PACKS_CHECKS_METHOD =
  "intentloom.specialized-packs.checks.v1" as const;
export const INCEPTION_SESSION_CREATE_METHOD =
  "intentloom.inception.session.create.v1" as const;
export const INCEPTION_SESSION_GET_METHOD =
  "intentloom.inception.session.get.v1" as const;
export const INCEPTION_QUESTIONS_LIST_METHOD =
  "intentloom.inception.questions.list.v1" as const;
export const INCEPTION_ANSWER_RECORD_METHOD =
  "intentloom.inception.answer.record.v1" as const;
export const INCEPTION_STATE_SUMMARIZE_METHOD =
  "intentloom.inception.state.summarize.v1" as const;
export const INCEPTION_CONFLICTS_IDENTIFY_METHOD =
  "intentloom.inception.conflicts.identify.v1" as const;
export const INCEPTION_SESSION_EXPORT_METHOD =
  "intentloom.inception.session.export.v1" as const;
export const INCEPTION_SESSION_DELETE_METHOD =
  "intentloom.inception.session.delete.v1" as const;
export const FOUNDATION_WORKSHOP_CREATE_METHOD =
  "intentloom.foundation.workshop.create.v1" as const;
export const FOUNDATION_WORKSHOP_GET_METHOD =
  "intentloom.foundation.workshop.get.v1" as const;
export const FOUNDATION_QUESTIONS_LIST_METHOD =
  "intentloom.foundation.questions.list.v1" as const;
export const FOUNDATION_ANSWER_RECORD_METHOD =
  "intentloom.foundation.answer.record.v1" as const;
export const FOUNDATION_UNDERSTANDING_SUMMARIZE_METHOD =
  "intentloom.foundation.understanding.summarize.v1" as const;
export const FOUNDATION_CONFLICTS_IDENTIFY_METHOD =
  "intentloom.foundation.conflicts.identify.v1" as const;
export const FOUNDATION_READINESS_EVALUATE_METHOD =
  "intentloom.foundation.readiness.evaluate.v1" as const;
export const FOUNDATION_WORKSHOP_EXPORT_METHOD =
  "intentloom.foundation.workshop.export.v1" as const;
export const FOUNDATION_WORKSHOP_DELETE_METHOD =
  "intentloom.foundation.workshop.delete.v1" as const;
export const FOUNDATION_DISCOVERY_QUESTIONS_METHOD =
  "intentloom.foundation.discovery.questions.v1" as const;
export const FOUNDATION_DISCOVERY_TURN_METHOD =
  "intentloom.foundation.discovery.turn.v1" as const;
export const FOUNDATION_BLUEPRINT_PROPOSE_METHOD =
  "intentloom.foundation.blueprint.propose.v1" as const;
export const FOUNDATION_BLUEPRINT_COMPARE_METHOD =
  "intentloom.foundation.blueprint.compare.v1" as const;
export const FOUNDATION_BLUEPRINT_APPROVE_METHOD =
  "intentloom.foundation.blueprint.approve.v1" as const;
export const FOUNDATION_BLUEPRINT_REVOKE_METHOD =
  "intentloom.foundation.blueprint.revoke.v1" as const;
export const FOUNDATION_SCAFFOLD_PREPARE_METHOD =
  "intentloom.foundation.scaffold.prepare.v1" as const;
export const FOUNDATION_SCAFFOLD_GET_METHOD =
  "intentloom.foundation.scaffold.get.v1" as const;
export const FOUNDATION_SCAFFOLD_COMPARE_METHOD =
  "intentloom.foundation.scaffold.compare.v1" as const;
export const FOUNDATION_SCAFFOLD_VALIDATE_METHOD =
  "intentloom.foundation.scaffold.validate.v1" as const;
export const FOUNDATION_SCAFFOLD_APPLY_METHOD =
  "intentloom.foundation.scaffold.apply.v1" as const;
export const FOUNDATION_SCAFFOLD_ROLLBACK_METHOD =
  "intentloom.foundation.scaffold.rollback.v1" as const;
export const EXISTING_PROJECT_WORKSPACE_PREPARE_METHOD =
  "intentloom.existing-project.workspace.prepare.v1" as const;

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
