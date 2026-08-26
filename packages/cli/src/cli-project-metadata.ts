import { resolve } from "node:path";
import { readdir } from "node:fs/promises";
import type { FileSystem, ProjectMapping } from "@intentloom/application";
import type { AdapterName } from "@intentloom/core";
import {
  createArtifactValidator,
  type ArtifactType,
  type ArtifactValidationResult,
  type ArtifactValidator,
} from "@intentloom/validator";

export class CliUsageError extends Error {}

export class CliProjectValidationError extends Error {
  constructor(readonly results: readonly ArtifactValidationResult[]) {
    super("project artifact validation failed");
  }
}

export interface ProjectConfiguration {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly projectOwnedMappings: readonly ProjectMapping[];
  readonly documentationMappings: readonly ProjectMapping[];
}

const supportedCliAdapters = new Set<AdapterName>([
  "claude",
  "codex",
  "cursor",
  "copilot",
]);

export function assertDaemonFlagsAllowed(
  command: string,
  hasEndpoint: boolean,
  hasTokenFile: boolean,
): void {
  if (hasEndpoint !== hasTokenFile)
    throw new CliUsageError(
      "--daemon-endpoint and --daemon-token-file must be used together",
    );
  if (hasEndpoint && command !== "doctor")
    throw new CliUsageError("daemon mode is only valid with doctor");
}

export function parseAdapters(value: string): AdapterName[] {
  const parsed = value.split(",").filter(Boolean);
  if (
    parsed.length === 0 ||
    parsed.some((adapter) => !supportedCliAdapters.has(adapter as AdapterName))
  )
    throw new CliUsageError("invalid --adapters value");
  return parsed as AdapterName[];
}

export async function projectConfiguration(
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

export async function validateExistingMetadata(
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

export function formatValidationFailure(
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

export async function createCliArtifactValidator(
  catalogRoot: string,
): Promise<ArtifactValidator> {
  const profileRoot = resolve(catalogRoot, "../profiles");
  const knownProfiles = (await readdir(profileRoot))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.slice(0, -5))
    .sort();
  const knownWorkflows = (await readdir(resolve(catalogRoot, "workflows")))
    .filter((entry) => entry.endsWith(".md"))
    .map((entry) => entry.slice(0, -3))
    .sort();
  return createArtifactValidator(resolve(catalogRoot, "schemas"), {
    knownProfiles,
    knownWorkflows,
    supportedAdapters: [...supportedCliAdapters].sort(),
  });
}
