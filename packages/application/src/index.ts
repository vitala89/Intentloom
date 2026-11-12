// Private project-operation layer. It must remain independent of CLI/process code.
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import type { GeneratedFile } from "@intentloom/core";
import {
  type AcceptedException,
  type AdoptionPlan,
  type ValidationRequirement,
} from "@intentloom/core/adoption";
import type { ArtifactValidator } from "@intentloom/validator";
import { synchronizeDeclaredProjectPaths } from "./generated-file-sync-declared.js";
import { commitOwnedGeneratedFiles } from "./generated-file/generated-file-transaction.js";
import { isDeclaredPathsOnlySyncMode } from "./generated-file/sync-mode.js";
import type {
  TransactionOptions,
  TransactionResult,
} from "./generated-file/transaction-contracts.js";
import type { Plan } from "./project-change.js";
import type {
  DetectedProfile,
  EngineeringProfile,
  ProfileCandidate,
  ProfileDetectionResult,
  WorkspaceTopology,
} from "./project-profile-detection.js";
import { nodeFileSystem, type FileSystem } from "./host-file-system.js";
import type { AdoptionProposal } from "./project-adoption/generated-file-adoption-contracts.js";
import { adoptGeneratedFiles } from "./project-adoption/generated-file-adoption.js";
import { planProjectAdoption } from "./project-adoption/governance-adoption-plan.js";
import { inside, secretLikePath } from "./project-path.js";
import { ArtifactValidationFailure } from "./artifact-validation-failure.js";
import { doctorProject } from "./project-lifecycle/doctor-project.js";
import { inspectProject } from "./project-lifecycle/project-inspection.js";
import { initProject } from "./project-lifecycle/project-init.js";
import { diffProject } from "./project-lifecycle/project-plan.js";
import { executeProjectSync } from "./project-lifecycle/project-sync.js";
import {
  type DoctorFinding,
  type InitOptions,
  type ProjectInspection,
  type SyncDryRunResult,
  type SyncOptions,
} from "./project-lifecycle/project-lifecycle-contracts.js";
import {
  collectGitEvidence,
  createReleaseTimeline,
  type GitRunner,
  type ReleaseTimeline,
} from "@intentloom/evidence-git";
import {
  type RetentionState,
  type SessionSummary,
  type SkillCatalogMetadata,
  type SkillDiscoveryDecision,
  type SkillDiscoveryResult,
  type SkillExecutionContract,
  type SkillLoadingLevel,
  type SkillProcedure,
  type SkillProposal,
  type SkillProposalState,
  type EvaluationCase,
  type EvaluationOutcome,
  type SkillEvaluationResult,
  type ProceduralMemorySummary,
  type ProceduralMemoryInspection,
  type SkillMutationPlan,
  type TaskCheckpointState,
  type TaskCheckpoint,
  type TaskRedirectRequest,
  type TaskResumeResult,
  type SemanticRankingProvider,
  type SemanticRankingConfig,
  type SemanticRankItem,
  type SemanticRankResult,
  type DelegatedAgentRole,
  type AgentRoleCapabilities,
  type ProfileDefinition,
  type DelegationRequest,
  type DelegationResult,
  type ContextSourceType,
  type ContextSource,
  type ContextRetrievalRequest,
  type ContextRetrievalResult,
  type MemoryClassification,
  type PersistentMemoryItem,
  type PersistentMemoryExport,
  type MemoryRenderTarget,
  type PersistentMemorySearchResult,
  type TaskSummary,
  type TrustClass,
  type AgentSessionState,
  type AgentSessionItem,
  type AgentSessionExportResult,
  type SecurityFindingSeverity,
  type SecurityFindingState,
  type SecurityEvidence,
  type AcceptedSecurityRisk,
  type SecurityFinding,
  type SecurityCoverageReport,
  type SarifImportResult,
  type SecurityAdapterCategory,
  type SecurityAdapterMetadata,
  type SecurityAdapterResult,
  type SecurityPolicyEnforcementLevel,
  type SecurityPolicyRule,
  type SecurityPolicy,
  type SecurityBaseline,
  type SecurityBaselineCheckResult,
  type SandboxCapabilityMode,
  type SandboxPathRule,
  type SandboxCommandRule,
  type SandboxCapabilityPolicy,
  type SandboxEvaluationResult,
  type SecurityInvariantStatus,
  type SecurityInvariantCheck,
  type ContinuousSecurityAuditReport,
  type AgentWorkspaceMode,
  type WorkspaceMessage,
  type WorkspaceConversationRecord,
  type NeutronSubagentRole,
  type NeutronSubagentStatus,
  type NeutronSubagentTaskRecord,
  validateSessionSummary,
  validateSkillCatalogMetadata,
  validateSkillDiscoveryResult,
  validateSkillEvaluationResult,
  validateSkillMutationPlan,
  validateSkillProposal,
  validateTaskCheckpoint,
  validateTaskRedirectRequest,
  validateSemanticRankingConfig,
  validateSemanticRankResult,
  validateProfileDefinition,
  validateDelegationRequest,
  validateDelegationResult,
  validateContextRetrievalRequest,
  validateContextRetrievalResult,
  validatePersistentMemoryItem,
  validatePersistentMemoryExport,
  validatePersistentMemorySearchResult,
  validateTaskSummary,
  validateSecurityFinding,
  validateSecurityAdapterMetadata,
  validateSecurityAdapterResult,
  validateWorkspaceConversationRecord,
  validateNeutronSubagentTaskRecord,
} from "@intentloom/protocol";
export { INTENTLOOM_VERSION } from "@intentloom/core";
export {
  evaluateProjectEngineeringConformance,
  summarizeProjectWorkflowVariants,
  summarizeProjectWorkflowDurations,
  summarizeProjectConformanceTrend,
  summarizeProjectWorkflowRepetitions,
  summarizeProjectWorkflowTransitionIntervals,
} from "./project-conformance-summaries.js";
export {
  createMemoryFileSystem,
  nodeFileSystem,
  type FileSystem,
} from "./host-file-system.js";
export type {
  RetentionState,
  SessionSummary,
  SkillCatalogMetadata,
  SkillDiscoveryDecision,
  SkillDiscoveryResult,
  SkillExecutionContract,
  SkillLoadingLevel,
  SkillProcedure,
  SkillProposal,
  SkillProposalState,
  EvaluationCase,
  EvaluationOutcome,
  SkillEvaluationResult,
  ProceduralMemorySummary,
  ProceduralMemoryInspection,
  SkillMutationPlan,
  TaskCheckpointState,
  TaskCheckpoint,
  TaskRedirectRequest,
  TaskResumeResult,
  SemanticRankingProvider,
  SemanticRankingConfig,
  SemanticRankItem,
  SemanticRankResult,
  DelegatedAgentRole,
  AgentRoleCapabilities,
  ProfileDefinition,
  DelegationRequest,
  DelegationResult,
  ContextSourceType,
  ContextSource,
  ContextRetrievalRequest,
  ContextRetrievalResult,
  MemoryClassification,
  PersistentMemoryItem,
  PersistentMemoryExport,
  MemoryRenderTarget,
  PersistentMemorySearchResult,
  TaskSummary,
  TrustClass,
  AgentSessionState,
  AgentSessionItem,
  AgentSessionExportResult,
  SecurityFindingSeverity,
  SecurityFindingState,
  SecurityEvidence,
  AcceptedSecurityRisk,
  SecurityFinding,
  SecurityCoverageReport,
  SarifImportResult,
  SecurityAdapterCategory,
  SecurityAdapterMetadata,
  SecurityAdapterResult,
  SecurityPolicyEnforcementLevel,
  SecurityPolicyRule,
  SecurityPolicy,
  SecurityBaseline,
  SecurityBaselineCheckResult,
  SandboxCapabilityMode,
  SandboxPathRule,
  SandboxCommandRule,
  SandboxCapabilityPolicy,
  SandboxEvaluationResult,
  SecurityInvariantStatus,
  SecurityInvariantCheck,
  ContinuousSecurityAuditReport,
  AgentWorkspaceMode,
  WorkspaceMessage,
  WorkspaceConversationRecord,
  NeutronSubagentRole,
  NeutronSubagentStatus,
  NeutronSubagentTaskRecord,
};
export * from "./task-routing.js";
export * from "./external-skill-import.js";
export * from "./harness/harness-adoption-gate.js";
export * from "./approved-apply-gate.js";
export * from "./approved-apply-engine.js";
export {
  validateNeutronSubagentTaskRecord,
  validateWorkspaceConversationRecord,
  validateSessionSummary,
  validateSkillCatalogMetadata,
  validateSkillDiscoveryResult,
  validateSkillEvaluationResult,
  validateSkillMutationPlan,
  validateSkillProposal,
  validateTaskCheckpoint,
  validateTaskRedirectRequest,
  validateSemanticRankingConfig,
  validateSemanticRankResult,
  validateProfileDefinition,
  validateDelegationRequest,
  validateDelegationResult,
  validateContextRetrievalRequest,
  validateContextRetrievalResult,
  validatePersistentMemoryItem,
  validatePersistentMemoryExport,
  validatePersistentMemorySearchResult,
  validateTaskSummary,
};
export type { Change, ChangeKind, Plan } from "./project-change.js";
export { ArtifactValidationFailure };
export { doctorExitCode } from "./project-lifecycle/project-lifecycle-contracts.js";
export { diffProject, doctorProject, initProject, inspectProject };
export type {
  DoctorCategory,
  DoctorError,
  DoctorFinding,
  DoctorPlan,
  DoctorSeverity,
  InitOptions,
  InspectionFindingSeverity,
  InspectionReadiness,
  ProjectInspection,
  ProjectInspectionCapability,
  ProjectInspectionFinding,
  ProjectMapping,
  SyncDryRunResult,
  SyncOptions,
} from "./project-lifecycle/project-lifecycle-contracts.js";
export type {
  InvalidPostWriteValidation,
  PostWriteCorruptionCode,
  PostWriteCorruptionContext,
  PostWriteValidationResult,
  TransactionOptions,
  TransactionResult,
  TransactionStage,
  ValidPostWriteValidation,
} from "./generated-file/transaction-contracts.js";
export interface ProjectTimelineOptions {
  readonly root: string;
  readonly caseId: string;
  readonly limit?: number;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly run?: GitRunner;
}

