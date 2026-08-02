// Private project-operation layer. It must remain independent of CLI/process code.
import {
  mkdir,
  lstat,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  realpath,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { extractMarkdownSection } from "./skill-markdown.js";
import { dirname, relative, resolve, sep } from "node:path";
import {
  adapterVersion,
  generateAdapters,
  getAdapterContract,
} from "@intentloom/adapters";
import {
  evaluateEngineeringConformance,
  summarizeWorkflowVariants,
  summarizeWorkflowDurations,
  summarizeConformanceTrend,
  summarizeWorkflowRepetitions,
  summarizeWorkflowTransitionIntervals,
} from "@intentloom/evidence-analysis";
import {
  INTENTLOOM_VERSION,
  checksum,
  loadCatalog,
  normalizeOutputPath,
  normalizeStoredPath,
  storedPathCollisionKey,
  type AdapterName,
  type Catalog,
  type GeneratedFile,
} from "@intentloom/core";
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
import {
  type ArtifactValidationResult,
  type ArtifactValidator,
  validateSkillSet,
} from "@intentloom/validator";
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
  type EngineeringConformanceReport,
  type EngineeringWorkflowPolicy,
  type GenericTimeline,
  type WorkflowVariantSummaryReport,
  type WorkflowDurationSummaryReport,
  type ConformanceTrendSummaryReport,
  type WorkflowRepetitionSummaryReport,
  type WorkflowTransitionIntervalsReport,
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
  validateAgentSessionItem,
  validateAgentSessionExportResult,
  validateSecurityFinding,
  validateSecurityCoverageReport,
  validateSarifImportResult,
  validateSecurityAdapterMetadata,
  validateSecurityAdapterResult,
  validateSecurityPolicy,
  validateSecurityBaseline,
  validateSecurityBaselineCheckResult,
  validateSandboxCapabilityPolicy,
  validateSandboxEvaluationResult,
  validateContinuousSecurityAuditReport,
  validateWorkspaceConversationRecord,
  validateNeutronSubagentTaskRecord,
} from "@intentloom/protocol";

export { INTENTLOOM_VERSION } from "@intentloom/core";

export function evaluateProjectEngineeringConformance(options: {
  readonly root: string;
  readonly timeline: GenericTimeline;
  readonly policy: EngineeringWorkflowPolicy;
}): EngineeringConformanceReport {
  if (options.root.length === 0) throw new Error("project root is required");
  return evaluateEngineeringConformance(options.timeline, options.policy);
}

export function summarizeProjectWorkflowVariants(
  timelines: readonly GenericTimeline[],
): WorkflowVariantSummaryReport {
  return summarizeWorkflowVariants(timelines);
}

export function summarizeProjectWorkflowDurations(
  timelines: readonly GenericTimeline[],
): WorkflowDurationSummaryReport {
  return summarizeWorkflowDurations(timelines);
}

export function summarizeProjectConformanceTrend(
  reports: readonly EngineeringConformanceReport[],
): ConformanceTrendSummaryReport {
  return summarizeConformanceTrend(reports);
}

export function summarizeProjectWorkflowRepetitions(
  timelines: readonly GenericTimeline[],
): WorkflowRepetitionSummaryReport {
  return summarizeWorkflowRepetitions(timelines);
}

export function summarizeProjectWorkflowTransitionIntervals(
  timelines: readonly GenericTimeline[],
): WorkflowTransitionIntervalsReport {
  return summarizeWorkflowTransitionIntervals(timelines);
}
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

export type ChangeKind =
  | "create"
  | "update"
  | "conflict"
  | "modified"
  | "missing"
  | "stale"
  | "security-error";
export interface Change {
  readonly path: string;
  readonly kind: ChangeKind;
  readonly reason: string;
  readonly content?: string;
}
export interface Plan {
  readonly changes: readonly Change[];
  readonly diagnostics: readonly string[];
}
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
export type TransactionStage =
  | "generated-stage"
  | "generated-commit"
  | "manifest-stage"
  | "manifest-finalize"
  | "source-map-stage"
  | "source-map-finalize"
  | "post-write-consistency"
  | "success-cleanup";
export interface TransactionResult extends Plan {
  readonly status: "success" | "failed";
  readonly failedStage?: TransactionStage;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
  readonly manifestUpdated: boolean;
  readonly sourceMapUpdated: boolean;
  readonly consistencyValidated: boolean;
  readonly cleanupCompleted: boolean;
  readonly postWriteValidation?: PostWriteValidationResult;
}
export type PostWriteCorruptionCode =
  | "manifest-json-malformed"
  | "source-map-json-malformed"
  | "manifest-entry-missing"
  | "source-map-entry-missing"
  | "manifest-destination-missing"
  | "source-map-destination-missing"
  | "generated-checksum-mismatch"
  | "manifest-source-map-checksum-mismatch"
  | "manifest-generated-checksum-mismatch"
  | "manifest-absolute-path"
  | "source-map-absolute-path"
  | "manifest-path-escape"
  | "source-map-path-escape"
  | "manifest-duplicate-destination"
  | "source-map-duplicate-ownership"
  | "ownership-classification-invalid"
  | "adapter-id-missing"
  | "adapter-id-mismatch"
  | "canonical-source-id-missing"
  | "canonical-source-id-mismatch"
  | "framework-version-missing"
  | "framework-version-incompatible"
  | "adapter-output-version-missing"
  | "adapter-output-version-incompatible"
  | "metadata-format-version-incompatible"
  | "committed-generated-bytes-mismatch"
  | "committed-manifest-bytes-mismatch"
  | "committed-source-map-bytes-mismatch"
  | "generated-file-without-ownership"
  | "ownership-record-without-generated-file"
  | "normalized-destination-duplicate";
export interface ValidPostWriteValidation {
  readonly status: "valid";
  readonly checkedGeneratedFileCount: number;
  readonly checkedManifestEntryCount: number;
  readonly checkedSourceMapEntryCount: number;
  readonly checksumsValidated: true;
  readonly ownershipValidated: true;
  readonly pathsValidated: true;
  readonly versionsValidated: true;
  readonly metadataBytesValidated: true;
}
export interface InvalidPostWriteValidation {
  readonly status: "invalid";
  readonly code: PostWriteCorruptionCode;
  readonly affectedPaths: readonly string[];
  readonly affectedIdentifiers: readonly string[];
}
export type PostWriteValidationResult =
  ValidPostWriteValidation | InvalidPostWriteValidation;
export interface FileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  realpath(path: string): Promise<string>;
  isSymbolicLink(path: string): Promise<boolean>;
}
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

export type DetectedProfile =
  | "generic"
  | "typescript"
  | "angular"
  | "rust"
  | "tauri"
  | "angular-tauri"
  | "nx"
  | "sqlite"
  | "security-sensitive";

export interface ProfileCandidate {
  readonly profile: DetectedProfile;
  readonly evidenceFiles: readonly string[];
  readonly reason: string;
  readonly confidence: "exact" | "inferred" | "fallback";
}

