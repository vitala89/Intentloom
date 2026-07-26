import { cwd } from "node:process";
import { resolve } from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { requestDaemonDoctor } from "../../daemon/src/index.js";
import {
  createDoctorRequest,
  type DoctorResult,
} from "../../protocol/src/index.js";
import {
  ArtifactValidationFailure,
  adoptProject,
  detectProjectProfiles,
  destinationCollisionKey,
  diffProject,
  doctorExitCode,
  doctorProject,
  initProject,
  inspectProject,
  nodeFileSystem,
  planFeature,
  planProjectAdoption,
  applyProjectAdoption,
  planPackUpdate,
  syncProject,
  getTaskSummary,
  listTaskSummaries,
  recordTaskSummary,
  recordSessionSummary,
  listSessionSummaries,
  discoverSkills,
  getSkillAtLevel,
  createSkillProposal,
  listSkillProposals,
  getSkillProposal,
  updateSkillProposalState,
  rollbackSkill,
  evaluateSkillProposal,
  listSkillEvaluations,
  getSkillEvaluation,
  listProceduralMemorySummary,
  inspectProceduralMemory,
  prepareSkillMutationPlan,
  applySkillMutationPlan,
  createTaskCheckpoint,
  pauseTask,
  cancelTask,
  redirectTask,
  resumeTask,
  listTaskCheckpoints,
  deleteTaskCheckpoint,
  rankProceduralMemory,
  getSemanticRankingConfig,
  updateSemanticRankingConfig,
  createProfile,
  getProfile,
  listProfiles,
  delegateTaskRole,
  getBoundedProjectContext,
  proposePersistentMemory,
  getPersistentMemoryItem,
  listPersistentMemoryItems,
  acceptPersistentMemory,
  forgetPersistentMemory,
  exportPersistentMemory,
  importPersistentMemory,
  searchPersistentMemory,
  renderPersistentMemoryContext,
  rebuildPersistentMemoryIndex,
  clearPersistentMemoryIndex,
  type SkillLoadingLevel,
  type SkillProposalState,
  type EvaluationOutcome,
  type SemanticRankingProvider,
  type DelegatedAgentRole,
  type TrustClass,
  type RetentionState,
  type FileSystem,
  type DoctorPlan,
  type AdoptionProposal,
  type Plan,
  type SyncDryRunResult,
  type TransactionOptions,
  type TransactionResult,
  type TransactionStage,
  type ProjectMapping,
} from "@intentloom/application";
import {
  collectGitEvidence,
  createReleaseTimeline,
} from "@intentloom/evidence-git";
import {
  importProviderExport,
  type ProviderEvidenceResult,
  type ProviderName,
} from "@intentloom/evidence-provider";
import {
  analyzeReleaseEvidence,
  evaluateEngineeringConformance,
  type EngineeringWorkflowCaseType,
  type EngineeringWorkflowPolicy,
  type EngineeringConformanceReport,
  type GenericTimeline,
} from "@intentloom/evidence-analysis";
import {
  INTENTLOOM_VERSION,
  normalizeOutputPath,
  resolveWithin,
  type AdapterName,
} from "@intentloom/core";
import {
  parseAdoptionPlan,
  stableStringify,
  type AdoptionPlan,
} from "@intentloom/core/adoption";
import {
  createArtifactValidator,
  SchemaCatalogError,
  validateSkillSet,
  type ArtifactType,
  type ArtifactValidationResult,
  type ArtifactValidator,
} from "@intentloom/validator";

export type CliExitCode = 0 | 2 | 3 | 4 | 5;

export interface CliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly transactionOptions?: TransactionOptions;
}

export interface CliSyncOutcome {
  readonly status: "success" | "conflict" | "failed";
  readonly dryRun: boolean;
  readonly failedStage: TransactionStage | null;
  readonly errorCode: string | null;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean | null;
  readonly rollbackFailures: readonly string[];
  readonly rollbackErrorCode: string | null;
  readonly created: readonly string[];
  readonly updated: readonly string[];
  readonly unchanged: readonly string[];
  readonly conflicts: readonly string[];
  readonly manifestUpdated: boolean;
  readonly sourceMapUpdated: boolean;
  readonly consistencyValidated: boolean;
  readonly cleanupCompleted: boolean;
  readonly exitCode: CliExitCode;
}

class CliUsageError extends Error {}
class CliProjectValidationError extends Error {
  constructor(readonly results: readonly ArtifactValidationResult[]) {
    super("project artifact validation failed");
  }
}

interface ParsedArguments {
  readonly command: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly mappingValues: ReadonlyMap<string, readonly string[]>;
}

interface ProjectConfiguration {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly projectOwnedMappings: readonly ProjectMapping[];
  readonly documentationMappings: readonly ProjectMapping[];
}

