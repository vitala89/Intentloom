import type { AdapterName, GeneratedFile } from "@intentloom/core";
import { documentConcept } from "../document-concepts.js";
import {
  adapterForKnownInstructionPath,
  instructionPath,
} from "../instruction-file-taxonomy.js";
import { sourceMapPath } from "../generated-file/transaction-metadata.js";
import type { FileSystem } from "../host-file-system.js";
import type { Change } from "../project-change.js";
import { inside } from "../project-path.js";
import type { AdoptionProposalItem } from "./generated-file-adoption-contracts.js";
import type { GeneratedAdoptionMappings } from "./generated-file-adoption-mappings.js";

export interface AdoptionClassificationSource {
  readonly root: string;
  readonly profile: string;
  readonly scanned: ReadonlySet<string>;
  readonly scannedPaths: readonly string[];
  readonly desiredFiles: readonly GeneratedFile[];
  readonly desiredByPath: ReadonlyMap<string, GeneratedFile>;
  readonly owned: ReadonlyMap<string, unknown>;
  readonly invalidOwnershipMetadata: boolean;
  readonly completeMetadata: boolean;
  readonly changeByPath: ReadonlyMap<string, Pick<Change, "kind" | "reason">>;
}

interface DesiredDestinationFacts {
  readonly path: string;
  readonly exists: boolean;
  readonly metadata: boolean;
  readonly metadataConflict: boolean;
  readonly aifOwned: boolean;
  readonly recognizedMetadata: boolean;
  readonly projectOwned: boolean;
  readonly change: Pick<Change, "kind" | "reason"> | undefined;
  readonly canonicalSource: string | null;
  readonly adapter: AdapterName | null;
  readonly profile: string;
}

interface ScannedFileFacts {
  readonly path: string;
  readonly concept: string | null;
  readonly duplicate: boolean;
  readonly mappedDocument: string | undefined;
  readonly selectedDocument: boolean;
  readonly adapter: AdapterName | null;
}

export async function buildAdoptionItems(
  source: AdoptionClassificationSource,
  mappings: GeneratedAdoptionMappings,
  fs: FileSystem,
): Promise<AdoptionProposalItem[]> {
  const items: AdoptionProposalItem[] = [];
  for (const file of source.desiredFiles)
    items.push(await desiredFileItem(source, file, fs));
  for (const path of source.scannedPaths) {
    if (source.desiredByPath.has(path)) continue;
    items.push(scannedPathItem(path, mappings));
  }
  items.sort((left, right) =>
    `${left.path}:${left.action}`.localeCompare(
      `${right.path}:${right.action}`,
    ),
  );
  return items;
}

function unsupportedPath(path: string): boolean {
  return /^\.github\/agents\/.+\.agent\.md$/u.test(path);
}

async function desiredFileItem(
  source: AdoptionClassificationSource,
  file: GeneratedFile,
  fs: FileSystem,
): Promise<AdoptionProposalItem> {
  const exists =
    source.scanned.has(file.path) ||
    (await fs.exists(inside(source.root, file.path)));
  const record = source.owned.get(file.path);
  const change = source.changeByPath.get(file.path);
  const metadata = file.path.startsWith(".aif/");
  const metadataConflict =
    file.path === sourceMapPath && source.invalidOwnershipMetadata;
  const aifOwned = record !== undefined;
  const recognizedMetadata = metadata && exists && source.completeMetadata;
  const projectOwned =
    exists && !aifOwned && !recognizedMetadata && !metadataConflict;
  return desiredDestinationItem({
    path: file.path,
    exists,
    metadata,
    metadataConflict,
    aifOwned,
    recognizedMetadata,
    projectOwned,
    change,
    canonicalSource: file.sources[0] ?? null,
    adapter: adapterForKnownInstructionPath(file.path),
    profile: source.profile,
  });
}

