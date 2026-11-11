// Private project-operation layer. It must remain independent of CLI/process code.
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, relative, resolve } from "node:path";
import { generateAdapters } from "@intentloom/adapters";
import { getAdapterContract } from "@intentloom/adapters";
import { INTENTLOOM_VERSION, checksum, loadCatalog } from "@intentloom/core";
import { normalizeOutputPath, normalizeStoredPath } from "@intentloom/core";
import { type AdapterName } from "@intentloom/core";
import type { Catalog, GeneratedFile } from "@intentloom/core";
import {
  deterministicId,
  planGovernanceAdoption,
  type AcceptedException,
  type AdoptionPlan,
  type DetectedProjectArtifact,
  type MigrationJournalEntry,
  type OwnershipClass,
  type RoleCandidate,
  type ValidationRequirement,
} from "@intentloom/core/adoption";
import type {
  ArtifactValidationResult,
  ArtifactValidator,
} from "@intentloom/validator";
import { validateSkillSet } from "@intentloom/validator";
import { collectExtensionHealthDoctorFindings } from "./extension-inspection/extension-health.js";
import { documentConcept } from "./document-concepts.js";
import {
  adapterForKnownInstructionPath,
  copilotInstructionPath,
  instructionAdapters,
  instructionPath,
  instructionRootKey,
} from "./instruction-file-taxonomy.js";
import { planExistingGeneratedChange } from "./generated-metadata-compare.js";
import { synchronizeDeclaredProjectPaths } from "./generated-file-sync-declared.js";
import { commitOwnedGeneratedFiles } from "./generated-file/generated-file-transaction.js";
import { isDeclaredPathsOnlySyncMode } from "./generated-file/sync-mode.js";
import {
  adapterOutputVersion,
  buildTransactionMetadata,
  lockPath,
  metadataFormatVersion,
  sourceMapPath,
} from "./generated-file/transaction-metadata.js";
import {
  collisionPlan,
  safeDestination,
} from "./generated-file/transaction-path-safety.js";
import { transactionSummary } from "./generated-file/transaction-summary.js";
import type { Change, Plan } from "./project-change.js";
import type {
  TransactionOptions,
  TransactionResult,
  TransactionStage,
} from "./generated-file/transaction-contracts.js";
import {
  detectProjectProfiles,
  type DetectedProfile,
  type EngineeringProfile,
  type ProfileCandidate,
  type ProfileDetectionResult,
  type WorkspaceTopology,
} from "./project-profile-detection.js";
import { inspectionExclusions } from "./project-scan-exclusions.js";
import { nodeFileSystem, type FileSystem } from "./host-file-system.js";
import {
  inside,
  projectRelativePaths,
  secretLikePath,
} from "./project-path.js";
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
import { parse, stringify } from "yaml";

export type { Change, ChangeKind, Plan } from "./project-change.js";
export interface DoctorPlan extends Plan {
  readonly findings: readonly DoctorFinding[];
  readonly errors: readonly DoctorError[];
}

export type DoctorSeverity = "error" | "warning" | "info";
export type DoctorCategory =
  | "config"
  | "schema"
  | "ownership"
  | "generated-file"
  | "adapter"
  | "profile"
  | "documentation"
  | "migration"
  | "security"
  | "drift";

export interface DoctorFinding {
  readonly code: string;
  readonly severity: DoctorSeverity;
  readonly category: DoctorCategory;
  readonly path: string;
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
  readonly adapter: AdapterName | null;
  readonly profile: string | null;
}

export interface DoctorError extends DoctorFinding {
  readonly phase: "semantic";
  readonly artifactType: "generated-state";
  readonly schemaId: "urn:aif:semantic:generated-state:1";
  readonly schemaVersion: "1";
  readonly documentPath: string;
  readonly affectedPath: string;
  readonly fieldPath: "/";
}

export function doctorExitCode(report: DoctorPlan): 0 | 3 {
  return report.findings.some((finding) => finding.severity === "error")
    ? 3
    : 0;
}
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
export interface InitOptions {
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly dryRun?: boolean;
  readonly catalog?: Catalog;
  readonly catalogRoot?: string;
  readonly canonicalSourceHashes?: Readonly<Record<string, string>>;
  readonly validator?: ArtifactValidator;
  readonly existingValidationResults?: readonly ArtifactValidationResult[];
  readonly profileConfirmed?: boolean;
  readonly projectOwnedMappings?: readonly ProjectMapping[];
  readonly documentationMappings?: readonly ProjectMapping[];
}

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