const commands = new Set([
  "init",
  "adopt",
  "update",
  "plan",
  "diff",
  "sync",
  "doctor",
  "inspect",
  "timeline",
  "evidence",
  "conformance",
  "summary",
  "skill",
  "proposal",
  "evaluate",
  "memory",
  "checkpoint",
  "rank",
  "profile",
  "delegate",
  "context",
]);
const projectPathCommands = new Set([
  "adopt",
  "update",
  "diff",
  "sync",
  "doctor",
  "inspect",
  "timeline",
  "conformance",
]);
const booleanFlags = new Set([
  "--dry-run",
  "--force",
  "--json",
  "--plan",
  "--strict",
  "--enable",
  "--disable",
  "--clear",
]);
const valueFlags = new Set([
  "--root",
  "--profile",
  "--adapters",
  "--task",
  "--daemon-endpoint",
  "--daemon-token-file",
  "--case-id",
  "--provider",
  "--file",
  "--project-key",
  "--policy",
  "--timeline",
  "--case-type",
  "--output",
  "--apply",
  "--id",
  "--trust-class",
  "--retention-state",
  "--json-input",
  "--level",
  "--pack",
  "--role",
  "--query",
  "--max-budget",
  "--state",
  "--evidence",
  "--proposal-id",
  "--skill-id",
  "--action",
  "--plan-file",
  "--new-intent",
  "--task-id",
  "--name",
  "--max-tokens",
  "--max-items",
  "--approved-by",
  "--project-id",
  "--target",
]);
const mappingValueFlags = new Set([
  "--project-owned-mapping",
  "--documentation-mapping",
]);
const adapters = new Set<AdapterName>(["claude", "codex", "cursor", "copilot"]);
const usage = [
  "Usage: intentloom <init|plan> [--root PATH] [--dry-run]",
  "       intentloom adopt <--plan|--apply PLAN_FILE> [PROJECT_PATH|--root PATH] [--json] [--output PATH] [--strict] [--dry-run]",
  "       intentloom update <--plan|--apply PLAN_FILE> [PROJECT_PATH|--root PATH] [--json] [--output PATH] [--strict] [--dry-run]",
  "       intentloom <adopt|update|diff|sync|doctor|inspect|timeline|conformance|summary|skill|proposal|evaluate|memory|checkpoint|rank|profile|delegate|context> [PROJECT_PATH|--root PATH] [--dry-run]",
  "       intentloom evidence import --provider github|gitlab --file PATH --project-key KEY [--json]",
  "       intentloom evidence analyze --provider github|gitlab --file PATH --project-key KEY [--root PATH] [--case-id ID] [--json]",
  "       intentloom conformance [PROJECT_PATH|--root PATH] [--policy PATH] [--timeline PATH] [--case-id ID] [--case-type TYPE] [--json]",
  "       intentloom summary <list|get|record> [PROJECT_PATH|--root PATH] [--id ID] [--trust-class CLASS] [--retention-state STATE] [--json]",
  "       intentloom skill discover [--level catalog|contract|procedure] [--pack PACK] [--role ROLE] [--query QUERY] [--max-budget NUM] [--root PATH] [--json]",
  "       intentloom proposal <list|get|create|approve|plan|apply> [PROJECT_PATH|--root PATH] [--id ID] [--action ACTION] [--plan-file PATH] [--evidence EVIDENCE] [--json]",
  "       intentloom evaluate <run|list> [PROJECT_PATH|--root PATH] [--proposal-id ID] [--skill-id ID] [--json]",
  "       intentloom memory <inspect|summary|propose|review|list|accept|forget|export|import|search|render|index> [PROJECT_PATH|--root PATH] [--json]",
  "       intentloom checkpoint <create|pause|cancel|redirect|resume|list|delete> [PROJECT_PATH|--root PATH] [--id ID] [--task-id ID] [--new-intent INTENT] [--json]",
  "       intentloom rank [QUERY|config] [--provider PROVIDER] [--enable|--disable] [--root PATH] [--json]",
  "       intentloom profile <create|get|list> [--name NAME] [--root PATH] [--json]",
  "       intentloom delegate --profile NAME --role ROLE --task-id ID [--root PATH] [--json]",
  "       intentloom context <get> [--query QUERY] [--max-tokens NUM] [--max-items NUM] [--root PATH] [--json]",
  "       adoption mappings use --project-owned-mapping SOURCE=DESTINATION",
  "       or --documentation-mapping SOURCE=DESTINATION",
].join("\n");

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "";
  if (!commands.has(command)) throw new CliUsageError(usage);
  if (command === "evidence" && args[1] !== "import" && args[1] !== "analyze")
    throw new CliUsageError(
      "evidence requires the import or analyze subcommand",
    );
  if (
    command === "summary" &&
    !["list", "get", "record"].includes(args[1] ?? "")
  )
    throw new CliUsageError("summary requires list, get, or record subcommand");
  if (command === "skill" && args[1] !== "discover")
    throw new CliUsageError("skill requires discover subcommand");
  if (
    command === "proposal" &&
    !["list", "get", "create", "approve", "plan", "apply"].includes(
      args[1] ?? "",
    )
  )
    throw new CliUsageError(
      "proposal requires list, get, create, approve, plan, or apply subcommand",
    );
  if (command === "evaluate" && !["run", "list"].includes(args[1] ?? ""))
    throw new CliUsageError("evaluate requires run or list subcommand");
  if (
    command === "memory" &&
    ![
      "inspect",
      "summary",
      "propose",
      "review",
      "list",
      "accept",
      "forget",
      "export",
      "import",
      "search",
      "render",
      "index",
    ].includes(args[1] ?? "")
  )
    throw new CliUsageError("unsupported memory subcommand");
  if (
    command === "checkpoint" &&
    ![
      "create",
      "pause",
      "cancel",
      "redirect",
      "resume",
      "list",
      "delete",
    ].includes(args[1] ?? "")
  )
    throw new CliUsageError(
      "checkpoint requires create, pause, cancel, redirect, resume, list, or delete subcommand",
    );
  if (
    command === "profile" &&
    !["create", "get", "list"].includes(args[1] ?? "")
  )
    throw new CliUsageError("profile requires create, get, or list subcommand");
  if (command === "context" && args[1] !== "get")
    throw new CliUsageError("context requires get subcommand");
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const mappingValues = new Map<string, string[]>();
  for (
    let index =
      command === "evidence" ||
      command === "summary" ||
      command === "skill" ||
      command === "proposal" ||
      command === "evaluate" ||
      command === "memory" ||
      command === "checkpoint" ||
      command === "profile" ||
      command === "context" ||
      (command === "rank" && args[1] !== undefined && !args[1].startsWith("--"))
        ? 2
        : 1;
    index < args.length;
    index += 1
  ) {
    const token = args[index]!;
    if (booleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (!projectPathCommands.has(command) || values.has("--root"))
        throw new CliUsageError(`unexpected argument: ${token}`);
      values.set("--root", token);
      continue;
    }
    if (!valueFlags.has(token) && !mappingValueFlags.has(token))
      throw new CliUsageError(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CliUsageError(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new CliUsageError("project path specified more than once");
    if (mappingValueFlags.has(token)) {
      const entries = mappingValues.get(token) ?? [];
      entries.push(value);
      mappingValues.set(token, entries);
    } else values.set(token, value);
    index += 1;
  }
  if (command !== "sync" && flags.has("--force"))
    throw new CliUsageError("--force is only valid with sync");
  if (mappingValues.size > 0 && command !== "init" && command !== "adopt")
    throw new CliUsageError(
      "adoption mappings are only valid with init or adopt",
    );
  const daemonEndpoint = values.has("--daemon-endpoint");
  const daemonTokenFile = values.has("--daemon-token-file");
  if (daemonEndpoint !== daemonTokenFile)
    throw new CliUsageError(
      "--daemon-endpoint and --daemon-token-file must be used together",
    );
  if (daemonEndpoint && command !== "doctor")
    throw new CliUsageError("daemon mode is only valid with doctor");
  return { command, flags, values, mappingValues };
}

function formatProviderEvidence(result: ProviderEvidenceResult): string {
  return [
    `Provider: ${result.provider}`,
    `Project: ${result.projectKey}`,
    `Status: ${result.status}`,
    `Events: ${result.events.length}`,
    ...(result.diagnostics.length > 0
      ? [`Diagnostics: ${result.diagnostics.join(", ")}`]
      : []),
  ].join("\n");
}

function formatReleaseAnalysis(
  report: ReturnType<typeof analyzeReleaseEvidence>,
): string {
  return [
    `Case: ${report.caseId}`,
    `Project: ${report.projectKey}`,
    `Quality: ${report.quality}`,
    `Findings: ${report.findings.length}`,
    ...report.findings.map(
      (finding) =>
        `${finding.status.padEnd(10)} ${finding.code}${finding.sourceIds.length > 0 ? ` (${finding.sourceIds.join(", ")})` : ""}`,
    ),
  ].join("\n");
}

function parseMappings(values: readonly string[]): ProjectMapping[] {
  const mappings = values.map((value) => {
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1)
      throw new CliUsageError("mapping must use SOURCE=DESTINATION");
    const source = value.slice(0, separator);
    const destination = value.slice(separator + 1);
    try {
      if (
        normalizeOutputPath(source) !== source ||
        normalizeOutputPath(destination) !== destination
      )
        throw new Error("mapping path is not normalized");
    } catch {
      throw new CliUsageError(
        "mapping paths must be normalized and project-relative",
      );
    }
    return { source, destination };
  });
  return [
    ...new Map(
      mappings.map((mapping) => [
        `${mapping.source}\0${mapping.destination}`,
        mapping,
      ]),
    ).values(),
  ].sort((left, right) =>
    `${left.source}\0${left.destination}`.localeCompare(
      `${right.source}\0${right.destination}`,
    ),
  );
}

function safePaths(paths: readonly string[]): string[] {
  const safe: string[] = [];
  for (const path of paths) {
    try {
      destinationCollisionKey(path);
      safe.push(path);
    } catch {
      /* unsafe metadata input is represented by its classification, not its value */
    }
  }
  return [...new Set(safe)].sort();
}

function safeErrorCode(value: string | undefined): string {
  return value !== undefined && /^[a-z0-9][a-z0-9:-]*$/u.test(value)
    ? value
    : "transaction-failed";
}

function conflicts(result: Plan): string[] {
  return safePaths(
    result.changes
      .filter((change) =>
        ["conflict", "modified", "security-error"].includes(change.kind),
      )
      .map((change) => change.path),
  );
}

export function mapTransactionResultToCliOutcome(
  result: TransactionResult,
): CliSyncOutcome {
  const conflictPaths = conflicts(result);
  const originalDiagnostic = result.diagnostics.find(
    (diagnostic) => diagnostic !== "transaction-rollback-incomplete",
  );
  const errorCode =
    result.status === "success"
      ? null
      : safeErrorCode(
          result.postWriteValidation?.status === "invalid"
            ? result.postWriteValidation.code
            : originalDiagnostic,
        );
  const status =
    result.status === "success"
      ? "success"
      : result.rollbackAttempted
        ? "failed"
        : "conflict";
  const exitCode: CliExitCode =
    status === "success"
      ? 0
      : status === "conflict"
        ? 3
        : result.rollbackCompleted
          ? 4
          : 5;
  return {
    status,
    dryRun: false,
    failedStage: result.failedStage ?? null,
    errorCode,
    rollbackAttempted: result.rollbackAttempted,
    rollbackCompleted: result.rollbackAttempted
      ? result.rollbackCompleted
      : null,
    rollbackFailures: safePaths(result.rollbackFailures),
    rollbackErrorCode: result.rollbackCompleted
      ? null
      : "transaction-rollback-incomplete",
    created: safePaths(result.createdFiles),
    updated: safePaths(result.updatedFiles),
    unchanged: safePaths(result.unchangedFiles),
    conflicts: conflictPaths,
    manifestUpdated: result.manifestUpdated,
    sourceMapUpdated: result.sourceMapUpdated,
    consistencyValidated: result.consistencyValidated,
    cleanupCompleted: result.cleanupCompleted,
    exitCode,
  };
}