function desiredDestinationItem(
  facts: DesiredDestinationFacts,
): AdoptionProposalItem {
  return {
    path: facts.path,
    action: desiredAction(facts),
    currentClassification: facts.recognizedMetadata
      ? "aif-metadata"
      : facts.aifOwned
        ? "aif-owned"
        : facts.exists
          ? "project-owned"
          : "absent",
    proposedClassification: facts.recognizedMetadata
      ? "aif-metadata"
      : facts.projectOwned
        ? "project-owned"
        : "aif-generated",
    reason: facts.metadataConflict
      ? "existing Intentloom ownership metadata is malformed or unsupported"
      : facts.projectOwned
        ? "existing destination has no Intentloom ownership record"
        : !facts.exists
          ? "safe generated destination is absent"
          : (facts.change?.reason ??
            "existing Intentloom-owned output already matches"),
    canonicalSource: facts.canonicalSource,
    adapter: facts.adapter,
    profile: facts.profile,
    conflictDetails: facts.metadataConflict
      ? ["ownership cannot be established from .aif/source-map.json"]
      : facts.projectOwned && facts.change
        ? [facts.change.reason]
        : [],
    writeEligible:
      !facts.metadataConflict &&
      !facts.projectOwned &&
      facts.change?.kind !== "conflict" &&
      facts.change?.kind !== "security-error" &&
      (!facts.exists || facts.aifOwned || facts.recognizedMetadata),
    manualDecisionRequired: facts.projectOwned || facts.metadataConflict,
    safeNextAction: facts.metadataConflict
      ? "Repair or explicitly replace the ownership metadata before applying changes."
      : facts.projectOwned
        ? "Keep the file project-owned or explicitly resolve the generated destination conflict."
        : !facts.exists
          ? "Apply the reviewed proposal to create this file transactionally."
          : "No action is required unless regeneration is requested.",
  };
}

function desiredAction(facts: DesiredDestinationFacts) {
  return facts.metadataConflict
    ? "conflict"
    : facts.projectOwned
      ? "map-existing-project-owned"
      : !facts.exists
        ? facts.metadata
          ? "create"
          : "generated-candidate"
        : facts.change?.kind === "conflict" ||
            facts.change?.kind === "security-error"
          ? "conflict"
          : facts.change
            ? "generated-candidate"
            : "skip";
}

function scannedPathItem(
  path: string,
  mappings: GeneratedAdoptionMappings,
): AdoptionProposalItem {
  const concept = documentConcept(path);
  const duplicate =
    concept !== null && (mappings.conceptCounts.get(concept) ?? 0) > 1;
  const mappedDocument =
    concept === null
      ? undefined
      : mappings.documentationMappingsByConcept.get(concept);
  return scannedFileItem({
    path,
    concept,
    duplicate,
    mappedDocument,
    selectedDocument: mappedDocument === path,
    adapter: adapterForKnownInstructionPath(path),
  });
}

function scannedFileItem(facts: ScannedFileFacts): AdoptionProposalItem {
  return {
    path: facts.path,
    action: scannedAction(facts),
    currentClassification: "project-owned",
    proposedClassification: unsupportedPath(facts.path)
      ? "unsupported"
      : facts.concept
        ? "project-owned-documentation"
        : "project-owned",
    reason: scannedReason(facts),
    canonicalSource: null,
    adapter: facts.adapter,
    profile: null,
    conflictDetails: facts.duplicate
      ? facts.mappedDocument === undefined
        ? [`ambiguous ${facts.concept} document mapping`]
        : []
      : [],
    writeEligible: false,
    manualDecisionRequired:
      facts.duplicate && facts.mappedDocument === undefined,
    safeNextAction: unsupportedPath(facts.path)
      ? "Keep the unsupported file project-owned and review adapter capabilities."
      : facts.duplicate && facts.mappedDocument === undefined
        ? "Choose the authoritative project document manually."
        : facts.selectedDocument
          ? "Keep the explicitly mapped project document project-owned."
          : facts.concept || instructionPath(facts.path)
            ? "Keep the existing file project-owned and record the mapping only."
            : "Leave the unrelated project file unchanged.",
  };
}

function scannedAction(facts: ScannedFileFacts) {
  return unsupportedPath(facts.path)
    ? "unsupported"
    : facts.duplicate && facts.mappedDocument === undefined
      ? "manual-decision-required"
      : facts.selectedDocument
        ? "map-existing-aif-compatible-document"
        : facts.mappedDocument !== undefined
          ? "skip"
          : facts.concept === "public-readme"
            ? "map-existing-project-owned"
            : instructionPath(facts.path)
              ? "map-existing-project-owned"
              : facts.concept
                ? "map-existing-aif-compatible-document"
                : "skip";
}

function scannedReason(facts: ScannedFileFacts): string {
  return unsupportedPath(facts.path)
    ? "custom Copilot agents are not generated by the current adapter"
    : facts.duplicate && facts.mappedDocument === undefined
      ? `multiple project documents represent the ${facts.concept} concept`
      : facts.selectedDocument
        ? `explicit documentation mapping selects this ${facts.concept} document`
        : facts.mappedDocument !== undefined
          ? `explicit documentation mapping retains ${facts.mappedDocument} for the ${facts.concept} concept`
          : facts.concept
            ? `existing project document maps to the ${facts.concept} concept`
            : instructionPath(facts.path)
              ? "existing tool instruction remains project-owned"
              : "project file is not an adoption artifact";
}
