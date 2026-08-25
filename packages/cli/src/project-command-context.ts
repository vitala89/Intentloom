import { resolve } from "node:path";
import {
  detectProjectProfiles,
  type FileSystem,
  type ProjectMapping,
} from "@intentloom/application";
import type { AdapterName } from "@intentloom/core";
import { normalizeOutputPath } from "@intentloom/core";
import type {
  ArtifactValidationResult,
  ArtifactValidator,
} from "@intentloom/validator";
import {
  CliUsageError,
  parseAdapters,
  projectConfiguration,
  validateExistingMetadata,
} from "./cli-project-metadata.js";

export type ProjectMutationCommand =
  "init" | "adopt" | "sync" | "diff" | "plan" | "update";

export function readsProjectMetadata(command: ProjectMutationCommand): boolean {
  return command === "sync" || command === "adopt" || command === "diff";
}

export async function loadInvalidProjectMetadata(
  command: ProjectMutationCommand,
  root: string,
  fileSystem: FileSystem,
  validator: ArtifactValidator,
): Promise<readonly ArtifactValidationResult[]> {
  if (!readsProjectMetadata(command)) return [];
  return validateExistingMetadata(root, fileSystem, validator);
}

export function metadataBlocksMutationCommand(
  command: ProjectMutationCommand,
  invalidMetadata: readonly ArtifactValidationResult[],
): boolean {
  return (
    invalidMetadata.length > 0 && command !== "adopt" && command !== "update"
  );
}

export function hasInvalidAdoptionConfig(
  command: ProjectMutationCommand,
  invalidMetadata: readonly ArtifactValidationResult[],
): boolean {
  return (
    (command === "adopt" || command === "update") &&
    invalidMetadata.some((result) => result.artifactType === "aif-config")
  );
}

export function parseMappings(values: readonly string[]): ProjectMapping[] {
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

export interface ProjectMutationOptionsInput {
  readonly command: ProjectMutationCommand;
  readonly root: string;
  readonly fileSystem: FileSystem;
  readonly validator: ArtifactValidator;
  readonly catalogRoot: string;
  readonly dryRun: boolean;
  readonly invalidMetadata: readonly ArtifactValidationResult[];
  readonly profileFlag?: string | undefined;
  readonly profileFlagProvided: boolean;
  readonly adaptersFlag?: string | undefined;
  readonly mappingValues: ReadonlyMap<string, readonly string[]>;
}

export interface ProjectMutationOptions {
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly dryRun: boolean;
  readonly catalogRoot: string;
  readonly validator: ArtifactValidator;
  readonly projectOwnedMappings: readonly ProjectMapping[];
  readonly documentationMappings: readonly ProjectMapping[];
  readonly existingValidationResults?: readonly ArtifactValidationResult[];
  readonly profileConfirmed?: boolean;
}

export async function buildProjectMutationOptions(
  input: ProjectMutationOptionsInput,
): Promise<ProjectMutationOptions> {
  const { command, root, fileSystem, validator, invalidMetadata } = input;
  const readsProject = readsProjectMetadata(command);
  const invalidAdoptionConfig = hasInvalidAdoptionConfig(
    command,
    invalidMetadata,
  );
  const storedConfig =
    readsProject && !invalidAdoptionConfig
      ? await projectConfiguration(
          root,
          fileSystem,
          validator,
          command === "sync",
        )
      : undefined;
  const configPresent = readsProject
    ? await fileSystem.exists(resolve(root, ".aif/config.yaml"))
    : false;
  const adoptionDetection =
    command === "adopt"
      ? await detectProjectProfiles(root, fileSystem)
      : undefined;
  const profile =
    input.profileFlag ??
    (configPresent
      ? storedConfig?.profile
      : adoptionDetection?.selectedProfile) ??
    "generic";
  const adapterNames = parseAdapters(
    input.adaptersFlag ??
      (configPresent ? storedConfig?.adapters.join(",") : undefined) ??
      (command === "adopt" ? "codex" : "claude,codex,cursor,copilot"),
  );
  const cliProjectOwnedMappings = parseMappings(
    input.mappingValues.get("--project-owned-mapping") ?? [],
  );
  const cliDocumentationMappings = parseMappings(
    input.mappingValues.get("--documentation-mapping") ?? [],
  );
  const projectOwnedMappings = input.mappingValues.has(
    "--project-owned-mapping",
  )
    ? cliProjectOwnedMappings
    : (storedConfig?.projectOwnedMappings ?? []);
  const documentationMappings = input.mappingValues.has(
    "--documentation-mapping",
  )
    ? cliDocumentationMappings
    : (storedConfig?.documentationMappings ?? []);
  const base: ProjectMutationOptions = {
    root,
    profile,
    adapters: adapterNames,
    dryRun: input.dryRun,
    catalogRoot: input.catalogRoot,
    validator,
    projectOwnedMappings,
    documentationMappings,
  };
  if (command === "adopt") {
    return {
      ...base,
      existingValidationResults: invalidMetadata,
      profileConfirmed: input.profileFlagProvided || storedConfig !== undefined,
    };
  }
  return base;
}
