import { normalizeOutputPath } from "@intentloom/core";
import { documentConcept } from "../document-concepts.js";
import type { ProjectMapping } from "../project-lifecycle/project-lifecycle-contracts.js";

export interface GeneratedAdoptionMappings {
  readonly diagnostics: string[];
  readonly documentationMappingsByConcept: Map<string, string>;
  readonly conceptCounts: Map<string, number>;
}

export function normalizeMappingPath(path: string): string | null {
  try {
    const normalized = normalizeOutputPath(path);
    return normalized === path ? normalized : null;
  } catch {
    return null;
  }
}

export function collectGeneratedAdoptionMappings(
  projectOwnedMappings: readonly ProjectMapping[] | undefined,
  documentationMappings: readonly ProjectMapping[] | undefined,
  scannedPaths: readonly string[],
  scanned: ReadonlySet<string>,
): GeneratedAdoptionMappings {
  const diagnostics = projectOwnedMappingDiagnostics(
    projectOwnedMappings,
    scanned,
  );
  const documentation = documentationMappingSelection(
    documentationMappings,
    scanned,
  );
  diagnostics.push(...documentation.diagnostics);
  return {
    diagnostics,
    documentationMappingsByConcept: documentation.byConcept,
    conceptCounts: documentConceptCounts(scannedPaths),
  };
}

function projectOwnedMappingDiagnostics(
  mappings: readonly ProjectMapping[] | undefined,
  scanned: ReadonlySet<string>,
): string[] {
  const diagnostics: string[] = [];
  for (const mapping of mappings ?? []) {
    const source = normalizeMappingPath(mapping.source);
    const destination = normalizeMappingPath(mapping.destination);
    if (
      source === null ||
      destination === null ||
      source !== destination ||
      !scanned.has(destination)
    )
      diagnostics.push(`project-owned mapping invalid: ${mapping.source}`);
  }
  return diagnostics;
}

function documentationMappingSelection(
  mappings: readonly ProjectMapping[] | undefined,
  scanned: ReadonlySet<string>,
): { diagnostics: string[]; byConcept: Map<string, string> } {
  const diagnostics: string[] = [];
  const byConcept = new Map<string, string>();
  for (const mapping of mappings ?? []) {
    const source = normalizeMappingPath(mapping.source);
    const destination = normalizeMappingPath(mapping.destination);
    const concept = source === null ? null : documentConcept(source);
    if (
      source === null ||
      destination === null ||
      source !== destination ||
      concept === null ||
      !scanned.has(source) ||
      byConcept.has(concept)
    ) {
      diagnostics.push(`documentation mapping invalid: ${mapping.source}`);
      continue;
    }
    byConcept.set(concept, source);
  }
  return { diagnostics, byConcept };
}

function documentConceptCounts(
  scannedPaths: readonly string[],
): Map<string, number> {
  const conceptCounts = new Map<string, number>();
  for (const path of scannedPaths) {
    const concept = documentConcept(path);
    if (concept)
      conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
  }
  return conceptCounts;
}
