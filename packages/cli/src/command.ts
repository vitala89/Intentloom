import { cwd } from "node:process";
import { resolve } from "node:path";
import {
  ArtifactValidationFailure,
  adoptProject,
  detectProjectProfiles,
  destinationCollisionKey,
  diffProject,
  initProject,
  nodeFileSystem,
  planFeature,
  planProjectAdoption,
  applyProjectAdoption,
  planPackUpdate,
  syncProject,
  getTaskSummary,
  listTaskSummaries,
  recordTaskSummary,
  discoverSkills,
  createSkillProposal,
  listSkillProposals,
  getSkillProposal,
  updateSkillProposalState,
  evaluateSkillProposal,
  listSkillEvaluations,
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
  startAgentSession,
  getAgentSession,
  listAgentSessions,
  closeAgentSession,
  deleteAgentSession,
  exportAgentSession,
  importSarifSecurityReport,
  getSecurityCoverageReport,
  dismissSecurityFinding,
  acceptSecurityRisk,
  listSecurityFindings,
  runLocalSecurityAdapters,
  getSecurityPolicy,
  updateSecurityBaseline,
  checkSecurityPolicyAndBaseline,
  getSandboxCapabilityPolicy,
  evaluateProposalAgainstSandbox,
  runContinuousSecurityAudit,
  type SecurityFindingSeverity,
  type SecurityFindingState,
  type SecurityAdapterCategory,
  type AgentSessionState,
  type SkillLoadingLevel,
  type SkillProposalState,
  type SemanticRankingProvider,
  type DelegatedAgentRole,
  type TrustClass,
  type RetentionState,
  type FileSystem,
  type AdoptionProposal,
  type Plan,
  type SyncDryRunResult,
  type TransactionOptions,
  type TransactionResult,
  type TransactionStage,
  type ProjectMapping,
} from "@intentloom/application";
import { type ProviderCacheStore } from "@intentloom/evidence-provider";
import { runCleanCommand } from "./clean-command.js";
import { runConformanceCommand } from "./conformance-command.js";
import { runDoctorCommand } from "./doctor-command.js";
import { runInspectCommand } from "./inspect-command.js";
import { runTimelineCommand } from "./timeline-command.js";
import { runUiCommand } from "./ui-command.js";
import { runWorkspaceCommand } from "./workspace-command.js";
import { runNeutronCommand } from "./neutron-command.js";
import { runEvidenceCommand } from "./evidence-command.js";
import { runHarnessCommand } from "./harness-command.js";
import {
  assertDaemonFlagsAllowed,
  CliProjectValidationError,
  CliUsageError,
  createCliArtifactValidator,
  parseAdapters,
  projectConfiguration,
  validateExistingMetadata,
} from "./cli-project-metadata.js";
import { usage } from "./usage.js";
import { formatAdoptionProposal, formatPlan } from "./formatters.js";
import {
  INTENTLOOM_VERSION,
  normalizeOutputPath,
  resolveWithin,
} from "@intentloom/core";
import {
  parseAdoptionPlan,
  stableStringify,
  type AdoptionPlan,
} from "@intentloom/core/adoption";
import {
  SchemaCatalogError,
  type ArtifactValidationResult,
} from "@intentloom/validator";

export type CliExitCode = 0 | 2 | 3 | 4 | 5;

export interface CliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface CliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
  readonly providerCacheStore?: ProviderCacheStore;
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

interface ParsedArguments {
  readonly command: string;
  readonly flags: ReadonlySet<string>;
  readonly values: ReadonlyMap<string, string>;
  readonly mappingValues: ReadonlyMap<string, readonly string[]>;
}