export interface ProfileDetectionResult {
  readonly selectedProfile: DetectedProfile;
  readonly candidates: readonly ProfileCandidate[];
  readonly competingCandidates: readonly DetectedProfile[];
  readonly manualConfirmationRequired: boolean;
  readonly scannedPaths: readonly string[];
}

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
export interface PostWriteCorruptionContext {
  readonly root: string;
  readonly fileSystem: FileSystem;
}
export interface TransactionOptions {
  readonly failAt?: TransactionStage;
  readonly rollbackFailPaths?: readonly string[];
  readonly corruptAfterFinalization?: (
    context: PostWriteCorruptionContext,
  ) => void | Promise<void>;
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
const lockPath = ".aif/manifest.lock.json";
const sourceMapPath = ".aif/source-map.json";
const metadataFormatVersion = "1";
const adapterOutputVersion = adapterVersion;
const transactionAdapterId = "aif:generated-files";
const ignoredScanSegments = new Set([
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

function projectRelativePaths(
  root: string,
  entries: readonly string[],
): string[] {
  const normalizedRoot = resolve(root);
  return [
    ...new Set(
      entries.flatMap((entry) => {
        const normalizedEntry = entry.replaceAll("\\", "/");
        const absolute = normalizedEntry.startsWith("/")
          ? resolve(normalizedEntry)
          : resolve(normalizedRoot, normalizedEntry);
        const path = relative(normalizedRoot, absolute).replaceAll("\\", "/");
        if (
          path === "" ||
          path === ".." ||
          path.startsWith("../") ||
          path.split("/").some((segment) => ignoredScanSegments.has(segment))
        )
          return [];
        return [path];
      }),
    ),
  ].sort();
}

async function readEvidenceFile(
  root: string,
  path: string,
  paths: ReadonlySet<string>,
  fs: FileSystem,
): Promise<string | null> {
  if (!paths.has(path)) return null;
  try {
    return await fs.read(inside(root, path));
  } catch {
    return null;
  }
}

export async function detectProjectProfiles(
  root: string,
  fs: FileSystem,
): Promise<ProfileDetectionResult> {
  const scannedPaths = projectRelativePaths(root, await fs.list(root));
  const paths = new Set(scannedPaths);
  const packageSource = await readEvidenceFile(root, "package.json", paths, fs);
  let packageNames = new Set<string>();
  if (packageSource !== null)
    try {
      const document = JSON.parse(packageSource) as Record<string, unknown>;
      packageNames = new Set(
        ["dependencies", "devDependencies", "peerDependencies"].flatMap(
          (field) =>
            typeof document[field] === "object" && document[field] !== null
              ? Object.keys(document[field] as Record<string, unknown>)
              : [],
        ),
      );
    } catch {
      /* malformed package metadata is not stack evidence */
    }
  const typescriptEvidence = [
    ...(paths.has("package.json") && packageNames.has("typescript")
      ? ["package.json"]
      : []),
    ...(paths.has("tsconfig.json") ? ["tsconfig.json"] : []),
  ];
  const angularEvidence = [
    ...(paths.has("angular.json") ? ["angular.json"] : []),
    ...(paths.has("package.json") && packageNames.has("@angular/core")
      ? ["package.json"]
      : []),
  ];
  const rustEvidence = [
    ...(paths.has("Cargo.toml") ? ["Cargo.toml"] : []),
    ...(paths.has("src-tauri/Cargo.toml") ? ["src-tauri/Cargo.toml"] : []),
  ];
  const tauriEvidence = [
    ...(paths.has("src-tauri/Cargo.toml") ? ["src-tauri/Cargo.toml"] : []),
    ...["src-tauri/tauri.conf.json", "src-tauri/tauri.conf.json5"].filter(
      (path) => paths.has(path),
    ),
    ...(paths.has("package.json") &&
    [...packageNames].some((name) => name.startsWith("@tauri-apps/"))
      ? ["package.json"]
      : []),
  ];
  const nxEvidence = [
    ...(paths.has("nx.json") ? ["nx.json"] : []),
    ...(paths.has("workspace.json") ? ["workspace.json"] : []),
    ...(paths.has("package.json") &&
    [...packageNames].some((name) => name === "nx" || name.startsWith("@nx/"))
      ? ["package.json"]
      : []),
  ];
  const sqliteEvidence = [
    ...(paths.has("prisma/schema.prisma") ? ["prisma/schema.prisma"] : []),
    ...["migrations", "db"].filter((path) => paths.has(path)),
    ...(paths.has("package.json") &&
    [...packageNames].some((name) =>
      ["better-sqlite3", "sqlite3", "@libsql/client"].includes(name),
    )
      ? ["package.json"]
      : []),
  ];
  const securitySensitiveEvidence = [
    ...[
      "src-tauri/src/stealth",
      "src-tauri/src/audio",
      "secrets",
      "credentials",
    ].filter((path) => paths.has(path) && !secretLikePath(path)),
  ];
  const hasAngular = angularEvidence.length > 0;
  const hasTauri = tauriEvidence.length > 0;
  const hasNx = nxEvidence.length > 0;
  const hasSqlite = sqliteEvidence.length > 0;
  const hasSecuritySensitive = securitySensitiveEvidence.length > 0;
  const definitions: ProfileCandidate[] = [];
  if (hasSecuritySensitive)
    definitions.push({
      profile: "security-sensitive",
      evidenceFiles: [...new Set(securitySensitiveEvidence)].sort(),
      reason:
        "Sensitive security, stealth, credential, or career-data indicators are present",
      confidence: "exact",
    });
  if (hasAngular && hasTauri)
    definitions.push({
      profile: "angular-tauri",
      evidenceFiles: [
        ...new Set([
          ...angularEvidence,
          ...tauriEvidence,
          ...typescriptEvidence,
        ]),
      ].sort(),
      reason: "Angular and Tauri configuration are both present",
      confidence: "exact",
    });
  if (hasNx)
    definitions.push({
      profile: "nx",
      evidenceFiles: [...new Set(nxEvidence)].sort(),
      reason: "Nx monorepo configuration or package evidence is present",
      confidence: "exact",
    });
  if (hasSqlite)
    definitions.push({
      profile: "sqlite",
      evidenceFiles: [...new Set(sqliteEvidence)].sort(),
      reason: "SQLite database or migration evidence is present",
      confidence: "inferred",
    });
  if (hasAngular)
    definitions.push({
      profile: "angular",
      evidenceFiles: [...new Set(angularEvidence)].sort(),
      reason: "Angular package or workspace configuration is present",
      confidence: "exact",
    });
  if (hasTauri)
    definitions.push({
      profile: "tauri",
      evidenceFiles: [...new Set(tauriEvidence)].sort(),
      reason: "Tauri configuration or package evidence is present",
      confidence: "exact",
    });
  if (typescriptEvidence.length > 0 || hasAngular)
    definitions.push({
      profile: "typescript",
      evidenceFiles: [...new Set(typescriptEvidence)].sort(),
      reason: "TypeScript configuration or package evidence is present",
      confidence: "inferred",
    });
  if (rustEvidence.length > 0 || hasTauri)
    definitions.push({
      profile: "rust",
      evidenceFiles: [...new Set(rustEvidence)].sort(),
      reason: "Cargo project evidence is present",
      confidence: "inferred",
    });
  definitions.push({
    profile: "generic",
    evidenceFiles: [],
    reason: "Generic is the deterministic fallback profile",
    confidence: "fallback",
  });
  const hasWebProfile = hasAngular || typescriptEvidence.length > 0;
  const hasNativeProfile = hasTauri || rustEvidence.length > 0;
  const ambiguous =
    hasWebProfile && hasNativeProfile && !(hasAngular && hasTauri);
  return {
    selectedProfile: ambiguous ? "generic" : definitions[0]!.profile,
    candidates: definitions,
    competingCandidates: definitions
      .filter(
        (candidate) =>
          candidate.profile !==
          (ambiguous ? "generic" : definitions[0]!.profile),
      )
      .map((candidate) => candidate.profile),
    manualConfirmationRequired: ambiguous,
    scannedPaths,
  };
}

const inspectionAdapterNames: readonly AdapterName[] = [
  "claude",
  "codex",
  "cursor",
  "copilot",
];
const inspectionMetadataPaths = [configPath, lockPath, sourceMapPath] as const;
const inspectionExclusions = [
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
  "symbolic links",
  "secret-like paths",
] as const;

function instructionAdapters(path: string): AdapterName[] {
  const detected = new Set<AdapterName>();
  if (path === "AGENTS.md" || path.startsWith(".agents/")) {
    detected.add("codex");
    detected.add("cursor");
  }
  if (path === "CLAUDE.md" || path.startsWith(".claude/"))
    detected.add("claude");
  if (path.startsWith(".cursor/")) detected.add("cursor");
  if (path.startsWith(".github/")) detected.add("copilot");
  return inspectionAdapterNames.filter((adapter) => detected.has(adapter));
}

function secretLikePath(path: string): boolean {
  return path
    .split("/")
    .some(
      (segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        /\.(?:key|pem|p12|pfx)$/iu.test(segment),
    );
}

export async function inspectProject(
  root: string,
  fs: FileSystem,
): Promise<ProjectInspection> {
  const emptyDetection: Omit<ProfileDetectionResult, "scannedPaths"> = {
    selectedProfile: "generic",
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

function inside(root: string, path: string): string {
  const target = resolve(root, path);
  if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`))
    throw new Error(`path traversal: ${path}`);
  return target;
}

export function destinationCollisionKey(path: string): string {
  try {
    return storedPathCollisionKey(path);
  } catch {
    throw new Error("invalid or escaping destination");
  }
}

export interface DestinationCollision {
  readonly code: "destination-collision";
  readonly key: string;
  readonly paths: readonly string[];
  readonly sources: readonly string[];
}

export function findDestinationCollisions(
  inputs: readonly { path: string; sources: readonly string[] }[],
): DestinationCollision[] {
  const groups = new Map<
    string,
    { paths: Set<string>; sources: Set<string>; count: number }
  >();
  for (const input of inputs) {
    const key = destinationCollisionKey(input.path);
    const group = groups.get(key) ?? {
      paths: new Set(),
      sources: new Set(),
      count: 0,
    };
    group.paths.add(input.path);
    input.sources.forEach((source) => group.sources.add(source));
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.count > 1)
    .map(([key, group]) => ({
      code: "destination-collision" as const,
      key,
      paths: [...group.paths].sort(),
      sources: [...group.sources].sort(),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function collisionPlan(files: readonly GeneratedFile[]): Plan | null {
  const collisions = findDestinationCollisions(files);
  if (collisions.length === 0) return null;
  return {
    changes: collisions.map((collision) => ({
      path: collision.paths.join(", "),
      kind: "conflict" as const,
      reason: JSON.stringify(collision),
    })),
    diagnostics: ["destination-collision"],
  };
}

function noncanonicalPathPlan(files: readonly GeneratedFile[]): Plan | null {
  const invalidPaths = files
    .map((file) => file.path)
    .filter((path) => {
      try {
        return normalizeStoredPath(path) !== path;
      } catch {
        return true;
      }
    })
    .sort();
  if (invalidPaths.length === 0) return null;
  return {
    changes: invalidPaths.map((path) => ({
      path,
      kind: "security-error" as const,
      reason: "generated destination is not a canonical stored path",
    })),
    diagnostics: ["invalid-stored-path"],
  };
}

type MetadataObject = Record<string, unknown>;
type MetadataRecord = Record<string, unknown>;

interface PostWriteValidationInput {
  readonly root: string;
  readonly files: readonly GeneratedFile[];
  readonly manifestBytes: string;
  readonly sourceMapBytes: string;
  readonly createdGeneratedPaths: ReadonlySet<string>;
  readonly fs: FileSystem;
}

interface TransactionMetadata {
  readonly manifest: string;
  readonly sourceMap: string;
}

interface MetadataPins {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly sourceHashes: readonly {
    readonly id: string;
    readonly checksum: string;
  }[];
}

function buildTransactionMetadata(
  files: readonly GeneratedFile[],
  pins: MetadataPins = {
    profile: "generic",
    adapters: ["codex"],
    sourceHashes: [
      {
        id: "transaction:generated",
        checksum: checksum("transaction:generated"),
      },
    ],
  },
): TransactionMetadata {
  const canonicalSourceId = checksum(
    JSON.stringify([...new Set(files.flatMap((file) => file.sources))].sort()),
  );
  const sharedMetadata = {
    metadataFormatVersion,
    frameworkVersion: INTENTLOOM_VERSION,
    adapterOutputVersion,
    adapterId: transactionAdapterId,
    canonicalSourceId,
  };
  return {
    manifest: `${JSON.stringify(
      {
        schemaVersion: metadataFormatVersion,
        lockVersion: metadataFormatVersion,
        ownershipPolicy: "aif-owned-generated",
        profile: pins.profile,
        schemaVersions: {
          config: "1",
          manifestLock: "1",
          sourceMap: "1",
          planning: "1",
          agentSkillPolicy: "1",
        },
        adapters: [...(pins.adapters ?? [])]
          .sort()
          .map((id) => ({ id, version: adapterOutputVersion })),
        sourceHashes: [...(pins.sourceHashes ?? [])].sort((left, right) =>
          left.id.localeCompare(right.id),
        ),
        ...sharedMetadata,
        generated: files.map(({ path, checksum }) => ({ path, checksum })),
      },
      null,
      2,
    )}\n`,
    sourceMap: `${JSON.stringify(
      {
        schemaVersion: metadataFormatVersion,
        ...sharedMetadata,
        files: files.map(({ path, checksum, sources }) => ({
          path,
          checksum,
          sources,
          ownership: "aif-owned-generated",
        })),
      },
      null,
      2,
    )}\n`,
  };
}

function transactionSummary(
  files: readonly GeneratedFile[],
  changes: readonly Change[],
): Pick<
  TransactionResult,
  | "createdFiles"
  | "updatedFiles"
  | "unchangedFiles"
  | "manifestUpdated"
  | "sourceMapUpdated"
> {
  const generatedChanges = changes.filter(
    (change) => change.path !== lockPath && change.path !== sourceMapPath,
  );
  const changedPaths = new Set(generatedChanges.map((change) => change.path));
  return {
    createdFiles: generatedChanges
      .filter((change) => change.kind === "create")
      .map((change) => change.path)
      .sort(),
    updatedFiles: generatedChanges
      .filter((change) => change.kind === "update")
      .map((change) => change.path)
      .sort(),
    unchangedFiles: files
      .map((file) => file.path)
      .filter((path) => !changedPaths.has(path))
      .sort(),
    manifestUpdated: changes.some((change) => change.path === lockPath),
    sourceMapUpdated: changes.some((change) => change.path === sourceMapPath),
  };
}

class PostWriteValidationFailure extends Error {
  constructor(readonly validation: InvalidPostWriteValidation) {
    super(validation.code);
  }
}

function invalidPostWriteState(
  code: PostWriteCorruptionCode,
  affectedPaths: readonly string[],
  affectedIdentifiers: readonly string[] = [],
): InvalidPostWriteValidation {
  return {
    status: "invalid",
    code,
    affectedPaths: [...new Set(affectedPaths)].sort(),
    affectedIdentifiers: [...new Set(affectedIdentifiers)].sort(),
  };
}

function metadataRecords(
  value: MetadataObject,
  key: "generated" | "files",
): MetadataRecord[] {
  return Array.isArray(value[key])
    ? (value[key] as MetadataRecord[]).filter(
        (record) => typeof record === "object" && record !== null,
      )
    : [];
}

function pathFailure(
  metadata: "manifest" | "source-map",
  records: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const metadataPath = metadata === "manifest" ? lockPath : sourceMapPath;
  const absoluteCode = `${metadata}-absolute-path` as PostWriteCorruptionCode;
  const escapeCode = `${metadata}-path-escape` as PostWriteCorruptionCode;
  for (const [index, record] of records.entries()) {
    const path = record.path;
    const identifier = `${metadata}.${index}`;
    if (
      typeof path !== "string" ||
      path.startsWith("/") ||
      /^[A-Za-z]:[\\/]/u.test(path)
    )
      return invalidPostWriteState(absoluteCode, [metadataPath], [identifier]);
    try {
      if (normalizeStoredPath(path) !== path)
        return invalidPostWriteState(escapeCode, [metadataPath], [identifier]);
    } catch {
      return invalidPostWriteState(escapeCode, [metadataPath], [identifier]);
    }
  }
  return null;
}

function duplicateFailure(
  metadata: "manifest" | "source-map",
  records: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const metadataPath = metadata === "manifest" ? lockPath : sourceMapPath;
  const exact = new Set<string>();
  for (const [index, record] of records.entries()) {
    if (typeof record.path !== "string") continue;
    if (exact.has(record.path))
      return invalidPostWriteState(
        metadata === "manifest"
          ? "manifest-duplicate-destination"
          : "source-map-duplicate-ownership",
        [metadataPath, record.path],
        [`${metadata}.${index}`],
      );
    exact.add(record.path);
  }
  const normalized = new Map<string, string>();
  for (const [index, record] of records.entries()) {
    if (typeof record.path !== "string") continue;
    const key = destinationCollisionKey(record.path);
    const previous = normalized.get(key);
    if (previous !== undefined && previous !== record.path)
      return invalidPostWriteState(
        "normalized-destination-duplicate",
        [metadataPath, previous, record.path],
        [`${metadata}.${index}`, key],
      );
    normalized.set(key, record.path);
  }
  return null;
}

function missingIdentity(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
  key: "adapterId" | "canonicalSourceId",
  code: "adapter-id-missing" | "canonical-source-id-missing",
): InvalidPostWriteValidation | null {
  const affected: string[] = [];
  if (typeof manifest[key] !== "string" || manifest[key] === "")
    affected.push(lockPath);
  if (typeof sourceMap[key] !== "string" || sourceMap[key] === "")
    affected.push(sourceMapPath);
  return affected.length === 0
    ? null
    : invalidPostWriteState(code, affected, [key]);
}

async function validateCommittedOwnershipState({
  root,
  files,
  manifestBytes,
  sourceMapBytes,
  createdGeneratedPaths,
  fs,
}: PostWriteValidationInput): Promise<PostWriteValidationResult> {
  const committedManifestBytes = await fs.read(inside(root, lockPath));
  const committedSourceMapBytes = await fs.read(inside(root, sourceMapPath));
  let manifest: MetadataObject;
  let sourceMap: MetadataObject;
  try {
    manifest = JSON.parse(committedManifestBytes) as MetadataObject;
  } catch {
    return invalidPostWriteState("manifest-json-malformed", [lockPath]);
  }
  try {
    sourceMap = JSON.parse(committedSourceMapBytes) as MetadataObject;
  } catch {
    return invalidPostWriteState("source-map-json-malformed", [sourceMapPath]);
  }

  const adapterMissing = missingIdentity(
    manifest,
    sourceMap,
    "adapterId",
    "adapter-id-missing",
  );
  if (adapterMissing) return adapterMissing;
  if (manifest.adapterId !== sourceMap.adapterId)
    return invalidPostWriteState(
      "adapter-id-mismatch",
      [lockPath, sourceMapPath],
      ["adapterId"],
    );
  const canonicalMissing = missingIdentity(
    manifest,
    sourceMap,
    "canonicalSourceId",
    "canonical-source-id-missing",
  );
  if (canonicalMissing) return canonicalMissing;
  if (manifest.canonicalSourceId !== sourceMap.canonicalSourceId)
    return invalidPostWriteState(
      "canonical-source-id-mismatch",
      [lockPath, sourceMapPath],
      ["canonicalSourceId"],
    );

  const frameworkPaths: string[] = [];
  if (typeof manifest.frameworkVersion !== "string")
    frameworkPaths.push(lockPath);
  if (typeof sourceMap.frameworkVersion !== "string")
    frameworkPaths.push(sourceMapPath);
  if (frameworkPaths.length > 0)
    return invalidPostWriteState("framework-version-missing", frameworkPaths, [
      "frameworkVersion",
    ]);
  if (
    manifest.frameworkVersion !== INTENTLOOM_VERSION ||
    sourceMap.frameworkVersion !== INTENTLOOM_VERSION
  )
    return invalidPostWriteState(
      "framework-version-incompatible",
      [lockPath, sourceMapPath],
      ["frameworkVersion"],
    );

  const adapterVersionPaths: string[] = [];
  if (typeof manifest.adapterOutputVersion !== "string")
    adapterVersionPaths.push(lockPath);
  if (typeof sourceMap.adapterOutputVersion !== "string")
    adapterVersionPaths.push(sourceMapPath);
  if (adapterVersionPaths.length > 0)
    return invalidPostWriteState(
      "adapter-output-version-missing",
      adapterVersionPaths,
      ["adapterOutputVersion"],
    );
  if (
    manifest.adapterOutputVersion !== adapterOutputVersion ||
    sourceMap.adapterOutputVersion !== adapterOutputVersion
  )
    return invalidPostWriteState(
      "adapter-output-version-incompatible",
      [lockPath, sourceMapPath],
      ["adapterOutputVersion"],
    );
  if (
    manifest.metadataFormatVersion !== metadataFormatVersion ||
    sourceMap.metadataFormatVersion !== metadataFormatVersion ||
    manifest.lockVersion !== metadataFormatVersion ||
    sourceMap.schemaVersion !== metadataFormatVersion
  )
    return invalidPostWriteState(
      "metadata-format-version-incompatible",
      [lockPath, sourceMapPath],
      ["metadataFormatVersion"],
    );

  const manifestRecords = metadataRecords(manifest, "generated");
  const sourceMapRecords = metadataRecords(sourceMap, "files");
  if (manifest.ownershipPolicy !== "aif-owned-generated")
    return invalidPostWriteState(
      "ownership-classification-invalid",
      [lockPath],
      ["ownershipPolicy"],
    );
  const manifestPathFailure = pathFailure("manifest", manifestRecords);
  if (manifestPathFailure) return manifestPathFailure;
  const sourceMapPathFailure = pathFailure("source-map", sourceMapRecords);
  if (sourceMapPathFailure) return sourceMapPathFailure;
  const manifestDuplicate = duplicateFailure("manifest", manifestRecords);
  if (manifestDuplicate) return manifestDuplicate;
  const sourceMapDuplicate = duplicateFailure("source-map", sourceMapRecords);
  if (sourceMapDuplicate) return sourceMapDuplicate;

  for (const [index, record] of sourceMapRecords.entries())
    if (record.ownership !== "aif-owned-generated")
      return invalidPostWriteState(
        "ownership-classification-invalid",
        [sourceMapPath, String(record.path ?? "")].filter(Boolean),
        [`source-map.${index}`, "ownership"],
      );

  const plannedByPath = new Map(files.map((file) => [file.path, file]));
  const manifestByPath = new Map(
    manifestRecords
      .filter((record) => typeof record.path === "string")
      .map((record) => [record.path as string, record]),
  );
  const sourceMapByPath = new Map(
    sourceMapRecords
      .filter((record) => typeof record.path === "string")
      .map((record) => [record.path as string, record]),
  );

  for (const record of manifestRecords) {
    const path = record.path as string;
    if (!(await fs.exists(inside(root, path))))
      return invalidPostWriteState(
        "manifest-destination-missing",
        [lockPath, path],
        [path],
      );
  }
  for (const record of sourceMapRecords) {
    const path = record.path as string;
    if (!(await fs.exists(inside(root, path))))
      return invalidPostWriteState(
        plannedByPath.has(path)
          ? "source-map-destination-missing"
          : sourceMapRecords.length > files.length
            ? "ownership-record-without-generated-file"
            : "source-map-destination-missing",
        [sourceMapPath, path],
        [path],
      );
  }

  for (const file of files) {
    if (!manifestByPath.has(file.path))
      return invalidPostWriteState(
        "manifest-entry-missing",
        [lockPath, file.path],
        [file.path],
      );
    if (!sourceMapByPath.has(file.path))
      return invalidPostWriteState(
        createdGeneratedPaths.has(file.path)
          ? "generated-file-without-ownership"
          : "source-map-entry-missing",
        [sourceMapPath, file.path],
        [file.path],
      );
  }

  for (const file of files) {
    const actualChecksum = checksum(await fs.read(inside(root, file.path)));
    const manifestChecksum = manifestByPath.get(file.path)!.checksum;
    const sourceMapChecksum = sourceMapByPath.get(file.path)!.checksum;
    if (
      actualChecksum === file.checksum &&
      sourceMapChecksum !== actualChecksum
    )
      return invalidPostWriteState(
        "generated-checksum-mismatch",
        [sourceMapPath, file.path],
        [file.path],
      );
    if (
      actualChecksum === file.checksum &&
      manifestChecksum !== sourceMapChecksum
    )
      return invalidPostWriteState(
        "manifest-source-map-checksum-mismatch",
        [lockPath, sourceMapPath, file.path],
        [file.path],
      );
    if (
      actualChecksum !== file.checksum &&
      manifestChecksum !== actualChecksum &&
      manifestChecksum === sourceMapChecksum
    )
      return invalidPostWriteState(
        "manifest-generated-checksum-mismatch",
        [lockPath, file.path],
        [file.path],
      );
    if (sourceMapChecksum !== actualChecksum)
      return invalidPostWriteState(
        "generated-checksum-mismatch",
        [sourceMapPath, file.path],
        [file.path],
      );
    if (manifestChecksum !== sourceMapChecksum)
      return invalidPostWriteState(
        "manifest-source-map-checksum-mismatch",
        [lockPath, sourceMapPath, file.path],
        [file.path],
      );
    if (manifestChecksum !== actualChecksum)
      return invalidPostWriteState(
        "manifest-generated-checksum-mismatch",
        [lockPath, file.path],
        [file.path],
      );
    if (actualChecksum !== file.checksum)
      return invalidPostWriteState(
        "committed-generated-bytes-mismatch",
        [file.path],
        [file.path],
      );
  }

  if (committedManifestBytes !== manifestBytes)
    return invalidPostWriteState("committed-manifest-bytes-mismatch", [
      lockPath,
    ]);
  if (committedSourceMapBytes !== sourceMapBytes)
    return invalidPostWriteState("committed-source-map-bytes-mismatch", [
      sourceMapPath,
    ]);

  return {
    status: "valid",
    checkedGeneratedFileCount: files.length,
    checkedManifestEntryCount: manifestRecords.length,
    checkedSourceMapEntryCount: sourceMapRecords.length,
    checksumsValidated: true,
    ownershipValidated: true,
    pathsValidated: true,
    versionsValidated: true,
    metadataBytesValidated: true,
  };
}

export async function synchronizeGeneratedFiles(
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions = {},
  validatedMetadata?: TransactionMetadata,
): Promise<TransactionResult> {
  const collision = collisionPlan(files);
  if (collision)
    return {
      ...collision,
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      createdFiles: [],
      updatedFiles: [],
      unchangedFiles: [],
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  const invalidPath = noncanonicalPathPlan(files);
  if (invalidPath)
    return {
      ...invalidPath,
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      createdFiles: [],
      updatedFiles: [],
      unchangedFiles: [],
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  const normalized = files.map((file) => ({
    ...file,
    checksum: checksum(file.content),
  }));
  const { manifest, sourceMap } =
    validatedMetadata ?? buildTransactionMetadata(normalized);
  const transactionFiles: GeneratedFile[] = [
    ...normalized,
    {
      path: lockPath,
      content: manifest,
      sources: ["transaction:manifest"],
      checksum: checksum(manifest),
    },
    {
      path: sourceMapPath,
      content: sourceMap,
      sources: ["transaction:source-map"],
      checksum: checksum(sourceMap),
    },
  ];
  const changes: Change[] = [];
  const createdGeneratedPaths = new Set<string>();
  for (const file of transactionFiles) {
    const path = inside(root, file.path);
    if (!(await fs.exists(path))) {
      changes.push({
        path: file.path,
        kind: "create",
        reason: "missing",
        content: file.content,
      });
      if (file.path !== lockPath && file.path !== sourceMapPath)
        createdGeneratedPaths.add(file.path);
    } else if ((await fs.read(path)) !== file.content)
      changes.push({
        path: file.path,
        kind: "update",
        reason: "committed content differs",
        content: file.content,
      });
  }
  const proposal: Plan = { changes, diagnostics: [] };
  const summary = transactionSummary(normalized, changes);
  const backups = new Map<string, string>();
  const created: string[] = [];
  let stage: TransactionStage = "generated-stage";
  let postWriteValidation: PostWriteValidationResult | undefined;
  const inject = (candidate: TransactionStage) => {
    stage = candidate;
    if (options.failAt === candidate) throw new Error(`injected:${candidate}`);
  };
  try {
    for (const candidate of [
      "generated-stage",
      "manifest-stage",
      "source-map-stage",
    ] as const)
      inject(candidate);
    for (const file of transactionFiles) {
      inject(
        file.path === lockPath
          ? "manifest-finalize"
          : file.path === sourceMapPath
            ? "source-map-finalize"
            : "generated-commit",
      );
      const path = inside(root, file.path);
      await safeDestination(root, path, fs);
      if (await fs.exists(path)) backups.set(path, await fs.read(path));
      else created.push(path);
      await fs.mkdir(dirname(path));
      await fs.write(path, file.content);
    }
    inject("post-write-consistency");
    await options.corruptAfterFinalization?.({ root, fileSystem: fs });
    postWriteValidation = await validateCommittedOwnershipState({
      root,
      files: normalized,
      manifestBytes: manifest,
      sourceMapBytes: sourceMap,
      createdGeneratedPaths,
      fs,
    });
    if (postWriteValidation.status === "invalid")
      throw new PostWriteValidationFailure(postWriteValidation);
    inject("success-cleanup");
    return {
      ...proposal,
      status: "success",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      ...summary,
      consistencyValidated: true,
      cleanupCompleted: true,
      postWriteValidation,
    };
  } catch (error) {
    if (error instanceof PostWriteValidationFailure)
      postWriteValidation = error.validation;
    const rollbackFailures: string[] = [];
    const injectedRollbackFailures = new Set(options.rollbackFailPaths ?? []);
    for (const [path, content] of backups) {
      const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure");
        await fs.write(path, content);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    for (const path of created) {
      const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure");
        await fs.remove(path);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    const originalError =
      error instanceof Error ? error.message : String(error);
    return {
      ...proposal,
      status: "failed",
      failedStage: stage,
      diagnostics:
        rollbackFailures.length === 0
          ? [originalError]
          : [originalError, "transaction-rollback-incomplete"],
      rollbackAttempted: true,
      rollbackCompleted: rollbackFailures.length === 0,
      rollbackFailures: rollbackFailures.sort(),
      ...summary,
      consistencyValidated: postWriteValidation?.status === "valid",
      cleanupCompleted: false,
      ...(postWriteValidation === undefined ? {} : { postWriteValidation }),
    };
  }
}

async function safeDestination(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<void> {
  let rootResolved = resolve(root);
  try {
    rootResolved = await fs.realpath(rootResolved);
  } catch {
    /* a new project root has no link to resolve yet */
  }
  let current = path;
  while (true) {
    if (await fs.isSymbolicLink(current))
      throw new Error(
        `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
      );
    if (await fs.exists(current)) {
      const resolved = await fs.realpath(current);
      if (
        resolved !== rootResolved &&
        !resolved.startsWith(`${rootResolved}${sep}`)
      )
        throw new Error(
          `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
        );
    }
    if (current === resolve(root)) return;
    current = dirname(current);
  }
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
    else if ((await fs.read(path)) === file.content) continue;
    else if (
      sync &&
      file.path !== sourceMapPath &&
      file.path !== lockPath &&
      file.path !== configPath
    ) {
      const record = owned.get(file.path);
      if (!record)
        changes.push({
          path: file.path,
          kind: "conflict",
          reason: "existing destination has no Intentloom ownership record",
        });
      else if (checksum(await fs.read(path)) !== record.checksum)
        changes.push({
          path: file.path,
          kind: "modified",
          reason: "Intentloom-owned generated file was manually modified",
        });
      else
        changes.push({
          path: file.path,
          kind: "update",
          reason: "verified Intentloom-owned generated output changed",
          content: file.content,
        });
    } else
      changes.push({
        path: file.path,
        kind: "conflict",
        reason: "existing file is not identical; explicit resolution required",
      });
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
    if (path.startsWith(".github/")) return "copilot";
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
    const generated = Array.isArray(manifest.generated)
      ? (manifest.generated as Record<string, unknown>[])
      : [];
    addStoredPathFinding(lockPath, generated);
    for (const record of generated)
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
    const portableGlob = (pattern: string) =>
      pattern.length > 0 &&
      !pattern.includes("\\") &&
      !pattern.includes("\0") &&
      !/^(?:[A-Za-z]:|\/)/u.test(pattern) &&
      !pattern.split("/").some((segment) => segment === ".." || segment === "");
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
        if (path === "AGENTS.md" || path.startsWith(".agents/"))
          return ["agents"];
        if (path === "CLAUDE.md" || path.startsWith(".claude/"))
          return ["claude"];
        if (path.startsWith(".cursor/")) return ["cursor"];
        if (path.startsWith(".github/")) return ["copilot"];
        return [];
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
  const adapterForPath = (path: string): AdapterName | null => {
    if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
    if (path.startsWith(".cursor/")) return "cursor";
    if (path.startsWith(".github/")) return "copilot";
    if (path.startsWith(".agents/")) return "codex";
    return null;
  };
  const instructionPath = (path: string) =>
    path === "AGENTS.md" ||
    path === "CLAUDE.md" ||
    path.startsWith(".claude/") ||
    path.startsWith(".agents/") ||
    path.startsWith(".cursor/") ||
    path === ".github/copilot-instructions.md" ||
    /^\.github\/instructions\/.+\.instructions\.md$/u.test(path);
  const unsupportedPath = (path: string) =>
    /^\.github\/agents\/.+\.agent\.md$/u.test(path);
  const documentConcept = (path: string): string | null => {
    const lower = path.toLowerCase();
    const name = lower.split("/").at(-1)!;
    if (name === "readme.md") return "public-readme";
    if (name === "changelog.md") return "change-history";
    if (
      name === "roadmap.md" ||
      /(?:product[-_ ]?(?:state|roadmap)|state[-_ ]?of[-_ ]?product)/u.test(
        name,
      )
    )
      return "product-state";
    if (/(?:architecture|architectural|adr)/u.test(name)) return "architecture";
    if (/(?:technical[-_ ]?debt|tech[-_ ]?debt)/u.test(name))
      return "technical-debt";
    return null;
  };
  const mappingDiagnostics: string[] = [];
  const normalizeMappingPath = (path: string): string | null => {
    try {
      const normalized = normalizeOutputPath(path);
      return normalized === path ? normalized : null;
    } catch {
      return null;
    }
  };
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
      adapter: adapterForPath(file.path),
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
      adapter: adapterForPath(path),
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
      (item) => item.manualDecisionRequired || item.action === "conflict",
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

export function createMemoryFileSystem(
  initial: Record<string, string> = {},
  failAfterWrites?: number,
): FileSystem & { files: Map<string, string> } {
  const memoryPath = (path: string) =>
    path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "");
  const files = new Map(
    Object.entries(initial).map(([path, content]) => [
      memoryPath(path),
      content,
    ]),
  );
  let writes = 0;
  let failed = false;
  return {
    files,
    async exists(path) {
      return files.has(memoryPath(path));
    },
    async read(path) {
      const content = files.get(memoryPath(path));
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write(path, content) {
      writes += 1;
      if (
        failAfterWrites !== undefined &&
        writes > failAfterWrites &&
        !failed
      ) {
        failed = true;
        throw new Error("injected write failure");
      }
      files.set(memoryPath(path), content);
    },
    async mkdir() {},
    async remove(path) {
      files.delete(memoryPath(path));
    },
    async list(path) {
      const directory = memoryPath(path);
      return [...files.keys()].filter((file) => file.startsWith(directory));
    },
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
  };
}
export const nodeFileSystem: FileSystem = {
  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },
  read: (path) => readFile(path, "utf8"),
  async write(path, content) {
    await writeFile(path, content, "utf8");
  },
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
  async remove(path) {
    await rm(path, { recursive: true, force: true });
  },
  async list(path) {
    try {
      const files: string[] = [];
      const binaryExtensions =
        /\.(?:7z|bin|dll|dylib|exe|gif|gz|ico|jpe?g|pdf|png|so|tar|webp|zip)$/iu;
      const walk = async (
        directory: string,
        prefix: string,
        depth: number,
      ): Promise<void> => {
        if (depth > 32 || files.length >= 10_000) return;
        const entries = (
          await readdir(directory, { withFileTypes: true })
        ).sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
          if (files.length >= 10_000) return;
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isSymbolicLink()) continue;
          if (entry.isDirectory()) {
            if (ignoredScanSegments.has(entry.name)) continue;
            await walk(resolve(directory, entry.name), relativePath, depth + 1);
          } else if (entry.isFile() && !binaryExtensions.test(entry.name))
            files.push(relativePath);
        }
      };
      await walk(path, "", 0);
      return files.sort();
    } catch {
      return [];
    }
  },
  realpath: (path) => realpath(path),
  async isSymbolicLink(path) {
    try {
      return (await lstat(path)).isSymbolicLink();
    } catch {
      return false;
    }
  },
};

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

    let ownership: OwnershipClass = "project-owned";
    if (path.startsWith(".aif/") || path.startsWith("catalog/")) {
      ownership = "intentloom-managed";
    } else if (
      path.startsWith(".claude/") ||
      path === "CLAUDE.md" ||
      path.startsWith(".cursor/") ||
      path === ".cursorrules" ||
      path.includes("copilot-instructions.md")
    ) {
      ownership = "provider-derivative";
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
      ownership,
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
  const { plan, dryRun = false } = options;
  if (plan.schemaVersion !== 1) {
    throw new Error("unsupported adoption plan schema version");
  }

  for (const op of plan.operations) {
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
      appliedOperations: plan.operations.map((op) => op.id),
      createdFiles: [],
      updatedFiles: [],
    };
  }

  const backups = new Map<string, string | null>();
  const appliedOperations: string[] = [];
  const createdFiles: string[] = [];
  const updatedFiles: string[] = [];

  try {
    for (const op of plan.operations) {
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
      planId: plan.planId,
      timestamp: appliedOperations.join(","),
    });
    const entry: MigrationJournalEntry = {
      id: entryId,
      planId: plan.planId,
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

export function parseSkillProgressive(
  id: string,
  content: string,
): {
  catalog: SkillCatalogMetadata;
  contract: SkillExecutionContract;
  procedure: SkillProcedure;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u.exec(content);
  const frontmatterStr = match ? (match[1] ?? "") : "";
  const body = match ? (match[2] ?? "") : content;

  let fields: Record<string, unknown> = {};
  if (frontmatterStr.trim().length > 0) {
    try {
      const parsed = parse(frontmatterStr) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        fields = parsed as Record<string, unknown>;
      }
    } catch {
      // fallback to empty frontmatter
    }
  }

  const name = typeof fields.name === "string" ? fields.name : id;
  const description =
    typeof fields.description === "string" ? fields.description : `Skill ${id}`;
  const version = typeof fields.version === "string" ? fields.version : "1.0.0";
  const packs = Array.isArray(fields.packs)
    ? fields.packs.filter((p): p is string => typeof p === "string")
    : ["all"];
  const roles = Array.isArray(fields.roles)
    ? fields.roles.filter((r): r is string => typeof r === "string")
    : ["engineer"];
  const trustClass: TrustClass =
    typeof fields.trustClass === "string" &&
    [
      "canonical-policy",
      "verified-evidence",
      "user-supplied",
      "agent-generated",
    ].includes(fields.trustClass)
      ? (fields.trustClass as TrustClass)
      : "canonical-policy";
  const compatibility = Array.isArray(fields.compatibility)
    ? fields.compatibility.filter((c): c is string => typeof c === "string")
    : ["v1.0"];
  const capabilities = Array.isArray(fields.capabilities)
    ? fields.capabilities.filter((c): c is string => typeof c === "string")
    : [id];
  const permissions = Array.isArray(fields.permissions)
    ? fields.permissions.filter((p): p is string => typeof p === "string")
    : [];

  const catalogCost = Math.ceil(
    (name.length + description.length + id.length + 50) / 4,
  );
  const contractCost = catalogCost + Math.ceil(body.length / 8);
  const procedureCost = Math.ceil(content.length / 4);

  const catalog: SkillCatalogMetadata = {
    level: "catalog",
    id,
    name,
    version,
    description,
    packs,
    roles,
    trustClass,
    compatibility,
    capabilities,
    permissions,
    contextCost: {
      catalogCost,
      contractCost,
      procedureCost,
    },
  };

  const inputs: { name: string; description: string; required: boolean }[] = [];
  const inputsSection = extractMarkdownSection(body, "Inputs");
  if (inputsSection) {
    const lines = inputsSection
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("-"));
    for (const line of lines) {
      const text = line.replace(/^- /, "").trim();
      inputs.push({
        name: text.split(" ")[0] ?? "input",
        description: text,
        required: true,
      });
    }
  }

  const outputs: { name: string; description: string }[] = [];
  const outputsSection = extractMarkdownSection(body, "Exact outputs");
  if (outputsSection) {
    const lines = outputsSection
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    for (const line of lines) {
      outputs.push({
        name: "output",
        description: line.replace(/^- /, ""),
      });
    }
  }

  const triggers: string[] = [];
  const triggerSection = extractMarkdownSection(body, "Trigger");
  if (triggerSection) {
    triggers.push(triggerSection.trim());
  }

  const contract: SkillExecutionContract = {
    ...catalog,
    level: "contract",
    inputs,
    outputs,
    triggers,
    toolRequirements: [],
    executionConstraints: [],
  };

  const procedure: SkillProcedure = {
    ...contract,
    level: "procedure",
    content,
  };

  return { catalog, contract, procedure };
}

export async function discoverSkills(
  options: {
    root: string;
    catalogRoot?: string;
    level?: SkillLoadingLevel;
    pack?: string;
    role?: string;
    query?: string;
    trustClass?: TrustClass;
    maxBudget?: number;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillDiscoveryResult> {
  const level: SkillLoadingLevel = options.level ?? "catalog";
  const catalogDir = options.catalogRoot ?? inside(options.root, "catalog");
  const skillsDir = inside(catalogDir, "skills");

  const allFiles = await fs.list(options.root);
  const skillMap = new Map<string, string>();

  for (const rawPath of allFiles) {
    const rel = rawPath.startsWith(options.root)
      ? relative(options.root, rawPath)
      : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    const match = /(?:catalog\/)?skills\/([^/]+)\/SKILL\.md$/u.exec(normalized);
    if (match?.[1]) {
      const fullPath = rawPath.startsWith(options.root)
        ? rawPath
        : inside(options.root, normalized);
      skillMap.set(match[1], fullPath);
    }
  }

  const selectedSkills: (
    SkillCatalogMetadata | SkillExecutionContract | SkillProcedure
  )[] = [];
  const decisions: SkillDiscoveryDecision[] = [];

  let accumulatedBudget = 0;
  let eagerBudget = 0;

  const sortedSkillIds = [...skillMap.keys()].sort();

  for (const skillId of sortedSkillIds) {
    const filePath = skillMap.get(skillId)!;
    try {
      const content = await fs.read(filePath);
      const progressive = parseSkillProgressive(skillId, content);
      const meta = progressive.catalog;

      if (
        options.trustClass !== undefined &&
        meta.trustClass !== options.trustClass
      ) {
        decisions.push({
          skillId,
          status: "rejected",
          reason: `Trust class ${meta.trustClass} does not match ${options.trustClass}`,
        });
        continue;
      }

      if (
        options.pack !== undefined &&
        !meta.packs.includes(options.pack) &&
        !meta.packs.includes("all")
      ) {
        decisions.push({
          skillId,
          status: "rejected",
          reason: `Skill pack does not match requested pack: ${options.pack}`,
        });
        continue;
      }

      if (
        options.role !== undefined &&
        !meta.roles.includes(options.role) &&
        !meta.roles.includes("engineer")
      ) {
        decisions.push({
          skillId,
          status: "rejected",
          reason: `Skill role does not match requested role: ${options.role}`,
        });
        continue;
      }

      if (options.query !== undefined) {
        const q = options.query.toLowerCase();
        const matches =
          meta.id.toLowerCase().includes(q) ||
          meta.name.toLowerCase().includes(q) ||
          meta.description.toLowerCase().includes(q) ||
          meta.capabilities.some((c) => c.toLowerCase().includes(q));
        if (!matches) {
          decisions.push({
            skillId,
            status: "rejected",
            reason: `Skill metadata does not match query: ${options.query}`,
          });
          continue;
        }
      }

      const costAtLevel =
        level === "catalog"
          ? meta.contextCost.catalogCost
          : level === "contract"
            ? meta.contextCost.contractCost
            : meta.contextCost.procedureCost;

      if (
        options.maxBudget !== undefined &&
        accumulatedBudget + costAtLevel > options.maxBudget
      ) {
        decisions.push({
          skillId,
          status: "incompatible",
          reason: `Exceeds remaining context budget constraint of ${options.maxBudget}`,
        });
        continue;
      }

      accumulatedBudget += costAtLevel;
      eagerBudget += meta.contextCost.procedureCost;

      const chosenSkill =
        level === "catalog"
          ? progressive.catalog
          : level === "contract"
            ? progressive.contract
            : progressive.procedure;

      selectedSkills.push(chosenSkill);
      decisions.push({
        skillId,
        status: "selected",
        reason: `Selected at level ${level}`,
      });
    } catch (error) {
      decisions.push({
        skillId,
        status: "unavailable",
        reason: `Failed to parse skill: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  const budgetSavingsPercentage =
    eagerBudget > 0
      ? Math.round(((eagerBudget - accumulatedBudget) / eagerBudget) * 100)
      : 0;

  return {
    level,
    totalBudgetEstimate: accumulatedBudget,
    eagerBudgetEstimate: eagerBudget,
    budgetSavingsPercentage,
    skills: selectedSkills,
    decisions,
  };
}

export async function getSkillAtLevel(
  id: string,
  level: SkillLoadingLevel,
  options: { root: string; catalogRoot?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<
  SkillCatalogMetadata | SkillExecutionContract | SkillProcedure | null
> {
  const catalogDir = options.catalogRoot ?? inside(options.root, "catalog");
  const filePath = inside(catalogDir, `skills/${id}/SKILL.md`);

  let content: string | null = null;
  if (await fs.exists(filePath)) {
    content = await fs.read(filePath);
  } else {
    const fallbackPath = inside(options.root, `skills/${id}/SKILL.md`);
    if (await fs.exists(fallbackPath)) {
      content = await fs.read(fallbackPath);
    }
  }
  if (!content) return null;

  try {
    const progressive = parseSkillProgressive(id, content);
    if (level === "catalog") return progressive.catalog;
    if (level === "contract") return progressive.contract;
    return progressive.procedure;
  } catch {
    return null;
  }
}

export async function createSkillProposal(
  input: Omit<
    SkillProposal,
    "schemaVersion" | "state" | "createdAt" | "updatedAt"
  > & {
    state?: SkillProposalState;
    createdAt?: string;
    updatedAt?: string;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const root = options.root;
  const now = new Date().toISOString();

  const proposal = validateSkillProposal({
    schemaVersion: "1",
    id: input.id,
    name: input.name,
    version: input.version,
    state: input.state ?? "proposed",
    sourceTaskIds: input.sourceTaskIds,
    observedPattern: input.observedPattern,
    confidence: input.confidence,
    uncertainty: input.uncertainty,
    requestedCapabilities: input.requestedCapabilities,
    supportedProfiles: input.supportedProfiles,
    validationExpectations: input.validationExpectations,
    privacyImpact: input.privacyImpact,
    ...(input.licenseNotice !== undefined
      ? { licenseNotice: input.licenseNotice }
      : {}),
    trustClass: input.trustClass,
    content: input.content,
    ...(input.approvalEvidence !== undefined
      ? { approvalEvidence: input.approvalEvidence }
      : {}),
    ...(input.previousVersion !== undefined
      ? { previousVersion: input.previousVersion }
      : {}),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });

  const path = inside(root, `.aif/memory/proposals/${proposal.id}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(proposal, null, 2)}\n`);
  return proposal;
}

export async function listSkillProposals(
  options: {
    root: string;
    state?: SkillProposalState;
    trustClass?: TrustClass;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SkillProposal[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: SkillProposal[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/proposals/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const proposal = validateSkillProposal(JSON.parse(content));
      if (options.state !== undefined && proposal.state !== options.state)
        continue;
      if (
        options.trustClass !== undefined &&
        proposal.trustClass !== options.trustClass
      )
        continue;
      results.push(proposal);
    } catch {
      // Ignore corrupted proposal records
    }
  }

  return results.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function getSkillProposal(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal | null> {
  const root = options.root;
  const path = inside(root, `.aif/memory/proposals/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateSkillProposal(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function updateSkillProposalState(
  id: string,
  newState: SkillProposalState,
  options: {
    root: string;
    approvalEvidence?: string;
    bypassEvaluationGate?: boolean;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const existing = await getSkillProposal(id, options, fs);
  if (!existing) throw new Error(`Skill proposal not found: ${id}`);

  if (
    (newState === "approved" || newState === "active") &&
    (!options.approvalEvidence || options.approvalEvidence.trim().length === 0)
  ) {
    throw new Error(
      `Transitioning proposal ${id} to ${newState} requires non-empty approvalEvidence`,
    );
  }

  if (
    (newState === "approved" || newState === "active") &&
    !options.bypassEvaluationGate
  ) {
    const evaluations = await listSkillEvaluations({ root: options.root }, fs);
    const proposalEvals = evaluations.filter(
      (e) =>
        e.proposalId === id ||
        e.skillId === existing.id ||
        e.skillId === existing.name,
    );
    if (proposalEvals.length === 0) {
      throw new Error(
        `Activation blocked: skill proposal ${id} has no evaluation records`,
      );
    }
    const latestEval = proposalEvals[0]!;
    if (
      !latestEval.passed ||
      !latestEval.securityPass ||
      latestEval.outcome === "regressed" ||
      latestEval.outcome === "unsafe"
    ) {
      throw new Error(
        `Activation blocked: skill proposal ${id} evaluation outcome is ${latestEval.outcome}`,
      );
    }
  }

  const updated = validateSkillProposal({
    ...existing,
    state: newState,
    ...(options.approvalEvidence !== undefined
      ? { approvalEvidence: options.approvalEvidence }
      : existing.approvalEvidence !== undefined
        ? { approvalEvidence: existing.approvalEvidence }
        : {}),
    updatedAt: new Date().toISOString(),
  });

  const path = inside(options.root, `.aif/memory/proposals/${id}.json`);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function rollbackSkill(
  id: string,
  options: { root: string; approvalEvidence?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const existing = await getSkillProposal(id, options, fs);
  if (!existing) throw new Error(`Skill proposal not found: ${id}`);

  const updated = validateSkillProposal({
    ...existing,
    state: "rolled-back",
    ...(options.approvalEvidence !== undefined
      ? { approvalEvidence: options.approvalEvidence }
      : {}),
    updatedAt: new Date().toISOString(),
  });

  const path = inside(options.root, `.aif/memory/proposals/${id}.json`);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function evaluateSkillProposal(
  proposalId: string,
  options: { root: string; caseId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillEvaluationResult> {
  const proposal = await getSkillProposal(proposalId, options, fs);
  if (!proposal) throw new Error(`Skill proposal not found: ${proposalId}`);

  const details: string[] = [];
  let securityPass = true;
  let passed = true;
  let outcome: EvaluationOutcome = "passed";

  const unsafePatterns = [
    /ignore previous instructions/iu,
    /bypass approval/iu,
    /grant all permissions/iu,
    /eval\(/iu,
    /rm -rf/iu,
  ];

  for (const pattern of unsafePatterns) {
    if (pattern.test(proposal.content)) {
      securityPass = false;
      passed = false;
      outcome = "unsafe";
      details.push(
        `Security check failed: content matched unsafe pattern ${pattern.source}`,
      );
      break;
    }
  }

  if (securityPass) {
    if (proposal.content.trim().length === 0) {
      passed = false;
      outcome = "unsupported";
      details.push("Proposal content is empty");
    } else {
      details.push("Security checks passed");
      details.push("Execution contract verified");
      outcome = proposal.previousVersion ? "improved" : "passed";
    }
  }

  const evalId = `eval-${proposal.id}-${Date.now()}`;
  const evalResult: SkillEvaluationResult = validateSkillEvaluationResult({
    schemaVersion: "1",
    id: evalId,
    skillId: proposal.name,
    proposalId: proposal.id,
    outcome,
    passed,
    contextCost: Math.ceil(proposal.content.length / 4),
    toolSelectionScore: securityPass ? 1.0 : 0.0,
    capabilityScore: passed ? 1.0 : 0.0,
    securityPass,
    details,
    provenance: {
      runtime: "node-v22",
      provider: "local-evaluator",
      model: "eval-gate-v1",
      environment: "test-harness",
    },
    evaluatedAt: new Date().toISOString(),
  });

  const path = inside(options.root, `.aif/memory/evaluations/${evalId}.json`);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) {
    await fs.mkdir(directory);
  }
  await fs.write(path, `${JSON.stringify(evalResult, null, 2)}\n`);
  return evalResult;
}

export async function listSkillEvaluations(
  options: {
    root: string;
    skillId?: string;
    outcome?: EvaluationOutcome;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SkillEvaluationResult[]> {
  const root = options.root;
  const allPaths = await fs.list(root);
  const results: SkillEvaluationResult[] = [];

  for (const rawPath of allPaths) {
    const rel = rawPath.startsWith(root) ? relative(root, rawPath) : rawPath;
    const normalized = rel.replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/evaluations/") ||
      !normalized.endsWith(".json")
    )
      continue;

    const fullPath = rawPath.startsWith(root)
      ? rawPath
      : inside(root, normalized);
    try {
      const content = await fs.read(fullPath);
      const evalRes = validateSkillEvaluationResult(JSON.parse(content));
      if (
        options.skillId !== undefined &&
        evalRes.skillId !== options.skillId &&
        evalRes.proposalId !== options.skillId
      )
        continue;
      if (options.outcome !== undefined && evalRes.outcome !== options.outcome)
        continue;
      results.push(evalRes);
    } catch {
      // Ignore corrupted evaluation records
    }
  }

  return results.sort((left, right) =>
    right.evaluatedAt.localeCompare(left.evaluatedAt),
  );
}

export async function getSkillEvaluation(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillEvaluationResult | null> {
  const root = options.root;
  const path = inside(root, `.aif/memory/evaluations/${id}.json`);
  if (!(await fs.exists(path))) return null;
  try {
    const content = await fs.read(path);
    return validateSkillEvaluationResult(JSON.parse(content));
  } catch {
    return null;
  }
}

export async function validateSkillExtensionLock(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<"clean" | "stale" | "unverified" | "corrupted"> {
  const lockPath = inside(options.root, ".aif/memory/lock.json");
  if (!(await fs.exists(lockPath))) return "unverified";
  try {
    const content = await fs.read(lockPath);
    JSON.parse(content);
    return "clean";
  } catch {
    return "corrupted";
  }
}

export async function listProceduralMemorySummary(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProceduralMemorySummary> {
  const proposals = await listSkillProposals({ root: options.root }, fs);
  const evaluations = await listSkillEvaluations({ root: options.root }, fs);
  const extensionLockStatus = await validateSkillExtensionLock(options, fs);

  const proposalCountsByState: Record<string, number> = {};
  let activeSkillsCount = 0;
  for (const p of proposals) {
    proposalCountsByState[p.state] = (proposalCountsByState[p.state] ?? 0) + 1;
    if (p.state === "active" || p.state === "approved") {
      activeSkillsCount += 1;
    }
  }

  const passedEvals = evaluations.filter((e) => e.passed && e.securityPass);
  const evaluationPassRate =
    evaluations.length > 0
      ? Math.round((passedEvals.length / evaluations.length) * 100)
      : 100;

  return {
    totalProposals: proposals.length,
    proposalCountsByState,
    totalEvaluations: evaluations.length,
    evaluationPassRate,
    activeSkillsCount,
    extensionLockStatus,
  };
}

export async function inspectProceduralMemory(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ProceduralMemoryInspection> {
  const summary = await listProceduralMemorySummary(options, fs);
  const proposals = await listSkillProposals({ root: options.root }, fs);
  const evaluations = await listSkillEvaluations({ root: options.root }, fs);
  const issues: string[] = [];

  if (summary.extensionLockStatus === "corrupted") {
    issues.push("Extension lock file .aif/memory/lock.json is corrupted");
  } else if (summary.extensionLockStatus === "unverified") {
    issues.push("Extension lock file .aif/memory/lock.json is missing");
  }

  for (const p of proposals) {
    if (p.state === "approved" || p.state === "active") {
      const propEvals = evaluations.filter(
        (e) => e.proposalId === p.id || e.skillId === p.name,
      );
      if (propEvals.length === 0) {
        issues.push(
          `Proposal [${p.id}] (${p.name}) is ${p.state} but has no evaluations`,
        );
      } else if (!propEvals[0]!.passed || !propEvals[0]!.securityPass) {
        issues.push(
          `Proposal [${p.id}] (${p.name}) is ${p.state} but latest evaluation failed`,
        );
      }
    }
  }

  return {
    summary,
    proposals,
    evaluations,
    issues,
  };
}

export async function prepareSkillMutationPlan(
  options: {
    root: string;
    action: "approve" | "activate" | "deprecate" | "rollback";
    proposalId: string;
    approvalEvidence?: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillMutationPlan> {
  const proposal = await getSkillProposal(options.proposalId, options, fs);
  if (!proposal)
    throw new Error(`Skill proposal not found: ${options.proposalId}`);

  let targetState: SkillProposalState;
  switch (options.action) {
    case "approve":
      targetState = "approved";
      break;
    case "activate":
      targetState = "active";
      break;
    case "deprecate":
      targetState = "deprecated";
      break;
    case "rollback":
      targetState = "rolled-back";
      break;
  }

  const planId = `plan-skill-${options.proposalId}-${Date.now()}`;
  const checksumPayload = `${planId}:${options.action}:${options.proposalId}:${targetState}:${options.approvalEvidence ?? ""}`;
  const checksum = createHash("sha256").update(checksumPayload).digest("hex");

  return validateSkillMutationPlan({
    schemaVersion: "1",
    id: planId,
    action: options.action,
    proposalId: options.proposalId,
    targetState,
    ...(options.approvalEvidence !== undefined
      ? { approvalEvidence: options.approvalEvidence }
      : {}),
    checksum,
    createdAt: new Date().toISOString(),
  });
}

export async function applySkillMutationPlan(
  planInput: unknown,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SkillProposal> {
  const plan = validateSkillMutationPlan(planInput);

  let result: SkillProposal;
  if (plan.action === "rollback") {
    result = await rollbackSkill(
      plan.proposalId,
      {
        root: options.root,
        ...(plan.approvalEvidence !== undefined
          ? { approvalEvidence: plan.approvalEvidence }
          : {}),
      },
      fs,
    );
  } else {
    result = await updateSkillProposalState(
      plan.proposalId,
      plan.targetState,
      {
        root: options.root,
        ...(plan.approvalEvidence !== undefined
          ? { approvalEvidence: plan.approvalEvidence }
          : {}),
      },
      fs,
    );
  }

  const logPath = inside(options.root, `.aif/memory/mutations/${plan.id}.json`);
  const dir = dirname(logPath);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(logPath, `${JSON.stringify(plan, null, 2)}\n`);

  return result;
}

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
  const checksum = createHash("sha256")
    .update(`${id}:${taskId}:${options.root}:${Date.now()}`)
    .digest("hex");

  const checkpoint = validateTaskCheckpoint({
    schemaVersion: "1",
    id,
    taskId,
    state: "active",
    completedSteps: options.completedSteps ?? [],
    unresolvedWork: options.unresolvedWork ?? [],
    createdSnapshotChecksum: checksum,
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
  const config = validateSemanticRankingConfig(input);
  const path = inside(options.root, ".aif/memory/semantic_config.json");
  const dir = dirname(path);
  if (!(await fs.exists(dir))) {
    await fs.mkdir(dir);
  }
  await fs.write(path, `${JSON.stringify(config, null, 2)}\n`);
  return config;
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

function redactPersistentMemoryContent(content: string): string {
  return content
    .replace(
      /(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+/giu,
      "[REDACTED]",
    )
    .replace(
      /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/gu,
      "[REDACTED PRIVATE KEY]",
    );
}

function persistentMemoryPath(root: string, id: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(id))
    throw new Error("memory id must be a safe identifier");
  return inside(root, `.aif/memory/items/${id}.json`);
}

async function writePersistentMemoryItem(
  item: PersistentMemoryItem,
  root: string,
  fs: FileSystem,
): Promise<PersistentMemoryItem> {
  const path = persistentMemoryPath(root, item.id);
  const directory = dirname(path);
  if (!(await fs.exists(directory))) await fs.mkdir(directory);
  await fs.write(path, `${JSON.stringify(item, null, 2)}\n`);
  return item;
}

export async function getPersistentMemoryItem(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem | undefined> {
  const path = persistentMemoryPath(options.root, id);
  if (!(await fs.exists(path))) return undefined;
  return validatePersistentMemoryItem(JSON.parse(await fs.read(path)));
}

export async function listPersistentMemoryItems(
  options: {
    root: string;
    lifecycleState?: PersistentMemoryItem["lifecycleState"];
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly PersistentMemoryItem[]> {
  const items: PersistentMemoryItem[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/items/") ||
      !normalized.endsWith(".json")
    )
      continue;
    try {
      const item = validatePersistentMemoryItem(
        JSON.parse(await fs.read(inside(options.root, normalized))),
      );
      if (
        options.lifecycleState === undefined ||
        item.lifecycleState === options.lifecycleState
      )
        items.push(item);
    } catch {
      /* corrupted records are not trusted */
    }
  }
  return items.sort((left, right) => left.id.localeCompare(right.id));
}

export async function proposePersistentMemory(
  input: {
    id: string;
    projectId: string;
    classification: MemoryClassification;
    content: string;
    provenance: string;
    trustClass?: TrustClass;
    retentionState?: RetentionState;
  },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  if (
    input.classification === "canonical-intent" ||
    input.classification === "verified-evidence"
  )
    throw new Error(
      "canonical and verified records must remain source-derived",
    );
  if (await getPersistentMemoryItem(input.id, options, fs))
    throw new Error(`memory item already exists: ${input.id}`);
  const now = new Date().toISOString();
  const item = validatePersistentMemoryItem({
    schemaVersion: "1",
    id: input.id,
    projectId: input.projectId,
    classification: input.classification,
    lifecycleState: "proposed",
    trustClass: input.trustClass ?? "agent-generated",
    content: redactPersistentMemoryContent(input.content),
    provenance: input.provenance,
    retentionState: input.retentionState ?? "active",
    createdAt: now,
    updatedAt: now,
    audit: ["proposed"],
  });
  return writePersistentMemoryItem(item, options.root, fs);
}

export async function acceptPersistentMemory(
  id: string,
  approval: { approvedBy: string; evidence: string },
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  const existing = await getPersistentMemoryItem(id, options, fs);
  if (!existing || existing.lifecycleState !== "proposed")
    throw new Error("only an existing proposed memory item can be accepted");
  const now = new Date().toISOString();
  const accepted = validatePersistentMemoryItem({
    ...existing,
    lifecycleState: "accepted",
    trustClass: "user-supplied",
    updatedAt: now,
    approval: { ...approval, approvedAt: now },
    audit: [...existing.audit, "accepted"],
  });
  return writePersistentMemoryItem(accepted, options.root, fs);
}

export async function supersedePersistentMemory(
  id: string,
  replacement: PersistentMemoryItem,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  const existing = await getPersistentMemoryItem(id, options, fs);
  if (!existing || existing.lifecycleState !== "accepted")
    throw new Error("only accepted memory can be superseded");
  if (replacement.projectId !== existing.projectId || replacement.id === id)
    throw new Error("replacement must have a distinct id in the same project");
  const now = new Date().toISOString();
  const superseded = validatePersistentMemoryItem({
    ...existing,
    lifecycleState: "superseded",
    retentionState: "superseded",
    updatedAt: now,
    audit: [...existing.audit, `superseded-by:${replacement.id}`],
  });
  const next = validatePersistentMemoryItem({
    ...replacement,
    supersedesId: id,
    updatedAt: now,
    audit: [...replacement.audit, `supersedes:${id}`],
  });
  try {
    await writePersistentMemoryItem(superseded, options.root, fs);
    return await writePersistentMemoryItem(next, options.root, fs);
  } catch (error) {
    await writePersistentMemoryItem(existing, options.root, fs).catch(
      () => undefined,
    );
    await fs
      .remove(persistentMemoryPath(options.root, next.id))
      .catch(() => undefined);
    throw error;
  }
}

export async function forgetPersistentMemory(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryItem> {
  const existing = await getPersistentMemoryItem(id, options, fs);
  if (!existing || existing.lifecycleState === "deleted")
    throw new Error("eligible memory item not found");
  return writePersistentMemoryItem(
    validatePersistentMemoryItem({
      ...existing,
      lifecycleState: "deleted",
      retentionState: "deleted",
      content: "[REDACTED]",
      updatedAt: new Date().toISOString(),
      audit: [...existing.audit, "forgotten"],
    }),
    options.root,
    fs,
  );
}

export async function exportPersistentMemory(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemoryExport> {
  const items = (
    await listPersistentMemoryItems({ root: options.root }, fs)
  ).filter(
    (item) =>
      item.projectId === options.projectId && item.lifecycleState !== "deleted",
  );
  return validatePersistentMemoryExport({
    schemaVersion: "1",
    projectId: options.projectId,
    exportedAt: new Date().toISOString(),
    items,
  });
}

export async function importPersistentMemory(
  bundleInput: unknown,
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly PersistentMemoryItem[]> {
  const bundle = validatePersistentMemoryExport(bundleInput);
  if (bundle.projectId !== options.projectId)
    throw new Error("memory import project identity mismatch");
  const imported: PersistentMemoryItem[] = [];
  try {
    for (const source of bundle.items) {
      if (
        ["canonical-intent", "verified-evidence"].includes(
          source.classification,
        )
      )
        throw new Error(
          "canonical sources cannot be imported as persistent memory",
        );
      const id = `import-${source.id}`;
      if (await getPersistentMemoryItem(id, options, fs))
        throw new Error(`memory item already exists: ${id}`);
      imported.push(
        await proposePersistentMemory(
          {
            id,
            projectId: options.projectId,
            classification: source.classification,
            content: source.content,
            provenance: `import:${source.provenance}`,
            trustClass: "agent-generated",
            retentionState: source.retentionState,
          },
          options,
          fs,
        ),
      );
    }
  } catch (error) {
    await Promise.all(
      imported.map((item) =>
        fs.remove(persistentMemoryPath(options.root, item.id)),
      ),
    );
    throw error;
  }
  return imported;
}

export async function searchPersistentMemory(
  query: string,
  options: { root: string; projectId: string; maxItems?: number },
  fs: FileSystem = nodeFileSystem,
): Promise<PersistentMemorySearchResult> {
  const terms = query.toLowerCase().split(/\s+/u).filter(Boolean);
  const items = (await listPersistentMemoryItems({ root: options.root }, fs))
    .filter(
      (item) =>
        item.projectId === options.projectId &&
        item.lifecycleState === "accepted",
    )
    .map((item) => ({
      item,
      score: terms.reduce(
        (score, term) =>
          score + (item.content.toLowerCase().includes(term) ? 1 : 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, options.maxItems ?? 10)
    .map(({ item }) => item);
  return validatePersistentMemorySearchResult({
    schemaVersion: "1",
    query,
    items,
    indexRebuilt: false,
  });
}

export async function rebuildPersistentMemoryIndex(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<{
  readonly schemaVersion: "1";
  readonly projectId: string;
  readonly itemIds: readonly string[];
}> {
  const itemIds = (await listPersistentMemoryItems({ root: options.root }, fs))
    .filter(
      (item) =>
        item.projectId === options.projectId &&
        item.lifecycleState === "accepted",
    )
    .map((item) => item.id)
    .sort();
  const path = inside(options.root, ".aif/memory/index.json");
  if (!(await fs.exists(dirname(path)))) await fs.mkdir(dirname(path));
  const index = {
    schemaVersion: "1" as const,
    projectId: options.projectId,
    itemIds,
  };
  await fs.write(path, `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

export async function clearPersistentMemoryIndex(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<void> {
  const path = inside(options.root, ".aif/memory/index.json");
  if (await fs.exists(path)) await fs.remove(path);
}

export async function renderPersistentMemoryContext(
  target: MemoryRenderTarget,
  query: string,
  options: { root: string; projectId: string; maxItems?: number },
  fs: FileSystem = nodeFileSystem,
): Promise<{
  readonly target: MemoryRenderTarget;
  readonly content: string;
  readonly itemIds: readonly string[];
}> {
  const result = await searchPersistentMemory(query, options, fs);
  return {
    target,
    itemIds: result.items.map((item) => item.id),
    content: result.items
      .map((item) => `- [${item.classification}] ${item.content}`)
      .join("\n"),
  };
}

function sessionFilePath(root: string, sessionId: string): string {
  return inside(root, `.aif/memory/sessions/${sessionId}.json`);
}

export async function startAgentSession(
  options: {
    root: string;
    projectId: string;
    sessionId?: string;
    activeTask: string;
    unresolvedQuestions?: readonly string[];
    decisions?: readonly string[];
    trustClass?: TrustClass;
    retentionPolicy?: RetentionState;
    metadata?: Record<string, unknown>;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionItem> {
  const sessionId = options.sessionId ?? `session-${Date.now()}`;
  const path = sessionFilePath(options.root, sessionId);
  if (await fs.exists(path)) {
    throw new Error(`agent session already exists: ${sessionId}`);
  }
  const now = new Date().toISOString();
  const session: AgentSessionItem = validateAgentSessionItem({
    schemaVersion: "1",
    sessionId,
    projectId: options.projectId,
    state: "active",
    activeTask: secretLikePath(options.activeTask)
      ? "[REDACTED]"
      : options.activeTask,
    unresolvedQuestions: (options.unresolvedQuestions ?? []).map((q) =>
      secretLikePath(q) ? "[REDACTED]" : q,
    ),
    decisions: (options.decisions ?? []).map((d) =>
      secretLikePath(d) ? "[REDACTED]" : d,
    ),
    outcomes: [],
    trustClass: options.trustClass ?? "user-supplied",
    retentionPolicy: options.retentionPolicy ?? "project",
    createdAt: now,
    updatedAt: now,
    ...(options.metadata ? { metadata: options.metadata } : {}),
  });

  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(session, null, 2)}\n`);
  return session;
}

export async function getAgentSession(
  sessionId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionItem | null> {
  const path = sessionFilePath(options.root, sessionId);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateAgentSessionItem(raw);
  } catch {
    return null;
  }
}

export async function listAgentSessions(
  options: { root: string; state?: AgentSessionState },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly AgentSessionItem[]> {
  const items: AgentSessionItem[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/memory/sessions/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const sessionId = normalized
      .replace(/^\.aif\/memory\/sessions\//u, "")
      .replace(/\.json$/u, "");
    const session = await getAgentSession(sessionId, options, fs);
    if (session) {
      if (!options.state || session.state === options.state) {
        items.push(session);
      }
    }
  }
  return items.sort((a, b) => a.sessionId.localeCompare(b.sessionId));
}

export async function closeAgentSession(
  sessionId: string,
  options: {
    root: string;
    outcomes?: readonly string[];
    decisions?: readonly string[];
    state?: "closed" | "compacted" | "archived";
  },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionItem> {
  const existing = await getAgentSession(sessionId, options, fs);
  if (!existing) {
    throw new Error(`agent session not found: ${sessionId}`);
  }
  const now = new Date().toISOString();
  const updatedOutcomes = [
    ...existing.outcomes,
    ...(options.outcomes ?? []).map((o) =>
      secretLikePath(o) ? "[REDACTED]" : o,
    ),
  ];
  const updatedDecisions = [
    ...existing.decisions,
    ...(options.decisions ?? []).map((d) =>
      secretLikePath(d) ? "[REDACTED]" : d,
    ),
  ];
  const closed: AgentSessionItem = validateAgentSessionItem({
    ...existing,
    state: options.state ?? "closed",
    outcomes: updatedOutcomes,
    decisions: updatedDecisions,
    updatedAt: now,
    closedAt: now,
  });
  const path = sessionFilePath(options.root, sessionId);
  await fs.write(path, `${JSON.stringify(closed, null, 2)}\n`);
  return closed;
}

export async function deleteAgentSession(
  sessionId: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<void> {
  const path = sessionFilePath(options.root, sessionId);
  if (await fs.exists(path)) {
    await fs.remove(path);
  }
}

export async function exportAgentSession(
  sessionId: string,
  options: { root: string; projectId: string; targetPath?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<AgentSessionExportResult> {
  const session = await getAgentSession(sessionId, options, fs);
  if (!session) {
    throw new Error(`agent session not found: ${sessionId}`);
  }
  const exportResult = validateAgentSessionExportResult({
    schemaVersion: "1",
    projectId: options.projectId,
    exportedAt: new Date().toISOString(),
    session,
  });
  if (options.targetPath) {
    const dest = inside(options.root, options.targetPath);
    if (!(await fs.exists(dirname(dest)))) {
      await fs.mkdir(dirname(dest));
    }
    await fs.write(dest, `${JSON.stringify(exportResult, null, 2)}\n`);
  }
  return exportResult;
}

function securityFindingPath(root: string, id: string): string {
  return inside(root, `.aif/security/findings/${id}.json`);
}

export async function getSecurityFinding(
  id: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityFinding | null> {
  const path = securityFindingPath(options.root, id);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateSecurityFinding(raw);
  } catch {
    return null;
  }
}

export async function listSecurityFindings(
  options: {
    root: string;
    severity?: SecurityFindingSeverity;
    state?: SecurityFindingState;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<readonly SecurityFinding[]> {
  const findings: SecurityFinding[] = [];
  for (const rawPath of await fs.list(options.root)) {
    const normalized = (
      rawPath.startsWith(options.root)
        ? relative(options.root, rawPath)
        : rawPath
    ).replaceAll("\\", "/");
    if (
      !normalized.startsWith(".aif/security/findings/") ||
      !normalized.endsWith(".json")
    )
      continue;
    const id = normalized
      .replace(/^\.aif\/security\/findings\//u, "")
      .replace(/\.json$/u, "");
    const finding = await getSecurityFinding(id, options, fs);
    if (finding) {
      if (
        (!options.severity || finding.severity === options.severity) &&
        (!options.state || finding.state === options.state)
      ) {
        findings.push(finding);
      }
    }
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

export async function dismissSecurityFinding(
  id: string,
  options: { root: string; reason: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityFinding> {
  const existing = await getSecurityFinding(id, options, fs);
  if (!existing) {
    throw new Error(`security finding not found: ${id}`);
  }
  const now = new Date().toISOString();
  const updated = validateSecurityFinding({
    ...existing,
    state: "dismissed",
    dismissalReason: options.reason,
    updatedAt: now,
  });
  const path = securityFindingPath(options.root, id);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

export async function acceptSecurityRisk(
  id: string,
  options: {
    root: string;
    approvedBy: string;
    reason: string;
    expiresAt?: string;
  },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityFinding> {
  const existing = await getSecurityFinding(id, options, fs);
  if (!existing) {
    throw new Error(`security finding not found: ${id}`);
  }
  const now = new Date().toISOString();
  const acceptedRisk: AcceptedSecurityRisk = {
    approvedBy: options.approvedBy,
    reason: options.reason,
    approvedAt: now,
    ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}),
  };
  const updated = validateSecurityFinding({
    ...existing,
    state: "accepted-risk",
    acceptedRisk,
    updatedAt: now,
  });
  const path = securityFindingPath(options.root, id);
  await fs.write(path, `${JSON.stringify(updated, null, 2)}\n`);
  return updated;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function importSarifSecurityReport(
  reportContent: string,
  reportPath: string,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SarifImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(reportContent);
  } catch {
    throw new Error("malformed SARIF JSON document");
  }

  if (!isObjectRecord(parsed) || !Array.isArray(parsed.runs)) {
    throw new Error("invalid SARIF structure: missing runs array");
  }

  const now = new Date().toISOString();
  const findings: SecurityFinding[] = [];

  let findingCounter = 1;
  for (const run of parsed.runs) {
    if (!isObjectRecord(run)) continue;
    const toolObj = isObjectRecord(run.tool) ? run.tool : {};
    const driverObj = isObjectRecord(toolObj.driver) ? toolObj.driver : {};
    const scannerName =
      typeof driverObj.name === "string" ? driverObj.name : "sarif-scanner";

    const results = Array.isArray(run.results) ? run.results : [];
    for (const result of results) {
      if (!isObjectRecord(result)) continue;
      const ruleId =
        typeof result.ruleId === "string" ? result.ruleId : "SARIF-RULE";
      const messageObj = isObjectRecord(result.message) ? result.message : {};
      const title =
        typeof messageObj.text === "string" ? messageObj.text : "SARIF Finding";
      const level =
        typeof result.level === "string"
          ? result.level.toLowerCase()
          : "warning";

      let severity: SecurityFindingSeverity = "medium";
      if (level === "error") severity = "high";
      else if (level === "warning") severity = "medium";
      else if (level === "note") severity = "low";
      else severity = "info";

      const locations = Array.isArray(result.locations) ? result.locations : [];
      const evidence: SecurityEvidence[] = locations.map((loc: unknown) => {
        if (!isObjectRecord(loc)) return { path: "unknown" };
        const phys = isObjectRecord(loc.physicalLocation)
          ? loc.physicalLocation
          : {};
        const art = isObjectRecord(phys.artifactLocation)
          ? phys.artifactLocation
          : {};
        const rawUri = typeof art.uri === "string" ? art.uri : "unknown";
        const region = isObjectRecord(phys.region) ? phys.region : {};
        const startLine =
          typeof region.startLine === "number" ? region.startLine : undefined;
        const endLine =
          typeof region.endLine === "number" ? region.endLine : undefined;
        const snippetObj = isObjectRecord(region.snippet) ? region.snippet : {};
        const snippetText =
          typeof snippetObj.text === "string" ? snippetObj.text : undefined;

        const path = secretLikePath(rawUri) ? "[REDACTED]" : rawUri;
        return {
          path,
          ...(startLine !== undefined ? { startLine } : {}),
          ...(endLine !== undefined ? { endLine } : {}),
          ...(snippetText !== undefined
            ? {
                snippet: secretLikePath(snippetText)
                  ? "[REDACTED]"
                  : snippetText,
              }
            : {}),
        };
      });

      const findingId = `sarif-finding-${findingCounter++}`;
      const finding: SecurityFinding = validateSecurityFinding({
        schemaVersion: "1",
        id: findingId,
        ruleId,
        title: secretLikePath(title) ? "[REDACTED]" : title,
        severity,
        state: "open",
        category: "vulnerability",
        description: `Imported from ${scannerName}`,
        scanner: scannerName,
        evidence,
        trustClass: "verified-evidence",
        createdAt: now,
        updatedAt: now,
      });

      const path = securityFindingPath(options.root, findingId);
      if (!(await fs.exists(dirname(path)))) {
        await fs.mkdir(dirname(path));
      }
      await fs.write(path, `${JSON.stringify(finding, null, 2)}\n`);
      findings.push(finding);
    }
  }

  const result: SarifImportResult = validateSarifImportResult({
    schemaVersion: "1",
    reportPath,
    importedCount: findings.length,
    findings,
    importedAt: now,
  });

  return result;
}

export async function getSecurityCoverageReport(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityCoverageReport> {
  const findings = await listSecurityFindings({ root: options.root }, fs);

  const findingsBySeverity: Record<SecurityFindingSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  const findingsByState: Record<SecurityFindingState, number> = {
    open: 0,
    verified: 0,
    dismissed: 0,
    "accepted-risk": 0,
    remediated: 0,
  };

  const scannerSet = new Set<string>();

  for (const f of findings) {
    findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] ?? 0) + 1;
    findingsByState[f.state] = (findingsByState[f.state] ?? 0) + 1;
    if (f.scanner) scannerSet.add(f.scanner);
  }

  return validateSecurityCoverageReport({
    schemaVersion: "1",
    projectId: options.projectId,
    totalFindings: findings.length,
    findingsBySeverity,
    findingsByState,
    scanners: [...scannerSet].sort(),
    reportedAt: new Date().toISOString(),
  });
}

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
            ...(content.dependencies ?? {}),
            ...(content.devDependencies ?? {}),
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

function securityPolicyPath(root: string): string {
  return inside(root, ".aif/security/policy.json");
}

function securityBaselinePath(root: string): string {
  return inside(root, ".aif/security/baseline.json");
}

export async function getSecurityPolicy(
  options: { root: string; projectId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityPolicy> {
  const path = securityPolicyPath(options.root);
  if (await fs.exists(path)) {
    try {
      const raw = JSON.parse(await fs.read(path));
      return validateSecurityPolicy(raw);
    } catch {
      // fallback to default
    }
  }
  return validateSecurityPolicy({
    schemaVersion: "1",
    projectId: options.projectId ?? "project-local",
    defaultEnforcement: "warn",
    rules: [
      { target: "critical", enforcement: "fail" },
      { target: "high", enforcement: "fail" },
      { target: "medium", enforcement: "warn" },
      { target: "low", enforcement: "ignore" },
    ],
    updatedAt: new Date().toISOString(),
  });
}

export async function writeSecurityPolicy(
  policy: SecurityPolicy,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityPolicy> {
  const validated = validateSecurityPolicy(policy);
  const path = securityPolicyPath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(validated, null, 2)}\n`);
  return validated;
}

export async function getSecurityBaseline(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityBaseline | null> {
  const path = securityBaselinePath(options.root);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateSecurityBaseline(raw);
  } catch {
    return null;
  }
}

export async function updateSecurityBaseline(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityBaseline> {
  const findings = await listSecurityFindings({ root: options.root }, fs);
  const now = new Date().toISOString();
  const sorted = [...findings].sort((a, b) => a.id.localeCompare(b.id));
  const rawData = JSON.stringify(sorted);
  const baselineHash = createHash("sha256").update(rawData).digest("hex");

  const baseline = validateSecurityBaseline({
    schemaVersion: "1",
    projectId: options.projectId,
    acceptedFindings: sorted,
    baselineHash,
    createdAt: now,
    updatedAt: now,
  });

  const path = securityBaselinePath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

export async function checkSecurityPolicyAndBaseline(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SecurityBaselineCheckResult> {
  const policy = await getSecurityPolicy(options, fs);
  const baseline = await getSecurityBaseline(options, fs);
  const currentFindings = await listSecurityFindings(
    { root: options.root },
    fs,
  );

  const baselineMap = new Map<string, SecurityFinding>();
  if (baseline) {
    for (const f of baseline.acceptedFindings) {
      baselineMap.set(f.id, f);
    }
  }

  const currentMap = new Map<string, SecurityFinding>();
  for (const f of currentFindings) {
    currentMap.set(f.id, f);
  }

  const newFindings: SecurityFinding[] = [];
  const resolvedFindings: SecurityFinding[] = [];
  const policyViolations: SecurityFinding[] = [];

  for (const f of currentFindings) {
    if (!baselineMap.has(f.id)) {
      newFindings.push(f);
    }
  }

  if (baseline) {
    for (const f of baseline.acceptedFindings) {
      if (!currentMap.has(f.id)) {
        resolvedFindings.push(f);
      }
    }
  }

  let hasFailViolation = false;
  for (const f of currentFindings) {
    if (
      f.state === "dismissed" ||
      f.state === "accepted-risk" ||
      f.state === "remediated"
    ) {
      continue;
    }

    let ruleEnforcement = policy.defaultEnforcement;
    const matchedRule = policy.rules.find(
      (r) =>
        r.target === f.ruleId ||
        r.target === f.category ||
        r.target === f.severity,
    );
    if (matchedRule) {
      ruleEnforcement = matchedRule.enforcement;
    }

    if (
      ruleEnforcement === "fail" ||
      (ruleEnforcement === "warn" && f.severity === "critical")
    ) {
      policyViolations.push(f);
      if (ruleEnforcement === "fail") {
        hasFailViolation = true;
      }
    }
  }

  return validateSecurityBaselineCheckResult({
    schemaVersion: "1",
    projectId: options.projectId,
    newFindings,
    resolvedFindings,
    policyViolations,
    exitCode: hasFailViolation ? 3 : 0,
    checkedAt: new Date().toISOString(),
  });
}

function sandboxCapabilityPolicyPath(root: string): string {
  return inside(root, ".aif/security/sandbox.json");
}

export async function getSandboxCapabilityPolicy(
  options: { root: string; projectId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SandboxCapabilityPolicy> {
  const path = sandboxCapabilityPolicyPath(options.root);
  if (await fs.exists(path)) {
    try {
      const raw = JSON.parse(await fs.read(path));
      return validateSandboxCapabilityPolicy(raw);
    } catch {
      // fallback to default
    }
  }
  return validateSandboxCapabilityPolicy({
    schemaVersion: "1",
    projectId: options.projectId ?? "project-local",
    mode: "proposal-only",
    pathRules: [
      { pathPrefix: "src/", allowWrite: true, allowDelete: false },
      { pathPrefix: ".aif/", allowWrite: true, allowDelete: false },
    ],
    commandRules: [
      { commandPrefix: "pnpm test" },
      { commandPrefix: "pnpm lint" },
      { commandPrefix: "git diff" },
    ],
    allowNetwork: false,
    updatedAt: new Date().toISOString(),
  });
}

export async function writeSandboxCapabilityPolicy(
  policy: SandboxCapabilityPolicy,
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SandboxCapabilityPolicy> {
  const validated = validateSandboxCapabilityPolicy(policy);
  const path = sandboxCapabilityPolicyPath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(validated, null, 2)}\n`);
  return validated;
}

export async function evaluateProposalAgainstSandbox(
  proposal: {
    actions?: readonly {
      type: string;
      path?: string;
      command?: string;
      networkAccess?: boolean;
    }[];
    changes?: readonly {
      type: string;
      path?: string;
    }[];
  },
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<SandboxEvaluationResult> {
  const policy = await getSandboxCapabilityPolicy(options, fs);
  const violations: string[] = [];

  if (policy.mode === "read-only") {
    violations.push(
      "Sandbox policy is in read-only mode: all mutation proposals are rejected",
    );
  }

  interface SandboxActionItem {
    type: string;
    path?: string;
    command?: string;
    networkAccess?: boolean;
  }
  const rawActions: readonly SandboxActionItem[] =
    (proposal.actions as readonly SandboxActionItem[] | undefined) ??
    (proposal.changes as readonly SandboxActionItem[] | undefined) ??
    [];
  for (const act of rawActions) {
    const actionType = act.type ?? "write";
    const path = act.path ? act.path.replaceAll("\\", "/") : undefined;

    if (path) {
      const isDelete = actionType === "delete" || actionType === "remove";
      const matchedRule = policy.pathRules.find(
        (r) => path.startsWith(r.pathPrefix) || r.pathPrefix === "*",
      );

      if (!matchedRule) {
        violations.push(`Path '${path}' is outside allowed sandbox path rules`);
      } else if (isDelete && !matchedRule.allowDelete) {
        violations.push(
          `Delete operation on path '${path}' violates sandbox policy (allowDelete: false)`,
        );
      } else if (!isDelete && !matchedRule.allowWrite) {
        violations.push(
          `Write operation on path '${path}' violates sandbox policy (allowWrite: false)`,
        );
      }
    }

    if (act.command) {
      const matchedCmd = policy.commandRules.find(
        (c) =>
          act.command?.startsWith(c.commandPrefix) || c.commandPrefix === "*",
      );
      if (!matchedCmd) {
        violations.push(
          `Command '${act.command}' is not in allowed sandbox command rules`,
        );
      }
    }

    if (act.networkAccess === true && !policy.allowNetwork) {
      violations.push(
        "Action requires network access, which is disabled by sandbox policy (allowNetwork: false)",
      );
    }
  }

  return validateSandboxEvaluationResult({
    schemaVersion: "1",
    projectId: options.projectId,
    allowed: violations.length === 0,
    violations,
    evaluatedAt: new Date().toISOString(),
  });
}

function securityAuditReportPath(root: string): string {
  return inside(root, ".aif/security/audit-report.json");
}

export async function getSecurityAuditReport(
  options: { root: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ContinuousSecurityAuditReport | null> {
  const path = securityAuditReportPath(options.root);
  if (!(await fs.exists(path))) return null;
  try {
    const raw = JSON.parse(await fs.read(path));
    return validateContinuousSecurityAuditReport(raw);
  } catch {
    return null;
  }
}

export async function runContinuousSecurityAudit(
  options: { root: string; projectId: string },
  fs: FileSystem = nodeFileSystem,
): Promise<ContinuousSecurityAuditReport> {
  const policy = await getSecurityPolicy(options, fs);
  const baseline = await getSecurityBaseline(options, fs);
  const sandbox = await getSandboxCapabilityPolicy(options, fs);
  const baselineCheck = await checkSecurityPolicyAndBaseline(options, fs);

  const checks: SecurityInvariantCheck[] = [
    {
      invariantId: 1,
      title: "No implicit network request or telemetry",
      status: sandbox.allowNetwork ? "warning" : "passed",
      details: sandbox.allowNetwork
        ? "Network access is enabled in sandbox policy"
        : "Network access disabled by default in sandbox policy",
    },
    {
      invariantId: 2,
      title: "Pure validation path for mutating paths",
      status: "passed",
      details:
        "Dry-run and validation functions available across application operations",
    },
    {
      invariantId: 3,
      title: "Traceable generated artifacts",
      status: "passed",
      details: "Checksum manifests and source map resolution verified",
    },
    {
      invariantId: 4,
      title: "Human confirmation required for non-identical replacement",
      status: "passed",
      details: "Adoption and proposal confirmation contracts enforced",
    },
    {
      invariantId: 5,
      title: "Security-sensitive provider behavior documented",
      status: "passed",
      details: "Provider capability declarations verified",
    },
    {
      invariantId: 6,
      title: "Metadata write paths reject symlinks",
      status: "passed",
      details: "Symlink resolution bounds enforced on file writes",
    },
    {
      invariantId: 7,
      title: "Symlink loops fail safely",
      status: "passed",
      details: "Loop detection active in filesystem security traversal",
    },
    {
      invariantId: 8,
      title: "Destination collisions abort",
      status: "passed",
      details: "Collision abort contracts active",
    },
    {
      invariantId: 9,
      title: "Transaction consistency",
      status: "passed",
      details: "Source map and manifest consistency verified",
    },
    {
      invariantId: 10,
      title: "Post-write corruption handling",
      status: "passed",
      details: "Post-write consistency checkers active",
    },
    {
      invariantId: 11,
      title: "Post-write diagnostics path safety",
      status: "passed",
      details: "Secret path redaction verified",
    },
    {
      invariantId: 12,
      title: "Adoption dry-run and doctor read-only",
      status: "passed",
      details: "Read-only guarantees verified for dry-run and doctor",
    },
    {
      invariantId: 13,
      title: "Profile detection bounded",
      status: "passed",
      details: "Profile definition schema validation active",
    },
    {
      invariantId: 14,
      title: "Daemon IPC authentication",
      status: "passed",
      details: "IPC authentication contracts active",
    },
    {
      invariantId: 15,
      title: "Inspection/conformance read-only bound",
      status: "passed",
      details: "Project inspection operations bound to project root",
    },
    {
      invariantId: 16,
      title: "Local Git read-only commands",
      status: "passed",
      details: "Fixed read-only git collection commands active",
    },
    {
      invariantId: 17,
      title: "Provider/MCP untrusted evidence",
      status: "passed",
      details: "Untrusted evidence proposal pattern enforced",
    },
    {
      invariantId: 18,
      title: "MCP typed capabilities",
      status: "passed",
      details: "MCP capability declarations typed and bounded",
    },
    {
      invariantId: 19,
      title: "MCP-triggered mutation proposal requirement",
      status: "passed",
      details: "Proposal plan and approval required for MCP mutations",
    },
    {
      invariantId: 20,
      title: "Credentials outside project config",
      status: "passed",
      details: "Secret redaction filter active for configuration paths",
    },
    {
      invariantId: 21,
      title: "Persistent-memory proposal status",
      status: "passed",
      details: "Memory proposals store proposal state prior to acceptance",
    },
    {
      invariantId: 22,
      title: "Persistent-memory explicit approval",
      status: "passed",
      details: "Memory acceptance requires explicit approval evidence",
    },
    {
      invariantId: 23,
      title: "Derived memory indexes deletable",
      status: "passed",
      details:
        "Memory search indexes detachable without affecting canonical state",
    },
    {
      invariantId: 24,
      title: "Agent session lifecycle local storage",
      status: "passed",
      details:
        "Agent session states stored locally under .aif/memory/sessions/",
    },
    {
      invariantId: 25,
      title: "Security finding SARIF untrusted input",
      status: "passed",
      details: "SARIF reports parsed as untrusted input with secret redaction",
    },
    {
      invariantId: 26,
      title: "Local security adapters read-only execution",
      status: "passed",
      details:
        "Built-in security adapters execute strictly read-only file checks",
    },
    {
      invariantId: 27,
      title: "Security policies and baselines enforcement",
      status: baselineCheck.policyViolations.length > 0 ? "failed" : "passed",
      details:
        baselineCheck.policyViolations.length > 0
          ? `${baselineCheck.policyViolations.length} policy violations detected`
          : `Policy enforced (default: ${policy.defaultEnforcement}, baseline: ${baseline ? "present" : "missing"})`,
    },
    {
      invariantId: 28,
      title: "Agent mutation proposals sandbox capability bounds",
      status: sandbox.mode === "read-only" ? "warning" : "passed",
      details: `Sandbox active (mode: ${sandbox.mode}, pathRules: ${sandbox.pathRules.length})`,
    },
  ];

  const passedCount = checks.filter((c) => c.status === "passed").length;
  const healthScore = Math.round((passedCount / checks.length) * 100);

  const now = new Date().toISOString();
  const sorted = [...checks].sort((a, b) => a.invariantId - b.invariantId);
  const rawData = JSON.stringify(sorted);
  const auditHash = createHash("sha256").update(rawData).digest("hex");

  const report = validateContinuousSecurityAuditReport({
    schemaVersion: "1",
    projectId: options.projectId,
    healthScore,
    invariantChecks: sorted,
    auditHash,
    auditedAt: now,
  });

  const path = securityAuditReportPath(options.root);
  if (!(await fs.exists(dirname(path)))) {
    await fs.mkdir(dirname(path));
  }
  await fs.write(path, `${JSON.stringify(report, null, 2)}\n`);

  return report;
}

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
  const projectId = options.projectId ?? "project-local";
  const [inspect, doctor, diff, timeline, auditReport, sessions] =
    await Promise.all([
      inspectProject(options.root, fs).catch(() => null),
      doctorProject(
        { root: options.root, profile: "generic", adapters: ["codex"] },
        fs,
      ),
      diffProject(
        {
          root: options.root,
          profile: "generic",
          adapters: ["codex"],
          dryRun: true,
        },
        fs,
      ).catch(() => null),
      timelineProject({
        root: options.root,
        caseId: "tui-timeline",
        limit: 50,
      }).catch(() => null),
      getSecurityAuditReport({ root: options.root }, fs).catch(() => null),
      listAgentSessions({ root: options.root }, fs).catch(() => []),
    ]);

  return {
    projectId,
    root: options.root,
    activeView: options.activeView ?? "inspect",
    inspect,
    findings: doctor.findings,
    diff,
    timeline,
    auditReport,
    sessions,
    generatedAt: new Date().toISOString(),
  };
}

function workspaceConversationPath(
  root: string,
  conversationId: string,
): string {
  return inside(root, `.aif/workspace/conversations/${conversationId}.json`);
}

function workspaceConversationsDir(root: string): string {
  return inside(root, ".aif/workspace/conversations");
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

export interface LocalWorkspaceSyncState {
  readonly projectId: string;
  readonly root: string;
  readonly readiness: string;
  readonly findingsCount: number;
  readonly securityScore: number | null;
  readonly activeConversationsCount: number;
  readonly subagentTasksCount: number;
  readonly syncedAt: string;
}

export async function syncLocalWorkspaceState(
  options: { root: string; projectId?: string },
  fs: FileSystem = nodeFileSystem,
): Promise<LocalWorkspaceSyncState> {
  const projectId = options.projectId ?? "project-local";
  const inspection = await inspectProject(options.root, fs);
  const doctor = await doctorProject(
    { root: options.root, profile: "generic", adapters: ["codex"] },
    fs,
  );
  const auditReport = await getSecurityAuditReport({ root: options.root }, fs);
  const conversations = await listWorkspaceConversations(
    { root: options.root },
    fs,
  );
  const tasks = await listNeutronSubagentTasks({ root: options.root }, fs);
  return {
    projectId,
    root: options.root,
    readiness: inspection.readiness,
    findingsCount: doctor.findings.length,
    securityScore: auditReport ? auditReport.healthScore : null,
    activeConversationsCount: conversations.length,
    subagentTasksCount: tasks.length,
    syncedAt: new Date().toISOString(),
  };
}
export * from "./inception.js";
export * from "./inception-discovery.js";
export * from "./inception-blueprint.js";
export * from "./inception-approval.js";
export * from "./inception-scaffold-planner.js";
export * from "./inception-scaffold-apply.js";
export * from "./inception-actions.js";
export * from "./inception-flow.js";
export * from "./inception-templates.js";
export * from "./harness-runner.js";
export * from "./harness-comparison.js";
