import {
  QUALITY_PACK_SCHEMA_URN,
  type EngineeringQualityPack,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import {
  validateEngineeringQualityPackEntry,
  validateEngineeringQualityPackSourceReference,
} from "./pack-entry.js";

const MAX_ITEMS = 256;
const MAX_TEXT = 4_000;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const RANGE =
  /^(?:\*|(?:\^|~|>=|<=|>|<|=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\s+(?:\^|~|>=|<=|>|<|=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)*?)$/u;

function text(value: unknown, field: string, maximum = MAX_TEXT): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(
      `${field} must be a non-empty string of at most ${maximum} characters`,
    );
  }
  return value;
}

function items(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) {
    throw new Error(`${field} must be an array of at most ${MAX_ITEMS} items`);
  }
  return value;
}

function strings(value: unknown, field: string): readonly string[] {
  return items(value, field).map((item, index) =>
    text(item, `${field}[${index}]`, 512),
  );
}

export function validateEngineeringQualityPack(
  value: unknown,
): EngineeringQualityPack {
  if (!isObject(value)) throw new Error("quality pack must be an object");
  if (value.schemaVersion !== QUALITY_PACK_SCHEMA_URN) {
    throw new Error(`pack.schemaVersion must equal ${QUALITY_PACK_SCHEMA_URN}`);
  }
  const version = text(value.version, "pack.version", 64);
  if (!SEMVER.test(version))
    throw new Error("pack.version must be a semantic version");
  const compatibility = value.compatibility;
  if (!isObject(compatibility))
    throw new Error("pack.compatibility must be an object");
  const intentloomVersionRange = text(
    compatibility.intentloomVersionRange,
    "pack.compatibility.intentloomVersionRange",
    128,
  );
  if (!RANGE.test(intentloomVersionRange))
    throw new Error("pack Intentloom compatibility range is invalid");
  const technologies =
    compatibility.technologies === undefined
      ? undefined
      : items(
          compatibility.technologies,
          "pack.compatibility.technologies",
        ).map((item, index) => {
          if (!isObject(item))
            throw new Error(
              `pack technology compatibility [${index}] must be an object`,
            );
          const versionRange = text(
            item.versionRange,
            `pack technology compatibility [${index}].versionRange`,
            128,
          );
          if (!RANGE.test(versionRange))
            throw new Error("pack technology compatibility range is invalid");
          return {
            technologyId: text(item.technologyId, "pack technologyId", 128),
            versionRange,
          };
        });
  if (!isObject(value.provenance))
    throw new Error("pack.provenance must be an object");
  if (value.provenance.sourceKind === "first-party") {
    if (
      value.provenance.publisher !== "intentloom" ||
      value.provenance.license !== "Apache-2.0"
    ) {
      throw new Error(
        "first-party pack provenance must identify the Intentloom Apache-2.0 source",
      );
    }
  } else if (value.provenance.sourceKind === "external") {
    const publisher = text(
      value.provenance.publisher,
      "pack.provenance.publisher",
      128,
    );
    const license = text(
      value.provenance.license,
      "pack.provenance.license",
      64,
    );
    if (!/^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/u.test(license)) {
      throw new Error(
        "external pack provenance license must be an SPDX-like identifier",
      );
    }
    if (!publisher.trim()) throw new Error("external pack publisher is empty");
  } else {
    throw new Error(
      "pack.provenance.sourceKind must be first-party or external",
    );
  }
  const references = items(
    value.provenance.references,
    "pack.provenance.references",
  ).map(validateEngineeringQualityPackSourceReference);
  if (references.length === 0)
    throw new Error("pack.provenance.references must not be empty");
  if (
    new Set(references.map((reference) => reference.id)).size !==
    references.length
  ) {
    throw new Error("pack.provenance.references must have unique ids");
  }
  const entries = items(value.entries, "pack.entries").map(
    validateEngineeringQualityPackEntry,
  );
  if (entries.length === 0) throw new Error("pack.entries must not be empty");
  const entryIds = new Set<string>();
  const meaningIds = new Set<string>();
  const referenceIds = new Set(references.map((reference) => reference.id));
  for (const entry of entries) {
    if (entryIds.has(entry.id))
      throw new Error(`pack contains duplicate entry id: ${entry.id}`);
    if (meaningIds.has(entry.meaningId))
      throw new Error(`pack contains duplicate meaning id: ${entry.meaningId}`);
    entryIds.add(entry.id);
    meaningIds.add(entry.meaningId);
    for (const referenceId of entry.sourceReferenceIds) {
      if (!referenceIds.has(referenceId)) {
        throw new Error(
          `pack entry ${entry.id} references unknown source: ${referenceId}`,
        );
      }
    }
  }
  const dependencies = strings(value.dependencies, "pack.dependencies");
  return {
    schemaVersion: QUALITY_PACK_SCHEMA_URN,
    id: text(value.id, "pack.id", 128),
    version,
    name: text(value.name, "pack.name"),
    description: text(value.description, "pack.description"),
    dependencies,
    compatibility: {
      intentloomVersionRange,
      ...(technologies !== undefined ? { technologies } : {}),
    },
    provenance: {
      sourceKind: value.provenance.sourceKind as "first-party" | "external",
      publisher: value.provenance.publisher as string,
      license: value.provenance.license as string,
      references,
    },
    entries,
  };
}
