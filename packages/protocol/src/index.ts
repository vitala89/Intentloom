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
