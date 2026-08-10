import {
  PROTOCOL_VERSION,
  DAEMON_INFO_METHOD,
  DOCTOR_METHOD,
  INSPECT_METHOD,
  PROJECT_DIFF_METHOD,
  PROJECT_TIMELINE_METHOD,
  SECURITY_AUDIT_METHOD,
  MEMORY_SEARCH_METHOD,
  MEMORY_EVALUATIONS_LIST_METHOD,
  ENGINEERING_CONFORMANCE_METHOD,
  WORKFLOW_VARIANT_SUMMARY_METHOD,
  WORKFLOW_DURATION_SUMMARY_METHOD,
  CONFORMANCE_TREND_SUMMARY_METHOD,
  WORKFLOW_REPETITION_SUMMARY_METHOD,
  WORKFLOW_TRANSITION_INTERVALS_METHOD,
  SESSION_GET_METHOD,
  APPROVED_APPLY_METHOD,
  QUALITY_STANDARDS_METHOD,
  QUALITY_CATALOG_METHOD,
  QUALITY_CHECKERS_METHOD,
  QUALITY_GRAPH_METHOD,
} from "./jsonrpc.js";
import type { RequestId, JsonRpcRequest } from "./jsonrpc.js";
import type { JsonRpcSuccess } from "./jsonrpc.js";
// prettier-ignore
import type { ApprovedApplyRequest, ApprovedApplyExecutionResult } from "./approved-apply.js";
// prettier-ignore
import type { CapabilityClassification, DaemonCapability, DaemonLimits, DaemonInfoResult, DaemonInfoRequest, DaemonInfoResponse } from "./daemon.js";
// prettier-ignore
import type { ProjectDiffParams, ProjectDiffChange, ProjectDiffResult, ProjectDiffRequest, ProjectDiffResponse } from "./diff.js";

import type {
  QualityCatalogRequest,
  QualityCatalogResponse,
  QualityCheckersRequest,
  QualityCheckersResponse,
  QualityGraphRequest,
  QualityGraphResponse,
  QualityStandardsRequest,
  QualityStandardsResponse,
  QualityViewmodelPayload,
} from "./engineering-quality/daemon-rpc.js";
import {
  createQualityCatalogRequest,
  createQualityCheckersRequest,
  createQualityGraphRequest,
  createQualityStandardsRequest,
} from "./engineering-quality/daemon-rpc.js";
// prettier-ignore
export { QUALITY_REMEDIATION_PLAN_SCHEMA_URN, QUALITY_ORGANIZATION_CATALOG_SCHEMA_URN, QUALITY_EXECUTABLE_MARKETPLACE_SCHEMA_URN, QUALITY_DISCIPLINE_SCHEMA_URN, QUALITY_ROLE_COMPOSITION_SCHEMA_URN, QUALITY_SPECIALIZED_PACK_SCHEMA_URN, QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN, QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN } from "./engineering-quality/common.js";

export * from "./jsonrpc.js";
export * from "./daemon.js";
export * from "./desktop-extension.js";
export * from "./diff.js";
export * from "./inception.js";
export * from "./harness.js";
export * from "./task-routing.js";
export * from "./external-skill-import.js";
export * from "./harness-adoption-gate.js";
export * from "./extension-lifecycle.js";
export * from "./knowledge-provider.js";
export * from "./approved-apply.js";
export * from "./model-adapter.js";
export * from "./engineering-assessment.js";
export * from "./engineering-quality-entry.js";

export const TIMELINE_DEFAULT_LIMIT = 50;
export const TIMELINE_MAX_LIMIT = 500;
export const TIMELINE_DEFAULT_TIMEOUT_MS = 5_000;
export const TIMELINE_MAX_TIMEOUT_MS = 30_000;
export const TIMELINE_DEFAULT_MAX_OUTPUT_BYTES = 512 * 1024;
export const TIMELINE_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

export interface ProjectTimelineParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly caseId: string;
  readonly limit: number;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
}
export interface ProjectTimelineEvent {
  readonly id: string;
  readonly eventType: "commit";
  readonly timestamp: number;
  readonly commitId: string;
  readonly parents: readonly string[];
  readonly changedPaths: readonly string[];
  readonly source: "local-git";
  readonly trust: "local-observed-unverified";
}
export interface ProjectTimelineResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly operationVersion: 1;
  readonly root: string;
  readonly caseType: "release";
  readonly caseId: string;
  readonly quality: "complete" | "bounded" | "unavailable";
  readonly events: readonly ProjectTimelineEvent[];
  readonly findings: readonly ("evidence-bounded" | "evidence-unavailable")[];
  readonly diagnostics: readonly string[];
}
export type ProjectTimelineRequest = JsonRpcRequest<
  typeof PROJECT_TIMELINE_METHOD,
  ProjectTimelineParams
>;
export type ProjectTimelineResponse = JsonRpcSuccess<ProjectTimelineResult>;

export interface DoctorParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly string[];
}
export interface DoctorFinding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly category: string;
  readonly path: string;
  readonly message: string;
}
export interface DoctorResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly findings: readonly DoctorFinding[];
  readonly diagnostics: readonly string[];
  readonly exitCode: 0 | 3;
}
export type DoctorRequest = JsonRpcRequest<typeof DOCTOR_METHOD, DoctorParams>;
export type DoctorResponse = JsonRpcSuccess<DoctorResult>;

export interface InspectParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
}
export interface InspectResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly projectId: string;
  readonly root: string;
}
export type InspectRequest = JsonRpcRequest<
  typeof INSPECT_METHOD,
  InspectParams
>;
export type InspectResponse = JsonRpcSuccess<InspectResult>;

export interface SecurityAuditParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly projectId: string;
}
export interface SecurityAuditResult {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: ContinuousSecurityAuditReport;
}
export type SecurityAuditRequest = JsonRpcRequest<
  typeof SECURITY_AUDIT_METHOD,
  SecurityAuditParams
>;
export type SecurityAuditResponse = JsonRpcSuccess<SecurityAuditResult>;

export interface MemorySearchParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly query: string;
}
export interface MemorySearchResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly query: string;
  readonly items: readonly PersistentMemoryItem[];
}
export type MemorySearchRequest = JsonRpcRequest<
  typeof MEMORY_SEARCH_METHOD,
  MemorySearchParams
>;
export type MemorySearchResponse = JsonRpcSuccess<MemorySearchResultPayload>;

export interface MemoryEvaluationsListParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly skillId?: string;
  readonly outcome?: EvaluationOutcome;
}
export interface MemoryEvaluationsListResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly evaluations: readonly SkillEvaluationResult[];
}
export type MemoryEvaluationsListRequest = JsonRpcRequest<
  typeof MEMORY_EVALUATIONS_LIST_METHOD,
  MemoryEvaluationsListParams
>;
export type MemoryEvaluationsListResponse =
  JsonRpcSuccess<MemoryEvaluationsListResultPayload>;

export interface EngineeringConformanceParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly timeline: GenericTimeline;
  readonly policy: EngineeringWorkflowPolicy;
}
export interface EngineeringConformanceResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: EngineeringConformanceReport;
}
export type EngineeringConformanceRequest = JsonRpcRequest<
  typeof ENGINEERING_CONFORMANCE_METHOD,
  EngineeringConformanceParams
>;
export type EngineeringConformanceResponse =
  JsonRpcSuccess<EngineeringConformanceResultPayload>;

export interface WorkflowVariantSummaryParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly timelines: readonly GenericTimeline[];
}
export interface WorkflowVariantSummaryResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: WorkflowVariantSummaryReport;
}
export type WorkflowVariantSummaryRequest = JsonRpcRequest<
  typeof WORKFLOW_VARIANT_SUMMARY_METHOD,
  WorkflowVariantSummaryParams
>;
export type WorkflowVariantSummaryResponse =
  JsonRpcSuccess<WorkflowVariantSummaryResultPayload>;

export interface WorkflowDurationSummaryParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly timelines: readonly GenericTimeline[];
}
export interface WorkflowDurationSummaryResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: WorkflowDurationSummaryReport;
}
export type WorkflowDurationSummaryRequest = JsonRpcRequest<
  typeof WORKFLOW_DURATION_SUMMARY_METHOD,
  WorkflowDurationSummaryParams
>;
export type WorkflowDurationSummaryResponse =
  JsonRpcSuccess<WorkflowDurationSummaryResultPayload>;

export interface ConformanceTrendSummaryParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly reports: readonly EngineeringConformanceReport[];
}
export interface ConformanceTrendSummaryResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: ConformanceTrendSummaryReport;
}
export type ConformanceTrendSummaryRequest = JsonRpcRequest<
  typeof CONFORMANCE_TREND_SUMMARY_METHOD,
  ConformanceTrendSummaryParams
>;
export type ConformanceTrendSummaryResponse =
  JsonRpcSuccess<ConformanceTrendSummaryResultPayload>;

export interface WorkflowRepetitionSummaryParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly timelines: readonly GenericTimeline[];
}
export interface WorkflowRepetitionSummaryResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: WorkflowRepetitionSummaryReport;
}
export type WorkflowRepetitionSummaryRequest = JsonRpcRequest<
  typeof WORKFLOW_REPETITION_SUMMARY_METHOD,
  WorkflowRepetitionSummaryParams
>;
export type WorkflowRepetitionSummaryResponse =
  JsonRpcSuccess<WorkflowRepetitionSummaryResultPayload>;

export interface WorkflowTransitionIntervalsParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly timelines: readonly GenericTimeline[];
}
export interface WorkflowTransitionIntervalsResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly report: WorkflowTransitionIntervalsReport;
}
export type WorkflowTransitionIntervalsRequest = JsonRpcRequest<
  typeof WORKFLOW_TRANSITION_INTERVALS_METHOD,
  WorkflowTransitionIntervalsParams
>;
export type WorkflowTransitionIntervalsResponse =
  JsonRpcSuccess<WorkflowTransitionIntervalsResultPayload>;

export interface SessionGetParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly root: string;
  readonly sessionId: string;
}
export interface SessionGetResultPayload {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly session: AgentSessionItem | null;
}
export type SessionGetRequest = JsonRpcRequest<
  typeof SESSION_GET_METHOD,
  SessionGetParams
>;
export type SessionGetResponse = JsonRpcSuccess<SessionGetResultPayload>;

export interface ApprovedApplyParams {
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly request: ApprovedApplyRequest;
}
export type ApprovedApplyRpcRequest = JsonRpcRequest<
  typeof APPROVED_APPLY_METHOD,
  ApprovedApplyParams
>;
export type ApprovedApplyRpcResponse =
  JsonRpcSuccess<ApprovedApplyExecutionResult>;

export type DaemonRequest =
  | DaemonInfoRequest
  | DoctorRequest
  | InspectRequest
  | ProjectDiffRequest
  | ProjectTimelineRequest
  | SecurityAuditRequest
  | MemorySearchRequest
  | MemoryEvaluationsListRequest
  | EngineeringConformanceRequest
  | WorkflowVariantSummaryRequest
  | WorkflowDurationSummaryRequest
  | ConformanceTrendSummaryRequest
  | WorkflowRepetitionSummaryRequest
  | WorkflowTransitionIntervalsRequest
  | SessionGetRequest
  | ApprovedApplyRpcRequest
  | QualityStandardsRequest
  | QualityCatalogRequest
  | QualityCheckersRequest
  | QualityGraphRequest;

export type DaemonResponse =
  | DaemonInfoResponse
  | DoctorResponse
  | InspectResponse
  | ProjectDiffResponse
  | ProjectTimelineResponse
  | SecurityAuditResponse
  | MemorySearchResponse
  | MemoryEvaluationsListResponse
  | EngineeringConformanceResponse
  | WorkflowVariantSummaryResponse
  | WorkflowDurationSummaryResponse
  | ConformanceTrendSummaryResponse
  | WorkflowRepetitionSummaryResponse
  | WorkflowTransitionIntervalsResponse
  | SessionGetResponse
  | ApprovedApplyRpcResponse
  | QualityStandardsResponse
  | QualityCatalogResponse
  | QualityCheckersResponse
  | QualityGraphResponse;

export class ProtocolValidationError extends Error {
  constructor(
    readonly code: -32600 | -32601 | -32602,
    message: string,
  ) {
    super(message);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestId(value: unknown): RequestId {
  if (typeof value === "string" || typeof value === "number") return value;
  throw new ProtocolValidationError(
    -32600,
    "request id must be a string or number",
  );
}

function stringValue(value: unknown, field: string): string {
  if (typeof value === "string" && value.length > 0) return value;
  throw new ProtocolValidationError(
    -32602,
    `${field} must be a non-empty string`,
  );
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string"))
    return value;
  throw new ProtocolValidationError(
    -32602,
    `${field} must be an array of strings`,
  );
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0)
    return value;
  throw new ProtocolValidationError(
    -32602,
    `${field} must be a positive integer`,
  );
}

function validateTimelineBounds(
  limit: number,
  timeoutMs: number,
  maxOutputBytes: number,
): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > TIMELINE_MAX_LIMIT)
    throw new ProtocolValidationError(
      -32602,
      `limit must be between 1 and ${TIMELINE_MAX_LIMIT}`,
    );
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 100 ||
    timeoutMs > TIMELINE_MAX_TIMEOUT_MS
  )
    throw new ProtocolValidationError(
      -32602,
      `timeoutMs must be between 100 and ${TIMELINE_MAX_TIMEOUT_MS}`,
    );
  if (
    !Number.isInteger(maxOutputBytes) ||
    maxOutputBytes < 4096 ||
    maxOutputBytes > TIMELINE_MAX_OUTPUT_BYTES
  )
    throw new ProtocolValidationError(
      -32602,
      `maxOutputBytes must be between 4096 and ${TIMELINE_MAX_OUTPUT_BYTES}`,
    );
}

export function createDoctorRequest(
  id: RequestId,
  params: Omit<DoctorParams, "protocolVersion">,
): DoctorRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: DOCTOR_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      profile: params.profile,
      adapters: [...params.adapters],
    },
  };
}

export function createDaemonInfoRequest(
  id: RequestId,
  clientProtocolVersion: number = PROTOCOL_VERSION,
): DaemonInfoRequest {
  if (!Number.isInteger(clientProtocolVersion) || clientProtocolVersion < 1)
    throw new ProtocolValidationError(
      -32602,
      "clientProtocolVersion must be a positive integer",
    );
  return {
    jsonrpc: "2.0",
    id,
    method: DAEMON_INFO_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      clientProtocolVersion,
    },
  };
}

export function createProjectDiffRequest(
  id: RequestId,
  params: Omit<ProjectDiffParams, "protocolVersion">,
): ProjectDiffRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: PROJECT_DIFF_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      profile: params.profile,
      adapters: [...params.adapters],
    },
  };
}

export function createProjectTimelineRequest(
  id: RequestId,
  params: Omit<
    ProjectTimelineParams,
    "protocolVersion" | "limit" | "timeoutMs" | "maxOutputBytes"
  > &
    Partial<
      Pick<ProjectTimelineParams, "limit" | "timeoutMs" | "maxOutputBytes">
    >,
): ProjectTimelineRequest {
  const limit = params.limit ?? TIMELINE_DEFAULT_LIMIT;
  const timeoutMs = params.timeoutMs ?? TIMELINE_DEFAULT_TIMEOUT_MS;
  const maxOutputBytes =
    params.maxOutputBytes ?? TIMELINE_DEFAULT_MAX_OUTPUT_BYTES;
  validateTimelineBounds(limit, timeoutMs, maxOutputBytes);
  return {
    jsonrpc: "2.0",
    id,
    method: PROJECT_TIMELINE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      caseId: params.caseId,
      limit,
      timeoutMs,
      maxOutputBytes,
    },
  };
}