export interface ProjectMapping {
  readonly source: string;
  readonly destination: string;
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

export type ProjectInspectionCapability = "project.files.read";
export type InspectionReadiness =
  "not-initialized" | "partial-metadata" | "ready";
export type InspectionFindingSeverity = "warning" | "error" | "info";

export interface ProjectInspectionFinding {
  readonly code:
    | "inspection-root-symlink"
    | "intentloom-not-initialized"
    | "intentloom-metadata-partial"
    | "inspection-ready";
  readonly severity: InspectionFindingSeverity;
  readonly path: "." | ".aif/";
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
}

export interface ProjectInspection {
  readonly operationVersion: 1;
  readonly capabilities: readonly [ProjectInspectionCapability];
  readonly readOnly: true;
  readonly profileDetection: Omit<ProfileDetectionResult, "scannedPaths">;
  readonly supportedAdapters: readonly AdapterName[];
  readonly detectedAdapters: readonly AdapterName[];
  readonly instructionPaths: readonly string[];
  readonly intentloomMetadata: readonly {
    readonly path:
      ".aif/config.yaml" | ".aif/manifest.lock.json" | ".aif/source-map.json";
    readonly present: boolean;
  }[];
  readonly readiness: InspectionReadiness;
  readonly exclusions: readonly string[];
  readonly findings: readonly ProjectInspectionFinding[];
}

export type AdoptionAction =
  | "create"
  | "map-existing-project-owned"
  | "map-existing-aif-compatible-document"
  | "generated-candidate"
  | "conflict"
  | "unsupported"
  | "skip"
  | "manual-decision-required";

export interface AdoptionProposalItem {
  readonly path: string;
  readonly action: AdoptionAction;
  readonly currentClassification:
    "absent" | "project-owned" | "aif-owned" | "aif-metadata";
  readonly proposedClassification:
    | "aif-generated"
    | "aif-metadata"
    | "project-owned"
    | "project-owned-documentation"
    | "unsupported";
  readonly reason: string;
  readonly canonicalSource: string | null;
  readonly adapter: AdapterName | null;
  readonly profile: string | null;
  readonly conflictDetails: readonly string[];
  readonly writeEligible: boolean;
  readonly manualDecisionRequired: boolean;
  readonly safeNextAction: string;
}

export interface AdoptionProposal extends Plan {
  readonly kind: "adoption-proposal";
  readonly items: readonly AdoptionProposalItem[];
  readonly profileDetection: ProfileDetectionResult;
  readonly applied: boolean;
  readonly applicationStatus:
    | "not-requested"
    | "blocked"
    | "applied"
    | "failed-restored"
    | "failed-incomplete";
  readonly transactionOutcome: AdoptionTransactionOutcome | null;
}
export interface AdoptionTransactionOutcome {
  readonly status: "success" | "failed";
  readonly failedStage: TransactionStage | null;
  readonly errorCode: string | null;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly diagnostics: readonly string[];
}
export interface SyncOptions extends InitOptions {
  readonly force?: boolean;
}
export interface SyncDryRunResult extends Plan {
  readonly dryRun: true;
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
  readonly conflictFiles: readonly string[];
}

const emptyCatalog: Catalog = {
  policies: [],
  workflows: [],
  templates: [],
  skills: [],
};
const configPath = ".aif/config.yaml";
const inspectionAdapterNames: readonly AdapterName[] = [
  "claude",
  "codex",
  "cursor",
  "copilot",
];
const inspectionMetadataPaths = [configPath, lockPath, sourceMapPath] as const;

export async function inspectProject(
  root: string,
  fs: FileSystem,
): Promise<ProjectInspection> {
  const emptyDetection: Omit<ProfileDetectionResult, "scannedPaths"> = {
    selectedProfile: "generic",
    workspaceTopology: "none",
    candidates: [
      {
        profile: "generic",
        evidenceFiles: [],
        reason: "Inspection did not access a symbolic-link project root",
        confidence: "fallback",
      },
    ],
    competingCandidates: [],
    manualConfirmationRequired: false,
  };
  if (await fs.isSymbolicLink(resolve(root)))
    return {
      operationVersion: 1,
      capabilities: ["project.files.read"],
      readOnly: true,
      profileDetection: emptyDetection,
      supportedAdapters: inspectionAdapterNames,
      detectedAdapters: [],
      instructionPaths: [],
      intentloomMetadata: inspectionMetadataPaths.map((path) => ({
        path,
        present: false,
      })),
      readiness: "not-initialized",
      exclusions: inspectionExclusions,
      findings: [
        {
          code: "inspection-root-symlink",
          severity: "error",
          path: ".",
          message: "inspection requires a non-symbolic explicit project root",
          remediation: ["Select the canonical project directory and retry."],
          readOnly: true,
        },
      ],
    };
  const detection = await detectProjectProfiles(root, fs);
  const paths = detection.scannedPaths.filter((path) => !secretLikePath(path));
  const instructionPaths = paths.filter(
    (path) => instructionAdapters(path).length > 0,
  );
  const detectedAdapters = inspectionAdapterNames.filter((adapter) =>
    instructionPaths.some((path) =>
      instructionAdapters(path).includes(adapter),
    ),
  );
  const intentloomMetadata = inspectionMetadataPaths.map((path) => ({
    path,
    present: paths.includes(path),
  }));
  const metadataCount = intentloomMetadata.filter(
    (item) => item.present,
  ).length;
  const readiness: InspectionReadiness =
    metadataCount === 0
      ? "not-initialized"
      : metadataCount === intentloomMetadata.length
        ? "ready"
        : "partial-metadata";
  const findings: ProjectInspectionFinding[] =
    readiness === "not-initialized"
      ? [
          {
            code: "intentloom-not-initialized",
            severity: "info",
            path: ".aif/",
            message: "Intentloom metadata is not present",
            remediation: [
              "Run adoption dry-run and review the proposed changes.",
            ],
            readOnly: true,
          },
        ]
      : readiness === "partial-metadata"
        ? [
            {
              code: "intentloom-metadata-partial",
              severity: "warning",
              path: ".aif/",
              message: "Intentloom metadata is incomplete",
              remediation: [
                "Inspect the existing metadata and review adoption before changing files.",
              ],
              readOnly: true,
            },
          ]
        : [
            {
              code: "inspection-ready",
              severity: "info",
              path: ".aif/",
              message: "Intentloom metadata is present",
              remediation: [],
              readOnly: true,
            },
          ];
  const { scannedPaths: _scannedPaths, ...profileDetection } = detection;
  return {
    operationVersion: 1,
    capabilities: ["project.files.read"],
    readOnly: true,
    profileDetection,
    supportedAdapters: inspectionAdapterNames,
    detectedAdapters,
    instructionPaths,
    intentloomMetadata,
    readiness,
    exclusions: inspectionExclusions,
    findings,
  };
}

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

function sortedMappings(mappings: readonly ProjectMapping[]): ProjectMapping[] {
  return [...mappings].sort((left, right) =>
    `${left.source}\0${left.destination}`.localeCompare(
      `${right.source}\0${right.destination}`,
    ),
  );
}

function config(
  profile: string,
  adapters: readonly AdapterName[],
  options: Pick<InitOptions, "projectOwnedMappings" | "documentationMappings">,
): string {
  const projectOwnedMappings = sortedMappings(
    options.projectOwnedMappings ?? [],
  );
  const documentationMappings = sortedMappings(
    options.documentationMappings ?? [],
  );
  return stringify({
    schemaVersion: "1",
    profile,
    adapters,
    ...(projectOwnedMappings.length === 0 ? {} : { projectOwnedMappings }),
    ...(documentationMappings.length === 0 ? {} : { documentationMappings }),
  });
}
function generated(
  adapterNames: readonly AdapterName[],
  catalog: Catalog,
  profile: string,
): GeneratedFile[] {
  return [...generateAdapters(adapterNames, catalog, { profile }).files];
}

async function desired(options: InitOptions): Promise<GeneratedFile[]> {
  if (options.validator && options.catalogRoot) {
    const skillRoot = resolve(options.catalogRoot, "skills");
    const directories = (await readdir(skillRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const documents = await Promise.all(
      directories.map(async (directory) => ({
        path: `skills/${directory}/SKILL.md`,
        content: await readFile(
          resolve(skillRoot, directory, "SKILL.md"),
          "utf8",
        ),
      })),
    );
    const skillValidation = validateSkillSet(options.validator, documents, {
      aifCatalogPolicy: true,
    });
    const invalid = skillValidation.results.filter(
      (result) => result.status === "invalid",
    );
    if (skillValidation.errors.length > 0)
      invalid.push({
        status: "invalid",
        artifactType: "agent-skill",
        schemaId: "urn:aif:schema:agent-skill:1",
        schemaVersion: "1",
        documentPath: documents[0]?.path ?? "skills/SKILL.md",
        structuralErrors: [],
        semanticErrors: skillValidation.errors,
        warnings: [],
      });
    if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
  }
  const catalog =
    options.catalog ??
    (options.catalogRoot
      ? await loadCatalog(options.catalogRoot)
      : emptyCatalog);
  const selectedAdapters = [...new Set(options.adapters)].sort();
  const projectOwnedDestinations = new Set(
    (options.projectOwnedMappings ?? []).map((mapping) => mapping.source),
  );
  const files = generated(selectedAdapters, catalog, options.profile).filter(
    (file) => !projectOwnedDestinations.has(file.path),
  );
  const configContent = config(options.profile, selectedAdapters, options);
  const payload: GeneratedFile[] = [
    {
      path: configPath,
      content: configContent,
      sources: ["project:config"],
      checksum: checksum(configContent),
    },
    {
      path: ".aif/local.example.yaml",
      content:
        "# Local Intentloom preferences only; never store secrets here.\n",
      sources: ["project:local-example"],
      checksum: checksum(
        "# Local Intentloom preferences only; never store secrets here.\n",
      ),
    },
    ...files,
  ];
  const canonicalSources = [
    ...new Set(
      payload
        .flatMap((file) => file.sources)
        .filter((source) =>
          /^(?:policies|skills|templates|workflows)\//u.test(source),
        ),
    ),
  ].sort();
  const sourceHashes = await Promise.all(
    canonicalSources.map(async (id) => {
      const pinnedChecksum = options.catalogRoot
        ? checksum(await readFile(resolve(options.catalogRoot, id), "utf8"))
        : options.canonicalSourceHashes?.[id];
      if (!pinnedChecksum || !/^[a-f0-9]{64}$/u.test(pinnedChecksum))
        throw new Error(`canonical source hash unavailable: ${id}`);
      return { id, checksum: pinnedChecksum };
    }),
  );
  const { manifest, sourceMap } = buildTransactionMetadata(payload, {
    profile: options.profile,
    adapters: options.adapters,
    sourceHashes,
  });
  if (options.validator) {
    const generatedDocuments = [
      options.validator.validate({
        artifactType: "aif-config",
        documentPath: configPath,
        format: "yaml",
        source: payload[0]!.content,
      }),
      options.validator.validate({
        artifactType: "manifest-lock",
        documentPath: lockPath,
        format: "json",
        source: manifest,
      }),
      options.validator.validate({
        artifactType: "source-map",
        documentPath: sourceMapPath,
        format: "json",
        source: sourceMap,
      }),
    ];
    const invalid = generatedDocuments.filter(
      (result) => result.status === "invalid",
    );
    if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
  }
  return [
    ...payload,
    // Metadata is committed last so ownership never advances ahead of files.
    {
      path: lockPath,
      content: manifest,
      sources: [],
      checksum: checksum(manifest),
    },
    {
      path: sourceMapPath,
      content: sourceMap,
      sources: [],
      checksum: checksum(sourceMap),
    },
  ];
}

export class ArtifactValidationFailure extends Error {
  constructor(readonly results: readonly ArtifactValidationResult[]) {
    super("project artifact validation failed");
  }
}

interface OwnershipRecord {
  readonly path: string;
  readonly checksum: string;
  readonly ownership: "aif-owned-generated";
}

async function ownership(
  root: string,
  fs: FileSystem,
): Promise<Map<string, OwnershipRecord> | null> {
  const path = inside(root, sourceMapPath);
  if (!(await fs.exists(path))) return new Map();
  try {
    const value = JSON.parse(await fs.read(path)) as {
      schemaVersion?: unknown;
      files?: unknown;
    };
    if (value.schemaVersion !== "1" || !Array.isArray(value.files)) return null;
    const records = new Map<string, OwnershipRecord>();
    for (const record of value.files) {
      if (typeof record !== "object" || record === null) return null;
      const item = record as Record<string, unknown>;
      if (
        typeof item.path !== "string" ||
        typeof item.checksum !== "string" ||
        item.ownership !== "aif-owned-generated"
      )
        return null;
      const normalized = normalizeOutputPath(item.path);
      if (normalized !== item.path || records.has(normalized)) return null;
      records.set(normalized, {
        path: normalized,
        checksum: item.checksum,
        ownership: "aif-owned-generated",
      });
    }
    return records;
  } catch {
    return null;
  }
}

async function plan(
  options: InitOptions,
  fs: FileSystem,
  sync = false,
): Promise<Plan> {
  const changes: Change[] = [];
  const desiredFiles = await desired(options);
  for (const metadataPath of [lockPath, sourceMapPath]) {
    try {
      await safeDestination(
        options.root,
        inside(options.root, metadataPath),
        fs,
      );
    } catch (error) {
      return {
        changes: [
          {
            path: metadataPath,
            kind: "security-error",
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
        diagnostics: ["security-error"],
      };
    }
  }
  const collision = collisionPlan(desiredFiles);
  if (collision) return collision;
  const owned = await ownership(options.root, fs);
  if (owned === null)
    return {
      changes: [
        {
          path: sourceMapPath,
          kind: "conflict",
          reason: "malformed source-map; refusing all writes",
        },
      ],
      diagnostics: ["invalid source-map"],
    };
  for (const file of desiredFiles) {
    const path = inside(options.root, normalizeOutputPath(file.path));
    try {
      await safeDestination(options.root, path, fs);
    } catch (error) {
      return {
        changes: [
          {
            path: file.path,
            kind: "security-error",
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
        diagnostics: ["security-error"],
      };
    }
    if (!(await fs.exists(path)))
      changes.push({
        path: file.path,
        kind: sync && owned.has(file.path) ? "missing" : "create",
        reason:
          sync && owned.has(file.path)
            ? "Intentloom-owned generated file is missing"
            : "missing",
        content: file.content,
      });
    else {
      const existing = await fs.read(path);
      const change = planExistingGeneratedChange({
        path: file.path,
        existing,
        desired: file.content,
        sync,
        ownedChecksum: owned.get(file.path)?.checksum,
        checksum,
        approvedOverwrite: options.profileConfirmed === true,
      });
      if (change) changes.push(change);
    }
  }
  return { changes, diagnostics: [] };
}

async function apply(
  root: string,
  fs: FileSystem,
  proposal: Plan,
): Promise<void> {
  const writes = proposal.changes.filter(
    (change) => change.kind === "create" || change.kind === "update",
  );
  const backups = new Map<string, string>();
  const created: string[] = [];
  try {
    for (const change of writes) {
      const path = inside(root, change.path);
      // Revalidate immediately before replacement to narrow symlink substitution races.
      await safeDestination(root, path, fs);
      if (await fs.exists(path)) backups.set(path, await fs.read(path));
      else created.push(path);
      await fs.mkdir(dirname(path));
      await fs.write(path, change.content!);
    }
  } catch (error) {
    for (const [path, content] of backups) await fs.write(path, content);
    for (const path of created) await fs.remove(path);
    throw error;
  }
}

export async function initProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  const proposal = await plan(options, fs);
  if (
    !options.dryRun &&
    !proposal.changes.some((change) => change.kind === "conflict")
  )
    await apply(options.root, fs, proposal);
  return proposal;
}
export async function syncProject(
  options: SyncOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions = {},
): Promise<SyncDryRunResult | TransactionResult> {
  const proposal = await plan(options, fs, true);
  const desiredFiles = await desired(options);
  const payload = desiredFiles.filter(
    (file) => file.path !== lockPath && file.path !== sourceMapPath,
  );
  const blockingChanges = proposal.changes.filter((change) =>
    ["conflict", "modified", "security-error"].includes(change.kind),
  );
  if (options.dryRun) {
    const summary = transactionSummary(payload, proposal.changes);
    return {
      ...proposal,
      dryRun: true,
      createdFiles: summary.createdFiles,
      updatedFiles: summary.updatedFiles,
      unchangedFiles: summary.unchangedFiles,
      conflictFiles: blockingChanges.map((change) => change.path).sort(),
    };
  }
  if (blockingChanges.length > 0 || proposal.diagnostics.length > 0)
    return {
      ...proposal,
      diagnostics:
        proposal.diagnostics.length > 0
          ? proposal.diagnostics
          : ["sync-conflict"],
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      ...transactionSummary(payload, proposal.changes),
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  return synchronizeGeneratedFiles(
    options.root,
    payload,
    fs,
    transactionOptions,
    {
      manifest: desiredFiles.find((file) => file.path === lockPath)!.content,
      sourceMap: desiredFiles.find((file) => file.path === sourceMapPath)!
        .content,
    },
  );
}
export async function diffProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  return plan(options, fs);
}
function portableGlob(pattern: string): boolean {
  return (
    pattern.length > 0 &&
    !pattern.includes("\\") &&
    !pattern.includes("\0") &&
    !/^(?:[A-Za-z]:|\/)/u.test(pattern) &&
    !pattern.split("/").some((segment) => segment === ".." || segment === "")
  );
}

export async function doctorProject(
  options: InitOptions,
  fs: FileSystem,
  validationResults: readonly ArtifactValidationResult[] = [],
): Promise<DoctorPlan> {
  const metadataPresence = await Promise.all(
    [configPath, lockPath, sourceMapPath].map(async (path) => ({
      path,
      present: await fs.exists(inside(options.root, path)),
    })),
  );
  const effectiveValidationResults = [...validationResults];
  if (options.validator) {
    const definitions = [
      {
        artifactType: "aif-config" as const,
        path: configPath,
        format: "yaml" as const,
      },
      {
        artifactType: "manifest-lock" as const,
        path: lockPath,
        format: "json" as const,
      },
      {
        artifactType: "source-map" as const,
        path: sourceMapPath,
        format: "json" as const,
      },
    ];
    for (const definition of definitions)
      if (
        (await fs.exists(inside(options.root, definition.path))) &&
        !effectiveValidationResults.some(
          (result) => result.documentPath === definition.path,
        )
      ) {
        const result = options.validator.validate({
          ...definition,
          documentPath: definition.path,
          source: await fs.read(inside(options.root, definition.path)),
        });
        if (result.status === "invalid")
          effectiveValidationResults.push(result);
      }
  }
  const findings: DoctorFinding[] = effectiveValidationResults.flatMap(
    (result) =>
      [...result.structuralErrors, ...result.semanticErrors].map((error) => ({
        code: error.code,
        severity: "error" as const,
        category: "schema" as const,
        path: result.documentPath,
        message: error.message,
        remediation: [
          `Repair ${result.artifactType} structure or semantics before applying changes.`,
        ],
        readOnly: true as const,
        adapter: null,
        profile: options.profile,
      })),
  );
  const selectedAdapters = [...new Set(options.adapters)].sort();
  const adapterForPath = (path: string): AdapterName | null => {
    if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
    if (path.startsWith(".agents/")) {
      const owners = selectedAdapters.filter(
        (adapter) => adapter === "codex" || adapter === "cursor",
      );
      return owners.length === 1 ? owners[0]! : null;
    }
    if (path.startsWith(".cursor/")) return "cursor";
    if (copilotInstructionPath(path)) return "copilot";
    if (path === "AGENTS.md")
      return (
        selectedAdapters.find((adapter) => adapter !== "claude") ??
        selectedAdapters[0] ??
        null
      );
    return null;
  };
  if (!options.validator) {
    for (const definition of [
      { path: configPath, format: "yaml" as const },
      { path: lockPath, format: "json" as const },
      { path: sourceMapPath, format: "json" as const },
    ]) {
      if (!(await fs.exists(inside(options.root, definition.path)))) continue;
      if (
        effectiveValidationResults.some(
          (result) => result.documentPath === definition.path,
        )
      )
        continue;
      try {
        const source = await fs.read(inside(options.root, definition.path));
        if (definition.format === "json") JSON.parse(source);
        else parse(source);
      } catch {
        findings.push({
          code:
            definition.format === "json" ? "json-malformed" : "yaml-malformed",
          severity: "error",
          category: "schema",
          path: definition.path,
          message: `${definition.format.toUpperCase()} document is malformed`,
          remediation: [
            "Repair the malformed metadata before applying changes.",
          ],
          readOnly: true,
          adapter: null,
          profile: options.profile,
        });
      }
    }
  }
  findings.push(
    ...metadataPresence
      .filter((item) => !item.present)
      .map((item) => ({
        code:
          item.path === configPath
            ? "aif-config-missing"
            : item.path === lockPath
              ? "manifest-lock-missing"
              : "source-map-missing",
        severity: "error" as const,
        category:
          item.path === configPath
            ? ("config" as const)
            : ("ownership" as const),
        path: item.path,
        message: `required Intentloom metadata is missing: ${item.path}`,
        remediation: [
          "Run adoption dry-run and review the proposed metadata creation.",
        ],
        readOnly: true as const,
        adapter: null,
        profile: options.profile,
      })),
  );
  const proposal = await plan({ ...options, dryRun: true }, fs, true);
  const changes = proposal.changes.map(({ content: _content, ...change }) =>
    change.kind === "update"
      ? {
          ...change,
          kind: "stale" as const,
          reason: "generated state is stale",
        }
      : change,
  );
  const blockingChanges = changes.filter((change) =>
    ["conflict", "modified", "missing", "stale", "security-error"].includes(
      change.kind,
    ),
  );
  for (const change of blockingChanges) {
    if (
      !metadataPresence.every((item) => item.present) &&
      change.kind !== "security-error"
    )
      continue;
    if (
      [configPath, lockPath, sourceMapPath].includes(change.path) &&
      change.kind !== "security-error"
    )
      continue;
    const definition =
      change.kind === "modified"
        ? {
            code: "generated-checksum-drift",
            category: "drift" as const,
            remediation:
              "Restore the generated file or explicitly regenerate it after review.",
          }
        : change.kind === "missing"
          ? {
              code: "generated-file-missing",
              category: "generated-file" as const,
              remediation:
                "Review a sync dry-run and restore the missing generated output.",
            }
          : change.kind === "stale"
            ? {
                code: "adapter-output-stale",
                category: "drift" as const,
                remediation: "Review and apply a transactional sync.",
              }
            : change.kind === "security-error"
              ? {
                  code: "path-security-violation",
                  category: "security" as const,
                  remediation:
                    "Remove the unsafe path or symlink before retrying.",
                }
              : {
                  code: "unowned-generated-destination",
                  category: "ownership" as const,
                  remediation:
                    "Keep the file project-owned or resolve the destination manually.",
                };
    findings.push({
      code: definition.code,
      severity: "error",
      category: definition.category,
      path: change.path,
      message: change.reason,
      remediation: [definition.remediation],
      readOnly: true,
      adapter: adapterForPath(change.path),
      profile: options.profile,
    });
  }
  const scannedPaths = projectRelativePaths(
    options.root,
    await fs.list(options.root),
  );
  const scannedSet = new Set(scannedPaths);
  const desiredPaths = new Set(
    (await desired(options))
      .map((file) => file.path)
      .filter((path) => path !== lockPath && path !== sourceMapPath),
  );
  const addFinding = (finding: Omit<DoctorFinding, "readOnly">) =>
    findings.push({ ...finding, readOnly: true });
  const readJson = async (
    path: string,
  ): Promise<Record<string, unknown> | null> => {
    try {
      const value = JSON.parse(await fs.read(inside(options.root, path)));
      return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
  const manifest = await readJson(lockPath);
  const sourceMap = await readJson(sourceMapPath);
  const addStoredPathFinding = (
    metadataPath: typeof lockPath | typeof sourceMapPath,
    records: readonly Record<string, unknown>[],
  ) => {
    if (
      records.some((record) => {
        if (typeof record.path !== "string") return false;
        try {
          return normalizeStoredPath(record.path) !== record.path;
        } catch {
          return true;
        }
      })
    )
      addFinding({
        code: "stored-path-incompatible",
        severity: "error",
        category: "security",
        path: metadataPath,
        message: "metadata contains a non-portable stored path",
        remediation: [
          "Review and migrate stored paths to normalized project-relative form.",
        ],
        adapter: null,
        profile: options.profile,
      });
  };
  if (manifest) {
    if (manifest.frameworkVersion !== INTENTLOOM_VERSION)
      addFinding({
        code: "framework-version-stale",
        severity: "error",
        category: "migration",
        path: lockPath,
        message: "manifest framework version does not match this CLI",
        remediation: [
          "Review the migration guide before regenerating metadata.",
        ],
        adapter: null,
        profile: options.profile,
      });
    if (manifest.adapterOutputVersion !== adapterOutputVersion)
      addFinding({
        code: "adapter-version-stale",
        severity: "error",
        category: "adapter",
        path: lockPath,
        message: "manifest adapter output version is stale",
        remediation: [
          "Review a sync dry-run with the current adapter version.",
        ],
        adapter: null,
        profile: options.profile,
      });
    if (manifest.schemaVersion !== metadataFormatVersion)
      addFinding({
        code: "schema-version-stale",
        severity: "error",
        category: "schema",
        path: lockPath,
        message: "manifest schema version is not supported by this CLI",
        remediation: ["Use an explicit supported schema migration."],
        adapter: null,
        profile: options.profile,
      });
    const generatedRecords = Array.isArray(manifest.generated)
      ? (manifest.generated as Record<string, unknown>[])
      : [];
    addStoredPathFinding(lockPath, generatedRecords);
    for (const record of generatedRecords)
      if (typeof record.path === "string" && !desiredPaths.has(record.path))
        addFinding({
          code: "manifest-entry-orphaned",
          severity: "error",
          category: "ownership",
          path: record.path,
          message: "manifest entry has no current generated destination",
          remediation: [
            "Review and remove the orphan through an explicit migration.",
          ],
          adapter: null,
          profile: options.profile,
        });
    const pinnedAdapters = Array.isArray(manifest.adapters)
      ? (manifest.adapters as Record<string, unknown>[])
          .map((entry) => entry.id)
          .filter((id): id is string => typeof id === "string")
          .sort()
      : [];
    if (
      pinnedAdapters.length > 0 &&
      pinnedAdapters.join(",") !== [...options.adapters].sort().join(",")
    )
      addFinding({
        code: "adapter-selection-conflict",
        severity: "error",
        category: "adapter",
        path: lockPath,
        message:
          "manifest adapter selection differs from project configuration",
        remediation: [
          "Choose adapters explicitly and review adoption before syncing.",
        ],
        adapter: null,
        profile: options.profile,
      });
  }
  const sourceRecords =
    sourceMap && Array.isArray(sourceMap.files)
      ? (sourceMap.files as Record<string, unknown>[])
      : [];
  addStoredPathFinding(sourceMapPath, sourceRecords);
  const ownedPaths = new Set(
    sourceRecords
      .map((record) => record.path)
      .filter((path): path is string => typeof path === "string"),
  );
  for (const record of sourceRecords) {
    if (typeof record.path !== "string") continue;
    if (!desiredPaths.has(record.path))
      addFinding({
        code: "source-map-record-orphaned",
        severity: "error",
        category: "ownership",
        path: record.path,
        message:
          "source-map ownership record has no current generated destination",
        remediation: [
          "Review and remove the orphan through an explicit migration.",
        ],
        adapter: null,
        profile: options.profile,
      });
    if (
      scannedSet.has(record.path) &&
      /\.(?:md|mdc)$/iu.test(record.path) &&
      !(await fs.read(inside(options.root, record.path))).includes(
        "Generated by Intentloom",
      )
    )
      addFinding({
        code: "generated-header-missing",
        severity: "error",
        category: "generated-file",
        path: record.path,
        message:
          "owned generated text file lacks its supported Intentloom header",
        remediation: ["Restore or transactionally regenerate the owned file."],
        adapter: null,
        profile: options.profile,
      });
  }
  for (const path of desiredPaths)
    if (
      scannedSet.has(path) &&
      !ownedPaths.has(path) &&
      /\.(?:md|mdc)$/iu.test(path) &&
      (await fs.read(inside(options.root, path))).includes(
        "Generated by Intentloom",
      )
    )
      addFinding({
        code:
          path === "AGENTS.md" && selectedAdapters.length > 1
            ? "shared-file-conflict"
            : "generated-header-without-ownership",
        severity: "error",
        category: "ownership",
        path,
        message: "Intentloom-like header is not ownership proof",
        remediation: [
          "Keep the file project-owned or resolve adoption manually.",
        ],
        adapter: null,
        profile: options.profile,
      });
  for (const path of desiredPaths) {
    if (
      !scannedSet.has(path) ||
      !(
        /^\.cursor\/rules\/.*\.mdc$/u.test(path) ||
        /^\.github\/instructions\/.*\.instructions\.md$/u.test(path)
      )
    )
      continue;
    const source = await fs.read(inside(options.root, path));
    const key = path.startsWith(".cursor/") ? "globs" : "applyTo";
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? "";
    const value = frontmatter
      .match(new RegExp(`^${key}:\\s*(.+)$`, "mu"))?.[1]
      ?.trim()
      .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
    const globalCursorRule =
      path.startsWith(".cursor/") &&
      /^alwaysApply:\s*true$/mu.test(frontmatter);
    const valid =
      globalCursorRule ||
      (typeof value === "string" && value.split(",").every(portableGlob));
    if (!valid)
      addFinding({
        code: "path-scoped-rule-invalid",
        severity: "error",
        category: "adapter",
        path,
        message: "path-scoped adapter output has invalid frontmatter",
        remediation: ["Restore or transactionally regenerate the scoped rule."],
        adapter: adapterForPath(path),
        profile: options.profile,
      });
  }
  const supportedProfiles = new Set([
    "generic",
    "typescript",
    "angular",
    "rust",
    "tauri",
    "angular-tauri",
  ]);
  if (!supportedProfiles.has(options.profile))
    addFinding({
      code: "adapter-profile-unsupported",
      severity: "error",
      category: "profile",
      path: configPath,
      message: "selected profile is not supported by the adapter matrix",
      remediation: ["Choose a documented profile before syncing adapters."],
      adapter: null,
      profile: options.profile,
    });
  const profileDetection = await detectProjectProfiles(options.root, fs);
  if (
    !profileDetection.manualConfirmationRequired &&
    profileDetection.selectedProfile !== "generic" &&
    profileDetection.selectedProfile !== options.profile
  )
    addFinding({
      code: "profile-mismatch",
      severity: "warning",
      category: "profile",
      path: configPath,
      message: `configured profile does not match detected ${profileDetection.selectedProfile} evidence`,
      remediation: [
        "Review profile evidence and confirm the intended profile manually.",
      ],
      adapter: null,
      profile: options.profile,
    });
  for (const adapter of metadataPresence[0]?.present ? selectedAdapters : []) {
    const contract = getAdapterContract(adapter);
    for (const capability of contract.experimentalCapabilities)
      addFinding({
        code: "adapter-capability-experimental",
        severity: "warning",
        category: "adapter",
        path: configPath,
        message: `${adapter} capability ${capability} is experimental`,
        remediation: [
          "Review the compatibility matrix before relying on this capability.",
        ],
        adapter,
        profile: options.profile,
      });
    for (const capability of contract.unsupportedCapabilities)
      addFinding({
        code: "adapter-capability-unsupported",
        severity: "info",
        category: "adapter",
        path: configPath,
        message: `${adapter} capability ${capability} is not generated`,
        remediation: ["Keep unsupported provider configuration project-owned."],
        adapter,
        profile: options.profile,
      });
  }
  const instructionRoots = new Set(
    scannedPaths
      .filter((path) => !ownedPaths.has(path) || !desiredPaths.has(path))
      .flatMap((path) => {
        const key = instructionRootKey(path);
        return key ? [key] : [];
      }),
  );
  if (instructionRoots.size > 1)
    addFinding({
      code: "instruction-files-conflicting",
      severity: "warning",
      category: "migration",
      path: ".",
      message:
        "multiple project-owned tool instruction roots require explicit mapping",
      remediation: [
        "Review each instruction root and keep ownership explicit.",
      ],
      adapter: null,
      profile: options.profile,
    });
  if (
    !scannedPaths.some((path) =>
      /(?:^|\/)(?:readme|roadmap|product[-_ ]?(?:state|roadmap))\.md$/iu.test(
        path,
      ),
    )
  )
    findings.push({
      code: "product-documentation-missing",
      severity: "warning",
      category: "documentation",
      path: "docs/",
      message: "recommended product documentation was not detected",
      remediation: ["Map an existing product document or add one when useful."],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    });
  findings.push(...(await collectExtensionHealthDoctorFindings(options, fs)));
  if (!findings.some((finding) => finding.severity === "error"))
    findings.push({
      code: "installation-healthy",
      severity: "info",
      category: "config",
      path: ".aif/",
      message: "Intentloom required state is healthy",
      remediation: [],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    });
  findings.sort((left, right) =>
    `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`),
  );
  const errors: DoctorError[] = findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => ({
      ...finding,
      phase: "semantic",
      artifactType: "generated-state",
      schemaId: "urn:aif:semantic:generated-state:1",
      schemaVersion: "1",
      documentPath: finding.path,
      affectedPath: finding.path,
      fieldPath: "/",
    }));
  return {
    ...proposal,
    changes,
    diagnostics: errors.map((finding) => `${finding.path}: ${finding.message}`),
    findings,
    errors,
  };
}
function unsupportedPath(path: string): boolean {
  return /^\.github\/agents\/.+\.agent\.md$/u.test(path);
}

function normalizeMappingPath(path: string): string | null {
  try {
    const normalized = normalizeOutputPath(path);
    return normalized === path ? normalized : null;
  } catch {
    return null;
  }
}

export async function adoptProject(
  options: InitOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions = {},
): Promise<AdoptionProposal> {
  const profileDetection = await detectProjectProfiles(options.root, fs);
  const scannedPaths = profileDetection.scannedPaths;
  const scanned = new Set(scannedPaths);
  const desiredFiles = await desired(options);
  const desiredByPath = new Map(desiredFiles.map((file) => [file.path, file]));
  const ownershipState = await ownership(options.root, fs);
  const invalidOwnershipMetadata = ownershipState === null;
  const owned = ownershipState ?? new Map();
  const completeMetadata = await Promise.all(
    [configPath, lockPath, sourceMapPath].map((path) =>
      fs.exists(inside(options.root, path)),
    ),
  ).then((present) => present.every(Boolean) && owned.size > 0);
  const proposal = await plan({ ...options, dryRun: true }, fs);
  const changes = proposal.changes.map(
    ({ content: _content, ...change }) => change,
  );
  const changeByPath = new Map(changes.map((change) => [change.path, change]));
  const mappingDiagnostics: string[] = [];
  for (const mapping of options.projectOwnedMappings ?? []) {
    const source = normalizeMappingPath(mapping.source);
    const destination = normalizeMappingPath(mapping.destination);
    if (
      source === null ||
      destination === null ||
      source !== destination ||
      !scanned.has(destination)
    )
      mappingDiagnostics.push(
        `project-owned mapping invalid: ${mapping.source}`,
      );
  }
  const documentationMappingsByConcept = new Map<string, string>();
  for (const mapping of options.documentationMappings ?? []) {
    const source = normalizeMappingPath(mapping.source);
    const destination = normalizeMappingPath(mapping.destination);
    const concept = source === null ? null : documentConcept(source);
    if (
      source === null ||
      destination === null ||
      source !== destination ||
      concept === null ||
      !scanned.has(source) ||
      documentationMappingsByConcept.has(concept)
    ) {
      mappingDiagnostics.push(
        `documentation mapping invalid: ${mapping.source}`,
      );
      continue;
    }
    documentationMappingsByConcept.set(concept, source);
  }
  const conceptCounts = new Map<string, number>();
  for (const path of scannedPaths) {
    const concept = documentConcept(path);
    if (concept)
      conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
  }
  const items: AdoptionProposalItem[] = [];
  for (const file of desiredFiles) {
    const exists =
      scanned.has(file.path) ||
      (await fs.exists(inside(options.root, file.path)));
    const record = owned.get(file.path);
    const change = changeByPath.get(file.path);
    const metadata = file.path.startsWith(".aif/");
    const metadataConflict =
      file.path === sourceMapPath && invalidOwnershipMetadata;
    const aifOwned = record !== undefined;
    const recognizedMetadata = metadata && exists && completeMetadata;
    const projectOwned =
      exists && !aifOwned && !recognizedMetadata && !metadataConflict;
    items.push({
      path: file.path,
      action: metadataConflict
        ? "conflict"
        : projectOwned
          ? "map-existing-project-owned"
          : !exists
            ? metadata
              ? "create"
              : "generated-candidate"
            : change?.kind === "conflict" || change?.kind === "security-error"
              ? "conflict"
              : change
                ? "generated-candidate"
                : "skip",
      currentClassification: recognizedMetadata
        ? "aif-metadata"
        : aifOwned
          ? "aif-owned"
          : exists
            ? "project-owned"
            : "absent",
      proposedClassification: recognizedMetadata
        ? "aif-metadata"
        : projectOwned
          ? "project-owned"
          : "aif-generated",
      reason: metadataConflict
        ? "existing Intentloom ownership metadata is malformed or unsupported"
        : projectOwned
          ? "existing destination has no Intentloom ownership record"
          : !exists
            ? "safe generated destination is absent"
            : (change?.reason ??
              "existing Intentloom-owned output already matches"),
      canonicalSource: file.sources[0] ?? null,
      adapter: adapterForKnownInstructionPath(file.path),
      profile: options.profile,
      conflictDetails: metadataConflict
        ? ["ownership cannot be established from .aif/source-map.json"]
        : projectOwned && change
          ? [change.reason]
          : [],
      writeEligible:
        !metadataConflict &&
        !projectOwned &&
        change?.kind !== "conflict" &&
        change?.kind !== "security-error" &&
        (!exists || aifOwned || recognizedMetadata),
      manualDecisionRequired: projectOwned || metadataConflict,
      safeNextAction: metadataConflict
        ? "Repair or explicitly replace the ownership metadata before applying changes."
        : projectOwned
          ? "Keep the file project-owned or explicitly resolve the generated destination conflict."
          : !exists
            ? "Apply the reviewed proposal to create this file transactionally."
            : "No action is required unless regeneration is requested.",
    });
  }
  for (const path of scannedPaths) {
    if (desiredByPath.has(path)) continue;
    const concept = documentConcept(path);
    const duplicate = concept !== null && (conceptCounts.get(concept) ?? 0) > 1;
    const mappedDocument =
      concept === null
        ? undefined
        : documentationMappingsByConcept.get(concept);
    const selectedDocument = mappedDocument === path;
    items.push({
      path,
      action: unsupportedPath(path)
        ? "unsupported"
        : duplicate && mappedDocument === undefined
          ? "manual-decision-required"
          : selectedDocument
            ? "map-existing-aif-compatible-document"
            : mappedDocument !== undefined
              ? "skip"
              : concept === "public-readme"
                ? "map-existing-project-owned"
                : instructionPath(path)
                  ? "map-existing-project-owned"
                  : concept
                    ? "map-existing-aif-compatible-document"
                    : "skip",
      currentClassification: "project-owned",
      proposedClassification: unsupportedPath(path)
        ? "unsupported"
        : concept
          ? "project-owned-documentation"
          : "project-owned",
      reason: unsupportedPath(path)
        ? "custom Copilot agents are not generated by the current adapter"
        : duplicate && mappedDocument === undefined
          ? `multiple project documents represent the ${concept} concept`
          : selectedDocument
            ? `explicit documentation mapping selects this ${concept} document`
            : mappedDocument !== undefined
              ? `explicit documentation mapping retains ${mappedDocument} for the ${concept} concept`
              : concept
                ? `existing project document maps to the ${concept} concept`
                : instructionPath(path)
                  ? "existing tool instruction remains project-owned"
                  : "project file is not an adoption artifact",
      canonicalSource: null,
      adapter: adapterForKnownInstructionPath(path),
      profile: null,
      conflictDetails: duplicate
        ? mappedDocument === undefined
          ? [`ambiguous ${concept} document mapping`]
          : []
        : [],
      writeEligible: false,
      manualDecisionRequired: duplicate && mappedDocument === undefined,
      safeNextAction: unsupportedPath(path)
        ? "Keep the unsupported file project-owned and review adapter capabilities."
        : duplicate && mappedDocument === undefined
          ? "Choose the authoritative project document manually."
          : selectedDocument
            ? "Keep the explicitly mapped project document project-owned."
            : concept || instructionPath(path)
              ? "Keep the existing file project-owned and record the mapping only."
              : "Leave the unrelated project file unchanged.",
    });
  }
  items.sort((left, right) =>
    `${left.path}:${left.action}`.localeCompare(
      `${right.path}:${right.action}`,
    ),
  );
  const validationDiagnostics = (options.existingValidationResults ?? [])
    .flatMap((result) => [
      ...result.structuralErrors.map(
        (error) => `${result.documentPath}: ${error.code}`,
      ),
      ...result.semanticErrors.map(
        (error) => `${result.documentPath}: ${error.code}`,
      ),
    ])
    .sort();
  const profileConfirmationRequired =
    profileDetection.manualConfirmationRequired && !options.profileConfirmed;
  const blocked =
    profileConfirmationRequired ||
    mappingDiagnostics.length > 0 ||
    validationDiagnostics.length > 0 ||
    items.some(
      (item) =>
        item.manualDecisionRequired ||
        (item.action === "conflict" && options.profileConfirmed !== true),
    );
  let applied = false;
  let transactionOutcome: AdoptionTransactionOutcome | null = null;
  let applicationStatus: AdoptionProposal["applicationStatus"] = options.dryRun
    ? "not-requested"
    : blocked
      ? "blocked"
      : "applied";
  if (!options.dryRun && !blocked) {
    const result = await syncProject(
      { ...options, dryRun: false },
      fs,
      transactionOptions,
    );
    if (!("dryRun" in result)) {
      const safeDiagnostics = [
        ...new Set(
          result.diagnostics.map((diagnostic) =>
            /^[a-z0-9][a-z0-9:-]*$/u.test(diagnostic)
              ? diagnostic
              : "transaction-failed",
          ),
        ),
      ].sort();
      const errorCode =
        result.status === "success"
          ? null
          : result.postWriteValidation?.status === "invalid"
            ? result.postWriteValidation.code
            : (safeDiagnostics.find(
                (diagnostic) =>
                  diagnostic !== "transaction-rollback-incomplete",
              ) ?? "transaction-failed");
      transactionOutcome = {
        status: result.status,
        failedStage: result.failedStage ?? null,
        errorCode,
        rollbackAttempted: result.rollbackAttempted,
        rollbackCompleted: result.rollbackCompleted,
        rollbackFailures: result.rollbackFailures
          .flatMap((path) => {
            try {
              return [normalizeOutputPath(path)];
            } catch {
              return [];
            }
          })
          .sort(),
        diagnostics: safeDiagnostics,
      };
      if (result.status === "success") applied = true;
      else
        applicationStatus = result.rollbackCompleted
          ? "failed-restored"
          : "failed-incomplete";
    }
  }
  return {
    kind: "adoption-proposal",
    changes,
    diagnostics: [
      ...(profileConfirmationRequired
        ? ["profile: explicit confirmation required"]
        : []),
      ...mappingDiagnostics,
      ...validationDiagnostics,
      ...items
        .filter((item) => item.manualDecisionRequired)
        .map((item) => `${item.path}: manual decision required`),
    ].sort(),
    items,
    profileDetection,
    applied,
    applicationStatus,
    transactionOutcome,
  };
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

export interface PlanProjectAdoptionOptions {
  readonly root: string;
  readonly projectId?: string;
  readonly packId?: string;
  readonly packVersion?: string;
  readonly validations?: readonly ValidationRequirement[];
  readonly exceptions?: readonly AcceptedException[];
}

export async function planProjectAdoption(
  options: PlanProjectAdoptionOptions,
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionPlan> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "adoption planning requires a non-symbolic explicit project root",
    );
  }
  const rawPaths = await fs.list(root);
  const scannedPaths = projectRelativePaths(root, rawPaths);
  const artifacts: DetectedProjectArtifact[] = [];

  for (const path of scannedPaths) {
    if (secretLikePath(path)) continue;
    let content: string;
    try {
      content = await fs.read(inside(root, path));
    } catch {
      continue;
    }
    const contentHash = checksum(content);

    let ownershipClass: OwnershipClass = "project-owned";
    if (path.startsWith(".aif/") || path.startsWith("catalog/")) {
      ownershipClass = "intentloom-managed";
    } else if (
      path.startsWith(".claude/") ||
      path === "CLAUDE.md" ||
      path.startsWith(".cursor/") ||
      path === ".cursorrules" ||
      path.includes("copilot-instructions.md")
    ) {
      ownershipClass = "provider-derivative";
    }

    const roleCandidates: RoleCandidate[] = [];

    if (
      path === "docs/product/CURRENT_STATE.md" ||
      path === "CURRENT_STATE.md"
    ) {
      roleCandidates.push({
        role: "operational-project-state",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "PROJECT_STATE.md") {
      roleCandidates.push({
        role: "operational-project-state",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "AGENT_START_HERE.md") {
      roleCandidates.push({
        role: "agent-entrypoint",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "DUTY_WATCH.md") {
      roleCandidates.push({
        role: "duty-watch-log",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "AGENTS.md") {
      roleCandidates.push({
        role: "working-agreement",
        confidence: 0.9,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "ROADMAP.md") {
      roleCandidates.push({
        role: "roadmap",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "CHANGELOG.md") {
      roleCandidates.push({
        role: "changelog",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path === "SECURITY.md") {
      roleCandidates.push({
        role: "security-policy",
        confidence: 1.0,
        evidence: [`filename match: ${path}`],
      });
    }
    if (
      path === "docs/governance/ENGINEERING_PRINCIPLES.md" ||
      path.endsWith("ENGINEERING_PRINCIPLES.md")
    ) {
      roleCandidates.push({
        role: "validation-policy",
        confidence: 0.9,
        evidence: [`filename match: ${path}`],
      });
    }
    if (path.startsWith(".claude") || path === "CLAUDE.md") {
      roleCandidates.push({
        role: "provider-instructions:claude",
        confidence: 1.0,
        evidence: ["provider file: claude"],
      });
    }
    if (path.startsWith(".cursor") || path === ".cursorrules") {
      roleCandidates.push({
        role: "provider-instructions:cursor",
        confidence: 1.0,
        evidence: ["provider file: cursor"],
      });
    }
    if (path.includes("copilot-instructions.md")) {
      roleCandidates.push({
        role: "provider-instructions:copilot",
        confidence: 1.0,
        evidence: ["provider file: copilot"],
      });
    }
    if (path.startsWith("docs/decisions/")) {
      roleCandidates.push({
        role: "durable-project-context",
        confidence: 0.8,
        evidence: ["directory pattern: decisions"],
      });
    }
    if (path.startsWith("docs/specs/")) {
      roleCandidates.push({
        role: "durable-project-context",
        confidence: 0.8,
        evidence: ["directory pattern: specs"],
      });
    }

    artifacts.push({
      path,
      contentHash,
      ownership: ownershipClass,
      roleCandidates,
    });
  }

  return planGovernanceAdoption({
    projectId: options.projectId ?? "project",
    packId: options.packId ?? "duty-watch",
    packVersion: options.packVersion ?? "1.0.0",
    artifacts,
    ...(options.validations !== undefined
      ? { validations: options.validations }
      : {}),
    ...(options.exceptions !== undefined
      ? { exceptions: options.exceptions }
      : {}),
  });
}

export interface ApplyProjectAdoptionOptions {
  readonly root: string;
  readonly plan: AdoptionPlan;
  readonly dryRun?: boolean;
}

export interface AdoptionApplyResult {
  readonly status:
    "success" | "no-op" | "stale-hash" | "failed" | "rolled-back";
  readonly appliedOperations: readonly string[];
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly journalEntryId?: string;
  readonly error?: string;
}

export async function applyProjectAdoption(
  options: ApplyProjectAdoptionOptions,
  fs: FileSystem = nodeFileSystem,
): Promise<AdoptionApplyResult> {
  const root = resolve(options.root);
  if (await fs.isSymbolicLink(root)) {
    throw new Error(
      "adoption apply requires a non-symbolic explicit project root",
    );
  }
  const { plan: adoptionPlan, dryRun = false } = options;
  if (adoptionPlan.schemaVersion !== 1) {
    throw new Error("unsupported adoption plan schema version");
  }

  for (const op of adoptionPlan.operations) {
    if (op.path !== undefined && op.expectedCurrentHash !== undefined) {
      const fullPath = inside(root, op.path);
      if (await fs.exists(fullPath)) {
        let content: string;
        try {
          content = await fs.read(fullPath);
        } catch {
          return {
            status: "stale-hash",
            error: `Unable to read target file for hash verification: ${op.path}`,
            appliedOperations: [],
            createdFiles: [],
            updatedFiles: [],
          };
        }
        if (checksum(content) !== op.expectedCurrentHash) {
          return {
            status: "stale-hash",
            error: `Stale content hash for ${op.path}`,
            appliedOperations: [],
            createdFiles: [],
            updatedFiles: [],
          };
        }
      }
    }
  }

  if (dryRun) {
    return {
      status: "no-op",
      appliedOperations: adoptionPlan.operations.map((op) => op.id),
      createdFiles: [],
      updatedFiles: [],
    };
  }

  const backups = new Map<string, string | null>();
  const appliedOperations: string[] = [];
  const createdFiles: string[] = [];
  const updatedFiles: string[] = [];

  try {
    for (const op of adoptionPlan.operations) {
      if (op.kind === "create" && op.path !== undefined) {
        const fullPath = inside(root, op.path);
        const exists = await fs.exists(fullPath);
        if (!backups.has(op.path)) {
          backups.set(op.path, exists ? await fs.read(fullPath) : null);
        }
        const body =
          op.role === "agent-entrypoint"
            ? "# Agent Entrypoint\n\nStart here for repository instructions and workflows.\n"
            : `# Intentloom Governance ${op.role ?? op.path}\n`;
        await fs.mkdir(dirname(fullPath));
        await fs.write(fullPath, body);
        if (!exists) {
          createdFiles.push(op.path);
        } else {
          updatedFiles.push(op.path);
        }
        appliedOperations.push(op.id);
      } else {
        appliedOperations.push(op.id);
      }
    }

    const journalPath = inside(root, ".aif/migration-journal.json");
    let journalEntries: MigrationJournalEntry[] = [];
    if (await fs.exists(journalPath)) {
      try {
        journalEntries = JSON.parse(
          await fs.read(journalPath),
        ) as MigrationJournalEntry[];
      } catch {
        journalEntries = [];
      }
    }
    const entryId = deterministicId("journal", {
      planId: adoptionPlan.planId,
      timestamp: appliedOperations.join(","),
    });
    const entry: MigrationJournalEntry = {
      id: entryId,
      planId: adoptionPlan.planId,
      status: "applied",
      operationIds: appliedOperations,
      timestamp: new Date().toISOString(),
    };
    journalEntries.push(entry);
    await fs.mkdir(dirname(journalPath));
    await fs.write(journalPath, JSON.stringify(journalEntries, null, 2));

    return {
      status: "success",
      appliedOperations,
      createdFiles,
      updatedFiles,
      journalEntryId: entry.id,
    };
  } catch (err) {
    for (const [relativePath, originalContent] of backups) {
      const fullPath = inside(root, relativePath);
      try {
        if (originalContent === null) {
          await fs.remove(fullPath);
        } else {
          await fs.write(fullPath, originalContent);
        }
      } catch {
        /* rollback best-effort */
      }
    }
    return {
      status: "rolled-back",
      error: err instanceof Error ? err.message : String(err),
      appliedOperations: [],
      createdFiles: [],
      updatedFiles: [],
    };
  }
}

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
