import { resolve } from "node:path";
import type { ArtifactValidator } from "@intentloom/validator";
import type { AdapterName } from "@intentloom/core";
import { detectProjectProfiles } from "./project-profile-detection.js";
import type { FileSystem, InitOptions, ProjectMapping } from "./index.js";

const configPath = ".aif/config.yaml";

export interface ResolveProjectDoctorInitOptions {
  readonly root: string;
  readonly profile?: string;
  readonly adapters?: readonly string[];
  readonly catalogRoot?: string;
  readonly validator?: ArtifactValidator;
}

export type ResolvedProjectDoctorInit = Pick<
  InitOptions,
  | "root"
  | "profile"
  | "adapters"
  | "catalogRoot"
  | "validator"
  | "projectOwnedMappings"
  | "documentationMappings"
> & {
  readonly dryRun: true;
};

interface StoredProjectConfiguration {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly projectOwnedMappings: readonly ProjectMapping[];
  readonly documentationMappings: readonly ProjectMapping[];
}

function projectMappings(
  config: Record<string, unknown>,
  key: string,
): readonly ProjectMapping[] {
  if (!Array.isArray(config[key])) return [];
  return (config[key] as Record<string, unknown>[]).map((mapping) => ({
    source: mapping.source as string,
    destination: mapping.destination as string,
  }));
}

async function readStoredProjectConfiguration(
  root: string,
  fs: FileSystem,
  validator: ArtifactValidator,
): Promise<StoredProjectConfiguration | undefined> {
  const absolutePath = resolve(root, configPath);
  if (!(await fs.exists(absolutePath))) return undefined;
  const validation = validator.validate({
    artifactType: "aif-config",
    documentPath: configPath,
    format: "yaml",
    source: await fs.read(absolutePath),
  });
  if (validation.status === "invalid") return undefined;
  const config = validation.document as Record<string, unknown>;
  return {
    profile: config.profile as string,
    adapters: config.adapters as AdapterName[],
    projectOwnedMappings: projectMappings(config, "projectOwnedMappings"),
    documentationMappings: projectMappings(config, "documentationMappings"),
  };
}

function normalizeAdapters(
  adapters: readonly string[] | undefined,
  stored: StoredProjectConfiguration | undefined,
): readonly AdapterName[] {
  if (adapters !== undefined && adapters.length > 0) {
    return [...adapters] as AdapterName[];
  }
  if (stored !== undefined) return [...stored.adapters];
  return ["codex"];
}

export async function resolveProjectDoctorInit(
  options: ResolveProjectDoctorInitOptions,
  fs: FileSystem,
): Promise<ResolvedProjectDoctorInit> {
  const stored =
    options.validator === undefined
      ? undefined
      : await readStoredProjectConfiguration(
          options.root,
          fs,
          options.validator,
        );
  const detection = await detectProjectProfiles(options.root, fs);
  return {
    root: options.root,
    profile: options.profile ?? stored?.profile ?? detection.selectedProfile,
    adapters: normalizeAdapters(options.adapters, stored),
    dryRun: true,
    projectOwnedMappings: stored?.projectOwnedMappings ?? [],
    documentationMappings: stored?.documentationMappings ?? [],
    ...(options.catalogRoot !== undefined
      ? { catalogRoot: options.catalogRoot }
      : {}),
    ...(options.validator !== undefined
      ? { validator: options.validator }
      : {}),
  };
}
