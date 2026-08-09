import { createHash } from "node:crypto";
import type {
  CatalogEntry,
  CatalogSearchQuery,
  CatalogSearchResult,
  EngineeringQualityPackLock,
  EngineeringQualityPackLockEntry,
  EngineeringQualityPackUpdateDiff,
  EngineeringQualityRevocationState,
  QuarantineArtifact,
} from "@intentloom/protocol";
import {
  QUALITY_CATALOG_ENTRY_SCHEMA_URN,
  QUALITY_CATALOG_LOCK_SCHEMA_URN,
  QUALITY_CATALOG_QUARANTINE_SCHEMA_URN,
  QUALITY_CATALOG_REVOCATION_SCHEMA_URN,
  QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  validateCatalogEntry,
  validateCatalogSearchQuery,
} from "@intentloom/validator";

export const FIRST_PARTY_CATALOG_ENTRIES: readonly CatalogEntry[] = [
  validateCatalogEntry({
    schemaVersion: QUALITY_CATALOG_ENTRY_SCHEMA_URN,
    id: "intentloom/base",
    name: "Intentloom Base Quality Pack",
    summary: "First-party base quality standards, budgets, and ratchet rules",
    publisher: "Intentloom Maintainers",
    trustClass: "first-party",
    packClass: "data-only",
    version: "1.0.0",
    sourceIdentity: "catalog/packs/base/1.0.0",
    contentDigest:
      "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    license: "MIT",
    compatibility: { intentloomVersionRange: ">=1.0.0" },
    capabilities: ["quality:inspect"],
    networkBehavior: "none",
    filesystemBehavior: "none",
    executable: false,
    postInstallBehavior: "none",
    conflicts: [],
    supportStatus: "supported",
    publishedAt: "2026-08-01T00:00:00Z",
    reviewedAt: "2026-08-01T00:00:00Z",
  }),
  validateCatalogEntry({
    schemaVersion: QUALITY_CATALOG_ENTRY_SCHEMA_URN,
    id: "intentloom/typescript",
    name: "Intentloom TypeScript Quality Pack",
    summary: "Strict type safety and module boundary rules for TypeScript",
    publisher: "Intentloom Maintainers",
    trustClass: "first-party",
    packClass: "data-only",
    version: "1.0.0",
    sourceIdentity: "catalog/packs/typescript/1.0.0",
    contentDigest:
      "sha256:874525f381711202e861d87e07662c12513f56d091e84cfd29c3685c4b57cc9d",
    license: "MIT",
    compatibility: { intentloomVersionRange: ">=1.0.0" },
    capabilities: ["quality:inspect"],
    networkBehavior: "none",
    filesystemBehavior: "none",
    executable: false,
    postInstallBehavior: "none",
    conflicts: [],
    supportStatus: "supported",
    publishedAt: "2026-08-01T00:00:00Z",
    reviewedAt: "2026-08-01T00:00:00Z",
  }),
];

function matchesText(entry: CatalogEntry, q: string): boolean {
  const target =
    `${entry.id} ${entry.name} ${entry.summary} ${entry.publisher}`.toLowerCase();
  return target.includes(q.toLowerCase());
}

export function searchEngineeringCatalog(
  catalog: readonly CatalogEntry[],
  rawQuery: CatalogSearchQuery,
): CatalogSearchResult {
  const query = validateCatalogSearchQuery(rawQuery);
  const q = query.query?.trim();
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 50;

  const filtered = catalog.filter((entry) => {
    if (query.trustClass && entry.trustClass !== query.trustClass) return false;
    if (q && !matchesText(entry, q)) return false;
    return true;
  });

  const sliced = filtered.slice(offset, offset + limit);
  return { entries: sliced, total: filtered.length, offset, limit };
}

export function inspectEngineeringCatalogEntry(
  catalog: readonly CatalogEntry[],
  packId: string,
  version?: string,
): CatalogEntry {
  if (!packId || typeof packId !== "string") {
    throw new Error("packId must be a non-empty string");
  }
  const match = catalog.find((entry) => {
    if (entry.id !== packId) return false;
    if (version && entry.version !== version) return false;
    return true;
  });
  if (!match) {
    throw new Error(
      `Catalog entry not found: ${packId}${version ? `@${version}` : ""}`,
    );
  }
  return match;
}

