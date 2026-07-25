export const PROTOCOL_VERSION = 1 as const;
export const DOCTOR_METHOD = "intentloom.project.doctor.v1" as const;

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
  };
}

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

export function serializeRequest(request: DoctorRequest): string {
  return JSON.stringify(request);
}

export function parseSerializedRequest(serialized: string): DoctorRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new ProtocolValidationError(-32600, "request is not valid JSON");
  }
  return parseDoctorRequest(parsed);
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