export function createInspectRequest(
  id: RequestId,
  params: Omit<InspectParams, "protocolVersion">,
): InspectRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: INSPECT_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
    },
  };
}

export function createSecurityAuditRequest(
  id: RequestId,
  params: Omit<SecurityAuditParams, "protocolVersion">,
): SecurityAuditRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: SECURITY_AUDIT_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      projectId: params.projectId,
    },
  };
}

export function createMemorySearchRequest(
  id: RequestId,
  params: Omit<MemorySearchParams, "protocolVersion">,
): MemorySearchRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: MEMORY_SEARCH_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      query: params.query,
    },
  };
}

export function createMemoryEvaluationsListRequest(
  id: RequestId,
  params: Omit<MemoryEvaluationsListParams, "protocolVersion">,
): MemoryEvaluationsListRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: MEMORY_EVALUATIONS_LIST_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      ...(params.skillId !== undefined ? { skillId: params.skillId } : {}),
      ...(params.outcome !== undefined ? { outcome: params.outcome } : {}),
    },
  };
}

export function createEngineeringConformanceRequest(
  id: RequestId,
  params: Omit<EngineeringConformanceParams, "protocolVersion">,
): EngineeringConformanceRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: ENGINEERING_CONFORMANCE_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      timeline: params.timeline,
      policy: params.policy,
    },
  };
}

export function createWorkflowVariantSummaryRequest(
  id: RequestId,
  params: Omit<WorkflowVariantSummaryParams, "protocolVersion">,
): WorkflowVariantSummaryRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: WORKFLOW_VARIANT_SUMMARY_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      timelines: params.timelines,
    },
  };
}

export function createWorkflowDurationSummaryRequest(
  id: RequestId,
  params: Omit<WorkflowDurationSummaryParams, "protocolVersion">,
): WorkflowDurationSummaryRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: WORKFLOW_DURATION_SUMMARY_METHOD,
    params: { protocolVersion: PROTOCOL_VERSION, timelines: params.timelines },
  };
}

export function createConformanceTrendSummaryRequest(
  id: RequestId,
  params: Omit<ConformanceTrendSummaryParams, "protocolVersion">,
): ConformanceTrendSummaryRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: CONFORMANCE_TREND_SUMMARY_METHOD,
    params: { protocolVersion: PROTOCOL_VERSION, reports: params.reports },
  };
}

export function createWorkflowRepetitionSummaryRequest(
  id: RequestId,
  params: Omit<WorkflowRepetitionSummaryParams, "protocolVersion">,
): WorkflowRepetitionSummaryRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: WORKFLOW_REPETITION_SUMMARY_METHOD,
    params: { protocolVersion: PROTOCOL_VERSION, timelines: params.timelines },
  };
}

export function createWorkflowTransitionIntervalsRequest(
  id: RequestId,
  params: Omit<WorkflowTransitionIntervalsParams, "protocolVersion">,
): WorkflowTransitionIntervalsRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: WORKFLOW_TRANSITION_INTERVALS_METHOD,
    params: { protocolVersion: PROTOCOL_VERSION, timelines: params.timelines },
  };
}

export function createSessionGetRequest(
  id: RequestId,
  params: Omit<SessionGetParams, "protocolVersion">,
): SessionGetRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: SESSION_GET_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      root: params.root,
      sessionId: params.sessionId,
    },
  };
}

export function createApprovedApplyRpcRequest(
  id: RequestId,
  request: ApprovedApplyRequest,
): ApprovedApplyRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: APPROVED_APPLY_METHOD,
    params: {
      protocolVersion: PROTOCOL_VERSION,
      request,
    },
  };
}

export function parseDoctorRequest(value: unknown): DoctorRequest {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (value.method !== DOCTOR_METHOD)
    throw new ProtocolValidationError(-32601, "unsupported protocol method");
  if (!isObject(value.params))
    throw new ProtocolValidationError(-32602, "params must be an object");
  if (value.params.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  return createDoctorRequest(id, {
    root: stringValue(value.params.root, "root"),
    profile: stringValue(value.params.profile, "profile"),
    adapters: stringArray(value.params.adapters, "adapters"),
  });
}

export function parseDaemonRequest(value: unknown): DaemonRequest {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  const validMethods: readonly string[] = [
    DAEMON_INFO_METHOD,
    DOCTOR_METHOD,
    INSPECT_METHOD,
    PROJECT_DIFF_METHOD,
    PROJECT_TIMELINE_METHOD,
    SECURITY_AUDIT_METHOD,
    MEMORY_SEARCH_METHOD,
    MEMORY_EVALUATIONS_LIST_METHOD,
    ENGINEERING_CONFORMANCE_METHOD,
    WORKFLOW_VARIANT_SUMMARY_METHOD,
    WORKFLOW_DURATION_SUMMARY_METHOD,
    CONFORMANCE_TREND_SUMMARY_METHOD,
    WORKFLOW_REPETITION_SUMMARY_METHOD,
    WORKFLOW_TRANSITION_INTERVALS_METHOD,
    SESSION_GET_METHOD,
    APPROVED_APPLY_METHOD,
    QUALITY_STANDARDS_METHOD,
    QUALITY_CATALOG_METHOD,
    QUALITY_CHECKERS_METHOD,
    QUALITY_GRAPH_METHOD,
  ];
  if (typeof value.method !== "string" || !validMethods.includes(value.method))
    throw new ProtocolValidationError(-32601, "unsupported protocol method");
  if (!isObject(value.params))
    throw new ProtocolValidationError(-32602, "params must be an object");
  if (value.params.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");

  if (value.method === DAEMON_INFO_METHOD) {
    const clientProtocolVersion = value.params.clientProtocolVersion;
    if (
      typeof clientProtocolVersion !== "number" ||
      !Number.isInteger(clientProtocolVersion) ||
      clientProtocolVersion < 1
    )
      throw new ProtocolValidationError(
        -32602,
        "clientProtocolVersion must be a positive integer",
      );
    return createDaemonInfoRequest(id, clientProtocolVersion);
  }

  if (value.method === DOCTOR_METHOD) {
    return createDoctorRequest(id, {
      root: stringValue(value.params.root, "root"),
      profile: stringValue(value.params.profile, "profile"),
      adapters: stringArray(value.params.adapters, "adapters"),
    });
  }
  if (value.method === INSPECT_METHOD) {
    return createInspectRequest(id, {
      root: stringValue(value.params.root, "root"),
    });
  }
  if (value.method === PROJECT_DIFF_METHOD) {
    return createProjectDiffRequest(id, {
      root: stringValue(value.params.root, "root"),
      profile: stringValue(value.params.profile, "profile"),
      adapters: stringArray(value.params.adapters, "adapters"),
    });
  }
  if (value.method === PROJECT_TIMELINE_METHOD) {
    return createProjectTimelineRequest(id, {
      root: stringValue(value.params.root, "root"),
      caseId: stringValue(value.params.caseId, "caseId"),
      limit: positiveInteger(value.params.limit, "limit"),
      timeoutMs: positiveInteger(value.params.timeoutMs, "timeoutMs"),
      maxOutputBytes: positiveInteger(
        value.params.maxOutputBytes,
        "maxOutputBytes",
      ),
    });
  }
  if (value.method === SECURITY_AUDIT_METHOD) {
    return createSecurityAuditRequest(id, {
      root: stringValue(value.params.root, "root"),
      projectId: stringValue(value.params.projectId, "projectId"),
    });
  }
  if (value.method === MEMORY_SEARCH_METHOD) {
    return createMemorySearchRequest(id, {
      root: stringValue(value.params.root, "root"),
      query: stringValue(value.params.query, "query"),
    });
  }
  if (value.method === MEMORY_EVALUATIONS_LIST_METHOD) {
    const outcome = value.params.outcome;
    if (
      outcome !== undefined &&
      ![
        "passed",
        "failed",
        "improved",
        "regressed",
        "ambiguous",
        "unsupported",
        "unsafe",
      ].includes(stringValue(outcome, "outcome"))
    ) {
      throw new ProtocolValidationError(-32602, "invalid evaluation outcome");
    }
    return createMemoryEvaluationsListRequest(id, {
      root: stringValue(value.params.root, "root"),
      ...(typeof value.params.skillId === "string" &&
      value.params.skillId.length > 0
        ? { skillId: value.params.skillId }
        : {}),
      ...(outcome !== undefined
        ? { outcome: outcome as EvaluationOutcome }
        : {}),
    });
  }
  if (value.method === ENGINEERING_CONFORMANCE_METHOD) {
    return createEngineeringConformanceRequest(id, {
      root: stringValue(value.params.root, "root"),
      timeline: validateGenericTimeline(value.params.timeline),
      policy: validateEngineeringWorkflowPolicy(value.params.policy),
    });
  }
  if (value.method === WORKFLOW_VARIANT_SUMMARY_METHOD) {
    if (!Array.isArray(value.params.timelines))
      throw new ProtocolValidationError(-32602, "timelines must be an array");
    return createWorkflowVariantSummaryRequest(id, {
      timelines: value.params.timelines.map(validateGenericTimeline),
    });
  }
  if (value.method === WORKFLOW_DURATION_SUMMARY_METHOD) {
    if (!Array.isArray(value.params.timelines))
      throw new ProtocolValidationError(-32602, "timelines must be an array");
    return createWorkflowDurationSummaryRequest(id, {
      timelines: value.params.timelines.map(validateGenericTimeline),
    });
  }
  if (value.method === CONFORMANCE_TREND_SUMMARY_METHOD) {
    if (!Array.isArray(value.params.reports))
      throw new ProtocolValidationError(-32602, "reports must be an array");
    return createConformanceTrendSummaryRequest(id, {
      reports: value.params.reports.map(validateEngineeringConformanceReport),
    });
  }
  if (value.method === WORKFLOW_REPETITION_SUMMARY_METHOD) {
    if (!Array.isArray(value.params.timelines))
      throw new ProtocolValidationError(-32602, "timelines must be an array");
    return createWorkflowRepetitionSummaryRequest(id, {
      timelines: value.params.timelines.map(validateGenericTimeline),
    });
  }
  if (value.method === WORKFLOW_TRANSITION_INTERVALS_METHOD) {
    if (!Array.isArray(value.params.timelines))
      throw new ProtocolValidationError(-32602, "timelines must be an array");
    return createWorkflowTransitionIntervalsRequest(id, {
      timelines: value.params.timelines.map(validateGenericTimeline),
    });
  }
  if (value.method === SESSION_GET_METHOD) {
    return createSessionGetRequest(id, {
      root: stringValue(value.params.root, "root"),
      sessionId: stringValue(value.params.sessionId, "sessionId"),
    });
  }
  if (value.method === APPROVED_APPLY_METHOD) {
    if (!isObject(value.params.request)) {
      throw new ProtocolValidationError(-32602, "request must be an object");
    }
    return createApprovedApplyRpcRequest(
      id,
      value.params.request as unknown as ApprovedApplyRequest,
    );
  }
  if (value.method === QUALITY_STANDARDS_METHOD)
    return createQualityStandardsRequest(
      id,
      stringValue(value.params.root, "root"),
    );
  if (value.method === QUALITY_CATALOG_METHOD)
    return createQualityCatalogRequest(
      id,
      stringValue(value.params.root, "root"),
    );
  if (value.method === QUALITY_CHECKERS_METHOD)
    return createQualityCheckersRequest(
      id,
      stringValue(value.params.root, "root"),
    );
  if (value.method === QUALITY_GRAPH_METHOD)
    return createQualityGraphRequest(
      id,
      stringValue(value.params.root, "root"),
    );
  throw new ProtocolValidationError(-32601, "unsupported protocol method");
}

export function serializeRequest(request: DaemonRequest): string {
  return JSON.stringify(request);
}

export function parseSerializedRequest(serialized: string): DaemonRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new ProtocolValidationError(-32600, "request is not valid JSON");
  }
  return parseDaemonRequest(parsed);
}

export function createDoctorResponse(
  id: RequestId,
  result: Omit<DoctorResult, "protocolVersion">,
): DoctorResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      findings: result.findings.map((finding) => ({ ...finding })),
      diagnostics: [...result.diagnostics],
      exitCode: result.exitCode,
    },
  };
}

export function createDaemonInfoResponse(
  id: RequestId,
  result: Omit<DaemonInfoResult, "protocolVersion">,
): DaemonInfoResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      daemonVersion: result.daemonVersion,
      capabilities: result.capabilities.map((capability) => ({
        ...capability,
      })),
      limits: { ...result.limits },
      compatibility: { ...result.compatibility },
    },
  };
}

export function createProjectDiffResponse(
  id: RequestId,
  result: Omit<ProjectDiffResult, "protocolVersion">,
): ProjectDiffResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      operationVersion: 1,
      root: result.root,
      changes: result.changes.map((change) => ({ ...change })),
      diagnostics: [...result.diagnostics],
    },
  };
}

export function createProjectTimelineResponse(
  id: RequestId,
  result: Omit<ProjectTimelineResult, "protocolVersion">,
): ProjectTimelineResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      operationVersion: 1,
      root: result.root,
      caseType: "release",
      caseId: result.caseId,
      quality: result.quality,
      events: result.events.map((event) => ({
        ...event,
        parents: [...event.parents],
        changedPaths: [...event.changedPaths],
      })),
      findings: [...result.findings],
      diagnostics: [...result.diagnostics],
    },
  };
}

export function createInspectResponse(
  id: RequestId,
  result: Omit<InspectResult, "protocolVersion">,
): InspectResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      projectId: result.projectId,
      root: result.root,
    },
  };
}

export function createSecurityAuditResponse(
  id: RequestId,
  result: Omit<SecurityAuditResult, "protocolVersion">,
): SecurityAuditResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: result.report,
    },
  };
}

export function createMemorySearchResponse(
  id: RequestId,
  result: Omit<MemorySearchResultPayload, "protocolVersion">,
): MemorySearchResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      query: result.query,
      items: [...result.items],
    },
  };
}

export function createMemoryEvaluationsListResponse(
  id: RequestId,
  result: Omit<MemoryEvaluationsListResultPayload, "protocolVersion">,
): MemoryEvaluationsListResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      evaluations: [...result.evaluations],
    },
  };
}

export function createEngineeringConformanceResponse(
  id: RequestId,
  result: Omit<EngineeringConformanceResultPayload, "protocolVersion">,
): EngineeringConformanceResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: validateEngineeringConformanceReport(result.report),
    },
  };
}

export function createWorkflowVariantSummaryResponse(
  id: RequestId,
  result: Omit<WorkflowVariantSummaryResultPayload, "protocolVersion">,
): WorkflowVariantSummaryResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: validateWorkflowVariantSummaryReport(result.report),
    },
  };
}

export function createWorkflowDurationSummaryResponse(
  id: RequestId,
  result: Omit<WorkflowDurationSummaryResultPayload, "protocolVersion">,
): WorkflowDurationSummaryResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: validateWorkflowDurationSummaryReport(result.report),
    },
  };
}

export function createConformanceTrendSummaryResponse(
  id: RequestId,
  result: Omit<ConformanceTrendSummaryResultPayload, "protocolVersion">,
): ConformanceTrendSummaryResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: validateConformanceTrendSummaryReport(result.report),
    },
  };
}

export function createWorkflowRepetitionSummaryResponse(
  id: RequestId,
  result: Omit<WorkflowRepetitionSummaryResultPayload, "protocolVersion">,
): WorkflowRepetitionSummaryResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: validateWorkflowRepetitionSummaryReport(result.report),
    },
  };
}

