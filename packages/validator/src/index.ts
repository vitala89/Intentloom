import {
  checksum,
  normalizeOutputPath,
  parseAifConfig,
  parseSkill,
  type GeneratedFile,
} from "@aif/core";

export interface Diagnostic {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
}

export function validateSkillDocuments(
  documents: readonly { path: string; content: string }[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const names = new Map<string, string>();
  for (const document of documents) {
    try {
      const skill = parseSkill(document.path, document.content);
      const previous = names.get(skill.name);
      if (previous)
        diagnostics.push({
          code: "duplicate-skill-name",
          path: document.path,
          message: `${skill.name} also appears in ${previous}`,
        });
      else names.set(skill.name, document.path);
    } catch (error) {
      diagnostics.push({
        code: "malformed-skill",
        path: document.path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return diagnostics;
}

export function validateConfigDocument(value: string): Diagnostic[] {
  try {
    parseAifConfig(value);
    return [];
  } catch (error) {
    return [
      {
        code: "invalid-config",
        message: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

export function validateGeneratedFiles(
  files: readonly GeneratedFile[],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const destinations = new Set<string>();
  for (const file of files) {
    try {
      normalizeOutputPath(file.path);
    } catch (error) {
      diagnostics.push({
        code: "path-traversal",
        path: file.path,
        message: String(error),
      });
    }
    if (destinations.has(file.path))
      diagnostics.push({
        code: "conflicting-destination",
        path: file.path,
        message: "more than one file has this destination",
      });
    destinations.add(file.path);
    if (file.sources.length === 0)
      diagnostics.push({
        code: "missing-source-attribution",
        path: file.path,
        message: "generated files require canonical sources",
      });
    if (checksum(file.content) !== file.checksum)
      diagnostics.push({
        code: "stale-generated-checksum",
        path: file.path,
        message: "generated content has changed",
      });
  }
  return diagnostics;
}

export function validateManifest(value: unknown): Diagnostic[] {
  if (typeof value !== "object" || value === null)
    return [
      { code: "invalid-manifest", message: "manifest must be an object" },
    ];
  const manifest = value as Record<string, unknown>;
  return typeof manifest.lockVersion === "string" &&
    typeof manifest.frameworkVersion === "string"
    ? []
    : [
        {
          code: "invalid-manifest",
          message: "manifest requires lockVersion and frameworkVersion",
        },
      ];
}

export function validateCanonicalReferences(
  references: readonly string[],
  knownSources: readonly string[],
): Diagnostic[] {
  const known = new Set(knownSources);
  return references
    .filter((reference) => !known.has(reference))
    .map((reference) => ({
      code: "broken-canonical-reference",
      path: reference,
      message: "reference does not exist in the supplied canonical catalog",
    }));
}