export function mapDryRunToCliOutcome(
  result: SyncDryRunResult,
): CliSyncOutcome {
  const conflictPaths = safePaths(result.conflictFiles);
  const hasConflict = conflictPaths.length > 0 || result.diagnostics.length > 0;
  return {
    status: hasConflict ? "conflict" : "success",
    dryRun: true,
    failedStage: null,
    errorCode: hasConflict
      ? safeErrorCode(result.diagnostics[0] ?? "sync-conflict")
      : null,
    rollbackAttempted: false,
    rollbackCompleted: null,
    rollbackFailures: [],
    rollbackErrorCode: null,
    created: safePaths(result.createdFiles),
    updated: safePaths(result.updatedFiles),
    unchanged: safePaths(result.unchangedFiles),
    conflicts: conflictPaths,
    manifestUpdated: false,
    sourceMapUpdated: false,
    consistencyValidated: false,
    cleanupCompleted: false,
    exitCode: hasConflict ? 3 : 0,
  };
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function counts(outcome: CliSyncOutcome): string[] {
  return [
    `Created: ${outcome.created.length}`,
    `Updated: ${outcome.updated.length}`,
    `Unchanged: ${outcome.unchanged.length}`,
  ];
}

export function formatHumanOutcome(outcome: CliSyncOutcome): string {
  if (outcome.dryRun) {
    if (outcome.status === "conflict")
      return [
        "Intentloom sync dry run found conflicts.",
        "",
        `Reason: ${outcome.errorCode}`,
        `Conflicts: ${outcome.conflicts.length}`,
        ...outcome.conflicts.map((path) => `- ${path}`),
        "Dry run — no files were changed.",
      ].join("\n");
    return [
      "Intentloom sync dry run.",
      "",
      ...counts(outcome),
      "Dry run — no files were changed.",
    ].join("\n");
  }
  if (outcome.status === "success") {
    const noChanges =
      outcome.created.length === 0 &&
      outcome.updated.length === 0 &&
      !outcome.manifestUpdated &&
      !outcome.sourceMapUpdated;
    return [
      noChanges
        ? "Intentloom sync completed. No changes required."
        : "Intentloom sync completed.",
      "",
      ...counts(outcome),
      `Manifest updated: ${yesNo(outcome.manifestUpdated)}`,
      `Source map updated: ${yesNo(outcome.sourceMapUpdated)}`,
      `Consistency validation: ${outcome.consistencyValidated ? "passed" : "failed"}`,
      `Cleanup: ${outcome.cleanupCompleted ? "passed" : "failed"}`,
    ].join("\n");
  }
  if (outcome.status === "conflict")
    return [
      "Intentloom sync was not applied.",
      "",
      `Reason: ${outcome.errorCode}`,
      `Conflicts: ${outcome.conflicts.length}`,
      ...outcome.conflicts.map((path) => `- ${path}`),
      "No project files were changed.",
    ].join("\n");
  if (outcome.rollbackCompleted)
    return [
      `Intentloom sync failed during: ${outcome.failedStage ?? "unknown"}`,
      `Error: ${outcome.errorCode}`,
      "Rollback: completed",
      "Project state was restored.",
    ].join("\n");
  return [
    `Intentloom sync failed during: ${outcome.failedStage ?? "unknown"}`,
    `Error: ${outcome.errorCode}`,
    "Rollback: incomplete",
    `Rollback error: ${outcome.rollbackErrorCode}`,
    "Manual inspection is required.",
    ...outcome.rollbackFailures.map((path) => `- ${path}`),
  ].join("\n");
}

export function formatJsonOutcome(outcome: CliSyncOutcome): string {
  return JSON.stringify(outcome, null, 2);
}

function formatPlan(result: Plan): string {
  return [...result.changes]
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(
      (change) => `${change.kind.padEnd(8)} ${change.path} — ${change.reason}`,
    )
    .join("\n");
}

function formatAdoptionProposal(result: AdoptionProposal): string {
  const lines = [
    `Detected profile: ${result.profileDetection.selectedProfile}`,
    `Application status: ${result.applicationStatus}`,
    ...result.items.map(
      (item) =>
        `${item.action.padEnd(36)} ${item.path} — ${item.reason} Next: ${item.safeNextAction}`,
    ),
  ];
  if (result.transactionOutcome?.status === "failed") {
    lines.push(
      `Transaction failed during: ${result.transactionOutcome.failedStage ?? "unknown"}`,
      `Error: ${result.transactionOutcome.errorCode ?? "transaction-failed"}`,
      `Rollback: ${result.transactionOutcome.rollbackCompleted ? "completed" : "incomplete"}`,
    );
    if (!result.transactionOutcome.rollbackCompleted)
      lines.push(
        "Manual inspection is required.",
        ...result.transactionOutcome.rollbackFailures.map(
          (path) => `- ${path}`,
        ),
      );
  }
  return lines.join("\n");
}

function formatGovernanceAdoptionPlan(plan: AdoptionPlan): string {
  const lines: string[] = [
    `Adoption Plan: ${plan.packId} (v${plan.packVersion})`,
    `Project ID: ${plan.projectId}`,
    `Repository Hash: ${plan.repositoryHash}`,
    `Automatic Apply Allowed: ${plan.automaticApplyAllowed ? "yes" : "no"}`,
    "",
    "Role Mappings:",
  ];
  if (plan.mappings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const mapping of plan.mappings) {
      lines.push(
        `  ${mapping.role.padEnd(30)} -> ${mapping.path} (${mapping.ownership})`,
      );
    }
  }
  lines.push("", "Findings:");
  if (plan.findings.length === 0) {
    lines.push("  (none)");
  } else {
    for (const finding of plan.findings) {
      lines.push(
        `  [${finding.status}] ${finding.code}: ${finding.summary} (${finding.paths.join(", ")})`,
      );
    }
  }
  lines.push("", "Operations:");
  if (plan.operations.length === 0) {
    lines.push("  (none)");
  } else {
    for (const op of plan.operations) {
      const target = op.path ?? op.role ?? "workspace";
      lines.push(`  [${op.kind}] ${target} (${op.approval}) — ${op.reason}`);
    }
  }
  return lines.join("\n");
}

function formatDoctor(result: DoctorPlan): string {
  return result.findings
    .map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}${
          finding.remediation.length > 0
            ? ` Remediation: ${finding.remediation.join(" ")}`
            : ""
        }`,
    )
    .join("\n");
}

function formatInspection(
  result: Awaited<ReturnType<typeof inspectProject>>,
): string {
  return [
    `Profile: ${result.profileDetection.selectedProfile}`,
    `Readiness: ${result.readiness}`,
    `Detected adapters: ${result.detectedAdapters.join(", ") || "none"}`,
    `Instruction files: ${result.instructionPaths.join(", ") || "none"}`,
    ...result.findings.map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}`,
    ),
  ].join("\n");
}

function formatTimeline(
  result: ReturnType<typeof createReleaseTimeline>,
): string {
  return [
    `Case: ${result.caseId}`,
    `Quality: ${result.quality}`,
    `Events: ${result.events.length}`,
    ...result.events.map(
      (event) =>
        `${new Date(event.timestamp * 1000).toISOString()} ${event.commitId} ${event.changedPaths.join(", ")}`,
    ),
    ...(result.findings.length > 0
      ? [`Findings: ${result.findings.join(", ")}`]
      : []),
  ].join("\n");
}

function formatDaemonDoctor(result: DoctorResult): string {
  return result.findings
    .map(
      (finding) =>
        `${finding.severity.padEnd(7)} ${finding.code} ${finding.path} — ${finding.message}`,
    )
    .join("\n");
}

function parseAdapters(value: string): AdapterName[] {
  const parsed = value.split(",").filter(Boolean);
  if (
    parsed.length === 0 ||
    parsed.some((adapter) => !adapters.has(adapter as AdapterName))
  )
    throw new CliUsageError("invalid --adapters value");
  return parsed as AdapterName[];
}

async function projectConfiguration(
  root: string,
  fileSystem: FileSystem,
  validator: ArtifactValidator,
  required: boolean,
): Promise<ProjectConfiguration> {
  const path = resolve(root, ".aif/config.yaml");
  if (!(await fileSystem.exists(path))) {
    if (!required)
      return {
        profile: "generic",
        adapters: ["claude", "codex", "cursor", "copilot"],
        projectOwnedMappings: [],
        documentationMappings: [],
      };
    throw new CliUsageError(
      "sync requires an initialized project with .aif/config.yaml",
    );
  }
  const validation = validator.validate({
    artifactType: "aif-config",
    documentPath: ".aif/config.yaml",
    format: "yaml",
    source: await fileSystem.read(path),
  });
  if (validation.status === "invalid")
    throw new CliProjectValidationError([validation]);
  const config = validation.document as Record<string, unknown>;
  const mappings = (key: string): ProjectMapping[] =>
    Array.isArray(config[key])
      ? (config[key] as Record<string, unknown>[]).map((mapping) => ({
          source: mapping.source as string,
          destination: mapping.destination as string,
        }))
      : [];
  return {
    profile: config.profile as string,
    adapters: config.adapters as AdapterName[],
    projectOwnedMappings: mappings("projectOwnedMappings"),
    documentationMappings: mappings("documentationMappings"),
  };
}

const projectArtifacts: readonly {
  artifactType: ArtifactType;
  path: string;
  format: "json" | "yaml";
}[] = [
  { artifactType: "aif-config", path: ".aif/config.yaml", format: "yaml" },
  {
    artifactType: "manifest-lock",
    path: ".aif/manifest.lock.json",
    format: "json",
  },
  { artifactType: "source-map", path: ".aif/source-map.json", format: "json" },
];

async function validateExistingMetadata(
  root: string,
  fileSystem: FileSystem,
  validator: ArtifactValidator,
): Promise<ArtifactValidationResult[]> {
  const validated: ArtifactValidationResult[] = [];
  for (const artifact of projectArtifacts) {
    const absolute = resolve(root, artifact.path);
    if (!(await fileSystem.exists(absolute))) continue;
    const result = validator.validate({
      artifactType: artifact.artifactType,
      documentPath: artifact.path,
      format: artifact.format,
      source: await fileSystem.read(absolute),
    });
    validated.push(result);
  }
  const results = validated.filter((result) => result.status === "invalid");
  if (results.length > 0) return results;
  const manifest = validated.find(
    (result) => result.artifactType === "manifest-lock",
  );
  const sourceMap = validated.find(
    (result) => result.artifactType === "source-map",
  );
  if (manifest?.document && sourceMap?.document) {
    const lock = manifest.document as Record<string, unknown>;
    const map = sourceMap.document as Record<string, unknown>;
    const identityKeys = [
      "metadataFormatVersion",
      "frameworkVersion",
      "adapterOutputVersion",
      "adapterId",
      "canonicalSourceId",
    ];
    const lockRecords = new Map(
      (lock.generated as Record<string, unknown>[]).map((record) => [
        record.path,
        record.checksum,
      ]),
    );
    const mapRecords = new Map(
      (map.files as Record<string, unknown>[]).map((record) => [
        record.path,
        record.checksum,
      ]),
    );
    const inconsistent =
      identityKeys.some((key) => lock[key] !== map[key]) ||
      lockRecords.size !== mapRecords.size ||
      [...lockRecords].some(
        ([path, checksum]) => mapRecords.get(path) !== checksum,
      );
    if (inconsistent)
      results.push({
        status: "invalid",
        artifactType: "source-map",
        schemaId: sourceMap.schemaId,
        schemaVersion: sourceMap.schemaVersion,
        documentPath: sourceMap.documentPath,
        structuralErrors: [],
        semanticErrors: [
          {
            code: "metadata-relationship-inconsistent",
            message:
              "manifest and source map identity or checksum records differ",
            fieldPath: "",
          },
        ],
        warnings: [],
      });
  }
  return results;
}