export function createWorkflowTransitionIntervalsResponse(
  id: RequestId,
  result: Omit<WorkflowTransitionIntervalsResultPayload, "protocolVersion">,
): WorkflowTransitionIntervalsResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      report: validateWorkflowTransitionIntervalsReport(result.report),
    },
  };
}

export function createSessionGetResponse(
  id: RequestId,
  result: Omit<SessionGetResultPayload, "protocolVersion">,
): SessionGetResponse {
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      session: result.session,
    },
  };
}

export function parseDoctorResponse(value: unknown): DoctorResponse {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (!isObject(value.result))
    throw new ProtocolValidationError(-32600, "result must be an object");
  if (value.result.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  if (!Array.isArray(value.result.findings))
    throw new ProtocolValidationError(-32602, "findings must be an array");
  const findings = value.result.findings.map((finding) => {
    if (!isObject(finding))
      throw new ProtocolValidationError(-32602, "finding must be an object");
    const severity = stringValue(finding.severity, "finding severity");
    if (!["error", "warning", "info"].includes(severity))
      throw new ProtocolValidationError(-32602, "invalid finding severity");
    return {
      code: stringValue(finding.code, "finding code"),
      severity: severity as DoctorFinding["severity"],
      category: stringValue(finding.category, "finding category"),
      path: stringValue(finding.path, "finding path"),
      message: stringValue(finding.message, "finding message"),
    };
  });
  const exitCode = value.result.exitCode;
  if (exitCode !== 0 && exitCode !== 3)
    throw new ProtocolValidationError(-32602, "invalid doctor exit code");
  return createDoctorResponse(id, {
    findings,
    diagnostics: stringArray(value.result.diagnostics, "diagnostics"),
    exitCode,
  });
}

export function parseInspectResponse(value: unknown): InspectResponse {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (!isObject(value.result))
    throw new ProtocolValidationError(-32600, "result must be an object");
  if (value.result.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  return createInspectResponse(id, {
    projectId: stringValue(value.result.projectId, "projectId"),
    root: stringValue(value.result.root, "root"),
  });
}

export function parseDaemonInfoResponse(value: unknown): DaemonInfoResponse {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (!isObject(value.result))
    throw new ProtocolValidationError(-32600, "result must be an object");
  if (value.result.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  const daemonVersion = stringValue(
    value.result.daemonVersion,
    "daemonVersion",
  );
  if (!Array.isArray(value.result.capabilities))
    throw new ProtocolValidationError(-32602, "capabilities must be an array");
  const capabilities: readonly DaemonCapability[] =
    value.result.capabilities.map((capability) => {
      if (!isObject(capability))
        throw new ProtocolValidationError(
          -32602,
          "capability must be an object",
        );
      const classification = stringValue(
        capability.classification,
        "capability classification",
      );
      if (classification !== "read-only" && classification !== "mutating")
        throw new ProtocolValidationError(
          -32602,
          "invalid capability classification",
        );
      return {
        method: stringValue(capability.method, "capability method"),
        operation: stringValue(capability.operation, "capability operation"),
        classification: classification as CapabilityClassification,
      };
    });
  if (!isObject(value.result.limits))
    throw new ProtocolValidationError(-32602, "limits must be an object");
  const limits = value.result.limits;
  const limit = (field: keyof DaemonLimits): number => {
    const valueForField = limits[field];
    if (
      typeof valueForField !== "number" ||
      !Number.isInteger(valueForField) ||
      valueForField < 1
    )
      throw new ProtocolValidationError(
        -32602,
        `${field} must be a positive integer`,
      );
    return valueForField;
  };
  if (!isObject(value.result.compatibility))
    throw new ProtocolValidationError(
      -32602,
      "compatibility must be an object",
    );
  const status = stringValue(
    value.result.compatibility.status,
    "compatibility status",
  );
  if (status !== "compatible" && status !== "incompatible")
    throw new ProtocolValidationError(-32602, "invalid compatibility status");
  const clientProtocolVersion =
    value.result.compatibility.clientProtocolVersion;
  const daemonProtocolVersion =
    value.result.compatibility.daemonProtocolVersion;
  if (
    typeof clientProtocolVersion !== "number" ||
    !Number.isInteger(clientProtocolVersion) ||
    clientProtocolVersion < 1 ||
    daemonProtocolVersion !== PROTOCOL_VERSION
  )
    throw new ProtocolValidationError(-32602, "invalid compatibility versions");
  return createDaemonInfoResponse(id, {
    daemonVersion,
    capabilities,
    limits: {
      maxMessageBytes: limit("maxMessageBytes"),
      maxResponseBytes: limit("maxResponseBytes"),
      maxConnections: limit("maxConnections"),
      requestTimeoutMs: limit("requestTimeoutMs"),
    },
    compatibility: {
      status,
      clientProtocolVersion,
      daemonProtocolVersion,
      ...(typeof value.result.compatibility.reason === "string"
        ? { reason: value.result.compatibility.reason }
        : {}),
    },
  });
}

function parseQualityResponse(value: unknown): JsonRpcSuccess<{
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly viewmodel: QualityViewmodelPayload;
}> {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (!isObject(value.result))
    throw new ProtocolValidationError(-32600, "result must be an object");
  if (value.result.protocolVersion !== PROTOCOL_VERSION)
    throw new ProtocolValidationError(-32602, "unsupported protocol version");
  if (!isObject(value.result.viewmodel))
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: PROTOCOL_VERSION,
      viewmodel: value.result.viewmodel,
    },
  };
}

export function parseQualityStandardsResponse(
  value: unknown,
): QualityStandardsResponse {
  return parseQualityResponse(value) as QualityStandardsResponse;
}

export function parseQualityCatalogResponse(
  value: unknown,
): QualityCatalogResponse {
  return parseQualityResponse(value) as QualityCatalogResponse;
}

export function parseQualityCheckersResponse(
  value: unknown,
): QualityCheckersResponse {
  return parseQualityResponse(value) as QualityCheckersResponse;
}

export function parseQualityGraphResponse(
  value: unknown,
): QualityGraphResponse {
  return parseQualityResponse(value) as QualityGraphResponse;
}

export function parseProjectDiffResponse(value: unknown): ProjectDiffResponse {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (!isObject(value.result))
    throw new ProtocolValidationError(-32600, "result must be an object");
  if (
    value.result.protocolVersion !== PROTOCOL_VERSION ||
    value.result.operationVersion !== 1
  )
    throw new ProtocolValidationError(
      -32602,
      "unsupported project diff version",
    );
  if (!Array.isArray(value.result.changes))
    throw new ProtocolValidationError(-32602, "changes must be an array");
  const changes = value.result.changes.map((change) => {
    if (!isObject(change))
      throw new ProtocolValidationError(-32602, "change must be an object");
    const kind = stringValue(change.kind, "change kind");
    if (
      ![
        "create",
        "update",
        "conflict",
        "modified",
        "missing",
        "stale",
        "security-error",
      ].includes(kind)
    )
      throw new ProtocolValidationError(-32602, "invalid change kind");
    if (change.content !== undefined && typeof change.content !== "string")
      throw new ProtocolValidationError(
        -32602,
        "change content must be a string",
      );
    return {
      path: stringValue(change.path, "change path"),
      kind: kind as ProjectDiffChange["kind"],
      reason: stringValue(change.reason, "change reason"),
      ...(typeof change.content === "string"
        ? { content: change.content }
        : {}),
    };
  });
  return createProjectDiffResponse(id, {
    operationVersion: 1,
    root: stringValue(value.result.root, "root"),
    changes,
    diagnostics: stringArray(value.result.diagnostics, "diagnostics"),
  });
}

export function parseProjectTimelineResponse(
  value: unknown,
): ProjectTimelineResponse {
  if (!isObject(value) || value.jsonrpc !== "2.0")
    throw new ProtocolValidationError(-32600, "jsonrpc must equal 2.0");
  const id = requestId(value.id);
  if (!isObject(value.result))
    throw new ProtocolValidationError(-32600, "result must be an object");
  if (
    value.result.protocolVersion !== PROTOCOL_VERSION ||
    value.result.operationVersion !== 1 ||
    value.result.caseType !== "release"
  )
    throw new ProtocolValidationError(
      -32602,
      "unsupported project timeline version",
    );
  const quality = stringValue(value.result.quality, "timeline quality");
  if (!["complete", "bounded", "unavailable"].includes(quality))
    throw new ProtocolValidationError(-32602, "invalid timeline quality");
  if (!Array.isArray(value.result.events))
    throw new ProtocolValidationError(-32602, "events must be an array");
  const events = value.result.events.map((event) => {
    if (!isObject(event))
      throw new ProtocolValidationError(
        -32602,
        "timeline event must be an object",
      );
    if (
      event.eventType !== "commit" ||
      event.source !== "local-git" ||
      event.trust !== "local-observed-unverified"
    )
      throw new ProtocolValidationError(-32602, "invalid timeline event");
    if (
      typeof event.timestamp !== "number" ||
      !Number.isFinite(event.timestamp)
    )
      throw new ProtocolValidationError(-32602, "invalid timeline timestamp");
    return {
      id: stringValue(event.id, "timeline event id"),
      eventType: "commit" as const,
      timestamp: event.timestamp,
      commitId: stringValue(event.commitId, "timeline commit id"),
      parents: stringArray(event.parents, "timeline parents"),
      changedPaths: stringArray(event.changedPaths, "timeline changedPaths"),
      source: "local-git" as const,
      trust: "local-observed-unverified" as const,
    };
  });
  if (!Array.isArray(value.result.findings))
    throw new ProtocolValidationError(
      -32602,
      "timeline findings must be an array",
    );
  const findings = value.result.findings.map((finding) => {
    if (finding !== "evidence-bounded" && finding !== "evidence-unavailable")
      throw new ProtocolValidationError(-32602, "invalid timeline finding");
    return finding;
  });
  return createProjectTimelineResponse(id, {
    operationVersion: 1,
    root: stringValue(value.result.root, "root"),
    caseType: "release",
    caseId: stringValue(value.result.caseId, "caseId"),
    quality: quality as ProjectTimelineResult["quality"],
    events,
    findings,
    diagnostics: stringArray(value.result.diagnostics, "diagnostics"),
  });
}

export type TrustClass =
  | "canonical-policy"
  | "verified-evidence"
  | "user-supplied"
  | "agent-generated";

export type RetentionState = "active" | "archived" | "superseded" | "deleted";

export interface TaskSummary {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly root: string;
  readonly intent: string;
  readonly planRef?: string;
  readonly affectedPaths: readonly string[];
  readonly validationOutcome: "passed" | "failed" | "partial" | "skipped";
  readonly evidenceReferences: readonly string[];
  readonly usedSkills: readonly string[];
  readonly unresolvedWork: readonly string[];
  readonly provenance: string;
  readonly trustClass: TrustClass;
  readonly retentionState: RetentionState;
  readonly createdAt: string;
}

export interface SessionSummary {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly root: string;
  readonly profile: string;
  readonly activeAdapters: readonly string[];
  readonly completedTaskIds: readonly string[];
  readonly summaryNotes?: string;
  readonly createdAt: string;
}

export function validateTaskSummary(value: unknown): TaskSummary {
  if (!isObject(value))
    throw new ProtocolValidationError(-32602, "task summary must be an object");
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported task summary schema version",
    );
  const trustClass = stringValue(value.trustClass, "trustClass");
  if (
    ![
      "canonical-policy",
      "verified-evidence",
      "user-supplied",
      "agent-generated",
    ].includes(trustClass)
  )
    throw new ProtocolValidationError(-32602, "invalid trustClass");

  const retentionState = stringValue(value.retentionState, "retentionState");
  if (!["active", "archived", "superseded", "deleted"].includes(retentionState))
    throw new ProtocolValidationError(-32602, "invalid retentionState");

  const validationOutcome = stringValue(
    value.validationOutcome,
    "validationOutcome",
  );
  if (!["passed", "failed", "partial", "skipped"].includes(validationOutcome))
    throw new ProtocolValidationError(-32602, "invalid validationOutcome");

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    root: stringValue(value.root, "root"),
    intent: stringValue(value.intent, "intent"),
    ...(typeof value.planRef === "string" && value.planRef.length > 0
      ? { planRef: value.planRef }
      : {}),
    affectedPaths: stringArray(value.affectedPaths, "affectedPaths"),
    validationOutcome: validationOutcome as TaskSummary["validationOutcome"],
    evidenceReferences: stringArray(
      value.evidenceReferences,
      "evidenceReferences",
    ),
    usedSkills: stringArray(value.usedSkills, "usedSkills"),
    unresolvedWork: stringArray(value.unresolvedWork, "unresolvedWork"),
    provenance: stringValue(value.provenance, "provenance"),
    trustClass: trustClass as TrustClass,
    retentionState: retentionState as RetentionState,
    createdAt: stringValue(value.createdAt, "createdAt"),
  };
}

export function validateSessionSummary(value: unknown): SessionSummary {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "session summary must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported session summary schema version",
    );

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    root: stringValue(value.root, "root"),
    profile: stringValue(value.profile, "profile"),
    activeAdapters: stringArray(value.activeAdapters, "activeAdapters"),
    completedTaskIds: stringArray(value.completedTaskIds, "completedTaskIds"),
    ...(typeof value.summaryNotes === "string" && value.summaryNotes.length > 0
      ? { summaryNotes: value.summaryNotes }
      : {}),
    createdAt: stringValue(value.createdAt, "createdAt"),
  };
}

export type SkillLoadingLevel = "catalog" | "contract" | "procedure";

export interface SkillContextCost {
  readonly catalogCost: number;
  readonly contractCost: number;
  readonly procedureCost: number;
}

export interface SkillCatalogMetadata {
  readonly level: "catalog";
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly packs: readonly string[];
  readonly roles: readonly string[];
  readonly trustClass: TrustClass;
  readonly compatibility: readonly string[];
  readonly capabilities: readonly string[];
  readonly permissions: readonly string[];
  readonly contextCost: SkillContextCost;
}

export interface SkillExecutionContract extends Omit<
  SkillCatalogMetadata,
  "level"
> {
  readonly level: "contract";
  readonly inputs: readonly {
    readonly name: string;
    readonly description: string;
    readonly required: boolean;
  }[];
  readonly outputs: readonly {
    readonly name: string;
    readonly description: string;
  }[];
  readonly triggers: readonly string[];
  readonly toolRequirements: readonly string[];
  readonly executionConstraints: readonly string[];
}

export interface SkillProcedure extends Omit<SkillExecutionContract, "level"> {
  readonly level: "procedure";
  readonly content: string;
}

export interface SkillDiscoveryDecision {
  readonly skillId: string;
  readonly status: "selected" | "rejected" | "incompatible" | "unavailable";
  readonly reason: string;
}

export interface SkillDiscoveryResult {
  readonly level: SkillLoadingLevel;
  readonly totalBudgetEstimate: number;
  readonly eagerBudgetEstimate: number;
  readonly budgetSavingsPercentage: number;
  readonly skills: readonly (
    SkillCatalogMetadata | SkillExecutionContract | SkillProcedure
  )[];
  readonly decisions: readonly SkillDiscoveryDecision[];
}

