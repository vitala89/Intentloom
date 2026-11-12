import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { generateAdapters } from "@intentloom/adapters";
import {
  checksum,
  loadCatalog,
  type AdapterName,
  type Catalog,
  type GeneratedFile,
} from "@intentloom/core";
import type { ArtifactValidationResult } from "@intentloom/validator";
import { validateSkillSet } from "@intentloom/validator";
import { stringify } from "yaml";
import { ArtifactValidationFailure } from "../artifact-validation-failure.js";
import { buildTransactionMetadata } from "../generated-file/transaction-metadata.js";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import {
  configPath,
  type InitOptions,
  type ProjectMapping,
} from "./project-lifecycle-contracts.js";

const emptyCatalog: Catalog = {
  policies: [],
  workflows: [],
  templates: [],
  skills: [],
};
const localExample =
  "# Local Intentloom preferences only; never store secrets here.\n";

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

async function rejectInvalidCatalogSkills(options: InitOptions): Promise<void> {
  if (!options.validator || !options.catalogRoot) return;
  const documents = await readCatalogSkillDocuments(options.catalogRoot);
  const skillValidation = validateSkillSet(options.validator, documents, {
    aifCatalogPolicy: true,
  });
  const invalid = skillValidation.results.filter(
    (result) => result.status === "invalid",
  );
  if (skillValidation.errors.length > 0)
    invalid.push(catalogSkillFailure(documents, skillValidation.errors));
  if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
}

async function readCatalogSkillDocuments(
  catalogRoot: string,
): Promise<{ path: string; content: string }[]> {
  const skillRoot = resolve(catalogRoot, "skills");
  const directories = (await readdir(skillRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    directories.map(async (directory) => ({
      path: `skills/${directory}/SKILL.md`,
      content: await readFile(
        resolve(skillRoot, directory, "SKILL.md"),
        "utf8",
      ),
    })),
  );
}

function catalogSkillFailure(
  documents: readonly { path: string }[],
  errors: ArtifactValidationResult["semanticErrors"],
): ArtifactValidationResult {
  return {
    status: "invalid",
    artifactType: "agent-skill",
    schemaId: "urn:aif:schema:agent-skill:1",
    schemaVersion: "1",
    documentPath: documents[0]?.path ?? "skills/SKILL.md",
    structuralErrors: [],
    semanticErrors: errors,
    warnings: [],
  };
}

function assembleDesiredPayload(
  options: InitOptions,
  catalog: Catalog,
): GeneratedFile[] {
  const selectedAdapters = [...new Set(options.adapters)].sort();
  const projectOwnedDestinations = new Set(
    (options.projectOwnedMappings ?? []).map((mapping) => mapping.source),
  );
  const files = generated(selectedAdapters, catalog, options.profile).filter(
    (file) => !projectOwnedDestinations.has(file.path),
  );
  const configContent = config(options.profile, selectedAdapters, options);
  return [
    {
      path: configPath,
      content: configContent,
      sources: ["project:config"],
      checksum: checksum(configContent),
    },
    {
      path: ".aif/local.example.yaml",
      content: localExample,
      sources: ["project:local-example"],
      checksum: checksum(localExample),
    },
    ...files,
  ];
}

async function pinCanonicalSourceHashes(
  options: InitOptions,
  payload: readonly GeneratedFile[],
): Promise<readonly { id: string; checksum: string }[]> {
  const canonicalSources = [
    ...new Set(
      payload
        .flatMap((file) => file.sources)
        .filter((source) =>
          /^(?:policies|skills|templates|workflows)\//u.test(source),
        ),
    ),
  ].sort();
  return Promise.all(
    canonicalSources.map(async (id) => {
      const pinnedChecksum = options.catalogRoot
        ? checksum(await readFile(resolve(options.catalogRoot, id), "utf8"))
        : options.canonicalSourceHashes?.[id];
      if (!pinnedChecksum || !/^[a-f0-9]{64}$/u.test(pinnedChecksum))
        throw new Error(`canonical source hash unavailable: ${id}`);
      return { id, checksum: pinnedChecksum };
    }),
  );
}

function rejectInvalidDesiredMetadata(
  options: InitOptions,
  payload: readonly GeneratedFile[],
  manifest: string,
  sourceMap: string,
): void {
  if (!options.validator) return;
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

export async function desired(options: InitOptions): Promise<GeneratedFile[]> {
  await rejectInvalidCatalogSkills(options);
  const catalog =
    options.catalog ??
    (options.catalogRoot
      ? await loadCatalog(options.catalogRoot)
      : emptyCatalog);
  const payload = assembleDesiredPayload(options, catalog);
  const sourceHashes = await pinCanonicalSourceHashes(options, payload);
  const { manifest, sourceMap } = buildTransactionMetadata(payload, {
    profile: options.profile,
    adapters: options.adapters,
    sourceHashes,
  });
  rejectInvalidDesiredMetadata(options, payload, manifest, sourceMap);
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
