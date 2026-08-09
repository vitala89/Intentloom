import {
  QUALITY_PACK_RESOLUTION_SCHEMA_URN,
  type EngineeringQualityPack,
  type EngineeringQualityPackEntry,
  type EngineeringQualityPackResolution,
  type EngineeringQualityPackResolutionConflict,
  type ResolveEngineeringQualityPacksOptions,
} from "@intentloom/protocol";
import { validateEngineeringQualityPack } from "@intentloom/validator";
import { satisfiesVersionRange } from "./semver-range.js";

function ordered<T>(
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

const lexical = (left: string, right: string): number =>
  left.localeCompare(right);

function addConflict(
  conflicts: EngineeringQualityPackResolutionConflict[],
  conflict: EngineeringQualityPackResolutionConflict,
): void {
  const key = `${conflict.kind}:${conflict.packIds?.join(",")}:${conflict.meaningId ?? ""}`;
  if (
    !conflicts.some(
      (item) =>
        `${item.kind}:${item.packIds?.join(",")}:${item.meaningId ?? ""}` ===
        key,
    )
  ) {
    conflicts.push(conflict);
  }
}

function isCompatible(
  pack: EngineeringQualityPack,
  options: ResolveEngineeringQualityPacksOptions,
): boolean {
  if (
    !satisfiesVersionRange(
      options.context.intentloomVersion,
      pack.compatibility.intentloomVersionRange,
    )
  ) {
    return false;
  }
  return (pack.compatibility.technologies ?? []).every((requirement) => {
    const technology = options.context.technologies?.find(
      (item) => item.technologyId === requirement.technologyId,
    );
    return (
      technology !== undefined &&
      satisfiesVersionRange(technology.version, requirement.versionRange)
    );
  });
}

function entryFingerprint(entry: EngineeringQualityPackEntry): string {
  const common = {
    kind: entry.kind,
    category: entry.category,
    severity: entry.severity,
    enforcement: entry.enforcement,
    applicableClassifications: ordered(
      entry.applicableClassifications,
      lexical,
    ),
  };
  return entry.kind === "rule"
    ? JSON.stringify({
        ...common,
        metric: entry.metric,
        thresholds: ordered(entry.thresholds, (a, b) =>
          a.level.localeCompare(b.level),
        ),
      })
    : JSON.stringify({ ...common, reviewQuestion: entry.reviewQuestion });
}

function resolvePackOrder(
  requestedPackIds: readonly string[],
  byId: ReadonlyMap<string, EngineeringQualityPack>,
  duplicates: ReadonlySet<string>,
  options: ResolveEngineeringQualityPacksOptions,
  conflicts: EngineeringQualityPackResolutionConflict[],
): EngineeringQualityPack[] {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const orderedPacks: EngineeringQualityPack[] = [];

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      addConflict(conflicts, {
        kind: "dependency-cycle",
        message: `Quality pack dependency cycle includes ${id}.`,
        packIds: [id],
      });
      return;
    }
    if (duplicates.has(id)) {
      addConflict(conflicts, {
        kind: "duplicate-pack",
        message: `Quality pack ${id} has multiple definitions.`,
        packIds: [id],
      });
      return;
    }
    const pack = byId.get(id);
    if (!pack) {
      addConflict(conflicts, {
        kind: "unknown-pack",
        message: `Requested quality pack ${id} is unavailable.`,
        packIds: [id],
      });
      return;
    }
    if (!isCompatible(pack, options)) {
      addConflict(conflicts, {
        kind: "incompatible-pack",
        message: `Quality pack ${id}@${pack.version} is incompatible with the resolution context.`,
        packIds: [id],
      });
      return;
    }
    visiting.add(id);
    for (const dependency of ordered(pack.dependencies, lexical)) {
      if (!byId.has(dependency)) {
        addConflict(conflicts, {
          kind: "missing-dependency",
          message: `Quality pack ${id} requires unavailable pack ${dependency}.`,
          packIds: [id, dependency],
        });
      } else {
        visit(dependency);
      }
    }
    visiting.delete(id);
    visited.add(id);
    orderedPacks.push(pack);
  };

  for (const id of ordered([...new Set(requestedPackIds)], lexical)) visit(id);
  return orderedPacks;
}

function resolveEntries(
  packs: readonly EngineeringQualityPack[],
  conflicts: EngineeringQualityPackResolutionConflict[],
): readonly EngineeringQualityPackEntry[] {
  const meanings = new Map<
    string,
    { entry: EngineeringQualityPackEntry; fingerprint: string; packId: string }
  >();
  const fingerprints = new Map<string, string>();
  for (const pack of packs) {
    for (const entry of ordered(pack.entries, (a, b) =>
      a.meaningId.localeCompare(b.meaningId),
    )) {
      const fingerprint = entryFingerprint(entry);
      const existingMeaning = meanings.get(entry.meaningId);
      if (existingMeaning) {
        if (existingMeaning.fingerprint !== fingerprint) {
          addConflict(conflicts, {
            kind: "conflicting-meaning",
            message: `Meaning ${entry.meaningId} differs between ${existingMeaning.packId} and ${pack.id}.`,
            packIds: [existingMeaning.packId, pack.id],
            meaningId: entry.meaningId,
          });
        }
        continue;
      }
      const existingFingerprint = fingerprints.get(fingerprint);
      if (existingFingerprint && existingFingerprint !== entry.meaningId) {
        addConflict(conflicts, {
          kind: "duplicate-meaning",
          message: `Entries ${existingFingerprint} and ${entry.meaningId} describe the same canonical meaning.`,
          packIds: [pack.id],
          meaningId: entry.meaningId,
        });
        continue;
      }
      meanings.set(entry.meaningId, { entry, fingerprint, packId: pack.id });
      fingerprints.set(fingerprint, entry.meaningId);
    }
  }
  return ordered([...meanings.values()], (a, b) =>
    a.entry.meaningId.localeCompare(b.entry.meaningId),
  ).map((item) => item.entry);
}

export function resolveEngineeringQualityPacks(
  options: ResolveEngineeringQualityPacksOptions,
): EngineeringQualityPackResolution {
  const validatedPacks = ordered(
    options.packs.map(validateEngineeringQualityPack),
    (a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version),
  );
  const byId = new Map<string, EngineeringQualityPack>();
  const duplicateIds = new Set<string>();
  for (const pack of validatedPacks) {
    if (byId.has(pack.id)) duplicateIds.add(pack.id);
    else byId.set(pack.id, pack);
  }
  const conflicts: EngineeringQualityPackResolutionConflict[] = [];
  const resolvedPacks = resolvePackOrder(
    options.requestedPackIds,
    byId,
    duplicateIds,
    options,
    conflicts,
  );
  const entries = resolveEntries(resolvedPacks, conflicts);
  const status = conflicts.some((item) => item.kind === "incompatible-pack")
    ? "incompatible"
    : conflicts.some((item) =>
          ["unknown-pack", "missing-dependency", "dependency-cycle"].includes(
            item.kind,
          ),
        )
      ? "unsupported"
      : conflicts.length > 0
        ? "conflict"
        : "resolved";
  return {
    schemaVersion: QUALITY_PACK_RESOLUTION_SCHEMA_URN,
    status,
    requestedPackIds: ordered([...new Set(options.requestedPackIds)], lexical),
    resolvedPacks: resolvedPacks.map(({ id, version }) => ({ id, version })),
    entries,
    conflicts,
  };
}