export function validateSkillCatalogMetadata(
  value: unknown,
): SkillCatalogMetadata {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "skill catalog metadata must be an object",
    );
  if (value.level !== "catalog")
    throw new ProtocolValidationError(-32602, "level must be catalog");

  const trustClass = stringValue(value.trustClass, "trustClass");
  if (
    ![
      "canonical-policy",
      "verified-evidence",
      "user-supplied",
      "agent-generated",
    ].includes(trustClass)
  )
    throw new ProtocolValidationError(-32602, "invalid trustClass");

  if (!isObject(value.contextCost))
    throw new ProtocolValidationError(-32602, "contextCost must be an object");

  return {
    level: "catalog",
    id: stringValue(value.id, "id"),
    name: stringValue(value.name, "name"),
    version: stringValue(value.version, "version"),
    description: stringValue(value.description, "description"),
    packs: stringArray(value.packs, "packs"),
    roles: stringArray(value.roles, "roles"),
    trustClass: trustClass as TrustClass,
    compatibility: stringArray(value.compatibility, "compatibility"),
    capabilities: stringArray(value.capabilities, "capabilities"),
    permissions: stringArray(value.permissions, "permissions"),
    contextCost: {
      catalogCost:
        typeof value.contextCost.catalogCost === "number"
          ? value.contextCost.catalogCost
          : 0,
      contractCost:
        typeof value.contextCost.contractCost === "number"
          ? value.contextCost.contractCost
          : 0,
      procedureCost:
        typeof value.contextCost.procedureCost === "number"
          ? value.contextCost.procedureCost
          : 0,
    },
  };
}

export function validateSkillDiscoveryResult(
  value: unknown,
): SkillDiscoveryResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "skill discovery result must be an object",
    );

  const level = stringValue(value.level, "level");
  if (!["catalog", "contract", "procedure"].includes(level))
    throw new ProtocolValidationError(-32602, "invalid level");

  if (!Array.isArray(value.skills))
    throw new ProtocolValidationError(-32602, "skills must be an array");

  if (!Array.isArray(value.decisions))
    throw new ProtocolValidationError(-32602, "decisions must be an array");

  return {
    level: level as SkillLoadingLevel,
    totalBudgetEstimate:
      typeof value.totalBudgetEstimate === "number"
        ? value.totalBudgetEstimate
        : 0,
    eagerBudgetEstimate:
      typeof value.eagerBudgetEstimate === "number"
        ? value.eagerBudgetEstimate
        : 0,
    budgetSavingsPercentage:
      typeof value.budgetSavingsPercentage === "number"
        ? value.budgetSavingsPercentage
        : 0,
    skills: value.skills.map((entry) => {
      if (!isObject(entry))
        throw new ProtocolValidationError(
          -32602,
          "skill entry must be an object",
        );
      return validateSkillCatalogMetadata({
        ...entry,
        level: "catalog",
      });
    }),
    decisions: value.decisions.map((dec) => {
      if (!isObject(dec))
        throw new ProtocolValidationError(-32602, "decision must be an object");
      const status = stringValue(dec.status, "status");
      if (
        !["selected", "rejected", "incompatible", "unavailable"].includes(
          status,
        )
      )
        throw new ProtocolValidationError(-32602, "invalid decision status");
      return {
        skillId: stringValue(dec.skillId, "skillId"),
        status: status as SkillDiscoveryDecision["status"],
        reason: stringValue(dec.reason, "reason"),
      };
    }),
  };
}

export type SkillProposalState =
  | "proposed"
  | "under-review"
  | "approved"
  | "rejected"
  | "active"
  | "deprecated"
  | "archived"
  | "superseded"
  | "rolled-back";

export interface SkillProposal {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly state: SkillProposalState;
  readonly sourceTaskIds: readonly string[];
  readonly observedPattern: string;
  readonly confidence: number;
  readonly uncertainty: string;
  readonly requestedCapabilities: readonly string[];
  readonly supportedProfiles: readonly string[];
  readonly validationExpectations: readonly string[];
  readonly privacyImpact: string;
  readonly licenseNotice?: string;
  readonly trustClass: TrustClass;
  readonly content: string;
  readonly approvalEvidence?: string;
  readonly previousVersion?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function validateSkillProposal(value: unknown): SkillProposal {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "skill proposal must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported skill proposal schema version",
    );

  const state = stringValue(value.state, "state");
  const validStates: SkillProposalState[] = [
    "proposed",
    "under-review",
    "approved",
    "rejected",
    "active",
    "deprecated",
    "archived",
    "superseded",
    "rolled-back",
  ];
  if (!validStates.includes(state as SkillProposalState))
    throw new ProtocolValidationError(-32602, `invalid state: ${state}`);

  const trustClass = stringValue(value.trustClass, "trustClass");
  if (
    ![
      "canonical-policy",
      "verified-evidence",
      "user-supplied",
      "agent-generated",
    ].includes(trustClass)
  )
    throw new ProtocolValidationError(-32602, "invalid trustClass");

  const confidence =
    typeof value.confidence === "number" ? value.confidence : 0.5;

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    name: stringValue(value.name, "name"),
    version: stringValue(value.version, "version"),
    state: state as SkillProposalState,
    sourceTaskIds: stringArray(value.sourceTaskIds, "sourceTaskIds"),
    observedPattern: stringValue(value.observedPattern, "observedPattern"),
    confidence,
    uncertainty: stringValue(value.uncertainty, "uncertainty"),
    requestedCapabilities: stringArray(
      value.requestedCapabilities,
      "requestedCapabilities",
    ),
    supportedProfiles: stringArray(
      value.supportedProfiles,
      "supportedProfiles",
    ),
    validationExpectations: stringArray(
      value.validationExpectations,
      "validationExpectations",
    ),
    privacyImpact: stringValue(value.privacyImpact, "privacyImpact"),
    ...(typeof value.licenseNotice === "string" &&
    value.licenseNotice.length > 0
      ? { licenseNotice: value.licenseNotice }
      : {}),
    trustClass: trustClass as TrustClass,
    content: stringValue(value.content, "content"),
    ...(typeof value.approvalEvidence === "string" &&
    value.approvalEvidence.length > 0
      ? { approvalEvidence: value.approvalEvidence }
      : {}),
    ...(typeof value.previousVersion === "string" &&
    value.previousVersion.length > 0
      ? { previousVersion: value.previousVersion }
      : {}),
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
  };
}

export type EvaluationOutcome =
  "improved" | "regressed" | "ambiguous" | "unsupported" | "unsafe" | "passed";

export interface EvaluationCase {
  readonly id: string;
  readonly title: string;
  readonly profile: string;
  readonly prompt: string;
  readonly expectedCapabilities: readonly string[];
  readonly expectedTools: readonly string[];
  readonly maxContextBudget?: number;
}

export interface SkillEvaluationResult {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly skillId: string;
  readonly proposalId?: string;
  readonly outcome: EvaluationOutcome;
  readonly passed: boolean;
  readonly contextCost: number;
  readonly toolSelectionScore: number;
  readonly capabilityScore: number;
  readonly securityPass: boolean;
  readonly details: readonly string[];
  readonly provenance: {
    readonly runtime: string;
    readonly provider: string;
    readonly model: string;
    readonly environment: string;
  };
  readonly evaluatedAt: string;
}

export function validateSkillEvaluationResult(
  value: unknown,
): SkillEvaluationResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "skill evaluation result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported skill evaluation schema version",
    );

  const outcome = stringValue(value.outcome, "outcome");
  const validOutcomes: EvaluationOutcome[] = [
    "improved",
    "regressed",
    "ambiguous",
    "unsupported",
    "unsafe",
    "passed",
  ];
  if (!validOutcomes.includes(outcome as EvaluationOutcome))
    throw new ProtocolValidationError(-32602, `invalid outcome: ${outcome}`);

  if (typeof value.passed !== "boolean")
    throw new ProtocolValidationError(-32602, "passed must be a boolean");

  if (typeof value.securityPass !== "boolean")
    throw new ProtocolValidationError(-32602, "securityPass must be a boolean");

  if (!isObject(value.provenance))
    throw new ProtocolValidationError(-32602, "provenance must be an object");

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    skillId: stringValue(value.skillId, "skillId"),
    ...(typeof value.proposalId === "string" && value.proposalId.length > 0
      ? { proposalId: value.proposalId }
      : {}),
    outcome: outcome as EvaluationOutcome,
    passed: value.passed,
    contextCost: typeof value.contextCost === "number" ? value.contextCost : 0,
    toolSelectionScore:
      typeof value.toolSelectionScore === "number"
        ? value.toolSelectionScore
        : 1.0,
    capabilityScore:
      typeof value.capabilityScore === "number" ? value.capabilityScore : 1.0,
    securityPass: value.securityPass,
    details: stringArray(value.details, "details"),
    provenance: {
      runtime: stringValue(value.provenance.runtime, "provenance.runtime"),
      provider: stringValue(value.provenance.provider, "provenance.provider"),
      model: stringValue(value.provenance.model, "provenance.model"),
      environment: stringValue(
        value.provenance.environment,
        "provenance.environment",
      ),
    },
    evaluatedAt: stringValue(value.evaluatedAt, "evaluatedAt"),
  };
}

export interface ProceduralMemorySummary {
  readonly totalProposals: number;
  readonly proposalCountsByState: Record<string, number>;
  readonly totalEvaluations: number;
  readonly evaluationPassRate: number;
  readonly activeSkillsCount: number;
  readonly extensionLockStatus: "clean" | "stale" | "unverified" | "corrupted";
}

export interface ProceduralMemoryInspection {
  readonly summary: ProceduralMemorySummary;
  readonly proposals: readonly SkillProposal[];
  readonly evaluations: readonly SkillEvaluationResult[];
  readonly issues: readonly string[];
}

export interface SkillMutationPlan {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly action: "approve" | "activate" | "deprecate" | "rollback";
  readonly proposalId: string;
  readonly targetState: SkillProposalState;
  readonly approvalEvidence?: string;
  readonly checksum: string;
  readonly createdAt: string;
}

export function validateSkillMutationPlan(value: unknown): SkillMutationPlan {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "skill mutation plan must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported skill mutation plan schema version",
    );

  const action = stringValue(value.action, "action");
  const validActions = ["approve", "activate", "deprecate", "rollback"];
  if (!validActions.includes(action))
    throw new ProtocolValidationError(-32602, `invalid action: ${action}`);

  const targetState = stringValue(value.targetState, "targetState");

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    action: action as SkillMutationPlan["action"],
    proposalId: stringValue(value.proposalId, "proposalId"),
    targetState: targetState as SkillProposalState,
    ...(typeof value.approvalEvidence === "string" &&
    value.approvalEvidence.length > 0
      ? { approvalEvidence: value.approvalEvidence }
      : {}),
    checksum: stringValue(value.checksum, "checksum"),
    createdAt: stringValue(value.createdAt, "createdAt"),
  };
}

export type TaskCheckpointState =
  "active" | "paused" | "cancelled" | "redirected" | "resumed";

export interface TaskCheckpoint {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly taskId: string;
  readonly state: TaskCheckpointState;
  readonly completedSteps: readonly string[];
  readonly unresolvedWork: readonly string[];
  readonly createdSnapshotChecksum: string;
  readonly invalidatedPlans: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TaskRedirectRequest {
  readonly checkpointId: string;
  readonly newIntent: string;
  readonly reason?: string;
}

export interface TaskResumeResult {
  readonly checkpointId: string;
  readonly verifiedRoot: string;
  readonly valid: boolean;
  readonly invalidatedCount: number;
  readonly resumedAt: string;
}

export function validateTaskCheckpoint(value: unknown): TaskCheckpoint {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "task checkpoint must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported task checkpoint schema version",
    );

  const state = stringValue(value.state, "state");
  const validStates: TaskCheckpointState[] = [
    "active",
    "paused",
    "cancelled",
    "redirected",
    "resumed",
  ];
  if (!validStates.includes(state as TaskCheckpointState))
    throw new ProtocolValidationError(-32602, `invalid state: ${state}`);

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    taskId: stringValue(value.taskId, "taskId"),
    state: state as TaskCheckpointState,
    completedSteps: stringArray(value.completedSteps, "completedSteps"),
    unresolvedWork: stringArray(value.unresolvedWork, "unresolvedWork"),
    createdSnapshotChecksum: stringValue(
      value.createdSnapshotChecksum,
      "createdSnapshotChecksum",
    ),
    invalidatedPlans: stringArray(value.invalidatedPlans, "invalidatedPlans"),
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
  };
}

export function validateTaskRedirectRequest(
  value: unknown,
): TaskRedirectRequest {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "task redirect request must be an object",
    );

  return {
    checkpointId: stringValue(value.checkpointId, "checkpointId"),
    newIntent: stringValue(value.newIntent, "newIntent"),
    ...(typeof value.reason === "string" && value.reason.length > 0
      ? { reason: value.reason }
      : {}),
  };
}

export type SemanticRankingProvider =
  "local-tf-idf" | "local-embeddings" | "external-provider";

export interface SemanticRankingConfig {
  readonly schemaVersion: "1";
  readonly enabled: boolean;
  readonly provider: SemanticRankingProvider;
  readonly model?: string;
  readonly networkDestination?: string;
  readonly maxMemoryMb?: number;
  readonly dataScope?: string;
  readonly retentionPolicy?: string;
  readonly externalProviderApproved?: boolean;
}

export interface SemanticRankItem {
  readonly id: string;
  readonly type: "skill" | "proposal" | "summary" | "evidence";
  readonly score: number;
  readonly relevanceReason: string;
  readonly record: Record<string, unknown>;
}

export interface SemanticRankResult {
  readonly schemaVersion: "1";
  readonly query: string;
  readonly items: readonly SemanticRankItem[];
  readonly rankingLatencyMs: number;
  readonly provider: SemanticRankingProvider;
  readonly enabled: boolean;
}

export function validateSemanticRankingConfig(
  value: unknown,
): SemanticRankingConfig {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "semantic ranking config must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported semantic ranking config schema version",
    );

  if (typeof value.enabled !== "boolean")
    throw new ProtocolValidationError(-32602, "enabled must be a boolean");

  const provider = stringValue(value.provider, "provider");
  const validProviders: SemanticRankingProvider[] = [
    "local-tf-idf",
    "local-embeddings",
    "external-provider",
  ];
  if (!validProviders.includes(provider as SemanticRankingProvider))
    throw new ProtocolValidationError(-32602, `invalid provider: ${provider}`);

  if (
    provider === "external-provider" &&
    (typeof value.networkDestination !== "string" ||
      typeof value.model !== "string" ||
      typeof value.dataScope !== "string" ||
      typeof value.retentionPolicy !== "string" ||
      value.externalProviderApproved !== true)
  )
    throw new ProtocolValidationError(
      -32602,
      "external provider requires model, network destination, data scope, retention policy, and explicit approval",
    );
  return {
    schemaVersion: "1",
    enabled: value.enabled,
    provider: provider as SemanticRankingProvider,
    ...(typeof value.model === "string" && value.model.length > 0
      ? { model: value.model }
      : {}),
    ...(typeof value.networkDestination === "string" &&
    value.networkDestination.length > 0
      ? { networkDestination: value.networkDestination }
      : {}),
    ...(typeof value.maxMemoryMb === "number" && value.maxMemoryMb > 0
      ? { maxMemoryMb: value.maxMemoryMb }
      : {}),
    ...(typeof value.dataScope === "string" && value.dataScope.length > 0
      ? { dataScope: value.dataScope }
      : {}),
    ...(typeof value.retentionPolicy === "string" &&
    value.retentionPolicy.length > 0
      ? { retentionPolicy: value.retentionPolicy }
      : {}),
    ...(value.externalProviderApproved === true
      ? { externalProviderApproved: true }
      : {}),
  };
}