async function validateProjectSkills(
  root: string,
  fileSystem: FileSystem,
  validator: ArtifactValidator,
): Promise<ArtifactValidationResult[]> {
  const ignored = new Set([
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
  const entries = (await fileSystem.list(root))
    .map((entry) => entry.replaceAll("\\", "/"))
    .map((entry) =>
      entry.startsWith(`${root}/`) ? entry.slice(root.length + 1) : entry,
    )
    .filter(
      (entry) => !entry.split("/").some((segment) => ignored.has(segment)),
    )
    .sort();
  const ownedSkillPaths = new Set<string>();
  const sourceMapPath = resolve(root, ".aif/source-map.json");
  if (await fileSystem.exists(sourceMapPath))
    try {
      const sourceMap = JSON.parse(await fileSystem.read(sourceMapPath)) as {
        files?: unknown;
      };
      if (Array.isArray(sourceMap.files))
        for (const record of sourceMap.files)
          if (
            typeof record === "object" &&
            record !== null &&
            typeof (record as Record<string, unknown>).path === "string" &&
            (record as Record<string, unknown>).ownership ===
              "aif-owned-generated"
          )
            ownedSkillPaths.add(
              (record as Record<string, unknown>).path as string,
            );
    } catch {
      /* source-map validation reports malformed ownership metadata separately */
    }
  const documents = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.endsWith("/SKILL.md") &&
          (entry.startsWith("skills/") || ownedSkillPaths.has(entry)),
      )
      .map(async (entry) => {
        const absolute = entry.startsWith(root) ? entry : resolve(root, entry);
        const path = absolute.startsWith(`${root}/`)
          ? absolute.slice(root.length + 1)
          : entry;
        return { path, content: await fileSystem.read(absolute) };
      }),
  );
  const validation = validateSkillSet(validator, documents);
  const invalid = validation.results.filter(
    (result) => result.status === "invalid",
  );
  if (validation.errors.length > 0)
    invalid.push({
      status: "invalid",
      artifactType: "agent-skill",
      schemaId: "urn:aif:schema:agent-skill:1",
      schemaVersion: "1",
      documentPath: documents[0]?.path ?? "SKILL.md",
      structuralErrors: [],
      semanticErrors: validation.errors,
      warnings: [],
    });
  const planningKinds: readonly {
    pattern: RegExp;
    artifactType: ArtifactType;
  }[] = [
    {
      pattern: /(?:feature-brief|\.feature)\.json$/u,
      artifactType: "feature-brief",
    },
    {
      pattern: /(?:context-pack|\.context)\.json$/u,
      artifactType: "context-pack",
    },
    {
      pattern: /(?:change-request|\.change)\.json$/u,
      artifactType: "change-request",
    },
    {
      pattern: /(?:technical-debt|\.debt)\.json$/u,
      artifactType: "technical-debt",
    },
  ];
  for (const entry of entries) {
    const kind = planningKinds.find(({ pattern }) => pattern.test(entry));
    if (!kind) continue;
    const result = validator.validate({
      artifactType: kind.artifactType,
      documentPath: entry,
      format: "json",
      source: await fileSystem.read(resolve(root, entry)),
    });
    if (result.status === "invalid") invalid.push(result);
  }
  return invalid;
}

function validationErrors(results: readonly ArtifactValidationResult[]) {
  return results
    .flatMap((result) => [
      ...result.structuralErrors.map((error) => ({
        ...error,
        phase: "structural" as const,
        artifactType: result.artifactType,
        schemaId: result.schemaId,
        schemaVersion: result.schemaVersion,
        documentPath: result.documentPath,
      })),
      ...result.semanticErrors.map((error) => ({
        ...error,
        phase: "semantic" as const,
        artifactType: result.artifactType,
        schemaId: result.schemaId,
        schemaVersion: result.schemaVersion,
        documentPath: result.documentPath,
      })),
    ])
    .sort((left, right) =>
      `${left.documentPath}:${left.phase}:${left.fieldPath}:${left.code}`.localeCompare(
        `${right.documentPath}:${right.phase}:${right.fieldPath}:${right.code}`,
      ),
    );
}

function formatValidationFailure(
  results: readonly ArtifactValidationResult[],
  json: boolean,
): string {
  const errors = validationErrors(results);
  if (json)
    return JSON.stringify(
      { status: "invalid", errorCode: "artifact-validation-failed", errors },
      null,
      2,
    );
  return [
    "Intentloom project artifact validation failed.",
    ...errors.map(
      (error) =>
        `${error.documentPath} (${error.artifactType}, schema ${error.schemaVersion ?? "unknown"}) ${error.fieldPath || "/"}: ${error.message} [${error.code}; ${error.phase}]`,
    ),
  ].join("\n");
}

const defaultEngineeringPolicy: EngineeringWorkflowPolicy = {
  schemaVersion: "1",
  policyId: "policy:default-engineering-conformance",
  description: "Default Intentloom engineering workflow policy",
  rules: [
    {
      ruleId: "rule:require-commit-evidence",
      caseType: "pull-request",
      severity: "error",
      title: "Commit Evidence Presence",
      condition: {
        type: "required-activity",
        activity: "commit",
      },
      remediation: {
        summary: "Pull request workflow timeline must contain commit evidence.",
        actionableSteps: [
          "Ensure local Git history contains commits on the topic branch.",
        ],
      },
    },
    {
      ruleId: "rule:require-release-evidence",
      caseType: "release",
      severity: "error",
      title: "Release Evidence Presence",
      condition: {
        type: "required-activity",
        activity: "commit",
      },
      remediation: {
        summary: "Release workflow timeline must contain commit evidence.",
        actionableSteps: [
          "Ensure Git tags and release commits exist in the repository.",
        ],
      },
    },
  ],
};

function formatEngineeringConformanceHuman(
  report: EngineeringConformanceReport,
): string {
  const lines: string[] = [
    `Intentloom Engineering Conformance Report [v${report.operationVersion}]`,
    `Policy: ${report.policyId}`,
    `Case: ${report.caseType} (${report.caseId})`,
    `Summary: ${report.summary.passed}/${report.summary.totalRules} passed, ${report.summary.violations} violations, ${report.summary.missingEvidence} missing evidence, ${report.summary.ambiguousEvidence} ambiguous, ${report.summary.unsupported} unsupported`,
    "",
    "Findings:",
  ];
  for (const finding of report.findings) {
    const icon =
      finding.status === "pass"
        ? "[PASS]"
        : finding.status === "violation"
          ? "[VIOLATION]"
          : finding.status === "missing-evidence"
            ? "[MISSING EVIDENCE]"
            : `[${finding.status.toUpperCase()}]`;
    lines.push(
      `- ${icon} ${finding.title} (${finding.ruleId}) [Severity: ${finding.severity}]`,
    );
    if (finding.remediation) {
      lines.push(`  Remediation: ${finding.remediation.summary}`);
      for (const step of finding.remediation.actionableSteps) {
        lines.push(`  - ${step}`);
      }
    }
  }
  return lines.join("\n");
}