export function evaluateRevocationState(
  entry: CatalogEntry,
): EngineeringQualityRevocationState {
  const isRevoked = entry.supportStatus === "revoked";
  const isYanked = entry.supportStatus === "yanking";
  const failClosed = isRevoked || isYanked;
  const reason =
    entry.yankReason || (isRevoked ? "Pack has been revoked" : undefined);
  const revokedAt = entry.revokedAt;
  return {
    schemaVersion: QUALITY_CATALOG_REVOCATION_SCHEMA_URN,
    packId: entry.id,
    version: entry.version,
    isRevoked,
    isYanked,
    ...(reason !== undefined ? { reason } : {}),
    ...(revokedAt !== undefined ? { revokedAt } : {}),
    failClosed,
  };
}

export function verifyQuarantineArtifact(
  entry: CatalogEntry,
  rawContent: string | Uint8Array,
  expectedDigest?: string,
): QuarantineArtifact {
  const now = new Date().toISOString();
  const revocation = evaluateRevocationState(entry);
  if (revocation.failClosed) {
    return {
      schemaVersion: QUALITY_CATALOG_QUARANTINE_SCHEMA_URN,
      catalogEntryId: entry.id,
      version: entry.version,
      relativeLocation: `quarantine/${entry.id}/${entry.version}`,
      rawContentDigest: "sha256:" + "0".repeat(64),
      verifiedAt: now,
      quarantineState: "failed",
      failureReason: `Quarantine verification failed closed: catalog entry is ${revocation.isRevoked ? "revoked" : "yanked"}`,
    };
  }

  const hash = createHash("sha256");
  hash.update(
    typeof rawContent === "string"
      ? Buffer.from(rawContent, "utf-8")
      : rawContent,
  );
  const actualDigest = `sha256:${hash.digest("hex")}`;

  const targetDigest = expectedDigest || entry.contentDigest;
  const matches = actualDigest === targetDigest;
  const failureReason = matches
    ? undefined
    : `Content digest mismatch: expected ${targetDigest}, got ${actualDigest}`;

  return {
    schemaVersion: QUALITY_CATALOG_QUARANTINE_SCHEMA_URN,
    catalogEntryId: entry.id,
    version: entry.version,
    relativeLocation: `quarantine/${entry.id}/${entry.version}`,
    rawContentDigest: actualDigest,
    verifiedAt: now,
    quarantineState: matches ? "verified" : "failed",
    ...(failureReason !== undefined ? { failureReason } : {}),
  };
}

export function comparePackLock(
  currentLock: EngineeringQualityPackLock,
  targetPacks: readonly { id: string; version: string; digest: string }[],
): EngineeringQualityPackLock {
  const now = new Date().toISOString();
  const currentMap = new Map(currentLock.packs.map((p) => [p.id, p]));
  const updatedPacks: EngineeringQualityPackLockEntry[] = targetPacks.map(
    (target) => {
      const existing = currentMap.get(target.id);
      const isMatched = existing ? existing.digest === target.digest : true;
      return {
        id: target.id,
        version: target.version,
        digest: target.digest,
        source: existing?.source || "catalog",
        pinnedAt: existing?.pinnedAt || now,
        integrityStatus: isMatched ? "verified" : "mismatched",
      };
    },
  );
  return {
    schemaVersion: QUALITY_CATALOG_LOCK_SCHEMA_URN,
    lockVersion: currentLock.lockVersion + 1,
    packs: updatedPacks,
  };
}

export function diffEngineeringQualityPackUpdates(
  currentEntry: CatalogEntry,
  targetEntry: CatalogEntry,
): EngineeringQualityPackUpdateDiff {
  const isYankedOrRevoked =
    targetEntry.supportStatus === "revoked" ||
    targetEntry.supportStatus === "yanking" ||
    currentEntry.supportStatus === "revoked";

  let changeType: "upgrade" | "downgrade" | "yanked_migration" = "upgrade";
  if (isYankedOrRevoked) {
    changeType = "yanked_migration";
  } else if (targetEntry.version < currentEntry.version) {
    changeType = "downgrade";
  }

  const revocationWarning = isYankedOrRevoked
    ? `Target or current pack is in ${targetEntry.supportStatus} state`
    : undefined;

  return {
    schemaVersion: QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN,
    packId: currentEntry.id,
    currentVersion: currentEntry.version,
    targetVersion: targetEntry.version,
    changeType,
    ruleChanges: [
      {
        ruleId: `${currentEntry.id}:version-transition`,
        changeKind: changeType === "upgrade" ? "added" : "modified",
        description: `Transition pack from ${currentEntry.version} to ${targetEntry.version}`,
      },
    ],
    compatibilityDelta: `Updated from ${currentEntry.compatibility.intentloomVersionRange} to ${targetEntry.compatibility.intentloomVersionRange}`,
    riskAssessment: isYankedOrRevoked
      ? "high"
      : changeType === "downgrade"
        ? "medium"
        : "low",
    ...(revocationWarning !== undefined ? { revocationWarning } : {}),
  };
}
