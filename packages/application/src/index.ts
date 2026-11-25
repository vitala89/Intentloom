// Private project-operation layer. It must remain independent of CLI/process code.
import { dirname, resolve } from "node:path";
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
import { inside } from "./project-path.js";
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

export { parseSkillProgressive } from "./skills/skill-progressive-parse.js";
export { discoverSkills, getSkillAtLevel } from "./skills/skill-discovery.js";

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

import {
  getSemanticRankingConfig,
  rankProceduralMemory,
  updateSemanticRankingConfig,
} from "./memory/semantic-ranking.js";

export {
  getSemanticRankingConfig,
  rankProceduralMemory,
  updateSemanticRankingConfig,
};

import {
  createProfile,
  getProfile,
  listProfiles,
} from "./memory/profile-store.js";
import { delegateTaskRole } from "./memory/role-delegation.js";
import {
  getTaskSummary,
  listSessionSummaries,
  listTaskSummaries,
  recordSessionSummary,
  recordTaskSummary,
} from "./memory/task-session-summary-store.js";
import {
  cancelTask,
  createTaskCheckpoint,
  deleteTaskCheckpoint,
  getTaskCheckpoint,
  listTaskCheckpoints,
  pauseTask,
  redirectTask,
  resumeTask,
} from "./memory/task-checkpoint-store.js";
import { getBoundedProjectContext } from "./memory/bounded-project-context.js";
import {
  appendWorkspaceMessage,
  getWorkspaceConversation,
  listWorkspaceConversations,
  startWorkspaceConversation,
} from "./workspace/workspace-conversation-store.js";

export {
  createProfile,
  getProfile,
  listProfiles,
  delegateTaskRole,
  getTaskSummary,
  listSessionSummaries,
  listTaskSummaries,
  recordSessionSummary,
  recordTaskSummary,
  cancelTask,
  createTaskCheckpoint,
  deleteTaskCheckpoint,
  getTaskCheckpoint,
  listTaskCheckpoints,
  pauseTask,
  redirectTask,
  resumeTask,
  getBoundedProjectContext,
};

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

export { correlateSecurityFindings } from "./security/security-adapter-correlation.js";
export { runLocalSecurityAdapters } from "./security/security-adapter-run.js";

import {
  assembleInteractiveWorkspaceState,
  assembleLocalWorkspaceSyncState,
  type LocalWorkspaceSyncState,
} from "./workspace/interactive-workspace-read-model.js";
import {
  getNeutronSubagentTask,
  listNeutronSubagentTasks,
  spawnNeutronSubagentTask,
} from "./workspace/legacy-subagent-task-record.js";

export {
  getNeutronSubagentTask,
  listNeutronSubagentTasks,
  spawnNeutronSubagentTask,
};
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

export {
  appendWorkspaceMessage,
  getWorkspaceConversation,
  listWorkspaceConversations,
  startWorkspaceConversation,
};

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