export interface ProjectTimeline extends ReleaseTimeline {
  readonly root: string;
  readonly diagnostics: readonly string[];
}

export class ProjectRootError extends Error {
  constructor(
    readonly clientErrorCode: "invalid_root" | "stale_root",
    message: string,
  ) {
    super(message);
    this.name = "ProjectRootError";
  }
}

export async function assertCanonicalProjectRoot(
  root: string,
  fs: FileSystem = nodeFileSystem,
): Promise<string> {
  const canonicalRoot = resolve(root);
  if (!(await fs.exists(canonicalRoot)))
    throw new ProjectRootError("invalid_root", "project root does not exist");
  if (await fs.isSymbolicLink(canonicalRoot))
    throw new ProjectRootError(
      "stale_root",
      "project root is a symbolic link and is not stable",
    );
  return canonicalRoot;
}

export async function timelineProject(
  options: ProjectTimelineOptions,
): Promise<ProjectTimeline> {
  const root = await assertCanonicalProjectRoot(options.root);
  const evidence = await collectGitEvidence({
    root,
    ...(options.limit !== undefined ? { limit: options.limit } : {}),
    ...(options.timeoutMs !== undefined
      ? { timeoutMs: options.timeoutMs }
      : {}),
    ...(options.maxOutputBytes !== undefined
      ? { maxOutputBytes: options.maxOutputBytes }
      : {}),
    ...(options.run !== undefined ? { run: options.run } : {}),
  });
  return {
    root,
    ...createReleaseTimeline(options.caseId, evidence),
    diagnostics: [...evidence.diagnostics],
  };
}

export type {
  DetectedProfile,
  EngineeringProfile,
  ProfileCandidate,
  ProfileDetectionResult,
  WorkspaceTopology,
};
export {
  detectProjectProfiles,
  engineeringProfiles,
} from "./project-profile-detection.js";
export { ignoredScanPath } from "./project-scan-exclusions.js";