export function validateSemanticRankResult(value: unknown): SemanticRankResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "semantic rank result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported semantic rank result schema version",
    );

  if (typeof value.enabled !== "boolean")
    throw new ProtocolValidationError(-32602, "enabled must be a boolean");

  if (typeof value.rankingLatencyMs !== "number")
    throw new ProtocolValidationError(
      -32602,
      "rankingLatencyMs must be a number",
    );

  if (!Array.isArray(value.items))
    throw new ProtocolValidationError(-32602, "items must be an array");

  const provider = stringValue(value.provider, "provider");

  return {
    schemaVersion: "1",
    query: stringValue(value.query, "query"),
    items: value.items.map((item, idx) => {
      if (!isObject(item))
        throw new ProtocolValidationError(
          -32602,
          `item at index ${idx} must be an object`,
        );
      return {
        id: stringValue(item["id"], `items[${idx}].id`),
        type: stringValue(
          item["type"],
          `items[${idx}].type`,
        ) as SemanticRankItem["type"],
        score: typeof item["score"] === "number" ? item["score"] : 0,
        relevanceReason: stringValue(
          item["relevanceReason"],
          `items[${idx}].relevanceReason`,
        ),
        record: isObject(item["record"])
          ? (item["record"] as Record<string, unknown>)
          : {},
      };
    }),
    rankingLatencyMs: value.rankingLatencyMs,
    provider: provider as SemanticRankingProvider,
    enabled: value.enabled,
  };
}

export type DelegatedAgentRole =
  | "context-scout"
  | "feature-builder"
  | "test-engineer"
  | "reviewer"
  | "release-analyst";

export interface AgentRoleCapabilities {
  readonly readOnly: boolean;
  readonly allowedPaths: readonly string[];
  readonly allowedTools: readonly string[];
  readonly maxBudget: number;
  readonly allowNetwork: boolean;
}

export interface ProfileDefinition {
  readonly schemaVersion: "1";
  readonly name: string;
  readonly description?: string;
  readonly allowedCapabilities: AgentRoleCapabilities;
  readonly activeRoles: readonly DelegatedAgentRole[];
  readonly createdAt: string;
}

export interface DelegationRequest {
  readonly schemaVersion: "1";
  readonly profileName: string;
  readonly role: DelegatedAgentRole;
  readonly requestedCapabilities?: Partial<AgentRoleCapabilities>;
  readonly parentTaskId: string;
}

export interface DelegationResult {
  readonly schemaVersion: "1";
  readonly delegationId: string;
  readonly grantedRole: DelegatedAgentRole;
  readonly effectiveCapabilities: AgentRoleCapabilities;
  readonly deniedCapabilities: readonly string[];
  readonly createdAt: string;
}

export function validateProfileDefinition(value: unknown): ProfileDefinition {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "profile definition must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported profile definition schema version",
    );

  const caps = isObject(value.allowedCapabilities)
    ? value.allowedCapabilities
    : {};
  const validRoles: DelegatedAgentRole[] = [
    "context-scout",
    "feature-builder",
    "test-engineer",
    "reviewer",
    "release-analyst",
  ];

  const activeRoles = stringArray(value.activeRoles, "activeRoles").filter(
    (r) => validRoles.includes(r as DelegatedAgentRole),
  ) as DelegatedAgentRole[];

  return {
    schemaVersion: "1",
    name: stringValue(value.name, "name"),
    ...(typeof value.description === "string" && value.description.length > 0
      ? { description: value.description }
      : {}),
    allowedCapabilities: {
      readOnly: Boolean(caps["readOnly"]),
      allowedPaths: stringArray(caps["allowedPaths"], "allowedPaths"),
      allowedTools: stringArray(caps["allowedTools"], "allowedTools"),
      maxBudget:
        typeof caps["maxBudget"] === "number" ? caps["maxBudget"] : 100,
      allowNetwork: Boolean(caps["allowNetwork"]),
    },
    activeRoles,
    createdAt: stringValue(value.createdAt, "createdAt"),
  };
}

export function validateDelegationRequest(value: unknown): DelegationRequest {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "delegation request must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported delegation request schema version",
    );

  const role = stringValue(value.role, "role");
  const validRoles: DelegatedAgentRole[] = [
    "context-scout",
    "feature-builder",
    "test-engineer",
    "reviewer",
    "release-analyst",
  ];
  if (!validRoles.includes(role as DelegatedAgentRole))
    throw new ProtocolValidationError(
      -32602,
      `invalid delegated role: ${role}`,
    );

  const requestedCapsObj = isObject(value.requestedCapabilities)
    ? value.requestedCapabilities
    : undefined;

  const requestedCapabilities = requestedCapsObj
    ? {
        ...(typeof requestedCapsObj["readOnly"] === "boolean"
          ? { readOnly: Boolean(requestedCapsObj["readOnly"]) }
          : {}),
        ...(typeof requestedCapsObj["allowNetwork"] === "boolean"
          ? { allowNetwork: Boolean(requestedCapsObj["allowNetwork"]) }
          : {}),
        ...(typeof requestedCapsObj["maxBudget"] === "number"
          ? { maxBudget: Number(requestedCapsObj["maxBudget"]) }
          : {}),
      }
    : undefined;

  return {
    schemaVersion: "1",
    profileName: stringValue(value.profileName, "profileName"),
    role: role as DelegatedAgentRole,
    ...(requestedCapabilities !== undefined ? { requestedCapabilities } : {}),
    parentTaskId: stringValue(value.parentTaskId, "parentTaskId"),
  };
}

export function validateDelegationResult(value: unknown): DelegationResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "delegation result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported delegation result schema version",
    );

  const caps = isObject(value.effectiveCapabilities)
    ? value.effectiveCapabilities
    : {};

  return {
    schemaVersion: "1",
    delegationId: stringValue(value.delegationId, "delegationId"),
    grantedRole: stringValue(
      value.grantedRole,
      "grantedRole",
    ) as DelegatedAgentRole,
    effectiveCapabilities: {
      readOnly: Boolean(caps["readOnly"]),
      allowedPaths: stringArray(caps["allowedPaths"], "allowedPaths"),
      allowedTools: stringArray(caps["allowedTools"], "allowedTools"),
      maxBudget:
        typeof caps["maxBudget"] === "number" ? caps["maxBudget"] : 100,
      allowNetwork: Boolean(caps["allowNetwork"]),
    },
    deniedCapabilities: stringArray(
      value.deniedCapabilities,
      "deniedCapabilities",
    ),
    createdAt: stringValue(value.createdAt, "createdAt"),
  };
}

export type ContextSourceType =
  "intent" | "adr" | "documentation" | "ownership" | "evidence" | "provisional";

export interface ContextSource {
  readonly id: string;
  readonly type: ContextSourceType;
  readonly path: string;
  readonly summary: string;
  readonly trustClass: TrustClass;
  readonly tokenCount: number;
}

export interface ContextRetrievalRequest {
  readonly schemaVersion: "1";
  readonly query?: string;
  readonly sourceTypes?: readonly ContextSourceType[];
  readonly maxTokens?: number;
  readonly maxItems?: number;
}

export interface ContextRetrievalResult {
  readonly schemaVersion: "1";
  readonly root: string;
  readonly totalTokens: number;
  readonly items: readonly ContextSource[];
  readonly excludedPathsCount: number;
  readonly retrievedAt: string;
}

export function validateContextRetrievalRequest(
  value: unknown,
): ContextRetrievalRequest {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "context retrieval request must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported context retrieval request schema version",
    );

  const validTypes: ContextSourceType[] = [
    "intent",
    "adr",
    "documentation",
    "ownership",
    "evidence",
    "provisional",
  ];

  const sourceTypes = Array.isArray(value.sourceTypes)
    ? (stringArray(value.sourceTypes, "sourceTypes").filter((t) =>
        validTypes.includes(t as ContextSourceType),
      ) as ContextSourceType[])
    : undefined;

  return {
    schemaVersion: "1",
    ...(typeof value.query === "string" && value.query.length > 0
      ? { query: value.query }
      : {}),
    ...(sourceTypes !== undefined ? { sourceTypes } : {}),
    ...(typeof value.maxTokens === "number" && value.maxTokens > 0
      ? { maxTokens: value.maxTokens }
      : {}),
    ...(typeof value.maxItems === "number" && value.maxItems > 0
      ? { maxItems: value.maxItems }
      : {}),
  };
}

export function validateContextRetrievalResult(
  value: unknown,
): ContextRetrievalResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "context retrieval result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported context retrieval result schema version",
    );

  if (typeof value.totalTokens !== "number")
    throw new ProtocolValidationError(-32602, "totalTokens must be a number");

  if (typeof value.excludedPathsCount !== "number")
    throw new ProtocolValidationError(
      -32602,
      "excludedPathsCount must be a number",
    );

  if (!Array.isArray(value.items))
    throw new ProtocolValidationError(-32602, "items must be an array");

  return {
    schemaVersion: "1",
    root: stringValue(value.root, "root"),
    totalTokens: value.totalTokens,
    items: value.items.map((item, idx) => {
      if (!isObject(item))
        throw new ProtocolValidationError(
          -32602,
          `item at index ${idx} must be an object`,
        );
      return {
        id: stringValue(item["id"], `items[${idx}].id`),
        type: stringValue(
          item["type"],
          `items[${idx}].type`,
        ) as ContextSourceType,
        path: stringValue(item["path"], `items[${idx}].path`),
        summary: stringValue(item["summary"], `items[${idx}].summary`),
        trustClass: stringValue(
          item["trustClass"],
          `items[${idx}].trustClass`,
        ) as TrustClass,
        tokenCount:
          typeof item["tokenCount"] === "number" ? item["tokenCount"] : 0,
      };
    }),
    excludedPathsCount: value.excludedPathsCount,
    retrievedAt: stringValue(value.retrievedAt, "retrievedAt"),
  };
}

export type MemoryClassification =
  | "canonical-intent"
  | "verified-evidence"
  | "accepted-decision"
  | "working-context"
  | "untrusted-observation";
export type MemoryLifecycleState =
  "proposed" | "accepted" | "superseded" | "deleted";

export interface MemoryApproval {
  readonly approvedBy: string;
  readonly evidence: string;
  readonly approvedAt: string;
}

export interface PersistentMemoryItem {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly projectId: string;
  readonly classification: MemoryClassification;
  readonly lifecycleState: MemoryLifecycleState;
  readonly trustClass: TrustClass;
  readonly content: string;
  readonly provenance: string;
  readonly retentionState: RetentionState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly approval?: MemoryApproval;
  readonly supersedesId?: string;
  readonly audit: readonly string[];
}

export interface PersistentMemoryExport {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly exportedAt: string;
  readonly items: readonly PersistentMemoryItem[];
}

export function validatePersistentMemoryItem(
  value: unknown,
): PersistentMemoryItem {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "persistent memory item must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported persistent memory item schema version",
    );
  const classifications: readonly MemoryClassification[] = [
    "canonical-intent",
    "verified-evidence",
    "accepted-decision",
    "working-context",
    "untrusted-observation",
  ];
  const states: readonly MemoryLifecycleState[] = [
    "proposed",
    "accepted",
    "superseded",
    "deleted",
  ];
  const classification = stringValue(
    value.classification,
    "classification",
  ) as MemoryClassification;
  const lifecycleState = stringValue(
    value.lifecycleState,
    "lifecycleState",
  ) as MemoryLifecycleState;
  if (!classifications.includes(classification))
    throw new ProtocolValidationError(-32602, "invalid memory classification");
  if (!states.includes(lifecycleState))
    throw new ProtocolValidationError(-32602, "invalid memory lifecycle state");
  const approvalValue = value.approval;
  const approval = isObject(approvalValue)
    ? {
        approvedBy: stringValue(
          approvalValue.approvedBy,
          "approval.approvedBy",
        ),
        evidence: stringValue(approvalValue.evidence, "approval.evidence"),
        approvedAt: stringValue(
          approvalValue.approvedAt,
          "approval.approvedAt",
        ),
      }
    : undefined;
  if (lifecycleState === "accepted" && approval === undefined)
    throw new ProtocolValidationError(
      -32602,
      "accepted memory requires approval evidence",
    );
  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    projectId: stringValue(value.projectId, "projectId"),
    classification,
    lifecycleState,
    trustClass: stringValue(value.trustClass, "trustClass") as TrustClass,
    content: stringValue(value.content, "content"),
    provenance: stringValue(value.provenance, "provenance"),
    retentionState: stringValue(
      value.retentionState,
      "retentionState",
    ) as RetentionState,
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
    ...(approval !== undefined ? { approval } : {}),
    ...(typeof value.supersedesId === "string"
      ? { supersedesId: stringValue(value.supersedesId, "supersedesId") }
      : {}),
    audit: stringArray(value.audit, "audit"),
  };
}

export function validatePersistentMemoryExport(
  value: unknown,
): PersistentMemoryExport {
  if (
    !isObject(value) ||
    value.schemaVersion !== "1" ||
    !Array.isArray(value.items)
  )
    throw new ProtocolValidationError(
      -32602,
      "invalid persistent memory export",
    );
  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    exportedAt: stringValue(value.exportedAt, "exportedAt"),
    items: value.items.map(validatePersistentMemoryItem),
  };
}

export type MemoryRenderTarget =
  | "claude"
  | "codex"
  | "gemini"
  | "cursor"
  | "copilot"
  | "mcp"
  | "desktop"
  | "neutron";
export interface PersistentMemorySearchResult {
  readonly schemaVersion: "1";
  readonly query: string;
  readonly items: readonly PersistentMemoryItem[];
  readonly indexRebuilt: boolean;
}
export function validatePersistentMemorySearchResult(
  value: unknown,
): PersistentMemorySearchResult {
  if (
    !isObject(value) ||
    value.schemaVersion !== "1" ||
    !Array.isArray(value.items)
  )
    throw new ProtocolValidationError(
      -32602,
      "invalid persistent memory search result",
    );
  return {
    schemaVersion: "1",
    query: stringValue(value.query, "query"),
    items: value.items.map(validatePersistentMemoryItem),
    indexRebuilt: Boolean(value.indexRebuilt),
  };
}

export type AgentSessionState = "active" | "closed" | "compacted" | "archived";

export interface AgentSessionItem {
  readonly schemaVersion: "1";
  readonly sessionId: string;
  readonly projectId: string;
  readonly state: AgentSessionState;
  readonly activeTask: string;
  readonly unresolvedQuestions: readonly string[];
  readonly decisions: readonly string[];
  readonly outcomes: readonly string[];
  readonly trustClass: TrustClass;
  readonly retentionPolicy: RetentionState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface AgentSessionExportResult {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly exportedAt: string;
  readonly session: AgentSessionItem;
}

export function validateAgentSessionItem(value: unknown): AgentSessionItem {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "agent session item must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported agent session item schema version",
    );

  const states: readonly AgentSessionState[] = [
    "active",
    "closed",
    "compacted",
    "archived",
  ];
  const state = stringValue(value.state, "state") as AgentSessionState;
  if (!states.includes(state))
    throw new ProtocolValidationError(-32602, "invalid agent session state");

  return {
    schemaVersion: "1",
    sessionId: stringValue(value.sessionId, "sessionId"),
    projectId: stringValue(value.projectId, "projectId"),
    state,
    activeTask: stringValue(value.activeTask, "activeTask"),
    unresolvedQuestions: stringArray(
      value.unresolvedQuestions,
      "unresolvedQuestions",
    ),
    decisions: stringArray(value.decisions, "decisions"),
    outcomes: stringArray(value.outcomes, "outcomes"),
    trustClass: stringValue(value.trustClass, "trustClass") as TrustClass,
    retentionPolicy: stringValue(
      value.retentionPolicy,
      "retentionPolicy",
    ) as RetentionState,
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
    ...(typeof value.closedAt === "string" && value.closedAt.length > 0
      ? { closedAt: value.closedAt }
      : {}),
    ...(isObject(value.metadata)
      ? { metadata: value.metadata as Record<string, unknown> }
      : {}),
  };
}

