import { createHash } from "node:crypto";
import {
  type EngineeringQualityPack,
  type EngineeringQualityPackEntry,
  type ExternalQualityPackActivation,
  type ExternalQualityPackImportResult,
  type ExternalQualityPackSource,
} from "@intentloom/protocol";
import {
  validateEngineeringQualityPack,
  validateExternalQualityPackActivationApproval,
  validateExternalQualityPackImportRequest,
} from "@intentloom/validator";

function canonicalJson(value: unknown): string {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("pack contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value !== "object")
    throw new Error("pack contains an unsupported value");
  const object = value as Record<string, unknown>;
  return `{${sorted(Object.keys(object), (left, right) =>
    left.localeCompare(right),
  )
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function sorted<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
): T[] {
  const result: T[] = [];
  for (const value of values) {
    let index = 0;
    while (index < result.length && compare(result[index]!, value) <= 0) {
      index += 1;
    }
    result.splice(index, 0, value);
  }
  return result;
}

function normalizeEntry(
  entry: EngineeringQualityPackEntry,
): EngineeringQualityPackEntry {
  const common = {
    ...entry,
    applicableClassifications: sorted(entry.applicableClassifications, (a, b) =>
      a.localeCompare(b),
    ),
    sourceReferenceIds: sorted(entry.sourceReferenceIds, (a, b) =>
      a.localeCompare(b),
    ),
  };
  if (entry.kind === "guidance") {
    return {
      ...common,
      kind: "guidance",
      reviewQuestion: entry.reviewQuestion,
    };
  }
  return {
    ...common,
    kind: "rule",
    metric: entry.metric,
    thresholds: sorted(entry.thresholds, (a, b) =>
      a.level.localeCompare(b.level),
    ),
  };
}

function normalizePack(pack: EngineeringQualityPack): EngineeringQualityPack {
  return {
    ...pack,
    dependencies: sorted(pack.dependencies, (a, b) => a.localeCompare(b)),
    compatibility: {
      intentloomVersionRange: pack.compatibility.intentloomVersionRange,
      ...(pack.compatibility.technologies
        ? {
            technologies: sorted(pack.compatibility.technologies, (a, b) =>
              a.technologyId.localeCompare(b.technologyId),
            ),
          }
        : {}),
    },
    provenance: {
      ...pack.provenance,
      references: sorted(pack.provenance.references, (a, b) =>
        a.id.localeCompare(b.id),
      ),
    },
    entries: sorted(
      pack.entries.map(normalizeEntry),
      (a, b) =>
        a.meaningId.localeCompare(b.meaningId) || a.id.localeCompare(b.id),
    ),
  };
}

function packDigest(pack: EngineeringQualityPack): string {
  return `sha256:${createHash("sha256").update(canonicalJson(pack)).digest("hex")}`;
}

export function computeExternalQualityPackDigest(value: unknown): string {
  const pack = validateEngineeringQualityPack(value);
  if (pack.provenance.sourceKind !== "external") {
    throw new Error("external pack digest requires external provenance");
  }
  return packDigest(normalizePack(pack));
}

function sameSource(
  left: ExternalQualityPackSource,
  right: ExternalQualityPackSource,
): boolean {
  return (
    left.kind === right.kind &&
    left.locator === right.locator &&
    left.pin === right.pin &&
    left.digest === right.digest
  );
}

export function importExternalQualityPack(
  value: unknown,
): ExternalQualityPackImportResult {
  const request = validateExternalQualityPackImportRequest(value);
  let parsed: unknown;
  try {
    parsed = JSON.parse(request.payload) as unknown;
  } catch {
    throw new Error("external pack payload must contain valid JSON");
  }
  const pack = validateEngineeringQualityPack(parsed);
  if (pack.provenance.sourceKind !== "external") {
    throw new Error("external pack payload must declare external provenance");
  }
  if (
    pack.provenance.publisher !== request.declaredPublisher ||
    pack.provenance.license !== request.declaredLicense
  ) {
    throw new Error(
      "external pack provenance does not match the import declaration",
    );
  }
  const normalizedPack = normalizePack(pack);
  const digest = packDigest(normalizedPack);
  if (digest !== request.source.digest) {
    throw new Error(
      "external pack digest does not match the pinned source digest",
    );
  }
  return {
    schemaVersion: request.schemaVersion,
    status: "imported",
    reviewStatus: "pending",
    pinStatus: "verified",
    source: request.source,
    digest,
    pack: normalizedPack,
  };
}

export function activateExternalQualityPack(
  imported: ExternalQualityPackImportResult,
  value: unknown,
): ExternalQualityPackActivation {
  const approval = validateExternalQualityPackActivationApproval(value);
  if (imported.status !== "imported" || imported.pinStatus !== "verified") {
    throw new Error(
      "only an imported pack with a verified pin can be activated",
    );
  }
  if (
    !sameSource(imported.source, approval.source) ||
    approval.source.digest !== imported.digest
  ) {
    throw new Error(
      "activation approval does not match the imported pack digest and source",
    );
  }
  return {
    schemaVersion: approval.schemaVersion,
    status: "activated",
    reviewerId: approval.reviewerId,
    source: imported.source,
    digest: imported.digest,
    pack: imported.pack,
  };
}
