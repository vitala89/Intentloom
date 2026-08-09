import type {
  CatalogEntry,
  CatalogPackClass,
  CatalogSearchQuery,
  CatalogSupportStatus,
  CatalogTrustClass,
  EngineeringQualityPackLock,
  EngineeringQualityPackLockEntry,
  EngineeringQualityPackRuleChange,
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
import { isObject } from "./common.js";

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const RANGE =
  /^(?:\*|(?:\^|~|>=|<=|>|<|=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\s+(?:\^|~|>=|<=|>|<|=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)*?)$/u;

const TRUST_CLASSES: readonly CatalogTrustClass[] = [
  "first-party",
  "curated-third-party",
  "organization",
];
const PACK_CLASSES: readonly CatalogPackClass[] = [
  "data-only",
  "executable-checker",
  "remediation",
];
const SUPPORT_STATUSES: readonly CatalogSupportStatus[] = [
  "supported",
  "deprecated",
  "yanking",
  "revoked",
];

function str(value: unknown, field: string, maxLen = 256): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLen) {
    throw new Error(`${field} must be a string <= ${maxLen} chars`);
  }
  return value;
}

function optStr(
  value: unknown,
  field: string,
  maxLen = 256,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return str(value, field, maxLen);
}

export function validateEngineeringQualityPackCompatibility(value: unknown) {
  if (!isObject(value)) throw new Error("pack compatibility must be an object");
  const intentloomVersionRange = str(
    value.intentloomVersionRange,
    "intentloomVersionRange",
    128,
  );
  if (!RANGE.test(intentloomVersionRange)) {
    throw new Error("pack Intentloom compatibility range is invalid");
  }
  const technologies = Array.isArray(value.technologies)
    ? value.technologies.map((t, idx) => {
        if (!isObject(t))
          throw new Error(`technologies[${idx}] must be an object`);
        const vRange = str(
          t.versionRange,
          `technologies[${idx}].versionRange`,
          128,
        );
        if (!RANGE.test(vRange))
          throw new Error(`technologies[${idx}].versionRange is invalid`);
        return {
          technologyId: str(
            t.technologyId,
            `technologies[${idx}].technologyId`,
            128,
          ),
          versionRange: vRange,
        };
      })
    : undefined;
  return {
    intentloomVersionRange,
    ...(technologies !== undefined ? { technologies } : {}),
  };
}