export async function runCli(
  args: readonly string[],
  dependencies: CliDependencies,
  io: CliIo,
): Promise<CliExitCode> {
  if (args.includes("--version") || args[0] === "--version") {
    io.stdout(INTENTLOOM_VERSION);
    return 0;
  }
  if (
    args.includes("--help") ||
    args[0] === "--help" ||
    args[0] === "help" ||
    args.length === 0
  ) {
    io.stdout(usage);
    return 0;
  }
  try {
    const parsed = parseArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const root = parsed.values.get("--root") ?? cwd();
    const profileRoot = resolve(dependencies.catalogRoot, "../profiles");
    const knownProfiles = (await readdir(profileRoot))
      .filter((entry) => entry.endsWith(".json"))
      .map((entry) => entry.slice(0, -5))
      .sort();
    const knownWorkflows = (
      await readdir(resolve(dependencies.catalogRoot, "workflows"))
    )
      .filter((entry) => entry.endsWith(".md"))
      .map((entry) => entry.slice(0, -3))
      .sort();
    const validator = await createArtifactValidator(
      resolve(dependencies.catalogRoot, "schemas"),
      {
        knownProfiles,
        knownWorkflows,
        supportedAdapters: [...adapters].sort(),
      },
    );
    if (parsed.command === "evidence") {
      const evidenceSubcommand = args[1];
      const provider = parsed.values.get("--provider");
      const file = parsed.values.get("--file");
      const projectKey = parsed.values.get("--project-key");
      if (provider !== "github" && provider !== "gitlab")
        throw new CliUsageError("--provider must be github or gitlab");
      if (!file || !projectKey)
        throw new CliUsageError(
          `evidence ${evidenceSubcommand} requires --file and --project-key`,
        );
      let payload: unknown;
      let result: ProviderEvidenceResult;
      try {
        payload = JSON.parse(await readFile(resolve(file), "utf8"));
      } catch {
        result = {
          operationVersion: 1,
          source: "provider-export",
          provider: provider as ProviderName,
          projectKey,
          trust: "provider-supplied-unverified",
          status: "invalid",
          events: [],
          diagnostics: ["export-file-unreadable"],
        };
        if (evidenceSubcommand === "import") {
          io.stdout(
            parsed.flags.has("--json")
              ? JSON.stringify(result, null, 2)
              : formatProviderEvidence(result),
          );
          return 3;
        }
      }
      if (payload !== undefined)
        result = importProviderExport({
          provider: provider as ProviderName,
          projectKey,
          payload,
        });
      if (evidenceSubcommand === "import") {
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(result!, null, 2)
            : formatProviderEvidence(result!),
        );
        return result!.status === "invalid" ? 3 : 0;
      }
      const timeline = createReleaseTimeline(
        parsed.values.get("--case-id") ?? "release",
        await collectGitEvidence({ root }),
      );
      const report = analyzeReleaseEvidence(
        {
          caseId: timeline.caseId,
          quality: timeline.quality,
          events: timeline.events.map((event) => ({
            commitId: event.commitId,
            timestamp: event.timestamp,
          })),
        },
        {
          provider: result!.provider,
          projectKey: result!.projectKey,
          status: result!.status,
          events: result!.events.map((event) => ({
            eventType: event.eventType,
            sourceId: event.sourceId,
            ...(event.commitIds ? { commitIds: event.commitIds } : {}),
          })),
        },
        projectKey,
      );
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(report, null, 2)
          : formatReleaseAnalysis(report),
      );
      return report.quality === "conflicted" || report.quality === "unavailable"
        ? 3
        : 0;
    }
    const readsProject = ["sync", "adopt", "diff", "doctor"].includes(
      parsed.command,
    );
    const invalidMetadata = readsProject
      ? await validateExistingMetadata(root, fileSystem, validator)
      : [];
    if (parsed.command === "inspect") {
      const result = await inspectProject(root, fileSystem);
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(result, null, 2)
          : formatInspection(result),
      );
      return result.findings.some((finding) => finding.severity === "error")
        ? 3
        : 0;
    }
    if (parsed.command === "timeline") {
      const evidence = await collectGitEvidence({ root });
      const timeline = createReleaseTimeline(
        parsed.values.get("--case-id") ?? "release",
        evidence,
      );
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(timeline, null, 2)
          : formatTimeline(timeline),
      );
      return timeline.quality === "unavailable" ? 3 : 0;
    }
    if (parsed.command === "conformance") {
      const policyFile = parsed.values.get("--policy");
      const timelineFile = parsed.values.get("--timeline");
      const caseId = parsed.values.get("--case-id") ?? "current";
      const caseType =
        (parsed.values.get("--case-type") as EngineeringWorkflowCaseType) ??
        "pull-request";

      let policy: EngineeringWorkflowPolicy;
      if (policyFile) {
        policy = JSON.parse(
          await fileSystem.read(resolveWithin(root, policyFile)),
        );
      } else {
        policy = defaultEngineeringPolicy;
      }

      let timeline: GenericTimeline;
      if (timelineFile) {
        timeline = JSON.parse(
          await fileSystem.read(resolveWithin(root, timelineFile)),
        );
      } else {
        const rawGit = await collectGitEvidence({ root });
        timeline = {
          caseType,
          caseId,
          events: rawGit.commits.map((c) => ({
            activity: "commit",
            source: "git",
            sourceId: c.id,
            timestamp: new Date(c.timestamp * 1000).toISOString(),
            commitIds: [c.id],
          })),
        };
      }

      const report = evaluateEngineeringConformance(timeline, policy);
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(report, null, 2)
          : formatEngineeringConformanceHuman(report),
      );
      return report.summary.violations > 0 || report.summary.missingEvidence > 0
        ? 3
        : 0;
    }
    if (parsed.command === "summary") {
      const subcommand = args[1] ?? "list";
      if (subcommand === "list") {
        const trustClass = parsed.values.get("--trust-class") as
          TrustClass | undefined;
        const retentionState = parsed.values.get("--retention-state") as
          RetentionState | undefined;
        const summaries = await listTaskSummaries(
          {
            root,
            ...(trustClass ? { trustClass } : {}),
            ...(retentionState ? { retentionState } : {}),
          },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(summaries, null, 2)
            : summaries.length === 0
              ? "No task summaries recorded."
              : summaries
                  .map(
                    (s) =>
                      `[${s.id}] ${s.intent} (${s.validationOutcome}) [${s.trustClass}]`,
                  )
                  .join("\n"),
        );
        return 0;
      }
      if (subcommand === "get") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("summary get requires --id <id>");
        const summary = await getTaskSummary(id, { root }, fileSystem);
        if (!summary) {
          io.stderr(`Summary not found: ${id}\n`);
          return 3;
        }
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(summary, null, 2)
            : `[${summary.id}] ${summary.intent}\nOutcome: ${summary.validationOutcome}\nTrust: ${summary.trustClass}\nCreated: ${summary.createdAt}`,
        );
        return 0;
      }
      if (subcommand === "record") {
        const jsonInput = parsed.values.get("--json-input");
        const jsonFile = parsed.values.get("--file");
        let rawContent = jsonInput;
        if (!rawContent && jsonFile) {
          rawContent = await fileSystem.read(resolveWithin(root, jsonFile));
        }
        if (!rawContent) {
          throw new CliUsageError(
            "summary record requires --json-input <json> or --file <path>",
          );
        }
        const parsedSummary = JSON.parse(rawContent);
        const recorded = await recordTaskSummary(
          parsedSummary,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(recorded, null, 2)
            : `Recorded task summary [${recorded.id}]`,
        );
        return 0;
      }
      throw new CliUsageError(`unsupported summary subcommand: ${subcommand}`);
    }
    if (parsed.command === "skill") {
      const subcommand = args[1];
      if (subcommand === "discover") {
        const rawLevel = parsed.values.get("--level");
        if (
          rawLevel !== undefined &&
          !["catalog", "contract", "procedure"].includes(rawLevel)
        ) {
          throw new CliUsageError(
            "--level must be catalog, contract, or procedure",
          );
        }
        const level = (rawLevel as SkillLoadingLevel | undefined) ?? "catalog";
        const pack = parsed.values.get("--pack");
        const role = parsed.values.get("--role");
        const query = parsed.values.get("--query");
        const rawTrust = parsed.values.get("--trust-class");
        const trustClass = rawTrust as TrustClass | undefined;
        const rawBudget = parsed.values.get("--max-budget");
        const maxBudget = rawBudget ? parseInt(rawBudget, 10) : undefined;

        const result = await discoverSkills(
          {
            root,
            ...(dependencies.catalogRoot !== undefined
              ? { catalogRoot: dependencies.catalogRoot }
              : {}),
            level,
            ...(pack !== undefined ? { pack } : {}),
            ...(role !== undefined ? { role } : {}),
            ...(query !== undefined ? { query } : {}),
            ...(trustClass !== undefined ? { trustClass } : {}),
            ...(maxBudget !== undefined && !Number.isNaN(maxBudget)
              ? { maxBudget }
              : {}),
          },
          fileSystem,
        );

        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(result, null, 2));
        } else {
          const lines = [
            `Discovered ${result.skills.length} skills (Level: ${result.level})`,
            `Total context budget: ${result.totalBudgetEstimate} tokens (Savings: ${result.budgetSavingsPercentage}% vs eager loading)`,
            "",
          ];
          for (const s of result.skills) {
            lines.push(
              `- [${s.id}] ${s.name} (v${s.version}): ${s.description}`,
            );
          }
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      throw new CliUsageError(`unsupported skill subcommand: ${subcommand}`);
    }
    if (parsed.command === "proposal") {
      const subcommand = args[1];
      if (subcommand === "list") {
        const rawState = parsed.values.get("--state");
        const state = rawState as SkillProposalState | undefined;
        const rawTrust = parsed.values.get("--trust-class");
        const trustClass = rawTrust as TrustClass | undefined;
        const proposals = await listSkillProposals(
          {
            root,
            ...(state !== undefined ? { state } : {}),
            ...(trustClass !== undefined ? { trustClass } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(proposals, null, 2));
        } else {
          const lines = proposals.map(
            (p) =>
              `- [${p.id}] ${p.name} (v${p.version}) [State: ${p.state}] (Trust: ${p.trustClass})`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "get") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("proposal get requires --id <id>");
        const proposal = await getSkillProposal(id, { root }, fileSystem);
        if (!proposal) {
          io.stderr(`Proposal not found: ${id}\n`);
          return 3;
        }
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(proposal, null, 2)
            : `[${proposal.id}] ${proposal.name} (v${proposal.version})\nState: ${proposal.state}\nTrust: ${proposal.trustClass}\nObserved Pattern: ${proposal.observedPattern}`,
        );
        return 0;
      }
      if (subcommand === "create") {
        const jsonInput = parsed.values.get("--json-input");
        const jsonFile = parsed.values.get("--file");
        let rawContent = jsonInput;
        if (!rawContent && jsonFile) {
          rawContent = await fileSystem.read(resolveWithin(root, jsonFile));
        }
        if (!rawContent) {
          throw new CliUsageError(
            "proposal create requires --json-input <json> or --file <path>",
          );
        }
        const parsedProposal = JSON.parse(rawContent);
        const created = await createSkillProposal(
          parsedProposal,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(created, null, 2)
            : `Created skill proposal [${created.id}]`,
        );
        return 0;
      }
      if (subcommand === "approve") {
        const id = parsed.values.get("--id") ?? args[2];
        const evidence = parsed.values.get("--evidence");
        if (!id || !evidence) {
          throw new CliUsageError(
            "proposal approve requires --id <id> and --evidence <evidence>",
          );
        }
        const approved = await updateSkillProposalState(
          id,
          "approved",
          { root, approvalEvidence: evidence },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(approved, null, 2)
            : `Approved skill proposal [${approved.id}]`,
        );
        return 0;
      }
      if (subcommand === "plan") {
        const action = parsed.values.get("--action") as
          "approve" | "activate" | "deprecate" | "rollback" | undefined;
        const id =
          parsed.values.get("--id") ??
          parsed.values.get("--proposal-id") ??
          args[2];
        const evidence = parsed.values.get("--evidence");
        if (!action || !id) {
          throw new CliUsageError(
            "proposal plan requires --action <approve|activate|deprecate|rollback> and --id <id>",
          );
        }
        const plan = await prepareSkillMutationPlan(
          {
            root,
            action,
            proposalId: id,
            ...(evidence !== undefined ? { approvalEvidence: evidence } : {}),
          },
          fileSystem,
        );
        const outputText = parsed.flags.has("--json")
          ? JSON.stringify(plan, null, 2)
          : `Prepared skill mutation plan [${plan.id}] (${plan.action} -> ${plan.targetState}) checksum=${plan.checksum}`;
        const outputPath = parsed.values.get("--output");
        if (outputPath !== undefined) {
          const targetPath = resolveWithin(root, outputPath);
          await fileSystem.write(
            targetPath,
            `${JSON.stringify(plan, null, 2)}\n`,
          );
        }
        io.stdout(`${outputText}\n`);
        return 0;
      }
      if (subcommand === "apply") {
        const planFile =
          parsed.values.get("--plan-file") ??
          parsed.values.get("--file") ??
          args[2];
        if (!planFile) {
          throw new CliUsageError("proposal apply requires --plan-file <path>");
        }
        const planPath = resolveWithin(root, planFile);
        if (!(await fileSystem.exists(planPath))) {
          io.stderr(`Skill mutation plan file not found: ${planFile}\n`);
          return 3;
        }
        const rawPlan = await fileSystem.read(planPath);
        const plan = JSON.parse(rawPlan);
        const updated = await applySkillMutationPlan(
          plan,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(updated, null, 2)
            : `Applied skill mutation plan: proposal [${updated.id}] state is now ${updated.state}`,
        );
        return 0;
      }
      throw new CliUsageError(`unsupported proposal subcommand: ${subcommand}`);
    }
    if (parsed.command === "evaluate") {
      const subcommand = args[1];
      if (subcommand === "run") {
        const proposalId = parsed.values.get("--proposal-id") ?? args[2];
        if (!proposalId) {
          throw new CliUsageError("evaluate run requires --proposal-id <id>");
        }
        const caseId = parsed.values.get("--case-id");
        const evalResult = await evaluateSkillProposal(
          proposalId,
          {
            root,
            ...(caseId !== undefined ? { caseId } : {}),
          },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(evalResult, null, 2)
            : `Evaluated proposal [${proposalId}]: outcome=${evalResult.outcome}, passed=${evalResult.passed}, securityPass=${evalResult.securityPass}`,
        );
        return 0;
      }
      if (subcommand === "list") {
        const skillId = parsed.values.get("--skill-id");
        const evaluations = await listSkillEvaluations(
          {
            root,
            ...(skillId !== undefined ? { skillId } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(evaluations, null, 2));
        } else {
          const lines = evaluations.map(
            (e) =>
              `- [${e.id}] skill=${e.skillId} outcome=${e.outcome} passed=${e.passed}`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      throw new CliUsageError(`unsupported evaluate subcommand: ${subcommand}`);
    }
    if (parsed.command === "memory") {
      const subcommand = args[1];
      if (subcommand === "summary") {
        const summary = await listProceduralMemorySummary({ root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(summary, null, 2)
            : `Procedural Memory Summary:\n- Total Proposals: ${summary.totalProposals}\n- Active Skills: ${summary.activeSkillsCount}\n- Evaluations: ${summary.totalEvaluations} (Pass Rate: ${summary.evaluationPassRate}%)\n- Lock Status: ${summary.extensionLockStatus}`,
        );
        return 0;
      }
      if (subcommand === "inspect") {
        const inspection = await inspectProceduralMemory({ root }, fileSystem);
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(inspection, null, 2));
        } else {
          const lines = [
            `Procedural Memory Inspection:`,
            `- Total Proposals: ${inspection.summary.totalProposals}`,
            `- Active Skills: ${inspection.summary.activeSkillsCount}`,
            `- Evaluation Pass Rate: ${inspection.summary.evaluationPassRate}%`,
            `- Lock Status: ${inspection.summary.extensionLockStatus}`,
            "",
            `Issues (${inspection.issues.length}):`,
            ...(inspection.issues.length > 0
              ? inspection.issues.map((i) => `  - ${i}`)
              : ["  - None"]),
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "list") {
        const items = await listPersistentMemoryItems({ root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(items, null, 2)
            : items
                .map(
                  (item) =>
                    `[${item.id}] ${item.lifecycleState} ${item.classification}`,
                )
                .join("\n"),
        );
        return 0;
      }
      if (subcommand === "review") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("memory review requires --id <id>");
        const item = await getPersistentMemoryItem(id, { root }, fileSystem);
        if (!item) return 3;
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(item, null, 2)
            : `[${item.id}] ${item.lifecycleState}\n${item.content}`,
        );
        return 0;
      }
      if (subcommand === "propose") {
        const raw = parsed.values.get("--json-input");
        if (!raw)
          throw new CliUsageError(
            "memory propose requires --json-input <json>",
          );
        const input = JSON.parse(raw);
        const item = await proposePersistentMemory(input, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(item, null, 2)
            : `Proposed persistent memory [${item.id}]`,
        );
        return 0;
      }
      if (subcommand === "accept") {
        const id = parsed.values.get("--id") ?? args[2];
        const approvedBy = parsed.values.get("--approved-by");
        const evidence = parsed.values.get("--evidence");
        if (!id || !approvedBy || !evidence)
          throw new CliUsageError(
            "memory accept requires --id, --approved-by, and --evidence",
          );
        const item = await acceptPersistentMemory(
          id,
          { approvedBy, evidence },
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(item, null, 2)
            : `Accepted persistent memory [${item.id}]`,
        );
        return 0;
      }
      if (subcommand === "forget") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("memory forget requires --id <id>");
        const item = await forgetPersistentMemory(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(item, null, 2)
            : `Forgot persistent memory [${item.id}]`,
        );
        return 0;
      }
      if (subcommand === "export") {
        const projectId = parsed.values.get("--project-id");
        if (!projectId)
          throw new CliUsageError("memory export requires --project-id <id>");
        const bundle = await exportPersistentMemory(
          { root, projectId },
          fileSystem,
        );
        io.stdout(JSON.stringify(bundle, null, 2));
        return 0;
      }
      if (subcommand === "import") {
        const projectId = parsed.values.get("--project-id");
        const raw = parsed.values.get("--json-input");
        if (!projectId || !raw)
          throw new CliUsageError(
            "memory import requires --project-id and --json-input <json>",
          );
        const items = await importPersistentMemory(
          JSON.parse(raw),
          { root, projectId },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(items, null, 2)
            : `Imported ${items.length} persistent memory proposals`,
        );
        return 0;
      }
      if (subcommand === "search" || subcommand === "render") {
        const projectId = parsed.values.get("--project-id");
        const query = parsed.values.get("--query");
        if (!projectId || !query)
          throw new CliUsageError(
            `memory ${subcommand} requires --project-id and --query`,
          );
        if (subcommand === "search") {
          io.stdout(
            JSON.stringify(
              await searchPersistentMemory(
                query,
                { root, projectId },
                fileSystem,
              ),
              null,
              2,
            ),
          );
        } else {
          const target = parsed.values.get("--target") as any;
          if (!target)
            throw new CliUsageError("memory render requires --target");
          const result = await renderPersistentMemoryContext(
            target,
            query,
            { root, projectId },
            fileSystem,
          );
          io.stdout(
            parsed.flags.has("--json")
              ? JSON.stringify(result, null, 2)
              : result.content,
          );
        }
        return 0;
      }
      if (subcommand === "index") {
        if (parsed.flags.has("--clear")) {
          await clearPersistentMemoryIndex({ root }, fileSystem);
          io.stdout("Cleared persistent memory index");
          return 0;
        }
        const projectId = parsed.values.get("--project-id");
        if (!projectId)
          throw new CliUsageError("memory index requires --project-id");
        io.stdout(
          JSON.stringify(
            await rebuildPersistentMemoryIndex({ root, projectId }, fileSystem),
            null,
            2,
          ),
        );
        return 0;
      }
      throw new CliUsageError(`unsupported memory subcommand: ${subcommand}`);
    }
    if (parsed.command === "checkpoint") {
      const subcommand = args[1];
      if (subcommand === "create") {
        const taskId = parsed.values.get("--task-id") ?? args[2];
        if (!taskId) {
          throw new CliUsageError("checkpoint create requires --task-id <id>");
        }
        const created = await createTaskCheckpoint(
          taskId,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(created, null, 2)
            : `Created task checkpoint [${created.id}] for task [${taskId}]`,
        );
        return 0;
      }
      if (subcommand === "pause") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id) throw new CliUsageError("checkpoint pause requires --id <id>");
        const paused = await pauseTask(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(paused, null, 2)
            : `Paused task checkpoint [${id}]`,
        );
        return 0;
      }
      if (subcommand === "cancel") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id)
          throw new CliUsageError("checkpoint cancel requires --id <id>");
        const cancelled = await cancelTask(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(cancelled, null, 2)
            : `Cancelled task checkpoint [${id}]`,
        );
        return 0;
      }
      if (subcommand === "redirect") {
        const id = parsed.values.get("--id") ?? args[2];
        const newIntent = parsed.values.get("--new-intent");
        if (!id || !newIntent) {
          throw new CliUsageError(
            "checkpoint redirect requires --id <id> and --new-intent <intent>",
          );
        }
        const redirected = await redirectTask(
          id,
          newIntent,
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(redirected, null, 2)
            : `Redirected task checkpoint [${id}] to: ${newIntent}`,
        );
        return 0;
      }
      if (subcommand === "resume") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id)
          throw new CliUsageError("checkpoint resume requires --id <id>");
        const resumed = await resumeTask(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(resumed, null, 2)
            : `Resumed task checkpoint [${id}] (invalidated ${resumed.invalidatedCount} stale plans)`,
        );
        return 0;
      }
      if (subcommand === "list") {
        const taskId = parsed.values.get("--task-id");
        const checkpoints = await listTaskCheckpoints(
          { root, ...(taskId !== undefined ? { taskId } : {}) },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(checkpoints, null, 2));
        } else {
          const lines = checkpoints.map(
            (c) => `- [${c.id}] task=${c.taskId} state=${c.state}`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "delete") {
        const id = parsed.values.get("--id") ?? args[2];
        if (!id)
          throw new CliUsageError("checkpoint delete requires --id <id>");
        const deleted = await deleteTaskCheckpoint(id, { root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify({ id, deleted })
            : `Deleted checkpoint [${id}]: ${deleted}`,
        );
        return 0;
      }
      throw new CliUsageError(
        `unsupported checkpoint subcommand: ${subcommand}`,
      );
    }
    if (parsed.command === "profile") {
      const subcommand = args[1];
      if (subcommand === "create") {
        const name = parsed.values.get("--name") ?? args[2];
        if (!name) {
          throw new CliUsageError("profile create requires --name <name>");
        }
        const created = await createProfile(
          {
            schemaVersion: "1",
            name,
            allowedCapabilities: {
              readOnly: false,
              allowedPaths: ["."],
              allowedTools: ["*"],
              maxBudget: 100,
              allowNetwork: true,
            },
            activeRoles: [
              "context-scout",
              "feature-builder",
              "test-engineer",
              "reviewer",
              "release-analyst",
            ],
            createdAt: new Date().toISOString(),
          },
          { root },
          fileSystem,
        );
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(created, null, 2)
            : `Created profile [${created.name}]`,
        );
        return 0;
      }
      if (subcommand === "get") {
        const name = parsed.values.get("--name") ?? args[2];
        if (!name) {
          throw new CliUsageError("profile get requires --name <name>");
        }
        const profile = await getProfile(name, { root }, fileSystem);
        if (!profile) {
          throw new Error(`Profile not found: ${name}`);
        }
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(profile, null, 2)
            : `Profile [${profile.name}]: ${profile.activeRoles.join(", ")}`,
        );
        return 0;
      }
      if (subcommand === "list") {
        const profiles = await listProfiles({ root }, fileSystem);
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(profiles, null, 2));
        } else {
          const lines = profiles.map(
            (p) => `- [${p.name}] roles=${p.activeRoles.join(",")}`,
          );
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      throw new CliUsageError(`unsupported profile subcommand: ${subcommand}`);
    }
    if (parsed.command === "delegate") {
      const profileName = parsed.values.get("--profile");
      const role = parsed.values.get("--role");
      const parentTaskId = parsed.values.get("--task-id");
      if (!profileName || !role || !parentTaskId) {
        throw new CliUsageError(
          "delegate requires --profile <name>, --role <role>, and --task-id <id>",
        );
      }
      const delegation = await delegateTaskRole(
        {
          schemaVersion: "1",
          profileName,
          role: role as DelegatedAgentRole,
          parentTaskId,
        },
        { root },
        fileSystem,
      );
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(delegation, null, 2)
          : `Delegated role [${delegation.grantedRole}] under profile [${profileName}] (ID: ${delegation.delegationId})`,
      );
      return 0;
    }
    if (parsed.command === "rank") {
      const subcommand = args[1];
      if (subcommand === "config") {
        let enabled: boolean | undefined;
        if (parsed.flags.has("--enable")) enabled = true;
        if (parsed.flags.has("--disable")) enabled = false;

        const rawProvider = parsed.values.get("--provider");
        const provider = rawProvider as SemanticRankingProvider | undefined;

        if (enabled !== undefined || provider !== undefined) {
          const current = await getSemanticRankingConfig({ root }, fileSystem);
          const updated = await updateSemanticRankingConfig(
            {
              ...current,
              ...(enabled !== undefined ? { enabled } : {}),
              ...(provider !== undefined ? { provider } : {}),
            },
            { root },
            fileSystem,
          );
          io.stdout(
            parsed.flags.has("--json")
              ? JSON.stringify(updated, null, 2)
              : `Updated semantic ranking config: enabled=${updated.enabled}, provider=${updated.provider}`,
          );
          return 0;
        }

        const config = await getSemanticRankingConfig({ root }, fileSystem);
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(config, null, 2)
            : `Semantic ranking config: enabled=${config.enabled}, provider=${config.provider}`,
        );
        return 0;
      }

      const query = parsed.values.get("--query") ?? args[1];
      if (!query) {
        throw new CliUsageError(
          "rank requires a query string or 'config' subcommand",
        );
      }

      const rawProvider = parsed.values.get("--provider");
      const provider = rawProvider as SemanticRankingProvider | undefined;
      const enabled = parsed.flags.has("--disable") ? false : undefined;

      const result = await rankProceduralMemory(
        query,
        {
          root,
          ...(provider !== undefined ? { provider } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
        },
        fileSystem,
      );

      if (parsed.flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Semantic Rank Results for: "${result.query}" (Provider: ${result.provider}, Latency: ${result.rankingLatencyMs}ms)`,
          ...result.items.map(
            (item) =>
              `- [${item.score.toFixed(2)}] [${item.type}] ${item.id}: ${item.relevanceReason}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    if (parsed.command === "context") {
      const subcommand = args[1];
      if (subcommand !== "get") {
        throw new CliUsageError("context requires get subcommand");
      }
      const query = parsed.values.get("--query");
      const rawMaxTokens = parsed.values.get("--max-tokens");
      const rawMaxItems = parsed.values.get("--max-items");

      const maxTokens = rawMaxTokens ? parseInt(rawMaxTokens, 10) : undefined;
      const maxItems = rawMaxItems ? parseInt(rawMaxItems, 10) : undefined;

      const result = await getBoundedProjectContext(
        {
          schemaVersion: "1",
          query,
          maxTokens,
          maxItems,
        },
        { root },
        fileSystem,
      );

      if (parsed.flags.has("--json")) {
        io.stdout(JSON.stringify(result, null, 2));
      } else {
        const lines = [
          `Bounded Project Context (Root: ${result.root}, Tokens: ${result.totalTokens}, Excluded: ${result.excludedPathsCount})`,
          ...result.items.map(
            (item) =>
              `- [${item.trustClass}] [${item.type}] ${item.path} (${item.tokenCount} tokens): ${item.summary}`,
          ),
        ];
        io.stdout(lines.join("\n"));
      }
      return 0;
    }
    if (parsed.command === "doctor")
      invalidMetadata.push(
        ...(await validateProjectSkills(root, fileSystem, validator)),
      );
    if (parsed.command === "doctor") {
      const configInvalid = invalidMetadata.some(
        (result) => result.artifactType === "aif-config",
      );
      const configPresent = await fileSystem.exists(
        resolve(root, ".aif/config.yaml"),
      );
      const storedDoctorConfig =
        configPresent && !configInvalid
          ? await projectConfiguration(root, fileSystem, validator, false)
          : undefined;
      const detection = await detectProjectProfiles(root, fileSystem);
      const profile =
        parsed.values.get("--profile") ??
        storedDoctorConfig?.profile ??
        detection.selectedProfile;
      const adapterNames = parseAdapters(
        parsed.values.get("--adapters") ??
          storedDoctorConfig?.adapters.join(",") ??
          "codex",
      );
      const projectOwnedMappings =
        storedDoctorConfig?.projectOwnedMappings ?? [];
      const documentationMappings =
        storedDoctorConfig?.documentationMappings ?? [];
      const daemonEndpoint = parsed.values.get("--daemon-endpoint");
      if (daemonEndpoint !== undefined) {
        const tokenFile = parsed.values.get("--daemon-token-file")!;
        const sessionToken = (await readFile(tokenFile, "utf8")).trim();
        const result = await requestDaemonDoctor({
          endpoint: daemonEndpoint,
          sessionToken,
          request: createDoctorRequest(1, {
            root,
            profile,
            adapters: adapterNames,
          }),
        });
        io.stdout(
          parsed.flags.has("--json")
            ? JSON.stringify(result, null, 2)
            : formatDaemonDoctor(result),
        );
        return result.exitCode;
      }
      const result = await doctorProject(
        {
          root,
          profile,
          adapters: adapterNames,
          dryRun: true,
          catalogRoot: dependencies.catalogRoot,
          validator,
          projectOwnedMappings,
          documentationMappings,
        },
        fileSystem,
        invalidMetadata,
      );
      io.stdout(
        parsed.flags.has("--json")
          ? JSON.stringify(result, null, 2)
          : formatDoctor(result),
      );
      return doctorExitCode(result);
    }
    if (parsed.command === "adopt" && parsed.flags.has("--plan")) {
      const plan = await planProjectAdoption({ root }, fileSystem);
      const outputText = parsed.flags.has("--json")
        ? stableStringify(plan)
        : formatGovernanceAdoptionPlan(plan);
      const outputPath = parsed.values.get("--output");
      if (outputPath !== undefined) {
        const targetPath = resolveWithin(root, outputPath);
        await fileSystem.write(targetPath, outputText);
      }
      io.stdout(`${outputText}\n`);
      if (
        parsed.flags.has("--strict") &&
        (!plan.automaticApplyAllowed ||
          plan.findings.some(
            (finding) =>
              finding.status === "ambiguous" ||
              finding.status === "conflicting",
          ))
      ) {
        return 3;
      }
      return 0;
    }
    if (parsed.command === "adopt" && parsed.values.has("--apply")) {
      const planFile = parsed.values.get("--apply")!;
      const planPath = resolveWithin(root, planFile);
      if (!(await fileSystem.exists(planPath))) {
        io.stderr(`Adoption plan file not found: ${planFile}\n`);
        return 3;
      }
      const rawPlan = await fileSystem.read(planPath);
      let plan: AdoptionPlan;
      try {
        plan = parseAdoptionPlan(rawPlan);
      } catch (err) {
        io.stderr(
          `Invalid adoption plan file: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        return 3;
      }
      const applyResult = await applyProjectAdoption(
        {
          root,
          plan,
          dryRun: parsed.flags.has("--dry-run"),
        },
        fileSystem,
      );
      if (parsed.flags.has("--json")) {
        io.stdout(`${JSON.stringify(applyResult, null, 2)}\n`);
      } else {
        io.stdout(
          `Adoption apply status: ${applyResult.status}\n` +
            `Applied operations: ${applyResult.appliedOperations.length}\n` +
            `Created files: ${applyResult.createdFiles.length}\n` +
            `Updated files: ${applyResult.updatedFiles.length}\n` +
            (applyResult.error ? `Error: ${applyResult.error}\n` : ""),
        );
      }
      if (
        applyResult.status === "stale-hash" ||
        applyResult.status === "failed"
      ) {
        return 3;
      }
      if (applyResult.status === "rolled-back") {
        return 4;
      }
      return 0;
    }
    if (parsed.command === "update" && parsed.flags.has("--plan")) {
      const plan = await planPackUpdate({ root }, fileSystem);
      const outputText = parsed.flags.has("--json")
        ? stableStringify(plan)
        : formatGovernanceAdoptionPlan(plan);
      const outputPath = parsed.values.get("--output");
      if (outputPath !== undefined) {
        const targetPath = resolveWithin(root, outputPath);
        await fileSystem.write(targetPath, outputText);
      }
      io.stdout(`${outputText}\n`);
      if (
        parsed.flags.has("--strict") &&
        (!plan.automaticApplyAllowed ||
          plan.findings.some(
            (finding) =>
              finding.status === "ambiguous" ||
              finding.status === "conflicting",
          ))
      ) {
        return 3;
      }
      return 0;
    }
    if (parsed.command === "update" && parsed.values.has("--apply")) {
      const planFile = parsed.values.get("--apply")!;
      const planPath = resolveWithin(root, planFile);
      if (!(await fileSystem.exists(planPath))) {
        io.stderr(`Update plan file not found: ${planFile}\n`);
        return 3;
      }
      const rawPlan = await fileSystem.read(planPath);
      let plan: AdoptionPlan;
      try {
        plan = parseAdoptionPlan(rawPlan);
      } catch (err) {
        io.stderr(
          `Invalid update plan file: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        return 3;
      }
      const applyResult = await applyProjectAdoption(
        {
          root,
          plan,
          dryRun: parsed.flags.has("--dry-run"),
        },
        fileSystem,
      );
      if (parsed.flags.has("--json")) {
        io.stdout(`${JSON.stringify(applyResult, null, 2)}\n`);
      } else {
        io.stdout(
          `Pack update apply status: ${applyResult.status}\n` +
            `Applied operations: ${applyResult.appliedOperations.length}\n` +
            `Created files: ${applyResult.createdFiles.length}\n` +
            `Updated files: ${applyResult.updatedFiles.length}\n` +
            (applyResult.error ? `Error: ${applyResult.error}\n` : ""),
        );
      }
      if (
        applyResult.status === "stale-hash" ||
        applyResult.status === "failed"
      ) {
        return 3;
      }
      if (applyResult.status === "rolled-back") {
        return 4;
      }
      return 0;
    }
    if (
      invalidMetadata.length > 0 &&
      parsed.command !== "adopt" &&
      parsed.command !== "update"
    ) {
      const output = formatValidationFailure(
        invalidMetadata,
        parsed.flags.has("--json"),
      );
      io.stderr(output);
      return 3;
    }
    const invalidAdoptionConfig =
      (parsed.command === "adopt" || parsed.command === "update") &&
      invalidMetadata.some((result) => result.artifactType === "aif-config");
    const storedConfig =
      readsProject && !invalidAdoptionConfig
        ? await projectConfiguration(
            root,
            fileSystem,
            validator,
            parsed.command === "sync",
          )
        : undefined;
    const configPresent = readsProject
      ? await fileSystem.exists(resolve(root, ".aif/config.yaml"))
      : false;
    const adoptionDetection =
      parsed.command === "adopt"
        ? await detectProjectProfiles(root, fileSystem)
        : undefined;
    const profile =
      parsed.values.get("--profile") ??
      (configPresent
        ? storedConfig?.profile
        : adoptionDetection?.selectedProfile) ??
      "generic";
    const adapterNames = parseAdapters(
      parsed.values.get("--adapters") ??
        (configPresent ? storedConfig?.adapters.join(",") : undefined) ??
        (parsed.command === "adopt" ? "codex" : "claude,codex,cursor,copilot"),
    );
    const cliProjectOwnedMappings = parseMappings(
      parsed.mappingValues.get("--project-owned-mapping") ?? [],
    );
    const cliDocumentationMappings = parseMappings(
      parsed.mappingValues.get("--documentation-mapping") ?? [],
    );
    const projectOwnedMappings = parsed.mappingValues.has(
      "--project-owned-mapping",
    )
      ? cliProjectOwnedMappings
      : (storedConfig?.projectOwnedMappings ?? []);
    const documentationMappings = parsed.mappingValues.has(
      "--documentation-mapping",
    )
      ? cliDocumentationMappings
      : (storedConfig?.documentationMappings ?? []);
    const options = {
      root,
      profile,
      adapters: adapterNames,
      dryRun: parsed.flags.has("--dry-run"),
      catalogRoot: dependencies.catalogRoot,
      validator,
      projectOwnedMappings,
      documentationMappings,
      ...(parsed.command === "adopt"
        ? {
            existingValidationResults: invalidMetadata,
            profileConfirmed:
              parsed.values.has("--profile") || storedConfig !== undefined,
          }
        : {}),
    };
    if (parsed.command === "sync") {
      const result = await syncProject(
        { ...options, force: parsed.flags.has("--force") },
        fileSystem,
        dependencies.transactionOptions,
      );
      const outcome =
        "dryRun" in result
          ? mapDryRunToCliOutcome(result)
          : mapTransactionResultToCliOutcome(result);
      io.stdout(
        parsed.flags.has("--json")
          ? formatJsonOutcome(outcome)
          : formatHumanOutcome(outcome),
      );
      return outcome.exitCode;
    }
    const result =
      parsed.command === "init"
        ? await initProject(options, fileSystem)
        : parsed.command === "adopt"
          ? await adoptProject(
              options,
              fileSystem,
              dependencies.transactionOptions,
            )
          : parsed.command === "diff"
            ? await diffProject(options, fileSystem)
            : await planFeature(parsed.values.get("--task") ?? "", validator);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(result, null, 2)
        : typeof result === "string"
          ? result
          : parsed.command === "adopt"
            ? formatAdoptionProposal(result as AdoptionProposal)
            : formatPlan(result),
    );
    if (parsed.command === "adopt") {
      const adoption = result as AdoptionProposal;
      if (adoption.transactionOutcome?.status === "failed")
        return adoption.transactionOutcome.rollbackCompleted ? 4 : 5;
      return adoption.applicationStatus === "blocked" ||
        adoption.applicationStatus === "failed-restored" ||
        adoption.applicationStatus === "failed-incomplete" ||
        adoption.diagnostics.length > 0 ||
        adoption.items.some(
          (item) => item.manualDecisionRequired || item.action === "conflict",
        )
        ? 3
        : 0;
    }
    return typeof result === "string" || conflicts(result).length === 0 ? 0 : 3;
  } catch (error) {
    if (error instanceof SchemaCatalogError) {
      const payload = {
        status: "invalid",
        errorCode: error.code,
        schemaFile: error.schemaFile,
      };
      const output = args.includes("--json")
        ? JSON.stringify(payload, null, 2)
        : `Intentloom schema catalog validation failed: ${error.schemaFile} [${error.code}]`;
      if (args[0] === "doctor") io.stdout(output);
      else io.stderr(output);
      return 3;
    }
    if (
      error instanceof CliProjectValidationError ||
      error instanceof ArtifactValidationFailure
    ) {
      const json = args.includes("--json");
      io.stderr(formatValidationFailure(error.results, json));
      return 3;
    }
    io.stderr(error instanceof Error ? error.message : "configuration error");
    return 2;
  }
}