export type { AdoptionProposal };
export type {
  AdoptionAction,
  AdoptionProposalItem,
  AdoptionTransactionOutcome,
} from "./project-adoption/generated-file-adoption-contracts.js";
export {
  destinationCollisionKey,
  findDestinationCollisions,
  type DestinationCollision,
} from "./destination-collisions.js";
export {
  GENERATED_FILE_SYNC_DECLARED_PATHS_ONLY,
  isDeclaredPathsOnlySyncMode,
  planSynchronizeGeneratedFilesWriteSet,
  synchronizeDeclaredProjectPaths,
  type GeneratedFileSyncMode,
} from "./generated-file-sync-declared.js";

interface TransactionMetadata {
  readonly manifest: string;
  readonly sourceMap: string;
}

export async function synchronizeGeneratedFiles(
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions = {},
  validatedMetadata?: TransactionMetadata,
): Promise<TransactionResult> {
  if (isDeclaredPathsOnlySyncMode(options.syncMode)) {
    return synchronizeDeclaredProjectPaths(root, files, fs, options);
  }
  return commitOwnedGeneratedFiles(root, files, fs, options, validatedMetadata);
}

export async function syncProject(
  options: SyncOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions = {},
): Promise<SyncDryRunResult | TransactionResult> {
  return executeProjectSync(
    options,
    fs,
    transactionOptions,
    synchronizeGeneratedFiles,
  );
}

export async function adoptProject(
  options: InitOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions = {},
): Promise<AdoptionProposal> {
  return adoptGeneratedFiles(options, fs, transactionOptions, syncProject);
}

export async function planFeature(
  taskId: string,
  validator?: ArtifactValidator,
): Promise<string> {
  if (!taskId) throw new Error("task identifier is required");
  const featureBrief = {
    schemaVersion: "1",
    id: taskId,
    title: taskId,
    status: "draft",
    priority: "medium",
    effort: "m",
    risk: "medium",
    impact: "To be assessed",
    ownerMode: "unassigned",
    problem: "To be defined",
    userValue: "To be defined",
    goal: "Create an approved bounded implementation brief",
    scope: [],
    outOfScope: [],
    acceptanceCriteria: [
      "Acceptance criteria must be completed before approval",
    ],
    architectureBoundaries: [],
    reuseCandidates: [],
    contextPack: `plans/${taskId}-context.json`,
    allowedFiles: [],
    forbiddenFiles: [],
    edgeCases: [],
    verification: ["Define proportionate verification before implementation"],
    liveVerification: false,
    technicalDebtDecision: "none",
    stopCondition: "Stop before implementation until the brief is approved",
  };
  const contextPack = {
    schemaVersion: "1",
    taskId,
    mustRead: [],
    readIfNeeded: [],
    excluded: [],
    forbiddenToChange: [],
    relevantSourceAreas: [],
    contextMode: "minimal",
    expansionReasons: [],
    fileBudget: 20,
  };
  if (validator) {
    const results = [
      validator.validate({
        artifactType: "feature-brief",
        documentPath: `plans/${taskId}.json`,
        format: "json",
        source: JSON.stringify(featureBrief),
      }),
      validator.validate({
        artifactType: "context-pack",
        documentPath: `plans/${taskId}-context.json`,
        format: "json",
        source: JSON.stringify(contextPack),
      }),
    ];
    const invalid = results.filter((result) => result.status === "invalid");
    if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
  }
  return JSON.stringify({ featureBrief, contextPack }, null, 2);
}

export { planProjectAdoption };
export type {
  AdoptionApplyResult,
  ApplyProjectAdoptionOptions,
  PlanProjectAdoptionOptions,
} from "./project-adoption/governance-adoption-contracts.js";
export { applyProjectAdoption } from "./project-adoption/governance-adoption-apply.js";

export interface PlanPackUpdateOptions {
  readonly root: string;
  readonly targetPackVersion?: string;
  readonly validations?: readonly ValidationRequirement[];
  readonly exceptions?: readonly AcceptedException[];
}

export async function planPackUpdate(
  options: PlanPackUpdateOptions,
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionPlan> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "pack update planning requires a non-symbolic explicit project root",
    );
  }
  const basePlan = await planProjectAdoption(
    {
      root,
      ...(options.validations !== undefined
        ? { validations: options.validations }
        : {}),
      ...(options.exceptions !== undefined
        ? { exceptions: options.exceptions }
        : {}),
    },
    fs,
  );

  const targetVersion = options.targetPackVersion ?? "1.1.0";
  if (basePlan.packVersion === targetVersion) {
    return basePlan;
  }

  const updatedOperations = basePlan.operations.map((op) => {
    if (op.kind === "map-existing" || op.kind === "create") {
      return op;
    }
    return op;
  });

  return {
    ...basePlan,
    packVersion: targetVersion,
    operations: updatedOperations,
  };
}