export function validateCatalogSearchQuery(value: unknown): CatalogSearchQuery {
  if (!isObject(value)) return {};
  const query = optStr(value.query, "query", 128);
  const category = optStr(value.category, "category", 64);
  let trustClass: CatalogTrustClass | undefined;
  if (value.trustClass !== undefined) {
    if (!TRUST_CLASSES.includes(value.trustClass as CatalogTrustClass)) {
      throw new Error("invalid search trustClass");
    }
    trustClass = value.trustClass as CatalogTrustClass;
  }
  const tags = Array.isArray(value.tags)
    ? value.tags.map((t, idx) => str(t, `tags[${idx}]`, 64))
    : undefined;
  const limit =
    typeof value.limit === "number" && value.limit > 0
      ? Math.floor(value.limit)
      : undefined;
  const offset =
    typeof value.offset === "number" && value.offset >= 0
      ? Math.floor(value.offset)
      : undefined;
  return {
    ...(query !== undefined ? { query } : {}),
    ...(trustClass !== undefined ? { trustClass } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(offset !== undefined ? { offset } : {}),
  };
}

export function validateCatalogEntry(value: unknown): CatalogEntry {
  if (!isObject(value)) throw new Error("catalog entry must be an object");
  if (value.schemaVersion !== QUALITY_CATALOG_ENTRY_SCHEMA_URN) {
    throw new Error(
      `catalog entry schema must equal ${QUALITY_CATALOG_ENTRY_SCHEMA_URN}`,
    );
  }
  const id = str(value.id, "entry id", 128);
  const name = str(value.name, "entry name", 128);
  const summary = str(value.summary, "entry summary", 512);
  const publisher = str(value.publisher, "entry publisher", 128);
  if (!TRUST_CLASSES.includes(value.trustClass as CatalogTrustClass)) {
    throw new Error("entry trustClass is invalid");
  }
  if (!PACK_CLASSES.includes(value.packClass as CatalogPackClass)) {
    throw new Error("entry packClass is invalid");
  }
  if (!SUPPORT_STATUSES.includes(value.supportStatus as CatalogSupportStatus)) {
    throw new Error("entry supportStatus is invalid");
  }
  const version = str(value.version, "entry version", 64);
  const sourceIdentity = str(value.sourceIdentity, "entry sourceIdentity", 256);
  const contentDigest = str(value.contentDigest, "entry contentDigest", 71);
  if (!DIGEST.test(contentDigest))
    throw new Error("entry contentDigest must be valid SHA-256");
  const license = str(value.license, "entry license", 64);
  const compatibility = validateEngineeringQualityPackCompatibility(
    value.compatibility,
  );
  const capabilities = Array.isArray(value.capabilities)
    ? value.capabilities.map((c, i) => str(c, `capabilities[${i}]`, 64))
    : [];
  const networkBehavior = value.networkBehavior as
    "none" | "declarative" | "network-required";
  const filesystemBehavior = value.filesystemBehavior as
    "none" | "read-only" | "project-scoped";
  if (!["none", "declarative", "network-required"].includes(networkBehavior)) {
    throw new Error("invalid networkBehavior");
  }
  if (!["none", "read-only", "project-scoped"].includes(filesystemBehavior)) {
    throw new Error("invalid filesystemBehavior");
  }

  const signature = optStr(value.signature, "signature", 512);
  const revokedAt = optStr(value.revokedAt, "revokedAt", 64);
  const yankedAt = optStr(value.yankedAt, "yankedAt", 64);
  const yankReason = optStr(value.yankReason, "yankReason", 256);

  return {
    schemaVersion: QUALITY_CATALOG_ENTRY_SCHEMA_URN,
    id,
    name,
    summary,
    publisher,
    trustClass: value.trustClass as CatalogTrustClass,
    packClass: value.packClass as CatalogPackClass,
    version,
    sourceIdentity,
    contentDigest,
    ...(signature !== undefined ? { signature } : {}),
    license,
    compatibility,
    capabilities,
    networkBehavior,
    filesystemBehavior,
    executable: Boolean(value.executable),
    postInstallBehavior:
      value.postInstallBehavior === "review-required"
        ? "review-required"
        : "none",
    conflicts: Array.isArray(value.conflicts)
      ? value.conflicts.map((c, i) => str(c, `conflicts[${i}]`, 128))
      : [],
    supportStatus: value.supportStatus as CatalogSupportStatus,
    publishedAt: str(value.publishedAt, "publishedAt", 64),
    reviewedAt: str(value.reviewedAt, "reviewedAt", 64),
    ...(revokedAt !== undefined ? { revokedAt } : {}),
    ...(yankedAt !== undefined ? { yankedAt } : {}),
    ...(yankReason !== undefined ? { yankReason } : {}),
  };
}

export function validateQuarantineArtifact(value: unknown): QuarantineArtifact {
  if (!isObject(value))
    throw new Error("quarantine artifact must be an object");
  if (value.schemaVersion !== QUALITY_CATALOG_QUARANTINE_SCHEMA_URN) {
    throw new Error(
      `quarantine schema must equal ${QUALITY_CATALOG_QUARANTINE_SCHEMA_URN}`,
    );
  }
  const catalogEntryId = str(value.catalogEntryId, "catalogEntryId", 128);
  const version = str(value.version, "version", 64);
  const relativeLocation = str(value.relativeLocation, "relativeLocation", 256);
  const rawContentDigest = str(value.rawContentDigest, "rawContentDigest", 71);
  if (!DIGEST.test(rawContentDigest))
    throw new Error("rawContentDigest must be valid SHA-256");
  const state = value.quarantineState;
  if (!["quarantined", "verified", "failed"].includes(state as string)) {
    throw new Error("invalid quarantineState");
  }
  const failureReason = optStr(value.failureReason, "failureReason", 256);

  return {
    schemaVersion: QUALITY_CATALOG_QUARANTINE_SCHEMA_URN,
    catalogEntryId,
    version,
    relativeLocation,
    rawContentDigest,
    verifiedAt: str(value.verifiedAt, "verifiedAt", 64),
    quarantineState: state as "quarantined" | "verified" | "failed",
    ...(failureReason !== undefined ? { failureReason } : {}),
  };
}

export function validateEngineeringQualityPackLock(
  value: unknown,
): EngineeringQualityPackLock {
  if (!isObject(value)) throw new Error("pack lock must be an object");
  if (value.schemaVersion !== QUALITY_CATALOG_LOCK_SCHEMA_URN) {
    throw new Error(
      `pack lock schema must equal ${QUALITY_CATALOG_LOCK_SCHEMA_URN}`,
    );
  }
  const lockVersion =
    typeof value.lockVersion === "number" ? value.lockVersion : 1;
  const packs: EngineeringQualityPackLockEntry[] = Array.isArray(value.packs)
    ? value.packs.map((p, idx) => {
        if (!isObject(p)) throw new Error(`packs[${idx}] must be an object`);
        const digest = str(p.digest, `packs[${idx}].digest`, 71);
        if (!DIGEST.test(digest))
          throw new Error(`packs[${idx}].digest invalid SHA-256`);
        return {
          id: str(p.id, `packs[${idx}].id`, 128),
          version: str(p.version, `packs[${idx}].version`, 64),
          digest,
          source: str(p.source, `packs[${idx}].source`, 256),
          pinnedAt: str(p.pinnedAt, `packs[${idx}].pinnedAt`, 64),
          integrityStatus: ["verified", "unverified", "mismatched"].includes(
            p.integrityStatus as string,
          )
            ? (p.integrityStatus as "verified" | "unverified" | "mismatched")
            : "unverified",
        };
      })
    : [];
  return { schemaVersion: QUALITY_CATALOG_LOCK_SCHEMA_URN, lockVersion, packs };
}

export function validateEngineeringQualityPackUpdateDiff(
  value: unknown,
): EngineeringQualityPackUpdateDiff {
  if (!isObject(value)) throw new Error("update diff must be an object");
  if (value.schemaVersion !== QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN) {
    throw new Error(
      `update diff schema must equal ${QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN}`,
    );
  }
  const changeType = value.changeType as
    "upgrade" | "downgrade" | "yanked_migration";
  if (!["upgrade", "downgrade", "yanked_migration"].includes(changeType)) {
    throw new Error("invalid update diff changeType");
  }
  const ruleChanges: EngineeringQualityPackRuleChange[] = Array.isArray(
    value.ruleChanges,
  )
    ? value.ruleChanges.map((rc, idx) => {
        if (!isObject(rc))
          throw new Error(`ruleChanges[${idx}] must be an object`);
        const changeKind = rc.changeKind as "added" | "removed" | "modified";
        if (!["added", "removed", "modified"].includes(changeKind))
          throw new Error("invalid changeKind");
        return {
          ruleId: str(rc.ruleId, `ruleChanges[${idx}].ruleId`, 128),
          changeKind,
          description: str(
            rc.description,
            `ruleChanges[${idx}].description`,
            256,
          ),
        };
      })
    : [];

  const revocationWarning = optStr(
    value.revocationWarning,
    "revocationWarning",
    256,
  );

  return {
    schemaVersion: QUALITY_CATALOG_UPDATE_DIFF_SCHEMA_URN,
    packId: str(value.packId, "packId", 128),
    currentVersion: str(value.currentVersion, "currentVersion", 64),
    targetVersion: str(value.targetVersion, "targetVersion", 64),
    changeType,
    ruleChanges,
    compatibilityDelta: str(
      value.compatibilityDelta,
      "compatibilityDelta",
      256,
    ),
    riskAssessment: ["low", "medium", "high"].includes(
      value.riskAssessment as string,
    )
      ? (value.riskAssessment as "low" | "medium" | "high")
      : "medium",
    ...(revocationWarning !== undefined ? { revocationWarning } : {}),
  };
}

export function validateEngineeringQualityRevocationState(
  value: unknown,
): EngineeringQualityRevocationState {
  if (!isObject(value)) throw new Error("revocation state must be an object");
  if (value.schemaVersion !== QUALITY_CATALOG_REVOCATION_SCHEMA_URN) {
    throw new Error(
      `revocation state schema must equal ${QUALITY_CATALOG_REVOCATION_SCHEMA_URN}`,
    );
  }

  const reason = optStr(value.reason, "reason", 256);
  const revokedAt = optStr(value.revokedAt, "revokedAt", 64);
  const replacementVersion = optStr(
    value.replacementVersion,
    "replacementVersion",
    64,
  );

  return {
    schemaVersion: QUALITY_CATALOG_REVOCATION_SCHEMA_URN,
    packId: str(value.packId, "packId", 128),
    version: str(value.version, "version", 64),
    isRevoked: Boolean(value.isRevoked),
    isYanked: Boolean(value.isYanked),
    ...(reason !== undefined ? { reason } : {}),
    ...(revokedAt !== undefined ? { revokedAt } : {}),
    ...(replacementVersion !== undefined ? { replacementVersion } : {}),
    failClosed: Boolean(value.failClosed),
  };
}
