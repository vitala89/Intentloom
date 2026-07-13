import { cwd } from "node:process";
import { resolve } from "node:path";
import { readdir } from "node:fs/promises";
import {
  ArtifactValidationFailure,
  adoptProject,
  destinationCollisionKey,
  diffProject,
  doctorProject,
  initProject,
  nodeFileSystem,
  planFeature,
  syncProject,
  type FileSystem,
  type Plan,
  type SyncDryRunResult,
  type TransactionOptions,
  type TransactionResult,
  type TransactionStage,
} from "./index.js";
import type { AdapterName } from "@aif/core";
import {
  createArtifactValidator,
  SchemaCatalogError,
  validateSkillSet,
  type ArtifactType,
  type ArtifactValidationResult,
  type ArtifactValidator,
} from "@aif/validator";

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
}

interface ProjectConfiguration {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
}

const commands = new Set(["init", "adopt", "plan", "diff", "sync", "doctor"]);
const booleanFlags = new Set(["--dry-run", "--force", "--json"]);
const valueFlags = new Set(["--root", "--profile", "--adapters", "--task"]);
const adapters = new Set<AdapterName>(["claude", "codex", "cursor", "copilot"]);
const usage =
  "Usage: aif <init|adopt|plan|diff|sync|doctor> [--root PATH] [--dry-run]";

function parseArguments(args: readonly string[]): ParsedArguments {
  const command = args[0] ?? "";
  if (!commands.has(command)) throw new CliUsageError(usage);
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (booleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!valueFlags.has(token))
      throw new CliUsageError(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new CliUsageError(`missing value for ${token}`);
    values.set(token, value);
    index += 1;
  }
  if (command !== "sync" && flags.has("--force"))
    throw new CliUsageError("--force is only valid with sync");
  return { command, flags, values };
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
        "AIF sync dry run found conflicts.",
        "",
        `Reason: ${outcome.errorCode}`,
        `Conflicts: ${outcome.conflicts.length}`,
        ...outcome.conflicts.map((path) => `- ${path}`),
        "Dry run — no files were changed.",
      ].join("\n");
    return [
      "AIF sync dry run.",
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
        ? "AIF sync completed. No changes required."
        : "AIF sync completed.",
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
      "AIF sync was not applied.",
      "",
      `Reason: ${outcome.errorCode}`,
      `Conflicts: ${outcome.conflicts.length}`,
      ...outcome.conflicts.map((path) => `- ${path}`),
      "No project files were changed.",
    ].join("\n");
  if (outcome.rollbackCompleted)
    return [
      `AIF sync failed during: ${outcome.failedStage ?? "unknown"}`,
      `Error: ${outcome.errorCode}`,
      "Rollback: completed",
      "Project state was restored.",
    ].join("\n");
  return [
    `AIF sync failed during: ${outcome.failedStage ?? "unknown"}`,
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
  return {
    profile: config.profile as string,
    adapters: config.adapters as AdapterName[],
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
  const entries = await fileSystem.list(root);
  const documents = await Promise.all(
    entries
      .map((entry) => entry.replaceAll("\\", "/"))
      .filter((entry) => entry.endsWith("/SKILL.md"))
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
    "AIF project artifact validation failed.",
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
    io.stdout("0.1.0-alpha.0");
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
    const readsProject = ["sync", "adopt", "diff", "doctor"].includes(
      parsed.command,
    );
    const invalidMetadata = readsProject
      ? await validateExistingMetadata(root, fileSystem, validator)
      : [];
    if (parsed.command === "doctor")
      invalidMetadata.push(
        ...(await validateProjectSkills(root, fileSystem, validator)),
      );
    if (invalidMetadata.length > 0) {
      const output = formatValidationFailure(
        invalidMetadata,
        parsed.flags.has("--json"),
      );
      if (parsed.command === "doctor") io.stdout(output);
      else io.stderr(output);
      return 3;
    }
    const storedConfig = readsProject
      ? await projectConfiguration(
          root,
          fileSystem,
          validator,
          parsed.command === "sync",
        )
      : undefined;
    const profile =
      parsed.values.get("--profile") ?? storedConfig?.profile ?? "generic";
    const adapterNames = parseAdapters(
      parsed.values.get("--adapters") ??
        storedConfig?.adapters.join(",") ??
        "claude,codex,cursor,copilot",
    );
    const options = {
      root,
      profile,
      adapters: adapterNames,
      dryRun: parsed.flags.has("--dry-run"),
      catalogRoot: dependencies.catalogRoot,
      validator,
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
          ? await adoptProject(options, fileSystem)
          : parsed.command === "diff"
            ? await diffProject(options, fileSystem)
            : parsed.command === "doctor"
              ? await doctorProject(options, fileSystem)
              : await planFeature(parsed.values.get("--task") ?? "", validator);
    io.stdout(
      parsed.flags.has("--json")
        ? JSON.stringify(result, null, 2)
        : typeof result === "string"
          ? result
          : formatPlan(result),
    );
    if (
      parsed.command === "doctor" &&
      typeof result !== "string" &&
      result.diagnostics.length > 0
    )
      return 3;
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
        : `AIF schema catalog validation failed: ${error.schemaFile} [${error.code}]`;
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