const commands = new Set([
  "init",
  "adopt",
  "update",
  "plan",
  "diff",
  "sync",
  "evidence",
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
  "session",
  "security",
]);
const projectPathCommands = new Set(["adopt", "update", "diff", "sync"]);
const booleanFlags = new Set([
  "--cache",
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
  "--severity",
  "--reason",
  "--category",
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
  "--path",
  "--conversation-id",
  "--content",
  "--mode",
  "--input",
  "--view",
]);
const mappingValueFlags = new Set([
  "--project-owned-mapping",
  "--documentation-mapping",
]);

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "";
  if (!commands.has(command)) throw new CliUsageError(usage);
  if (
    command === "evidence" &&
    !["fetch", "import", "analyze"].includes(args[1] ?? "")
  )
    throw new CliUsageError("evidence requires fetch, import, or analyze");
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
  if (
    command === "session" &&
    !["start", "close", "list", "get", "delete", "export"].includes(
      args[1] ?? "",
    )
  )
    throw new CliUsageError(
      "session requires start, close, list, get, delete, or export subcommand",
    );
  if (
    command === "security" &&
    ![
      "import",
      "inspect",
      "coverage",
      "dismiss",
      "accept-risk",
      "list",
      "scan",
      "baseline",
      "policy",
      "sandbox",
      "audit",
      "verify",
    ].includes(args[1] ?? "")
  )
    throw new CliUsageError(
      "security requires import, inspect, coverage, dismiss, accept-risk, list, scan, baseline, policy, sandbox, audit, or verify subcommand",
    );
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const mappingValues = new Map<string, string[]>();
  for (
    let index =
      command === "security" &&
      (args[1] === "baseline" || args[1] === "sandbox") &&
      args[2] !== undefined &&
      !args[2].startsWith("--")
        ? 3
        : command === "evidence" ||
            command === "summary" ||
            command === "skill" ||
            command === "proposal" ||
            command === "evaluate" ||
            command === "memory" ||
            command === "checkpoint" ||
            command === "profile" ||
            command === "context" ||
            command === "session" ||
            command === "security" ||
            (command === "rank" &&
              args[1] !== undefined &&
              !args[1].startsWith("--"))
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
  assertDaemonFlagsAllowed(command, daemonEndpoint, daemonTokenFile);
  if (flags.has("--cache")) {
    throw new CliUsageError("--cache is only valid with clean");
  }
  return { command, flags, values, mappingValues };
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
    if (args[0] === "harness") {
      return await runHarnessCommand(
        args,
        { fileSystem: dependencies.fileSystem ?? nodeFileSystem },
        io,
      );
    }
    if (args[0] === "evidence") {
      return await runEvidenceCommand(args, io);
    }
    if (args[0] === "clean") {
      return runCleanCommand(args, dependencies, io);
    }
    if (args[0] === "inspect") {
      return runInspectCommand(args, dependencies, io);
    }
    if (args[0] === "timeline") {
      return runTimelineCommand(args, {}, io);
    }
    if (args[0] === "conformance") {
      return runConformanceCommand(args, dependencies, io);
    }
    if (args[0] === "doctor") {
      return runDoctorCommand(args, dependencies, io);
    }
    if (args[0] === "ui") {
      return runUiCommand(args, dependencies, io);
    }
    if (args[0] === "workspace") {
      return await runWorkspaceCommand(args, dependencies, io);
    }
    if (args[0] === "neutron") {
      return await runNeutronCommand(args, dependencies, io);
    }
    const parsed = parseArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const root = parsed.values.get("--root") ?? cwd();
    const validator = await createCliArtifactValidator(
      dependencies.catalogRoot,
    );
    const readsProject = ["sync", "adopt", "diff"].includes(parsed.command);
    const invalidMetadata = readsProject
      ? await validateExistingMetadata(root, fileSystem, validator)
      : [];
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
    if (parsed.command === "session") {
      const subcommand = args[1];
      if (
        !["start", "close", "list", "get", "delete", "export"].includes(
          subcommand ?? "",
        )
      ) {
        throw new CliUsageError(
          "session requires start, close, list, get, delete, or export subcommand",
        );
      }
      const sessionId =
        parsed.values.get("--id") ??
        (args[2] && !args[2].startsWith("--") ? args[2] : undefined);
      const activeTask = parsed.values.get("--task") ?? "unspecified-task";
      const projectId = parsed.values.get("--project-id") ?? "project-local";

      if (subcommand === "start") {
        const session = await startAgentSession(
          {
            root,
            projectId,
            activeTask,
            ...(sessionId !== undefined ? { sessionId } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(session, null, 2));
        } else {
          io.stdout(
            `Started agent session ${session.sessionId} [${session.state}] for task: ${session.activeTask}`,
          );
        }
        return 0;
      }
      if (subcommand === "close") {
        if (!sessionId)
          throw new CliUsageError(
            "session close requires session ID (--id or positional argument)",
          );
        const session = await closeAgentSession(
          sessionId,
          { root },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(session, null, 2));
        } else {
          io.stdout(
            `Closed agent session ${session.sessionId} [${session.state}]`,
          );
        }
        return 0;
      }
      if (subcommand === "list") {
        const rawState = parsed.values.get("--state");
        const state = rawState as AgentSessionState | undefined;
        const sessions = await listAgentSessions(
          {
            root,
            ...(state !== undefined ? { state } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(sessions, null, 2));
        } else {
          const lines = [
            `Agent Sessions (${sessions.length}):`,
            ...sessions.map(
              (s) => `- ${s.sessionId} [${s.state}] (${s.activeTask})`,
            ),
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "get") {
        if (!sessionId)
          throw new CliUsageError(
            "session get requires session ID (--id or positional argument)",
          );
        const session = await getAgentSession(sessionId, { root }, fileSystem);
        if (!session) {
          throw new Error(`agent session not found: ${sessionId}`);
        }
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(session, null, 2));
        } else {
          const lines = [
            `Agent Session: ${session.sessionId}`,
            `State: ${session.state}`,
            `Task: ${session.activeTask}`,
            `Created: ${session.createdAt}`,
            `Updated: ${session.updatedAt}`,
            ...(session.closedAt ? [`Closed: ${session.closedAt}`] : []),
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }
      if (subcommand === "delete") {
        if (!sessionId)
          throw new CliUsageError(
            "session delete requires session ID (--id or positional argument)",
          );
        await deleteAgentSession(sessionId, { root }, fileSystem);
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify({ status: "deleted", sessionId }, null, 2));
        } else {
          io.stdout(`Deleted agent session: ${sessionId}`);
        }
        return 0;
      }
      if (subcommand === "export") {
        if (!sessionId)
          throw new CliUsageError(
            "session export requires session ID (--id or positional argument)",
          );
        const targetPath = parsed.values.get("--output");
        const result = await exportAgentSession(
          sessionId,
          {
            root,
            projectId,
            ...(targetPath !== undefined ? { targetPath } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(result, null, 2));
        } else {
          io.stdout(
            `Exported agent session ${sessionId} for project ${projectId}${targetPath ? ` to ${targetPath}` : ""}`,
          );
        }
        return 0;
      }
    }
    if (parsed.command === "security") {
      const subcommand = args[1];
      if (
        ![
          "import",
          "inspect",
          "coverage",
          "dismiss",
          "accept-risk",
          "list",
          "scan",
          "baseline",
          "policy",
          "sandbox",
          "audit",
          "verify",
        ].includes(subcommand ?? "")
      ) {
        throw new CliUsageError(
          "security requires import, inspect, coverage, dismiss, accept-risk, list, scan, baseline, policy, sandbox, audit, or verify subcommand",
        );
      }
      const projectId = parsed.values.get("--project-id") ?? "project-local";

      if (subcommand === "import") {
        const filePath = parsed.values.get("--file");
        if (!filePath) {
          throw new CliUsageError("security import requires --file <path>");
        }
        const fullPath = resolveWithin(root, filePath);
        if (!(await fileSystem.exists(fullPath))) {
          throw new Error(`security report file not found: ${filePath}`);
        }
        const content = await fileSystem.read(fullPath);
        const result = await importSarifSecurityReport(
          content,
          filePath,
          { root },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(result, null, 2));
        } else {
          io.stdout(
            `Imported ${result.importedCount} security findings from ${filePath}`,
          );
        }
        return 0;
      }

      if (subcommand === "coverage" || subcommand === "inspect") {
        const report = await getSecurityCoverageReport(
          { root, projectId },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(report, null, 2));
        } else {
          const lines = [
            `Security Posture Report for project ${report.projectId}:`,
            `Total Findings: ${report.totalFindings}`,
            `Scanners: ${report.scanners.join(", ") || "none"}`,
            `Severities: critical=${report.findingsBySeverity.critical}, high=${report.findingsBySeverity.high}, medium=${report.findingsBySeverity.medium}, low=${report.findingsBySeverity.low}, info=${report.findingsBySeverity.info}`,
            `States: open=${report.findingsByState.open}, verified=${report.findingsByState.verified}, dismissed=${report.findingsByState.dismissed}, accepted-risk=${report.findingsByState["accepted-risk"]}, remediated=${report.findingsByState.remediated}`,
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }

      if (subcommand === "dismiss") {
        const id =
          parsed.values.get("--id") ??
          (args[2] && !args[2].startsWith("--") ? args[2] : undefined);
        const reason =
          parsed.values.get("--reason") ?? "Dismissed by maintainer";
        if (!id) {
          throw new CliUsageError(
            "security dismiss requires finding ID (--id or positional argument)",
          );
        }
        const updated = await dismissSecurityFinding(
          id,
          { root, reason },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(updated, null, 2));
        } else {
          io.stdout(
            `Dismissed security finding ${id}: ${updated.dismissalReason}`,
          );
        }
        return 0;
      }

      if (subcommand === "accept-risk") {
        const id =
          parsed.values.get("--id") ??
          (args[2] && !args[2].startsWith("--") ? args[2] : undefined);
        const approvedBy = parsed.values.get("--approved-by") ?? "maintainer";
        const reason = parsed.values.get("--reason") ?? "Accepted risk";
        if (!id) {
          throw new CliUsageError(
            "security accept-risk requires finding ID (--id or positional argument)",
          );
        }
        const updated = await acceptSecurityRisk(
          id,
          { root, approvedBy, reason },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(updated, null, 2));
        } else {
          io.stdout(
            `Accepted risk for security finding ${id} by ${approvedBy}`,
          );
        }
        return 0;
      }

      if (subcommand === "list") {
        const rawSeverity = parsed.values.get("--severity");
        const rawState = parsed.values.get("--state");
        const severity = rawSeverity as SecurityFindingSeverity | undefined;
        const state = rawState as SecurityFindingState | undefined;

        const findings = await listSecurityFindings(
          {
            root,
            ...(severity !== undefined ? { severity } : {}),
            ...(state !== undefined ? { state } : {}),
          },
          fileSystem,
        );

        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(findings, null, 2));
        } else {
          const lines = [
            `Security Findings (${findings.length}):`,
            ...findings.map(
              (f) =>
                `- [${f.severity.toUpperCase()}] [${f.state}] ${f.id} (${f.title}): ${f.scanner}`,
            ),
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }

      if (subcommand === "scan") {
        const rawCategory = parsed.values.get("--category");
        const categories = rawCategory
          ? ([rawCategory] as SecurityAdapterCategory[])
          : undefined;

        const results = await runLocalSecurityAdapters(
          {
            root,
            ...(categories !== undefined ? { categories } : {}),
          },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(results, null, 2));
        } else {
          const total = results.reduce((acc, r) => acc + r.totalCount, 0);
          const lines = [
            `Ran ${results.length} security adapters (${total} total findings discovered):`,
            ...results.map(
              (r) =>
                `- [${r.adapter.category}] ${r.adapter.name}: ${r.totalCount} findings`,
            ),
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }

      if (subcommand === "baseline") {
        const action = args[2] ?? "check";
        if (action === "update") {
          const baseline = await updateSecurityBaseline(
            { root, projectId },
            fileSystem,
          );
          if (parsed.flags.has("--json")) {
            io.stdout(JSON.stringify(baseline, null, 2));
          } else {
            io.stdout(
              `Updated security baseline for ${projectId}: ${baseline.acceptedFindings.length} findings accepted (hash: ${baseline.baselineHash.slice(0, 8)})`,
            );
          }
          return 0;
        }
        const result = await checkSecurityPolicyAndBaseline(
          { root, projectId },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(result, null, 2));
        } else {
          const lines = [
            `Security Baseline & Policy Check for ${projectId}:`,
            `New Findings: ${result.newFindings.length}`,
            `Resolved Findings: ${result.resolvedFindings.length}`,
            `Policy Violations: ${result.policyViolations.length}`,
            `Exit Code: ${result.exitCode}`,
          ];
          io.stdout(lines.join("\n"));
        }
        return result.exitCode as CliExitCode;
      }

      if (subcommand === "policy") {
        const policy = await getSecurityPolicy({ root, projectId }, fileSystem);
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(policy, null, 2));
        } else {
          const lines = [
            `Security Policy for ${policy.projectId}:`,
            `Default Enforcement: ${policy.defaultEnforcement}`,
            `Rules (${policy.rules.length}):`,
            ...policy.rules.map((r) => `- ${r.target}: ${r.enforcement}`),
          ];
          io.stdout(lines.join("\n"));
        }
        return 0;
      }

      if (subcommand === "sandbox") {
        const action = args[2] ?? "policy";
        if (action === "policy" || action === "check") {
          const policy = await getSandboxCapabilityPolicy(
            { root, projectId },
            fileSystem,
          );
          if (parsed.flags.has("--json")) {
            io.stdout(JSON.stringify(policy, null, 2));
          } else {
            const lines = [
              `Sandbox Capability Policy for ${policy.projectId}:`,
              `Mode: ${policy.mode}`,
              `Allow Network: ${policy.allowNetwork}`,
              `Path Rules (${policy.pathRules.length}):`,
              ...policy.pathRules.map(
                (r) =>
                  `- ${r.pathPrefix} (write: ${r.allowWrite}, delete: ${r.allowDelete})`,
              ),
              `Command Rules (${policy.commandRules.length}):`,
              ...policy.commandRules.map((c) => `- ${c.commandPrefix}`),
            ];
            io.stdout(lines.join("\n"));
          }
          return 0;
        }

        if (action === "validate" || action === "eval") {
          const targetPath = parsed.values.get("--path") ?? "src/app.ts";
          const sampleProposal = {
            actions: [{ type: "write", path: targetPath }],
          };
          const result = await evaluateProposalAgainstSandbox(
            sampleProposal,
            { root, projectId },
            fileSystem,
          );
          if (parsed.flags.has("--json")) {
            io.stdout(JSON.stringify(result, null, 2));
          } else {
            const lines = [
              `Sandbox Evaluation for ${projectId}:`,
              `Allowed: ${result.allowed}`,
              `Violations (${result.violations.length}):`,
              ...result.violations.map((v) => `- ${v}`),
            ];
            io.stdout(lines.join("\n"));
          }
          return (result.allowed ? 0 : 3) as CliExitCode;
        }
        return 0;
      }

      if (subcommand === "audit" || subcommand === "verify") {
        const report = await runContinuousSecurityAudit(
          { root, projectId },
          fileSystem,
        );
        if (parsed.flags.has("--json")) {
          io.stdout(JSON.stringify(report, null, 2));
        } else {
          const lines = [
            `Continuous Security Audit & Verification for ${report.projectId}:`,
            `Security Health Score: ${report.healthScore}%`,
            `Audit Hash: ${report.auditHash.slice(0, 8)}`,
            `Invariant Verification (${report.invariantChecks.length} checks):`,
            ...report.invariantChecks.map(
              (c) =>
                `- [#${c.invariantId}] ${c.title}: ${c.status.toUpperCase()} (${c.details})`,
            ),
          ];
          io.stdout(lines.join("\n"));
        }
        const hasFailedInvariant = report.invariantChecks.some(
          (c) => c.status === "failed",
        );
        return (
          report.healthScore >= 80 && !hasFailedInvariant ? 0 : 3
        ) as CliExitCode;
      }
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
      io.stderr(output);
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
