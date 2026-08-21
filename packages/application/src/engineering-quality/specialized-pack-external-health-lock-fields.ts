import type {
  ExtensionHealthFinding,
  ExtensionLockEntry,
} from "@intentloom/protocol";
import { QUALITY_SPECIALIZED_PACK_SCHEMA_URN } from "@intentloom/protocol";
import { validateExternalQualityPackSource } from "@intentloom/validator";
import {
  SPECIALIZED_PACK_INTEGRITY_INVALID,
  SPECIALIZED_PACK_LOCK_INVALID,
  SPECIALIZED_PACK_PIN_INVALID,
  SPECIALIZED_PACK_TRUST_INVALID,
  specializedPackFinding,
} from "./specialized-pack-external-health-findings.js";

const EXACT_VERSION =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;

function lockInvalid(
  extensionId: string,
  path: string,
  message: string,
): ExtensionHealthFinding {
  return specializedPackFinding(
    extensionId,
    SPECIALIZED_PACK_LOCK_INVALID,
    "error",
    path,
    message,
    "Repair or replace the specialized-pack lock entry after explicit review.",
  );
}

function pinInvalid(
  extensionId: string,
  path: string,
  message: string,
): ExtensionHealthFinding {
  return specializedPackFinding(
    extensionId,
    SPECIALIZED_PACK_PIN_INVALID,
    "error",
    path,
    message,
    "Re-activate the specialized pack with a valid source pin.",
  );
}

function integrityInvalid(
  extensionId: string,
  path: string,
  message: string,
): ExtensionHealthFinding {
  return specializedPackFinding(
    extensionId,
    SPECIALIZED_PACK_INTEGRITY_INVALID,
    "error",
    path,
    message,
    "Re-activate the specialized pack with a verified SHA-256 digest.",
  );
}

function trustInvalid(
  extensionId: string,
  path: string,
  message: string,
): ExtensionHealthFinding {
  return specializedPackFinding(
    extensionId,
    SPECIALIZED_PACK_TRUST_INVALID,
    "error",
    path,
    message,
    "Re-review and re-activate the specialized pack with publisher, license, and approver.",
  );
}

export function inspectSpecializedPackIdentityAndSchema(
  key: string,
  entry: ExtensionLockEntry,
  path: string,
): ExtensionHealthFinding[] {
  const findings: ExtensionHealthFinding[] = [];
  const id = entry.extensionId;
  if (key !== id)
    findings.push(
      lockInvalid(
        id,
        path,
        `${id}: lock key does not match the specialized-pack id`,
      ),
    );
  if (entry.category !== "policy-pack")
    findings.push(
      lockInvalid(
        id,
        path,
        `${id}: active specialized-pack category must be policy-pack`,
      ),
    );
  if (entry.installationType !== "referenced")
    findings.push(
      lockInvalid(
        id,
        path,
        `${id}: active specialized-pack installation type must be referenced`,
      ),
    );
  if (entry.manifestSchemaVersion !== QUALITY_SPECIALIZED_PACK_SCHEMA_URN)
    findings.push(
      lockInvalid(
        id,
        path,
        `${id}: specialized-pack manifest schema is missing or unsupported`,
      ),
    );
  if (
    entry.requestedVersion !== entry.resolvedVersion ||
    !EXACT_VERSION.test(entry.requestedVersion) ||
    !EXACT_VERSION.test(entry.resolvedVersion)
  )
    findings.push(
      lockInvalid(
        id,
        path,
        `${id}: specialized-pack lock does not pin an exact version`,
      ),
    );
  return findings;
}

function mapSourceValidationError(
  extensionId: string,
  path: string,
  error: unknown,
): ExtensionHealthFinding {
  const message = error instanceof Error ? error.message : "invalid source";
  if (message.includes("digest"))
    return integrityInvalid(
      extensionId,
      path,
      `${extensionId}: specialized-pack integrity digest is missing or malformed`,
    );
  if (message.includes("pin"))
    return pinInvalid(
      extensionId,
      path,
      `${extensionId}: specialized-pack source pin is missing or invalid`,
    );
  return lockInvalid(
    extensionId,
    path,
    `${extensionId}: specialized-pack source metadata is invalid`,
  );
}

export function inspectSpecializedPackPersistedSource(
  entry: ExtensionLockEntry,
  path: string,
): ExtensionHealthFinding[] {
  const id = entry.extensionId;
  const source = entry.source;
  if (
    !source ||
    typeof source.registry !== "string" ||
    typeof source.package !== "string" ||
    typeof source.resolved !== "string" ||
    source.resolved.trim() === ""
  )
    return [
      pinInvalid(
        id,
        path,
        `${id}: specialized-pack source pin is missing or invalid`,
      ),
    ];
  if (typeof entry.integrity !== "string" || entry.integrity.trim() === "")
    return [
      integrityInvalid(
        id,
        path,
        `${id}: specialized-pack integrity digest is missing or malformed`,
      ),
    ];
  try {
    validateExternalQualityPackSource({
      kind: source.registry,
      locator: source.package,
      pin: source.resolved,
      digest: entry.integrity,
    });
  } catch (error) {
    return [mapSourceValidationError(id, path, error)];
  }
  return [];
}

export function inspectSpecializedPackTrustMetadata(
  entry: ExtensionLockEntry,
  path: string,
): ExtensionHealthFinding[] {
  const findings: ExtensionHealthFinding[] = [];
  const id = entry.extensionId;
  if (typeof entry.approvedBy !== "string" || entry.approvedBy.trim() === "")
    findings.push(
      trustInvalid(
        id,
        path,
        `${id}: active specialized-pack approver is missing`,
      ),
    );
  if (
    typeof entry.approvedAt !== "string" ||
    entry.approvedAt.trim() === "" ||
    !Number.isFinite(Date.parse(entry.approvedAt))
  )
    findings.push(
      trustInvalid(
        id,
        path,
        `${id}: active specialized-pack approval timestamp is missing`,
      ),
    );
  if (
    typeof entry.publisher?.name !== "string" ||
    entry.publisher.name.trim() === ""
  )
    findings.push(
      trustInvalid(
        id,
        path,
        `${id}: active specialized-pack publisher is missing`,
      ),
    );
  if (
    typeof entry.license?.spdxId !== "string" ||
    entry.license.spdxId.trim() === ""
  )
    findings.push(
      trustInvalid(
        id,
        path,
        `${id}: active specialized-pack license is missing`,
      ),
    );
  return findings;
}
