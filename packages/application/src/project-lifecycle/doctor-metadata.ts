import type { ArtifactValidationResult } from "@intentloom/validator";
import { parse } from "yaml";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import {
  configPath,
  type DoctorFinding,
  type InitOptions,
} from "./project-lifecycle-contracts.js";

const metadataPaths = [configPath, lockPath, sourceMapPath] as const;

export interface MetadataPresence {
  readonly path: (typeof metadataPaths)[number];
  readonly present: boolean;
}

const validatorDefinitions = [
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

export async function readMetadataPresence(
  options: InitOptions,
  fs: FileSystem,
): Promise<readonly MetadataPresence[]> {
  return Promise.all(
    metadataPaths.map(async (path) => ({
      path,
      present: await fs.exists(inside(options.root, path)),
    })),
  );
}

export async function collectValidatorMetadataResults(
  options: InitOptions,
  fs: FileSystem,
  validationResults: readonly ArtifactValidationResult[],
): Promise<ArtifactValidationResult[]> {
  const effectiveValidationResults = [...validationResults];
  if (!options.validator) return effectiveValidationResults;
  for (const definition of validatorDefinitions) {
    if (!(await fs.exists(inside(options.root, definition.path)))) continue;
    if (
      effectiveValidationResults.some(
        (result) => result.documentPath === definition.path,
      )
    )
      continue;
    const result = options.validator.validate({
      ...definition,
      documentPath: definition.path,
      source: await fs.read(inside(options.root, definition.path)),
    });
    if (result.status === "invalid") effectiveValidationResults.push(result);
  }
  return effectiveValidationResults;
}

export function schemaFindings(
  results: readonly ArtifactValidationResult[],
  profile: string,
): DoctorFinding[] {
  return results.flatMap((result) =>
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
      profile,
    })),
  );
}

export async function malformedMetadataFindings(
  options: InitOptions,
  fs: FileSystem,
  results: readonly ArtifactValidationResult[],
): Promise<DoctorFinding[]> {
  if (options.validator) return [];
  const findings: DoctorFinding[] = [];
  for (const definition of [
    { path: configPath, format: "yaml" as const },
    { path: lockPath, format: "json" as const },
    { path: sourceMapPath, format: "json" as const },
  ]) {
    if (!(await fs.exists(inside(options.root, definition.path)))) continue;
    if (results.some((result) => result.documentPath === definition.path))
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
        remediation: ["Repair the malformed metadata before applying changes."],
        readOnly: true,
        adapter: null,
        profile: options.profile,
      });
    }
  }
  return findings;
}

export function missingMetadataFindings(
  presence: readonly MetadataPresence[],
  profile: string,
): DoctorFinding[] {
  return presence
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
        item.path === configPath ? ("config" as const) : ("ownership" as const),
      path: item.path,
      message: `required Intentloom metadata is missing: ${item.path}`,
      remediation: [
        "Run adoption dry-run and review the proposed metadata creation.",
      ],
      readOnly: true as const,
      adapter: null,
      profile,
    }));
}