export async function recordTaskSummary(
  input: Omit<TaskSummary, "schemaVersion" | "createdAt"> & {
    createdAt?: string;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskSummary> {
  const root = options.root;
  const createdAt = input.createdAt ?? new Date().toISOString();

  const sanitizedAffectedPaths = input.affectedPaths.filter(
    (path) => !secretLikePath(path),
  );

  const summary: TaskSummary = validateTaskSummary({
    schemaVersion: "1",
    id: input.id,
    root: input.root,
    intent: input.intent,
    ...(input.planRef !== undefined ? { planRef: input.planRef } : {}),
    affectedPaths: sanitizedAffectedPaths,
    validationOutcome: input.validationOutcome,
    evidenceReferences: input.evidenceReferences,
    usedSkills: input.usedSkills,
    unresolvedWork: input.unresolvedWork,
    provenance: input.provenance,
    trustClass: input.trustClass,
    retentionState: input.retentionState,
    createdAt,
  });

  const path = inside(root, `.aif/memory/tasks/${summary.id}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function listTaskSummaries(
  options: {
    root: string;
    trustClass?: TrustClass;
    retentionState?: RetentionState;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly TaskSummary[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: TaskSummary[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/tasks/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const summary = validateTaskSummary(JSON.parse(content));
      if (
        options.trustClass !== undefined &&
        summary.trustClass !== options.trustClass
      )
        continue;
      if (
        options.retentionState !== undefined &&
        summary.retentionState !== options.retentionState
      )
        continue;
      results.push(summary);
    } catch {
      // Ignore corrupted memory records
    }
  }

  return results.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function getTaskSummary(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskSummary | null> {
  const root = options.root;
  const path = inside(root, `.aif/memory/tasks/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateTaskSummary(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function recordSessionSummary(
  input: Omit<SessionSummary, "schemaVersion" | "createdAt"> & {
    createdAt?: string;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SessionSummary> {
  const root = options.root;
  const createdAt = input.createdAt ?? new Date().toISOString();

  const summary: SessionSummary = validateSessionSummary({
    schemaVersion: "1",
    id: input.id,
    root: input.root,
    profile: input.profile,
    activeAdapters: input.activeAdapters,
    completedTaskIds: input.completedTaskIds,
    ...(input.summaryNotes !== undefined
      ? { summaryNotes: input.summaryNotes }
      : {}),
    createdAt,
  });

  const path = inside(root, `.aif/memory/sessions/${summary.id}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

export async function listSessionSummaries(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SessionSummary[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: SessionSummary[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/sessions/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const summary = validateSessionSummary(JSON.parse(content));
      results.push(summary);
    } catch {
      // Ignore corrupted memory records
    }
  }

  return results.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export { parseSkillProgressive } from "./skills/skill-progressive-parse.js";
export { discoverSkills, getSkillAtLevel } from "./skills/skill-discovery.js";

import { listSkillProposals } from "./skills/skill-proposal-store.js";
import { listSkillEvaluations } from "./skills/skill-evaluation.js";

export {
  createSkillProposal,
  getSkillProposal,
  listSkillProposals,
} from "./skills/skill-proposal-store.js";
export {
  evaluateSkillProposal,
  getSkillEvaluation,
  listSkillEvaluations,
} from "./skills/skill-evaluation.js";
export {
  updateSkillProposalState,
  rollbackSkill,
  prepareSkillMutationPlan,
  applySkillMutationPlan,
} from "./skills/skill-mutation.js";
export {
  validateSkillExtensionLock,
  listProceduralMemorySummary,
  inspectProceduralMemory,
} from "./skills/skill-procedural-memory.js";

export async function createTaskCheckpoint(
  taskId: string,
  options: {
    root: string;
    completedSteps?: readonly string[];
    unresolvedWork?: readonly string[];
  },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const id = `chk-${taskId}-${Date.now()}`;
  const path = inside(options.root, `.aif/memory/checkpoints/${id}.json`);
  const snapshotChecksum = createHash("sha256")
    .update(`${id}:${taskId}:${options.root}:${Date.now()}`)
    .digest("hex");

  const checkpoint = validateTaskCheckpoint({
    schemaVersion: "1",
    id,
    taskId,
    state: "active",
    completedSteps: options.completedSteps ?? [],
    unresolvedWork: options.unresolvedWork ?? [],
    createdSnapshotChecksum: snapshotChecksum,
    invalidatedPlans: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(checkpoint, null, 2)}\n`);
  return checkpoint;
}

export async function getTaskCheckpoint(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint | null> {
  const path = inside(options.root, `.aif/memory/checkpoints/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateTaskCheckpoint(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function listTaskCheckpoints(
  options: { root: string; taskId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly TaskCheckpoint[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: TaskCheckpoint[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/checkpoints/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const chk = validateTaskCheckpoint(JSON.parse(content));
      if (options.taskId !== undefined && chk.taskId !== options.taskId)
        continue;
      results.push(chk);
    } catch {
      // Ignore corrupted checkpoint files
    }
  }

  return results.sort((l, r) => r.updatedAt.localeCompare(l.updatedAt));
}

export async function pauseTask(
  checkpointId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "paused",
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function cancelTask(
  checkpointId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "cancelled",
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function redirectTask(
  checkpointId: string,
  newIntent: string,
  options: { root: string; reason?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskCheckpoint> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  const invalidatedPlans = [
    ...existing.invalidatedPlans,
    `plan-invalidated-${Date.now()}`,
  ];

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "redirected",
    unresolvedWork: [...existing.unresolvedWork, `Redirected: ${newIntent}`],
    invalidatedPlans,
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function resumeTask(
  checkpointId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<TaskResumeResult> {
  const existing = await getTaskCheckpoint(checkpointId, options, fs);
  if (!existing) throw new Error(`Task checkpoint not found: ${checkpointId}`);

  if (existing.state === "cancelled") {
    throw new Error(`Cannot resume cancelled task checkpoint: ${checkpointId}`);
  }

  const updated = validateTaskCheckpoint({
    ...existing,
    state: "resumed",
    updatedAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/checkpoints/${checkpointId}.json`,
  );
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);

  return {
    checkpointId,
    verifiedRoot: options.root,
    valid: true,
    invalidatedCount: existing.invalidatedPlans.length,
    resumedAt: new Date().toISOString(),
  };
}

export async function deleteTaskCheckpoint(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<boolean> {
  const path = inside(options.root, `.aif/memory/checkpoints/${id}.json`);
  if (!(await fs.exists(path))) return false;
  await fs.remove(path);
  return true;
}

export async function getSemanticRankingConfig(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SemanticRankingConfig> {
  const path = inside(options.root, ".aif/memory/semantic_config.json");
  if (!(await fs.exists(path))) {
    return {
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    };
  }
  try {
    const content = await fs.read(path);
    return validateSemanticRankingConfig(JSON.parse(content));
  } catch {
    return {
      schemaVersion: "1",
      enabled: false,
      provider: "local-tf-idf",
    };
  }
}

export async function updateSemanticRankingConfig(
  input: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SemanticRankingConfig> {
  const rankingConfig = validateSemanticRankingConfig(input);
  const path = inside(options.root, ".aif/memory/semantic_config.json");
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(rankingConfig, null, 2)}\n`);
  return rankingConfig;
}

export async function rankProceduralMemory(
  query: string,
  options: {
    root: string;
    provider?: SemanticRankingProvider;
    enabled?: boolean;
    maxResults?: number;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SemanticRankResult> {
  const startTime = Date.now();
  const currentConfig = await getSemanticRankingConfig(options, fs);
  const enabled = options.enabled ?? currentConfig.enabled ?? true;
  const provider = options.provider ?? currentConfig.provider ?? "local-tf-idf";

  const proposals = await listSkillProposals({ root: options.root }, fs);
  const evaluations = await listSkillEvaluations({ root: options.root }, fs);

  const queryTerms = query
    .toLowerCase()
    .split(/\s+/u)
    .filter((t) => t.length > 0);

  const items: SemanticRankItem[] = [];

  for (const p of proposals) {
    let score = 0;
    const text = `${p.name} ${p.observedPattern} ${p.content}`.toLowerCase();
    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 0.5;
      }
    }
    if (score > 0) {
      items.push({
        id: p.id,
        type: "proposal",
        score: Math.min(score, 1.0),
        relevanceReason: `Matched terms in proposal ${p.name}`,
        record: {
          id: p.id,
          name: p.name,
          state: p.state,
          confidence: p.confidence,
        },
      });
    }
  }

  for (const e of evaluations) {
    let score = 0;
    const text =
      `${e.skillId} ${e.outcome} ${e.details.join(" ")}`.toLowerCase();
    for (const term of queryTerms) {
      if (text.includes(term)) {
        score += 0.4;
      }
    }
    if (score > 0) {
      items.push({
        id: e.id,
        type: "evidence",
        score: Math.min(score, 1.0),
        relevanceReason: `Matched evaluation outcome ${e.outcome} for ${e.skillId}`,
        record: {
          id: e.id,
          skillId: e.skillId,
          outcome: e.outcome,
          passed: e.passed,
        },
      });
    }
  }

  items.sort((left, right) => right.score - left.score);
  const maxResults = options.maxResults ?? 10;
  const slicedItems = items.slice(0, maxResults);

  return validateSemanticRankResult({
    schemaVersion: "1",
    query,
    items: slicedItems,
    rankingLatencyMs: Date.now() - startTime,
    provider,
    enabled,
  });
}

export async function createProfile(
  input: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProfileDefinition> {
  const profile = validateProfileDefinition(input);
  const path = inside(
    options.root,
    `.aif/memory/profiles/${profile.name}.json`,
  );
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(profile, null, 2)}\n`);
  return profile;
}

export async function getProfile(
  name: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProfileDefinition | null> {
  const path = inside(options.root, `.aif/memory/profiles/${name}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateProfileDefinition(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function listProfiles(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly ProfileDefinition[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: ProfileDefinition[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/profiles/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const prof = validateProfileDefinition(JSON.parse(content));
      results.push(prof);
    } catch {
      // Ignore invalid profile files
    }
  }

  return results.sort((l, r) => l.name.localeCompare(r.name));
}

export async function delegateTaskRole(
  input: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<DelegationResult> {
  const req = validateDelegationRequest(input);
  const profile = await getProfile(req.profileName, options, fs);
  if (!profile) {
    throw new Error(`Profile not found: ${req.profileName}`);
  }

  if (!profile.activeRoles.includes(req.role)) {
    throw new Error(
      `Role [${req.role}] is not allowed by profile [${profile.name}]`,
    );
  }

  const deniedCapabilities: string[] = [];

  // Enforce read-only roles
  const isReadOnlyRole =
    req.role === "context-scout" || req.role === "reviewer";
  const readOnly = isReadOnlyRole || profile.allowedCapabilities.readOnly;

  if (isReadOnlyRole && req.requestedCapabilities?.readOnly === false) {
    deniedCapabilities.push("readOnly: false (role enforces read-only)");
  }

  const allowedPaths = profile.allowedCapabilities.allowedPaths;
  const allowedTools = profile.allowedCapabilities.allowedTools;
  const maxBudget = Math.min(
    profile.allowedCapabilities.maxBudget,
    req.requestedCapabilities?.maxBudget ??
      profile.allowedCapabilities.maxBudget,
  );
  const allowNetwork =
    profile.allowedCapabilities.allowNetwork &&
    (req.requestedCapabilities?.allowNetwork ?? true);

  if (
    req.requestedCapabilities?.allowNetwork === true &&
    !profile.allowedCapabilities.allowNetwork
  ) {
    deniedCapabilities.push("allowNetwork: true (profile disallows network)");
  }

  const delegationId = `del-${req.role}-${Date.now()}`;
  const result = validateDelegationResult({
    schemaVersion: "1",
    delegationId,
    grantedRole: req.role,
    effectiveCapabilities: {
      readOnly,
      allowedPaths,
      allowedTools,
      maxBudget,
      allowNetwork,
    },
    deniedCapabilities,
    createdAt: new Date().toISOString(),
  });

  const path = inside(
    options.root,
    `.aif/memory/delegations/${delegationId}.json`,
  );
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(result, null, 2)}\n`);

  return result;
}

export async function getBoundedProjectContext(
  requestInput: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ContextRetrievalResult> {
  const req = validateContextRetrievalRequest(
    requestInput ?? { schemaVersion: "1" },
  );
  const root = options.root;

  const maxTokens = req.maxTokens ?? 4000;
  const maxItems = req.maxItems ?? 20;

  const secretPatterns = [
    /\.env$/u,
    /\.env\./u,
    /\.pem$/u,
    /\.key$/u,
    /credentials\.json$/u,
    /id_rsa$/u,
    /id_ed25519$/u,
    /\.git\//u,
    /node_modules\//u,
  ];

  let excludedPathsCount = 0;
  const rawList = await fs.list(root);
  const candidateItems: ContextSource[] = [];

  for (const rawPath of rawList) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");

    if (secretPatterns.some((pattern) => pattern.test(normalized))) {
      excludedPathsCount += 1;
      continue;
    }

    let type: ContextSourceType | null = null;
    let trustClass: TrustClass = "verified-evidence";

    if (normalized.startsWith("docs/specs/")) {
      type = "intent";
      trustClass = "canonical-policy";
    } else if (normalized.startsWith("docs/decisions/")) {
      type = "adr";
      trustClass = "canonical-policy";
    } else if (normalized.startsWith("docs/")) {
      type = "documentation";
      trustClass = "verified-evidence";
    } else if (
      normalized === "PROJECT_STATE.md" ||
      normalized === "DUTY_WATCH.md"
    ) {
      type = "ownership";
      trustClass = "verified-evidence";
    } else if (normalized.startsWith(".aif/memory/")) {
      type = "evidence";
      trustClass = "verified-evidence";
    }

    if (!type) continue;
    if (req.sourceTypes && !req.sourceTypes.includes(type)) continue;

    try {
      const fullPath = rawPath.startsWith(root)
        ? rawPath
        : inside(root, normalized);
      const content = await fs.read(fullPath);
      const tokenCount = Math.ceil(content.length / 4);
      const summary = content.slice(0, 150).replace(/\n+/gu, " ").trim();

      if (req.query) {
        const q = req.query.toLowerCase();
        if (
          !normalized.toLowerCase().includes(q) &&
          !content.toLowerCase().includes(q)
        ) {
          continue;
        }
      }

      candidateItems.push({
        id: `ctx-${type}-${normalized.replaceAll("/", "-")}`,
        type,
        path: normalized,
        summary,
        trustClass,
        tokenCount,
      });
    } catch {
      // Ignore unreadable files
    }
  }

  let currentTokens = 0;
  const slicedItems: ContextSource[] = [];

  for (const item of candidateItems) {
    if (slicedItems.length >= maxItems) break;
    if (currentTokens + item.tokenCount > maxTokens && slicedItems.length > 0)
      break;

    slicedItems.push(item);
    currentTokens += item.tokenCount;
  }

  return validateContextRetrievalResult({
    schemaVersion: "1",
    root,
    totalTokens: currentTokens,
    items: slicedItems,
    excludedPathsCount,
    retrievedAt: new Date().toISOString(),
  });
}

export {
  getPersistentMemoryItem,
  listPersistentMemoryItems,
} from "./memory/persistent-memory-store.js";
export {
  acceptPersistentMemory,
  exportPersistentMemory,
  forgetPersistentMemory,
  importPersistentMemory,
  proposePersistentMemory,
  supersedePersistentMemory,
} from "./memory/persistent-memory-lifecycle.js";
export {
  clearPersistentMemoryIndex,
  rebuildPersistentMemoryIndex,
  renderPersistentMemoryContext,
  searchPersistentMemory,
} from "./memory/persistent-memory-retrieval.js";

export {
  closeAgentSession,
  deleteAgentSession,
  exportAgentSession,
  getAgentSession,
  listAgentSessions,
  startAgentSession,
} from "./agent-session/agent-session.js";

import { securityFindingPath } from "./security/security-finding-store.js";
import { evaluateProposalAgainstSandbox } from "./security/sandbox-proposal-evaluation.js";

export {
  acceptSecurityRisk,
  dismissSecurityFinding,
  getSecurityFinding,
  listSecurityFindings,
} from "./security/security-finding-store.js";
export { importSarifSecurityReport } from "./security/sarif-security-import.js";
export { getSecurityCoverageReport } from "./security/security-coverage.js";
export {
  getSecurityPolicy,
  writeSecurityPolicy,
} from "./security/security-policy.js";
export {
  getSecurityBaseline,
  updateSecurityBaseline,
} from "./security/security-baseline.js";
export { checkSecurityPolicyAndBaseline } from "./security/security-policy-evaluation.js";
export {
  getSandboxCapabilityPolicy,
  writeSandboxCapabilityPolicy,
} from "./security/sandbox-capability-policy.js";
export { evaluateProposalAgainstSandbox } from "./security/sandbox-proposal-evaluation.js";
export { getSecurityAuditReport } from "./security/security-audit-report-store.js";
export { runContinuousSecurityAudit } from "./security/continuous-security-audit.js";

export function correlateSecurityFindings(
  findings: readonly SecurityFinding[],
): readonly SecurityFinding[] {
  const map = new Map<string, SecurityFinding>();
  for (const finding of findings) {
    const primaryPath = finding.evidence[0]?.path ?? "unknown";
    const key = `${finding.ruleId}:${primaryPath}`;
    if (!map.has(key)) {
      map.set(key, finding);
    } else {
      const existing = map.get(key)!;
      const severityRank: Record<SecurityFindingSeverity, number> = {
        critical: 5,
        high: 4,
        medium: 3,
        low: 2,
        info: 1,
      };
      if (severityRank[finding.severity] > severityRank[existing.severity]) {
        map.set(key, finding);
      }
    }
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function runLocalSecurityAdapters(
  options: {
    root: string;
    categories?: readonly SecurityAdapterCategory[];
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SecurityAdapterResult[]> {
  const activeCategories = options.categories?.length
    ? options.categories
    : ([
        "dependency",
        "secret",
        "config",
        "source",
        "extension",
        "mcp",
        "hook",
        "agentic",
      ] as const);

  const results: SecurityAdapterResult[] = [];
  const now = new Date().toISOString();
  let findingCounter = 1;

  for (const category of activeCategories) {
    const rawFindings: SecurityFinding[] = [];

    if (category === "dependency") {
      const pkgPath = inside(options.root, "package.json");
      if (await fs.exists(pkgPath)) {
        try {
          const content = JSON.parse(await fs.read(pkgPath));
          const deps = {
            ...content.dependencies,
            ...content.devDependencies,
          };
          for (const [name, version] of Object.entries(deps)) {
            if (
              typeof version === "string" &&
              (version === "*" ||
                version === "latest" ||
                version.startsWith(">="))
            ) {
              rawFindings.push(
                validateSecurityFinding({
                  schemaVersion: "1",
                  id: `sec-dep-${findingCounter++}`,
                  ruleId: "dep/unpinned-wildcard",
                  title: `Unpinned dependency version for ${name}`,
                  severity: "medium",
                  state: "open",
                  category: "dependency",
                  description: `Dependency ${name} uses floating version specifier ${version}`,
                  scanner: "built-in:dependency-adapter",
                  evidence: [{ path: "package.json" }],
                  trustClass: "verified-evidence",
                  createdAt: now,
                  updatedAt: now,
                }),
              );
            }
          }
        } catch {
          // ignore malformed package.json
        }
      }
    }

    if (category === "secret") {
      const files = await fs.list(options.root);
      for (const rawPath of files) {
        const rel = rawPath.startsWith(options.root)
          ? relative(options.root, rawPath)
          : rawPath;
        if (
          rel.includes("node_modules") ||
          rel.startsWith(".git") ||
          rel.endsWith(".png") ||
          rel.endsWith(".jpg")
        )
          continue;

        if (secretLikePath(rel)) {
          rawFindings.push(
            validateSecurityFinding({
              schemaVersion: "1",
              id: `sec-secret-${findingCounter++}`,
              ruleId: "secret/sensitive-file-location",
              title: "Sensitive file in repository workspace",
              severity: "high",
              state: "open",
              category: "secret",
              description: `File path ${rel} matches sensitive secret filename pattern`,
              scanner: "built-in:secret-adapter",
              evidence: [{ path: secretLikePath(rel) ? "[REDACTED]" : rel }],
              trustClass: "verified-evidence",
              createdAt: now,
              updatedAt: now,
            }),
          );
        }
      }
    }

    if (category === "config") {
      const files = await fs.list(options.root);
      const hasAif = files.some((f) => f.includes(".aif/"));
      const hasPolicy = files.some((f) => f.includes(".aif/policy"));
      if (hasAif && !hasPolicy) {
        rawFindings.push(
          validateSecurityFinding({
            schemaVersion: "1",
            id: `sec-cfg-${findingCounter++}`,
            ruleId: "config/missing-security-policy",
            title: "No explicit security policy declared in .aif/",
            severity: "low",
            state: "open",
            category: "config",
            description:
              "Project .aif directory exists without an explicit security policy",
            scanner: "built-in:config-adapter",
            evidence: [{ path: ".aif" }],
            trustClass: "verified-evidence",
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
    }

    if (category === "mcp") {
      const files = await fs.list(options.root);
      for (const rawPath of files) {
        const normalized = rawPath.replaceAll("\\", "/");
        if (normalized.includes(".aif/mcp/") && normalized.endsWith(".json")) {
          try {
            const content = JSON.parse(await fs.read(rawPath));
            if (content.allowGenericShell === true) {
              const rel = rawPath.startsWith(options.root)
                ? relative(options.root, rawPath)
                : rawPath;
              rawFindings.push(
                validateSecurityFinding({
                  schemaVersion: "1",
                  id: `sec-mcp-${findingCounter++}`,
                  ruleId: "mcp/unrestricted-shell-permission",
                  title:
                    "MCP server configuration enables generic shell capability",
                  severity: "critical",
                  state: "open",
                  category: "mcp",
                  description: `MCP server config ${rel} allows generic shell execution`,
                  scanner: "built-in:mcp-adapter",
                  evidence: [{ path: rel }],
                  trustClass: "verified-evidence",
                  createdAt: now,
                  updatedAt: now,
                }),
              );
            }
          } catch {
            // ignore malformed mcp configs
          }
        }
      }
    }

    const correlated = correlateSecurityFindings(rawFindings);
    for (const finding of correlated) {
      const path = securityFindingPath(options.root, finding.id);
      if (!(await fs.exists(dirname(path)))) {
        await fs.mkdir(dirname(path));
      }
      await fs.write(path, `${JSON.stringify(finding, null, 2)}\n`);
    }

    const adapterMeta: SecurityAdapterMetadata =
      validateSecurityAdapterMetadata({
        schemaVersion: "1",
        name: `built-in:${category}-adapter`,
        category,
        version: "1.0.0",
        readOnly: true,
        networkAccess: false,
      });

    results.push(
      validateSecurityAdapterResult({
        schemaVersion: "1",
        adapter: adapterMeta,
        findings: correlated,
        totalCount: correlated.length,
        executedAt: now,
      }),
    );
  }

  return results;
}

import {
  assembleInteractiveWorkspaceState,
  assembleLocalWorkspaceSyncState,
  type LocalWorkspaceSyncState,
} from "./workspace/interactive-workspace-read-model.js";

export type { LocalWorkspaceSyncState };

export interface InteractiveWorkspaceState {
  readonly projectId: string;
  readonly root: string;
  readonly activeView:
    | "inspect"
    | "doctor"
    | "diff"
    | "timeline"
    | "health"
    | "security"
    | "sessions";
  readonly inspect: ProjectInspection | null;
  readonly findings: readonly DoctorFinding[];
  readonly diff: Plan | null;
  readonly timeline: ProjectTimeline | null;
  readonly auditReport: ContinuousSecurityAuditReport | null;
  readonly sessions: readonly AgentSessionItem[];
  readonly generatedAt: string;
}

export async function getInteractiveWorkspaceState(
  options: {
    root: string;
    projectId?: string;
    activeView?:
      | "inspect"
      | "doctor"
      | "diff"
      | "timeline"
      | "health"
      | "security"
      | "sessions";
  },
  fs: FileSystem = nodeFileSystem,
): Promise<InteractiveWorkspaceState> {
  return assembleInteractiveWorkspaceState(options, fs, {
    inspectProject,
    doctorProject,
    diffProject,
    timelineProject,
  });
}

function workspaceConversationPath(
  root: string,
  conversationId: string,
): string {
  return inside(root, `.aif/workspace/conversations/${conversationId}.json`);
}

export async function startWorkspaceConversation(
  options: {
    root: string;
    projectId: string;
    mode?: AgentWorkspaceMode;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceConversationRecord> {
  const id = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const record = validateWorkspaceConversationRecord({
    schemaVersion: "1",
    id,
    projectId: options.projectId,
    mode: options.mode ?? "discuss",
    messages: [],
    createdAt: now,
    updatedAt: now,
  });

  const path = workspaceConversationPath(options.root, id);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(record, null, 2)}\n`);

  return record;
}

export async function getWorkspaceConversation(
  options: { root: string; conversationId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceConversationRecord | null> {
  const path = workspaceConversationPath(options.root, options.conversationId);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateWorkspaceConversationRecord(raw);
  } catch {
    return null;
  }
}

function redactWorkspaceSecrets(content: string): string {
  return content
    .replace(
      /(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}|sk-[a-zA-Z0-9]{32,})/g,
      "[REDACTED_SECRET]",
    )
    .replace(
      /(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+/giu,
      "[REDACTED]",
    )
    .replace(
      /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gu,
      "[REDACTED PRIVATE KEY]",
    );
}

export async function appendWorkspaceMessage(
  options: {
    root: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceConversationRecord> {
  const current = await getWorkspaceConversation(
    { root: options.root, conversationId: options.conversationId },
    fs,
  );
  if (!current)
    throw new Error(`Conversation ${options.conversationId} not found`);

  const redactedContent = redactWorkspaceSecrets(options.content);
  const newMessage: WorkspaceMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: options.role,
    content: redactedContent,
    timestamp: new Date().toISOString(),
  };

  const updatedRecord = validateWorkspaceConversationRecord({
    ...current,
    messages: [...current.messages, newMessage],
    updatedAt: new Date().toISOString(),
  });

  const path = workspaceConversationPath(options.root, options.conversationId);
  await fs.write(path, `${JSON.stringify(updatedRecord, null, 2)}\n`);

  return updatedRecord;
}

export async function listWorkspaceConversations(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly WorkspaceConversationRecord[]> {
  const items: WorkspaceConversationRecord[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/workspace/conversations/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const conversationId = normalized
      .replace(/^\.aif\/workspace\/conversations\//u, "")
      .replace(/\.json$/u, "");
    const record = await getWorkspaceConversation(
      { root: options.root, conversationId },
      fs,
    );
    if (record) items.push(record);
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function workspaceProposalPath(root: string, proposalId: string): string {
  return inside(root, `.aif/proposals/${proposalId}.json`);
}

export async function promoteWorkspaceConversationToProposal(
  options: {
    root: string;
    conversationId: string;
    proposalId?: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionProposal> {
  const conv = await getWorkspaceConversation(
    { root: options.root, conversationId: options.conversationId },
    fs,
  );
  if (!conv)
    throw new Error(
      `Workspace conversation ${options.conversationId} not found`,
    );

  const proposalId = options.proposalId ?? `prop-${Date.now()}`;
  const proposalData = await adoptProject(
    {
      root: options.root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: true,
    },
    fs,
  );
  const path = workspaceProposalPath(options.root, proposalId);

  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(proposalData, null, 2)}\n`);

  return proposalData;
}

export interface WorkspaceProposalReviewResult {
  readonly proposalId: string;
  readonly schemaVersion: number;
  readonly itemsCount: number;
  readonly affectedPaths: readonly string[];
  readonly sandboxEvaluation: SandboxEvaluationResult;
  readonly readyToApply: boolean;
}

export async function reviewWorkspaceProposal(
  options: {
    root: string;
    proposalId: string;
    policyPath?: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<WorkspaceProposalReviewResult> {
  const path = workspaceProposalPath(options.root, options.proposalId);
  let proposalData: AdoptionProposal;
  if (await fs.exists(path)) {
    proposalData = JSON.parse(await fs.read(path));
  } else {
    proposalData = await adoptProject(
      {
        root: options.root,
        profile: "generic",
        adapters: ["codex"],
        dryRun: true,
      },
      fs,
    );
  }

  const affectedPaths = proposalData.items.map((i) => i.path);
  const sandboxEval = await evaluateProposalAgainstSandbox(
    { changes: affectedPaths.map((p) => ({ type: "modify", path: p })) },
    { root: options.root, projectId: options.proposalId },
    fs,
  );

  return {
    proposalId: options.proposalId,
    schemaVersion: 1,
    itemsCount: proposalData.items.length,
    affectedPaths,
    sandboxEvaluation: sandboxEval,
    readyToApply: sandboxEval.allowed,
  };
}

export async function applyWorkspaceProposal(
  options: {
    root: string;
    proposalId: string;
    approvedBy: string;
    planFile?: string;
    dryRun?: boolean;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionProposal> {
  if (!options.approvedBy || !options.approvedBy.trim()) {
    throw new Error("human approval required (--approved-by USER)");
  }

  return adoptProject(
    {
      root: options.root,
      profile: "generic",
      adapters: ["codex"],
      dryRun: options.dryRun ?? false,
    },
    fs,
  );
}

function neutronSubagentTaskPath(root: string, taskId: string): string {
  return inside(root, `.aif/neutron/subagents/${taskId}.json`);
}

export async function spawnNeutronSubagentTask(
  options: {
    root: string;
    projectId: string;
    conversationId?: string;
    role: NeutronSubagentRole;
    taskInput: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<NeutronSubagentTaskRecord> {
  const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const resultOutput = `Neutron subagent (${options.role}) completed research task: "${options.taskInput}"`;

  const record = validateNeutronSubagentTaskRecord({
    schemaVersion: "1",
    id,
    projectId: options.projectId,
    conversationId: options.conversationId ?? null,
    role: options.role,
    status: "completed",
    taskInput: options.taskInput,
    resultOutput,
    createdAt: now,
    completedAt: now,
  });

  const path = neutronSubagentTaskPath(options.root, id);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(record, null, 2)}\n`);

  return record;
}

export async function getNeutronSubagentTask(
  options: { root: string; taskId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<NeutronSubagentTaskRecord | null> {
  const path = neutronSubagentTaskPath(options.root, options.taskId);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateNeutronSubagentTaskRecord(raw);
  } catch {
    return null;
  }
}

export async function listNeutronSubagentTasks(
  options: { root: string; conversationId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly NeutronSubagentTaskRecord[]> {
  const items: NeutronSubagentTaskRecord[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/neutron/subagents/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const taskId = normalized
      .replace(/^\.aif\/neutron\/subagents\//u, "")
      .replace(/\.json$/u, "");
    const record = await getNeutronSubagentTask(
      { root: options.root, taskId },
      fs,
    );
    if (record) {
      if (
        !options.conversationId ||
        record.conversationId === options.conversationId
      ) {
        items.push(record);
      }
    }
  }

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
export async function syncLocalWorkspaceState(
  options: { root: string; projectId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<LocalWorkspaceSyncState> {
  return assembleLocalWorkspaceSyncState(options, fs, {
    inspectProject,
    doctorProject,
    listWorkspaceConversations,
    listNeutronSubagentTasks,
  });
}
export * from "./inception.js";
export * from "./inception/inception-discovery.js";
export * from "./inception/inception-blueprint.js";
export * from "./inception/inception-approval.js";
export * from "./inception/inception-scaffold-planner.js";
export * from "./inception/inception-scaffold-apply.js";
export * from "./inception/inception-actions.js";
export * from "./inception-flow.js";
export * from "./inception/inception-templates.js";
export * from "./harness/harness.js";
export * from "./extension-inspection/inspect-extension-manifest.js";
export * from "./propose-and-apply-extension-adoption.js";
export * from "./knowledge-provider.js";
export * from "./graphify-adapter.js";
export * from "./engineering-assessment.js";
export * from "./engineering-quality-entry.js";