export function validateAgentSessionExportResult(
  value: unknown,
): AgentSessionExportResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "agent session export result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported agent session export result schema version",
    );
  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    exportedAt: stringValue(value.exportedAt, "exportedAt"),
    session: validateAgentSessionItem(value.session),
  };
}

export type SecurityFindingSeverity =
  "critical" | "high" | "medium" | "low" | "info";

export type SecurityFindingState =
  "open" | "verified" | "dismissed" | "accepted-risk" | "remediated";

export interface SecurityEvidence {
  readonly path: string;
  readonly startLine?: number;
  readonly endLine?: number;
  readonly snippet?: string;
}

export interface AcceptedSecurityRisk {
  readonly approvedBy: string;
  readonly reason: string;
  readonly approvedAt: string;
  readonly expiresAt?: string;
}

export interface SecurityFinding {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly ruleId: string;
  readonly title: string;
  readonly severity: SecurityFindingSeverity;
  readonly state: SecurityFindingState;
  readonly category: string;
  readonly description: string;
  readonly scanner: string;
  readonly evidence: readonly SecurityEvidence[];
  readonly trustClass: TrustClass;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly dismissalReason?: string;
  readonly acceptedRisk?: AcceptedSecurityRisk;
}

export interface SecurityCoverageReport {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly totalFindings: number;
  readonly findingsBySeverity: Record<SecurityFindingSeverity, number>;
  readonly findingsByState: Record<SecurityFindingState, number>;
  readonly scanners: readonly string[];
  readonly reportedAt: string;
}

export interface SarifImportResult {
  readonly schemaVersion: "1";
  readonly reportPath: string;
  readonly importedCount: number;
  readonly findings: readonly SecurityFinding[];
  readonly importedAt: string;
}

export function validateSecurityFinding(value: unknown): SecurityFinding {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security finding must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security finding schema version",
    );

  const severities: readonly SecurityFindingSeverity[] = [
    "critical",
    "high",
    "medium",
    "low",
    "info",
  ];
  const states: readonly SecurityFindingState[] = [
    "open",
    "verified",
    "dismissed",
    "accepted-risk",
    "remediated",
  ];

  const severity = stringValue(
    value.severity,
    "severity",
  ) as SecurityFindingSeverity;
  if (!severities.includes(severity))
    throw new ProtocolValidationError(
      -32602,
      "invalid security finding severity",
    );

  const state = stringValue(value.state, "state") as SecurityFindingState;
  if (!states.includes(state))
    throw new ProtocolValidationError(-32602, "invalid security finding state");

  const rawEvidence = Array.isArray(value.evidence) ? value.evidence : [];
  const evidence: SecurityEvidence[] = rawEvidence.map((ev, idx) => {
    if (!isObject(ev))
      throw new ProtocolValidationError(
        -32602,
        `evidence at index ${idx} must be an object`,
      );
    return {
      path: stringValue(ev.path, `evidence[${idx}].path`),
      ...(typeof ev.startLine === "number" ? { startLine: ev.startLine } : {}),
      ...(typeof ev.endLine === "number" ? { endLine: ev.endLine } : {}),
      ...(typeof ev.snippet === "string" && ev.snippet.length > 0
        ? { snippet: ev.snippet }
        : {}),
    };
  });

  const acceptedRiskVal = value.acceptedRisk;
  const acceptedRisk: AcceptedSecurityRisk | undefined = isObject(
    acceptedRiskVal,
  )
    ? {
        approvedBy: stringValue(
          acceptedRiskVal.approvedBy,
          "acceptedRisk.approvedBy",
        ),
        reason: stringValue(acceptedRiskVal.reason, "acceptedRisk.reason"),
        approvedAt: stringValue(
          acceptedRiskVal.approvedAt,
          "acceptedRisk.approvedAt",
        ),
        ...(typeof acceptedRiskVal.expiresAt === "string" &&
        acceptedRiskVal.expiresAt.length > 0
          ? { expiresAt: acceptedRiskVal.expiresAt }
          : {}),
      }
    : undefined;

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    ruleId: stringValue(value.ruleId, "ruleId"),
    title: stringValue(value.title, "title"),
    severity,
    state,
    category: stringValue(value.category, "category"),
    description: stringValue(value.description, "description"),
    scanner: stringValue(value.scanner, "scanner"),
    evidence,
    trustClass: stringValue(value.trustClass, "trustClass") as TrustClass,
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
    ...(typeof value.dismissalReason === "string" &&
    value.dismissalReason.length > 0
      ? { dismissalReason: value.dismissalReason }
      : {}),
    ...(acceptedRisk ? { acceptedRisk } : {}),
  };
}

export function validateSecurityCoverageReport(
  value: unknown,
): SecurityCoverageReport {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security coverage report must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security coverage report schema version",
    );

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    totalFindings:
      typeof value.totalFindings === "number" ? value.totalFindings : 0,
    findingsBySeverity: isObject(value.findingsBySeverity)
      ? (value.findingsBySeverity as Record<SecurityFindingSeverity, number>)
      : { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    findingsByState: isObject(value.findingsByState)
      ? (value.findingsByState as Record<SecurityFindingState, number>)
      : {
          open: 0,
          verified: 0,
          dismissed: 0,
          "accepted-risk": 0,
          remediated: 0,
        },
    scanners: stringArray(value.scanners, "scanners"),
    reportedAt: stringValue(value.reportedAt, "reportedAt"),
  };
}

export function validateSarifImportResult(value: unknown): SarifImportResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "sarif import result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported sarif import result schema version",
    );

  if (!Array.isArray(value.findings))
    throw new ProtocolValidationError(-32602, "findings must be an array");

  return {
    schemaVersion: "1",
    reportPath: stringValue(value.reportPath, "reportPath"),
    importedCount:
      typeof value.importedCount === "number" ? value.importedCount : 0,
    findings: value.findings.map(validateSecurityFinding),
    importedAt: stringValue(value.importedAt, "importedAt"),
  };
}

export type SecurityAdapterCategory =
  | "dependency"
  | "secret"
  | "config"
  | "source"
  | "extension"
  | "mcp"
  | "hook"
  | "agentic";

export interface SecurityAdapterMetadata {
  readonly schemaVersion: "1";
  readonly name: string;
  readonly category: SecurityAdapterCategory;
  readonly version: string;
  readonly readOnly: boolean;
  readonly networkAccess: boolean;
}

export interface SecurityAdapterResult {
  readonly schemaVersion: "1";
  readonly adapter: SecurityAdapterMetadata;
  readonly findings: readonly SecurityFinding[];
  readonly totalCount: number;
  readonly executedAt: string;
}

export function validateSecurityAdapterMetadata(
  value: unknown,
): SecurityAdapterMetadata {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security adapter metadata must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security adapter metadata schema version",
    );

  const categories: readonly SecurityAdapterCategory[] = [
    "dependency",
    "secret",
    "config",
    "source",
    "extension",
    "mcp",
    "hook",
    "agentic",
  ];
  const category = stringValue(
    value.category,
    "category",
  ) as SecurityAdapterCategory;
  if (!categories.includes(category))
    throw new ProtocolValidationError(
      -32602,
      "invalid security adapter category",
    );

  return {
    schemaVersion: "1",
    name: stringValue(value.name, "name"),
    category,
    version: stringValue(value.version, "version"),
    readOnly: value.readOnly === true,
    networkAccess: value.networkAccess === true,
  };
}

export function validateSecurityAdapterResult(
  value: unknown,
): SecurityAdapterResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security adapter result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security adapter result schema version",
    );

  if (!Array.isArray(value.findings))
    throw new ProtocolValidationError(-32602, "findings must be an array");

  return {
    schemaVersion: "1",
    adapter: validateSecurityAdapterMetadata(value.adapter),
    findings: value.findings.map(validateSecurityFinding),
    totalCount: typeof value.totalCount === "number" ? value.totalCount : 0,
    executedAt: stringValue(value.executedAt, "executedAt"),
  };
}

export type SecurityPolicyEnforcementLevel = "ignore" | "warn" | "fail";

export interface SecurityPolicyRule {
  readonly target: string;
  readonly enforcement: SecurityPolicyEnforcementLevel;
  readonly severityOverride?: SecurityFindingSeverity;
}

export interface SecurityPolicy {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly defaultEnforcement: SecurityPolicyEnforcementLevel;
  readonly rules: readonly SecurityPolicyRule[];
  readonly allowedScanners?: readonly string[];
  readonly updatedAt: string;
}

export interface SecurityBaseline {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly acceptedFindings: readonly SecurityFinding[];
  readonly baselineHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SecurityBaselineCheckResult {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly newFindings: readonly SecurityFinding[];
  readonly resolvedFindings: readonly SecurityFinding[];
  readonly policyViolations: readonly SecurityFinding[];
  readonly exitCode: number;
  readonly checkedAt: string;
}

export function validateSecurityPolicy(value: unknown): SecurityPolicy {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security policy must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security policy schema version",
    );

  const levels: readonly SecurityPolicyEnforcementLevel[] = [
    "ignore",
    "warn",
    "fail",
  ];
  const defaultEnforcement = stringValue(
    value.defaultEnforcement,
    "defaultEnforcement",
  ) as SecurityPolicyEnforcementLevel;
  if (!levels.includes(defaultEnforcement))
    throw new ProtocolValidationError(
      -32602,
      "invalid security policy default enforcement level",
    );

  const rawRules = Array.isArray(value.rules) ? value.rules : [];
  const rules: SecurityPolicyRule[] = rawRules.map((r, idx) => {
    if (!isObject(r))
      throw new ProtocolValidationError(
        -32602,
        `rules at index ${idx} must be an object`,
      );
    const enf = stringValue(
      r.enforcement,
      `rules[${idx}].enforcement`,
    ) as SecurityPolicyEnforcementLevel;
    if (!levels.includes(enf))
      throw new ProtocolValidationError(
        -32602,
        `invalid enforcement level at rules[${idx}]`,
      );
    return {
      target: stringValue(r.target, `rules[${idx}].target`),
      enforcement: enf,
      ...(typeof r.severityOverride === "string" &&
      r.severityOverride.length > 0
        ? { severityOverride: r.severityOverride as SecurityFindingSeverity }
        : {}),
    };
  });

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    defaultEnforcement,
    rules,
    ...(Array.isArray(value.allowedScanners)
      ? {
          allowedScanners: stringArray(
            value.allowedScanners,
            "allowedScanners",
          ),
        }
      : {}),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
  };
}

export function validateSecurityBaseline(value: unknown): SecurityBaseline {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security baseline must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security baseline schema version",
    );

  if (!Array.isArray(value.acceptedFindings))
    throw new ProtocolValidationError(
      -32602,
      "acceptedFindings must be an array",
    );

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    acceptedFindings: value.acceptedFindings.map(validateSecurityFinding),
    baselineHash: stringValue(value.baselineHash, "baselineHash"),
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
  };
}

export function validateSecurityBaselineCheckResult(
  value: unknown,
): SecurityBaselineCheckResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "security baseline check result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported security baseline check result schema version",
    );

  if (!Array.isArray(value.newFindings))
    throw new ProtocolValidationError(-32602, "newFindings must be an array");
  if (!Array.isArray(value.resolvedFindings))
    throw new ProtocolValidationError(
      -32602,
      "resolvedFindings must be an array",
    );
  if (!Array.isArray(value.policyViolations))
    throw new ProtocolValidationError(
      -32602,
      "policyViolations must be an array",
    );

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    newFindings: value.newFindings.map(validateSecurityFinding),
    resolvedFindings: value.resolvedFindings.map(validateSecurityFinding),
    policyViolations: value.policyViolations.map(validateSecurityFinding),
    exitCode: typeof value.exitCode === "number" ? value.exitCode : 0,
    checkedAt: stringValue(value.checkedAt, "checkedAt"),
  };
}

export type SandboxCapabilityMode = "read-only" | "proposal-only" | "mutating";

export interface SandboxPathRule {
  readonly pathPrefix: string;
  readonly allowWrite: boolean;
  readonly allowDelete: boolean;
}

export interface SandboxCommandRule {
  readonly commandPrefix: string;
  readonly allowArgs?: readonly string[];
}

export interface SandboxCapabilityPolicy {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly mode: SandboxCapabilityMode;
  readonly pathRules: readonly SandboxPathRule[];
  readonly commandRules: readonly SandboxCommandRule[];
  readonly allowNetwork: boolean;
  readonly updatedAt: string;
}

export interface SandboxEvaluationResult {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly allowed: boolean;
  readonly violations: readonly string[];
  readonly evaluatedAt: string;
}

export function validateSandboxCapabilityPolicy(
  value: unknown,
): SandboxCapabilityPolicy {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "sandbox capability policy must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported sandbox capability policy schema version",
    );

  const modes: readonly SandboxCapabilityMode[] = [
    "read-only",
    "proposal-only",
    "mutating",
  ];
  const mode = stringValue(value.mode, "mode") as SandboxCapabilityMode;
  if (!modes.includes(mode))
    throw new ProtocolValidationError(
      -32602,
      "invalid sandbox capability policy mode",
    );

  const rawPathRules = Array.isArray(value.pathRules) ? value.pathRules : [];
  const pathRules: SandboxPathRule[] = rawPathRules.map((r, idx) => {
    if (!isObject(r))
      throw new ProtocolValidationError(
        -32602,
        `pathRules at index ${idx} must be an object`,
      );
    return {
      pathPrefix: stringValue(r.pathPrefix, `pathRules[${idx}].pathPrefix`),
      allowWrite: r.allowWrite === true,
      allowDelete: r.allowDelete === true,
    };
  });

  const rawCommandRules = Array.isArray(value.commandRules)
    ? value.commandRules
    : [];
  const commandRules: SandboxCommandRule[] = rawCommandRules.map((c, idx) => {
    if (!isObject(c))
      throw new ProtocolValidationError(
        -32602,
        `commandRules at index ${idx} must be an object`,
      );
    return {
      commandPrefix: stringValue(
        c.commandPrefix,
        `commandRules[${idx}].commandPrefix`,
      ),
      ...(Array.isArray(c.allowArgs)
        ? {
            allowArgs: stringArray(
              c.allowArgs,
              `commandRules[${idx}].allowArgs`,
            ),
          }
        : {}),
    };
  });

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    mode,
    pathRules,
    commandRules,
    allowNetwork: value.allowNetwork === true,
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
  };
}

export function validateSandboxEvaluationResult(
  value: unknown,
): SandboxEvaluationResult {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "sandbox evaluation result must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported sandbox evaluation result schema version",
    );

  if (!Array.isArray(value.violations))
    throw new ProtocolValidationError(
      -32602,
      "violations must be an array of strings",
    );

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    allowed: value.allowed === true,
    violations: stringArray(value.violations, "violations"),
    evaluatedAt: stringValue(value.evaluatedAt, "evaluatedAt"),
  };
}

export type SecurityInvariantStatus = "passed" | "warning" | "failed";

export interface SecurityInvariantCheck {
  readonly invariantId: number;
  readonly title: string;
  readonly status: SecurityInvariantStatus;
  readonly details: string;
}

export interface ContinuousSecurityAuditReport {
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly healthScore: number;
  readonly invariantChecks: readonly SecurityInvariantCheck[];
  readonly auditHash: string;
  readonly auditedAt: string;
}

