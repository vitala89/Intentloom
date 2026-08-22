import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { requestDaemonDoctor } from "../../daemon/src/index.js";
import { createDoctorRequest } from "../../protocol/src/index.js";
import {
  detectProjectProfiles,
  doctorExitCode,
  doctorProject,
  ignoredScanPath,
  nodeFileSystem,
  type FileSystem,
} from "@intentloom/application";
import {
  createCliArtifactValidator,
  parseAdapters,
  projectConfiguration,
  validateExistingMetadata,
} from "./cli-project-metadata.js";
import { formatDaemonDoctor, formatDoctor } from "./formatters.js";
import {
  SchemaCatalogError,
  validateSkillSet,
  type ArtifactType,
  type ArtifactValidationResult,
  type ArtifactValidator,
} from "@intentloom/validator";

export type DoctorCliExitCode = 0 | 2 | 3;

export interface DoctorCliIo {
  readonly stdout: (message: string) => void;
  readonly stderr: (message: string) => void;
}

export interface DoctorCliDependencies {
  readonly catalogRoot: string;
  readonly fileSystem?: FileSystem;
}

interface DoctorArguments {
  readonly root: string;
  readonly profile?: string;
  readonly adapters?: string;
  readonly json: boolean;
  readonly daemonEndpoint?: string;
  readonly daemonTokenFile?: string;
}

const legacyBooleanFlags = new Set([
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
  "--daemon-endpoint",
  "--daemon-token-file",
]);

const doctorUsage =
  "Usage: intentloom doctor [PROJECT_PATH|--root PATH] [--profile PROFILE] [--adapters LIST] [--json] [--dry-run] [--daemon-endpoint ENDPOINT --daemon-token-file PATH]";

function parseDoctorArguments(args: readonly string[]): DoctorArguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (let index = 1; index < args.length; index += 1) {
    const token = args[index]!;
    if (legacyBooleanFlags.has(token)) {
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      if (values.has("--root"))
        throw new Error("project path specified more than once");
      values.set("--root", token);
      continue;
    }
    if (!valueFlags.has(token)) throw new Error(`unknown option: ${token}`);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`missing value for ${token}`);
    if (token === "--root" && values.has("--root"))
      throw new Error("project path specified more than once");
    values.set(token, value);
    index += 1;
  }

  const hasEndpoint = values.has("--daemon-endpoint");
  const hasTokenFile = values.has("--daemon-token-file");
  if (hasEndpoint !== hasTokenFile)
    throw new Error(
      "--daemon-endpoint and --daemon-token-file must be used together",
    );

  return {
    root: values.get("--root") ?? cwd(),
    ...(values.has("--profile") ? { profile: values.get("--profile")! } : {}),
    ...(values.has("--adapters")
      ? { adapters: values.get("--adapters")! }
      : {}),
    json: flags.has("--json"),
    ...(hasEndpoint
      ? {
          daemonEndpoint: values.get("--daemon-endpoint")!,
          daemonTokenFile: values.get("--daemon-token-file")!,
        }
      : {}),
  };
}

async function validateProjectSkills(
  root: string,
  fileSystem: FileSystem,
  validator: ArtifactValidator,
): Promise<ArtifactValidationResult[]> {
  const entries = (await fileSystem.list(root))
    .map((entry) => entry.replaceAll("\\", "/"))
    .map((entry) =>
      entry.startsWith(`${root}/`) ? entry.slice(root.length + 1) : entry,
    )
    .filter((entry) => !ignoredScanPath(entry))
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

export async function runDoctorCommand(
  args: readonly string[],
  dependencies: DoctorCliDependencies,
  io: DoctorCliIo,
): Promise<DoctorCliExitCode> {
  try {
    const parsed = parseDoctorArguments(args);
    const fileSystem = dependencies.fileSystem ?? nodeFileSystem;
    const validator = await createCliArtifactValidator(
      dependencies.catalogRoot,
    );
    const invalidMetadata = [
      ...(await validateExistingMetadata(parsed.root, fileSystem, validator)),
      ...(await validateProjectSkills(parsed.root, fileSystem, validator)),
    ];
    const configInvalid = invalidMetadata.some(
      (result) => result.artifactType === "aif-config",
    );
    const configPresent = await fileSystem.exists(
      resolve(parsed.root, ".aif/config.yaml"),
    );
    const storedDoctorConfig =
      configPresent && !configInvalid
        ? await projectConfiguration(parsed.root, fileSystem, validator, false)
        : undefined;
    const detection = await detectProjectProfiles(parsed.root, fileSystem);
    const profile =
      parsed.profile ??
      storedDoctorConfig?.profile ??
      detection.selectedProfile;
    const adapterNames = parseAdapters(
      parsed.adapters ?? storedDoctorConfig?.adapters.join(",") ?? "codex",
    );
    const projectOwnedMappings = storedDoctorConfig?.projectOwnedMappings ?? [];
    const documentationMappings =
      storedDoctorConfig?.documentationMappings ?? [];

    if (parsed.daemonEndpoint !== undefined) {
      const sessionToken = (
        await readFile(parsed.daemonTokenFile!, "utf8")
      ).trim();
      const result = await requestDaemonDoctor({
        endpoint: parsed.daemonEndpoint,
        sessionToken,
        request: createDoctorRequest(1, {
          root: parsed.root,
          profile,
          adapters: adapterNames,
        }),
      });
      io.stdout(
        parsed.json
          ? JSON.stringify(result, null, 2)
          : formatDaemonDoctor(result),
      );
      return result.exitCode;
    }

    const result = await doctorProject(
      {
        root: parsed.root,
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
      parsed.json ? JSON.stringify(result, null, 2) : formatDoctor(result),
    );
    return doctorExitCode(result);
  } catch (error) {
    if (error instanceof SchemaCatalogError) {
      const payload = {
        status: "invalid",
        errorCode: error.code,
        schemaFile: error.schemaFile,
      };
      io.stdout(
        args.includes("--json")
          ? JSON.stringify(payload, null, 2)
          : `Intentloom schema catalog validation failed: ${error.schemaFile} [${error.code}]`,
      );
      return 3;
    }
    io.stderr(error instanceof Error ? error.message : doctorUsage);
    return 2;
  }
}