export function validateContinuousSecurityAuditReport(
  value: unknown,
): ContinuousSecurityAuditReport {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "continuous security audit report must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported continuous security audit report schema version",
    );

  if (!Array.isArray(value.invariantChecks))
    throw new ProtocolValidationError(
      -32602,
      "invariantChecks must be an array",
    );

  const statuses: readonly SecurityInvariantStatus[] = [
    "passed",
    "warning",
    "failed",
  ];

  const invariantChecks: SecurityInvariantCheck[] = value.invariantChecks.map(
    (item, idx) => {
      if (!isObject(item))
        throw new ProtocolValidationError(
          -32602,
          `invariantChecks at index ${idx} must be an object`,
        );
      const status = stringValue(
        item.status,
        `invariantChecks[${idx}].status`,
      ) as SecurityInvariantStatus;
      if (!statuses.includes(status))
        throw new ProtocolValidationError(
          -32602,
          `invalid invariant check status at index ${idx}`,
        );

      return {
        invariantId:
          typeof item.invariantId === "number" ? item.invariantId : 0,
        title: stringValue(item.title, `invariantChecks[${idx}].title`),
        status,
        details: stringValue(item.details, `invariantChecks[${idx}].details`),
      };
    },
  );

  return {
    schemaVersion: "1",
    projectId: stringValue(value.projectId, "projectId"),
    healthScore: typeof value.healthScore === "number" ? value.healthScore : 0,
    invariantChecks,
    auditHash: stringValue(value.auditHash, "auditHash"),
    auditedAt: stringValue(value.auditedAt, "auditedAt"),
  };
}

export type AgentWorkspaceMode = "discuss" | "inspect" | "plan" | "review";

export interface WorkspaceMessage {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly timestamp: string;
}

export interface WorkspaceConversationRecord {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly projectId: string;
  readonly mode: AgentWorkspaceMode;
  readonly messages: readonly WorkspaceMessage[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function validateWorkspaceConversationRecord(
  value: unknown,
): WorkspaceConversationRecord {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "workspace conversation record must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported workspace conversation record schema version",
    );

  const modes: readonly AgentWorkspaceMode[] = [
    "discuss",
    "inspect",
    "plan",
    "review",
  ];
  const mode = stringValue(value.mode, "mode") as AgentWorkspaceMode;
  if (!modes.includes(mode))
    throw new ProtocolValidationError(
      -32602,
      `invalid workspace mode '${mode}'`,
    );

  if (!Array.isArray(value.messages))
    throw new ProtocolValidationError(-32602, "messages must be an array");

  const messages: WorkspaceMessage[] = value.messages.map((item, idx) => {
    if (!isObject(item))
      throw new ProtocolValidationError(
        -32602,
        `messages at index ${idx} must be an object`,
      );
    const role = stringValue(item.role, `messages[${idx}].role`);
    if (role !== "user" && role !== "assistant")
      throw new ProtocolValidationError(
        -32602,
        `messages[${idx}].role must be 'user' or 'assistant'`,
      );
    return {
      id: stringValue(item.id, `messages[${idx}].id`),
      role: role as "user" | "assistant",
      content: stringValue(item.content, `messages[${idx}].content`),
      timestamp: stringValue(item.timestamp, `messages[${idx}].timestamp`),
    };
  });

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    projectId: stringValue(value.projectId, "projectId"),
    mode,
    messages,
    createdAt: stringValue(value.createdAt, "createdAt"),
    updatedAt: stringValue(value.updatedAt, "updatedAt"),
  };
}

export type NeutronSubagentRole =
  | "research"
  | "arch-checker"
  | "test-runner"
  | "conformance-auditor"
  | "custom";

export type NeutronSubagentStatus =
  "pending" | "running" | "completed" | "failed";

export interface NeutronSubagentTaskRecord {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly projectId: string;
  readonly conversationId: string | null;
  readonly role: NeutronSubagentRole;
  readonly status: NeutronSubagentStatus;
  readonly taskInput: string;
  readonly resultOutput: string | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export function validateNeutronSubagentTaskRecord(
  value: unknown,
): NeutronSubagentTaskRecord {
  if (!isObject(value))
    throw new ProtocolValidationError(
      -32602,
      "neutron subagent task record must be an object",
    );
  if (value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported neutron subagent task record schema version",
    );

  const roles: readonly NeutronSubagentRole[] = [
    "research",
    "arch-checker",
    "test-runner",
    "conformance-auditor",
    "custom",
  ];
  const role = stringValue(value.role, "role") as NeutronSubagentRole;
  if (!roles.includes(role))
    throw new ProtocolValidationError(
      -32602,
      `invalid neutron subagent role '${role}'`,
    );

  const statuses: readonly NeutronSubagentStatus[] = [
    "pending",
    "running",
    "completed",
    "failed",
  ];
  const status = stringValue(value.status, "status") as NeutronSubagentStatus;
  if (!statuses.includes(status))
    throw new ProtocolValidationError(
      -32602,
      `invalid neutron subagent status '${status}'`,
    );

  return {
    schemaVersion: "1",
    id: stringValue(value.id, "id"),
    projectId: stringValue(value.projectId, "projectId"),
    conversationId:
      typeof value.conversationId === "string" ? value.conversationId : null,
    role,
    status,
    taskInput: stringValue(value.taskInput, "taskInput"),
    resultOutput:
      typeof value.resultOutput === "string" ? value.resultOutput : null,
    createdAt: stringValue(value.createdAt, "createdAt"),
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : null,
  };
}

export type EngineeringWorkflowCaseType =
  "pull-request" | "release" | "incident" | "migration" | "agent-task";
export type EngineeringRuleSeverity = "error" | "warning" | "info";
export type EngineeringRuleConditionType =
  | "required-activity"
  | "forbidden-activity"
  | "ordered-sequence"
  | "evidence-presence"
  | "time-delta-threshold";
export interface EngineeringRuleCondition {
  readonly type: EngineeringRuleConditionType;
  readonly activity?: string;
  readonly sequence?: readonly string[];
  readonly evidenceType?: string;
  readonly maxMinutes?: number;
}
export interface EngineeringRuleRemediation {
  readonly summary: string;
  readonly actionableSteps: readonly string[];
}
export interface EngineeringRule {
  readonly ruleId: string;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly severity: EngineeringRuleSeverity;
  readonly title: string;
  readonly description?: string;
  readonly condition: EngineeringRuleCondition;
  readonly remediation?: EngineeringRuleRemediation;
}
export interface EngineeringWorkflowPolicy {
  readonly schemaVersion: "1";
  readonly policyId: string;
  readonly description?: string;
  readonly rules: readonly EngineeringRule[];
}
export type EngineeringConformanceStatus =
  | "pass"
  | "violation"
  | "missing-evidence"
  | "ambiguous-evidence"
  | "unsupported";
export interface EngineeringEvidenceRef {
  readonly source: string;
  readonly sourceId: string;
  readonly timestamp?: string;
}
export interface EngineeringConformanceFinding {
  readonly ruleId: string;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly severity: EngineeringRuleSeverity;
  readonly status: EngineeringConformanceStatus;
  readonly title: string;
  readonly evidence: readonly EngineeringEvidenceRef[];
  readonly remediation?: EngineeringRuleRemediation;
}
export interface EngineeringConformanceSummary {
  readonly totalRules: number;
  readonly passed: number;
  readonly violations: number;
  readonly missingEvidence: number;
  readonly ambiguousEvidence: number;
  readonly unsupported: number;
}
export interface EngineeringConformanceReport {
  readonly operationVersion: 1;
  readonly policyId: string;
  readonly evaluatedAt: string;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly caseId: string;
  readonly summary: EngineeringConformanceSummary;
  readonly findings: readonly EngineeringConformanceFinding[];
}
export interface TimelineEventRef {
  readonly activity: string;
  readonly source: string;
  readonly sourceId: string;
  readonly timestamp?: string;
  readonly commitIds?: readonly string[];
  readonly evidenceType?: string;
}
export interface GenericTimeline {
  readonly caseType: EngineeringWorkflowCaseType;
  readonly caseId: string;
  readonly events: readonly TimelineEventRef[];
}

const engineeringCaseTypes: readonly EngineeringWorkflowCaseType[] = [
  "pull-request",
  "release",
  "incident",
  "migration",
  "agent-task",
];
const engineeringConditionTypes: readonly EngineeringRuleConditionType[] = [
  "required-activity",
  "forbidden-activity",
  "ordered-sequence",
  "evidence-presence",
  "time-delta-threshold",
];
const engineeringSeverities: readonly EngineeringRuleSeverity[] = [
  "error",
  "warning",
  "info",
];
const engineeringStatuses: readonly EngineeringConformanceStatus[] = [
  "pass",
  "violation",
  "missing-evidence",
  "ambiguous-evidence",
  "unsupported",
];

function engineeringCaseType(
  value: unknown,
  field: string,
): EngineeringWorkflowCaseType {
  const candidate = stringValue(value, field) as EngineeringWorkflowCaseType;
  if (!engineeringCaseTypes.includes(candidate))
    throw new ProtocolValidationError(-32602, `invalid ${field}`);
  return candidate;
}

function engineeringRemediation(
  value: unknown,
): EngineeringRuleRemediation | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value))
    throw new ProtocolValidationError(-32602, "remediation must be an object");
  return {
    summary: stringValue(value.summary, "remediation.summary"),
    actionableSteps: stringArray(
      value.actionableSteps,
      "remediation.actionableSteps",
    ),
  };
}

export function validateEngineeringWorkflowPolicy(
  value: unknown,
): EngineeringWorkflowPolicy {
  if (!isObject(value) || value.schemaVersion !== "1")
    throw new ProtocolValidationError(
      -32602,
      "unsupported engineering workflow policy schema version",
    );
  if (!Array.isArray(value.rules))
    throw new ProtocolValidationError(-32602, "policy rules must be an array");
  const rules = value.rules.map((rule, index): EngineeringRule => {
    if (!isObject(rule) || !isObject(rule.condition))
      throw new ProtocolValidationError(
        -32602,
        `rule ${index} must include a condition`,
      );
    const conditionType = stringValue(
      rule.condition.type,
      `rules[${index}].condition.type`,
    ) as EngineeringRuleConditionType;
    if (!engineeringConditionTypes.includes(conditionType))
      throw new ProtocolValidationError(
        -32602,
        `invalid rules[${index}].condition.type`,
      );
    const severity = stringValue(
      rule.severity,
      `rules[${index}].severity`,
    ) as EngineeringRuleSeverity;
    if (!engineeringSeverities.includes(severity))
      throw new ProtocolValidationError(
        -32602,
        `invalid rules[${index}].severity`,
      );
    const remediation = engineeringRemediation(rule.remediation);
    return {
      ruleId: stringValue(rule.ruleId, `rules[${index}].ruleId`),
      caseType: engineeringCaseType(rule.caseType, `rules[${index}].caseType`),
      severity,
      title: stringValue(rule.title, `rules[${index}].title`),
      ...(typeof rule.description === "string" && rule.description.length > 0
        ? { description: rule.description }
        : {}),
      condition: {
        type: conditionType,
        ...(typeof rule.condition.activity === "string" &&
        rule.condition.activity.length > 0
          ? { activity: rule.condition.activity }
          : {}),
        ...(Array.isArray(rule.condition.sequence)
          ? {
              sequence: stringArray(
                rule.condition.sequence,
                `rules[${index}].condition.sequence`,
              ),
            }
          : {}),
        ...(typeof rule.condition.evidenceType === "string" &&
        rule.condition.evidenceType.length > 0
          ? { evidenceType: rule.condition.evidenceType }
          : {}),
        ...(typeof rule.condition.maxMinutes === "number" &&
        Number.isFinite(rule.condition.maxMinutes)
          ? { maxMinutes: rule.condition.maxMinutes }
          : {}),
      },
      ...(remediation ? { remediation } : {}),
    };
  });
  if (new Set(rules.map((rule) => rule.ruleId)).size !== rules.length)
    throw new ProtocolValidationError(
      -32602,
      "engineering workflow policy rule IDs must be unique",
    );
  return {
    schemaVersion: "1",
    policyId: stringValue(value.policyId, "policyId"),
    ...(typeof value.description === "string" && value.description.length > 0
      ? { description: value.description }
      : {}),
    rules,
  };
}

export function validateGenericTimeline(value: unknown): GenericTimeline {
  if (!isObject(value) || !Array.isArray(value.events))
    throw new ProtocolValidationError(
      -32602,
      "timeline events must be an array",
    );
  return {
    caseType: engineeringCaseType(value.caseType, "caseType"),
    caseId: stringValue(value.caseId, "caseId"),
    events: value.events.map((event, index): TimelineEventRef => {
      if (!isObject(event))
        throw new ProtocolValidationError(
          -32602,
          `events[${index}] must be an object`,
        );
      return {
        activity: stringValue(event.activity, `events[${index}].activity`),
        source: stringValue(event.source, `events[${index}].source`),
        sourceId: stringValue(event.sourceId, `events[${index}].sourceId`),
        ...(typeof event.timestamp === "string" && event.timestamp.length > 0
          ? { timestamp: event.timestamp }
          : {}),
        ...(Array.isArray(event.commitIds)
          ? {
              commitIds: stringArray(
                event.commitIds,
                `events[${index}].commitIds`,
              ),
            }
          : {}),
        ...(typeof event.evidenceType === "string" &&
        event.evidenceType.length > 0
          ? { evidenceType: event.evidenceType }
          : {}),
      };
    }),
  };
}

export function validateEngineeringConformanceReport(
  value: unknown,
): EngineeringConformanceReport {
  if (
    !isObject(value) ||
    value.operationVersion !== 1 ||
    !isObject(value.summary) ||
    !Array.isArray(value.findings)
  )
    throw new ProtocolValidationError(
      -32602,
      "engineering conformance report is invalid",
    );
  const summary = value.summary;
  const numberValue = (field: keyof EngineeringConformanceSummary) => {
    const number = summary[field];
    if (typeof number !== "number" || !Number.isFinite(number))
      throw new ProtocolValidationError(
        -32602,
        `summary.${field} must be a number`,
      );
    return number;
  };
  return {
    operationVersion: 1,
    policyId: stringValue(value.policyId, "policyId"),
    evaluatedAt: stringValue(value.evaluatedAt, "evaluatedAt"),
    caseType: engineeringCaseType(value.caseType, "caseType"),
    caseId: stringValue(value.caseId, "caseId"),
    summary: {
      totalRules: numberValue("totalRules"),
      passed: numberValue("passed"),
      violations: numberValue("violations"),
      missingEvidence: numberValue("missingEvidence"),
      ambiguousEvidence: numberValue("ambiguousEvidence"),
      unsupported: numberValue("unsupported"),
    },
    findings: value.findings.map(
      (finding, index): EngineeringConformanceFinding => {
        if (!isObject(finding) || !Array.isArray(finding.evidence))
          throw new ProtocolValidationError(
            -32602,
            `findings[${index}] is invalid`,
          );
        const severity = stringValue(
          finding.severity,
          `findings[${index}].severity`,
        ) as EngineeringRuleSeverity;
        const status = stringValue(
          finding.status,
          `findings[${index}].status`,
        ) as EngineeringConformanceStatus;
        if (
          !engineeringSeverities.includes(severity) ||
          !engineeringStatuses.includes(status)
        )
          throw new ProtocolValidationError(
            -32602,
            `findings[${index}] has an invalid status or severity`,
          );
        const remediation = engineeringRemediation(finding.remediation);
        return {
          ruleId: stringValue(finding.ruleId, `findings[${index}].ruleId`),
          caseType: engineeringCaseType(
            finding.caseType,
            `findings[${index}].caseType`,
          ),
          severity,
          status,
          title: stringValue(finding.title, `findings[${index}].title`),
          evidence: finding.evidence.map(
            (evidence, evidenceIndex): EngineeringEvidenceRef => {
              if (!isObject(evidence))
                throw new ProtocolValidationError(
                  -32602,
                  `findings[${index}].evidence[${evidenceIndex}] is invalid`,
                );
              return {
                source: stringValue(evidence.source, "evidence.source"),
                sourceId: stringValue(evidence.sourceId, "evidence.sourceId"),
                ...(typeof evidence.timestamp === "string" &&
                evidence.timestamp.length > 0
                  ? { timestamp: evidence.timestamp }
                  : {}),
              };
            },
          ),
          ...(remediation ? { remediation } : {}),
        };
      },
    ),
  };
}

export type WorkflowTimestampCoverage = "complete" | "partial" | "unavailable";

export interface WorkflowVariant {
  readonly variantId: string;
  readonly activities: readonly string[];
  readonly occurrenceCount: number;
  readonly caseIds: readonly string[];
}

export interface WorkflowVariantSummaryReport {
  readonly operationVersion: 1;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly timelineCount: number;
  readonly timestampCoverage: WorkflowTimestampCoverage;
  readonly variants: readonly WorkflowVariant[];
}

export function validateWorkflowVariantSummaryReport(
  value: unknown,
): WorkflowVariantSummaryReport {
  if (
    !isObject(value) ||
    value.operationVersion !== 1 ||
    !Array.isArray(value.variants)
  )
    throw new ProtocolValidationError(
      -32602,
      "workflow variant summary report is invalid",
    );
  const timestampCoverage = stringValue(
    value.timestampCoverage,
    "timestampCoverage",
  ) as WorkflowTimestampCoverage;
  if (
    !(["complete", "partial", "unavailable"] as const).includes(
      timestampCoverage,
    )
  )
    throw new ProtocolValidationError(-32602, "invalid timestampCoverage");
  if (
    typeof value.timelineCount !== "number" ||
    !Number.isInteger(value.timelineCount) ||
    value.timelineCount < 2
  )
    throw new ProtocolValidationError(
      -32602,
      "timelineCount must be an integer of at least two",
    );
  return {
    operationVersion: 1,
    caseType: engineeringCaseType(value.caseType, "caseType"),
    timelineCount: value.timelineCount,
    timestampCoverage,
    variants: value.variants.map((variant, index): WorkflowVariant => {
      if (!isObject(variant))
        throw new ProtocolValidationError(
          -32602,
          `variants[${index}] must be an object`,
        );
      const occurrenceCount = variant.occurrenceCount;
      if (
        typeof occurrenceCount !== "number" ||
        !Number.isInteger(occurrenceCount) ||
        occurrenceCount < 1
      )
        throw new ProtocolValidationError(
          -32602,
          `variants[${index}].occurrenceCount must be a positive integer`,
        );
      const caseIds = stringArray(
        variant.caseIds,
        `variants[${index}].caseIds`,
      );
      if (caseIds.length !== occurrenceCount)
        throw new ProtocolValidationError(
          -32602,
          `variants[${index}] case count does not match occurrenceCount`,
        );
      return {
        variantId: stringValue(
          variant.variantId,
          `variants[${index}].variantId`,
        ),
        activities: stringArray(
          variant.activities,
          `variants[${index}].activities`,
        ),
        occurrenceCount,
        caseIds,
      };
    }),
  };
}

export interface WorkflowElapsedMinutes {
  readonly minimum: number;
  readonly median: number;
  readonly maximum: number;
}

export interface WorkflowDurationSummaryReport {
  readonly operationVersion: 1;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly timelineCount: number;
  readonly timestampCoverage: WorkflowTimestampCoverage;
  readonly observableCaseCount: number;
  readonly elapsedMinutes?: WorkflowElapsedMinutes;
}

export function validateWorkflowDurationSummaryReport(
  value: unknown,
): WorkflowDurationSummaryReport {
  if (!isObject(value) || value.operationVersion !== 1)
    throw new ProtocolValidationError(
      -32602,
      "workflow duration summary report is invalid",
    );
  const timestampCoverage = stringValue(
    value.timestampCoverage,
    "timestampCoverage",
  ) as WorkflowTimestampCoverage;
  if (
    !(["complete", "partial", "unavailable"] as const).includes(
      timestampCoverage,
    )
  )
    throw new ProtocolValidationError(-32602, "invalid timestampCoverage");
  const integer = (field: "timelineCount" | "observableCaseCount") => {
    const result = value[field];
    if (typeof result !== "number" || !Number.isInteger(result) || result < 0)
      throw new ProtocolValidationError(
        -32602,
        `${field} must be a non-negative integer`,
      );
    return result;
  };
  const timelineCount = integer("timelineCount");
  const observableCaseCount = integer("observableCaseCount");
  if (timelineCount < 2 || observableCaseCount > timelineCount)
    throw new ProtocolValidationError(
      -32602,
      "invalid workflow duration case counts",
    );
  let elapsedMinutes: WorkflowElapsedMinutes | undefined;
  if (value.elapsedMinutes !== undefined) {
    if (!isObject(value.elapsedMinutes) || observableCaseCount === 0)
      throw new ProtocolValidationError(-32602, "elapsedMinutes is invalid");
    const rawElapsedMinutes = value.elapsedMinutes;
    const metric = (field: keyof WorkflowElapsedMinutes) => {
      const result = rawElapsedMinutes[field];
      if (typeof result !== "number" || !Number.isFinite(result) || result < 0)
        throw new ProtocolValidationError(
          -32602,
          `elapsedMinutes.${field} is invalid`,
        );
      return result;
    };
    elapsedMinutes = {
      minimum: metric("minimum"),
      median: metric("median"),
      maximum: metric("maximum"),
    };
    if (
      elapsedMinutes.minimum > elapsedMinutes.median ||
      elapsedMinutes.median > elapsedMinutes.maximum
    )
      throw new ProtocolValidationError(
        -32602,
        "elapsedMinutes values are not ordered",
      );
  } else if (observableCaseCount > 0) {
    throw new ProtocolValidationError(-32602, "elapsedMinutes is required");
  }
  return {
    operationVersion: 1,
    caseType: engineeringCaseType(value.caseType, "caseType"),
    timelineCount,
    timestampCoverage,
    observableCaseCount,
    ...(elapsedMinutes ? { elapsedMinutes } : {}),
  };
}

export interface ConformanceStatusCounts {
  readonly pass: number;
  readonly violation: number;
  readonly "missing-evidence": number;
  readonly "ambiguous-evidence": number;
  readonly unsupported: number;
}

export interface ConformanceSeverityCounts {
  readonly error: number;
  readonly warning: number;
  readonly info: number;
}

export interface ConformanceTrendSummaryReport {
  readonly operationVersion: 1;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly policyId: string;
  readonly reportCount: number;
  readonly findingCount: number;
  readonly statusCounts: ConformanceStatusCounts;
  readonly severityCounts: ConformanceSeverityCounts;
}

export function validateConformanceTrendSummaryReport(
  value: unknown,
): ConformanceTrendSummaryReport {
  if (
    !isObject(value) ||
    value.operationVersion !== 1 ||
    !isObject(value.statusCounts) ||
    !isObject(value.severityCounts)
  )
    throw new ProtocolValidationError(
      -32602,
      "conformance trend summary report is invalid",
    );
  const nonNegativeInteger = (
    source: Record<string, unknown>,
    field: string,
  ) => {
    const result = source[field];
    if (typeof result !== "number" || !Number.isInteger(result) || result < 0)
      throw new ProtocolValidationError(
        -32602,
        `${field} must be a non-negative integer`,
      );
    return result;
  };
  const reportCount = nonNegativeInteger(value, "reportCount");
  const findingCount = nonNegativeInteger(value, "findingCount");
  if (reportCount < 2)
    throw new ProtocolValidationError(
      -32602,
      "reportCount must be at least two",
    );
  const statusCounts = {
    pass: nonNegativeInteger(value.statusCounts, "pass"),
    violation: nonNegativeInteger(value.statusCounts, "violation"),
    "missing-evidence": nonNegativeInteger(
      value.statusCounts,
      "missing-evidence",
    ),
    "ambiguous-evidence": nonNegativeInteger(
      value.statusCounts,
      "ambiguous-evidence",
    ),
    unsupported: nonNegativeInteger(value.statusCounts, "unsupported"),
  };
  const severityCounts = {
    error: nonNegativeInteger(value.severityCounts, "error"),
    warning: nonNegativeInteger(value.severityCounts, "warning"),
    info: nonNegativeInteger(value.severityCounts, "info"),
  };
  if (
    Object.values(statusCounts).reduce((sum, count) => sum + count, 0) !==
      findingCount ||
    Object.values(severityCounts).reduce((sum, count) => sum + count, 0) !==
      findingCount
  )
    throw new ProtocolValidationError(
      -32602,
      "trend counts must equal findingCount",
    );
  return {
    operationVersion: 1,
    caseType: engineeringCaseType(value.caseType, "caseType"),
    policyId: stringValue(value.policyId, "policyId"),
    reportCount,
    findingCount,
    statusCounts,
    severityCounts,
  };
}

export interface WorkflowRepetitionPattern {
  readonly activity: string;
  readonly caseCount: number;
  readonly occurrenceCount: number;
  readonly maxOccurrencesPerCase: number;
}

export interface WorkflowRepetitionSummaryReport {
  readonly operationVersion: 1;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly timelineCount: number;
  readonly repeatedActivities: readonly WorkflowRepetitionPattern[];
}

export function validateWorkflowRepetitionSummaryReport(
  value: unknown,
): WorkflowRepetitionSummaryReport {
  if (!isObject(value) || value.operationVersion !== 1)
    throw new ProtocolValidationError(
      -32602,
      "workflow repetition summary report is invalid",
    );
  const nonNegativeInteger = (
    source: Record<string, unknown>,
    field: string,
  ) => {
    const result = source[field];
    if (typeof result !== "number" || !Number.isInteger(result) || result < 0)
      throw new ProtocolValidationError(
        -32602,
        `${field} must be a non-negative integer`,
      );
    return result;
  };
  const timelineCount = nonNegativeInteger(value, "timelineCount");
  if (timelineCount < 2)
    throw new ProtocolValidationError(
      -32602,
      "timelineCount must be at least two",
    );
  if (!Array.isArray(value.repeatedActivities))
    throw new ProtocolValidationError(
      -32602,
      "repeatedActivities must be an array",
    );
  const repeatedActivities = value.repeatedActivities.map((item) => {
    if (!isObject(item))
      throw new ProtocolValidationError(
        -32602,
        "repetition pattern is invalid",
      );
    const activity = stringValue(item.activity, "activity");
    const caseCount = nonNegativeInteger(item, "caseCount");
    const occurrenceCount = nonNegativeInteger(item, "occurrenceCount");
    const maxOccurrencesPerCase = nonNegativeInteger(
      item,
      "maxOccurrencesPerCase",
    );
    if (
      caseCount < 1 ||
      occurrenceCount < caseCount ||
      maxOccurrencesPerCase < 2
    )
      throw new ProtocolValidationError(
        -32602,
        "repetition pattern counts are invalid",
      );
    return { activity, caseCount, occurrenceCount, maxOccurrencesPerCase };
  });
  return {
    operationVersion: 1,
    caseType: engineeringCaseType(value.caseType, "caseType"),
    timelineCount,
    repeatedActivities,
  };
}

export interface WorkflowTransitionInterval {
  readonly from: string;
  readonly to: string;
  readonly intervalCount: number;
  readonly observableCaseCount: number;
  readonly elapsedMinutes: WorkflowElapsedMinutes;
}

export interface WorkflowTransitionIntervalsReport {
  readonly operationVersion: 1;
  readonly caseType: EngineeringWorkflowCaseType;
  readonly timelineCount: number;
  readonly timestampCoverage: WorkflowTimestampCoverage;
  readonly observableIntervalCount: number;
  readonly transitions: readonly WorkflowTransitionInterval[];
}

export function validateWorkflowTransitionIntervalsReport(
  value: unknown,
): WorkflowTransitionIntervalsReport {
  if (
    !isObject(value) ||
    value.operationVersion !== 1 ||
    !Array.isArray(value.transitions)
  )
    throw new ProtocolValidationError(
      -32602,
      "workflow transition intervals report is invalid",
    );
  const timestampCoverage = stringValue(
    value.timestampCoverage,
    "timestampCoverage",
  ) as WorkflowTimestampCoverage;
  if (
    !(["complete", "partial", "unavailable"] as const).includes(
      timestampCoverage,
    )
  )
    throw new ProtocolValidationError(-32602, "invalid timestampCoverage");
  const integer = (field: "timelineCount" | "observableIntervalCount") => {
    const result = value[field];
    if (typeof result !== "number" || !Number.isInteger(result) || result < 0)
      throw new ProtocolValidationError(
        -32602,
        `${field} must be a non-negative integer`,
      );
    return result;
  };
  const timelineCount = integer("timelineCount");
  const observableIntervalCount = integer("observableIntervalCount");
  if (timelineCount < 2)
    throw new ProtocolValidationError(
      -32602,
      "timelineCount must be at least two",
    );
  let countedIntervals = 0;
  const transitions = value.transitions.map((transition, index) => {
    if (!isObject(transition))
      throw new ProtocolValidationError(
        -32602,
        `transitions[${index}] is invalid`,
      );
    const from = stringValue(transition.from, `transitions[${index}].from`);
    const to = stringValue(transition.to, `transitions[${index}].to`);
    const intervalCount = transition.intervalCount;
    const observableCaseCount = transition.observableCaseCount;
    if (
      typeof intervalCount !== "number" ||
      !Number.isInteger(intervalCount) ||
      intervalCount < 1 ||
      typeof observableCaseCount !== "number" ||
      !Number.isInteger(observableCaseCount) ||
      observableCaseCount < 1 ||
      observableCaseCount > timelineCount
    )
      throw new ProtocolValidationError(
        -32602,
        `transitions[${index}] counts are invalid`,
      );
    if (!isObject(transition.elapsedMinutes))
      throw new ProtocolValidationError(
        -32602,
        `transitions[${index}].elapsedMinutes is invalid`,
      );
    const elapsedObject = transition.elapsedMinutes;
    const metric = (field: keyof WorkflowElapsedMinutes) => {
      const result = elapsedObject[field];
      if (typeof result !== "number" || !Number.isFinite(result) || result < 0)
        throw new ProtocolValidationError(
          -32602,
          `transitions[${index}].elapsedMinutes.${field} is invalid`,
        );
      return result;
    };
    const elapsedMinutes = {
      minimum: metric("minimum"),
      median: metric("median"),
      maximum: metric("maximum"),
    };
    if (
      elapsedMinutes.minimum > elapsedMinutes.median ||
      elapsedMinutes.median > elapsedMinutes.maximum
    )
      throw new ProtocolValidationError(
        -32602,
        `transitions[${index}].elapsedMinutes values are not ordered`,
      );
    countedIntervals += intervalCount;
    return { from, to, intervalCount, observableCaseCount, elapsedMinutes };
  });
  if (countedIntervals !== observableIntervalCount)
    throw new ProtocolValidationError(
      -32602,
      "transition interval counts do not match observableIntervalCount",
    );
  if (observableIntervalCount === 0 && transitions.length > 0)
    throw new ProtocolValidationError(
      -32602,
      "transitions must be empty when no intervals are observable",
    );
  return {
    operationVersion: 1,
    caseType: engineeringCaseType(value.caseType, "caseType"),
    timelineCount,
    timestampCoverage,
    observableIntervalCount,
    transitions,
  };
}
