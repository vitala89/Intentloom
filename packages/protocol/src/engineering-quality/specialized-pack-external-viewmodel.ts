import type {
  ExternalQualityPackSource,
  ExternalQualityPackSourceKind,
} from "./external-pack-import.js";
import { ProtocolValidationError } from "../protocol-validation-error.js";
import { isObject } from "../workspace-daemon-request-helpers.js";

export type ExternalSpecializedPackPreviewStatus =
  "ready-for-review" | "rejected";

export interface ExternalSpecializedPackPreviewViewModel {
  readonly status: ExternalSpecializedPackPreviewStatus;
  readonly packId: string;
  readonly version: string;
  readonly name: string;
  readonly publisher: string;
  readonly declaredLicense: string;
  readonly source: ExternalQualityPackSource;
  readonly digest: string;
  readonly trustLevel: string;
  readonly compatible: boolean;
  readonly extensionPlanStatus: string;
  readonly diagnostics: readonly string[];
  readonly activationRequiresApproval: true;
}

const SOURCE_KINDS: readonly ExternalQualityPackSourceKind[] = [
  "package",
  "git",
  "local",
  "organization-registry",
  "documentation-snapshot",
];

const MAX_FIELD = 512;
const MAX_DIAGNOSTICS = 32;
const MAX_DIAGNOSTIC_LENGTH = 512;

function stringValue(
  value: unknown,
  field: string,
  maximum = MAX_FIELD,
): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximum
  ) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string of at most ${maximum} characters`,
    );
  }
  return value;
}

function parseSource(value: unknown): ExternalQualityPackSource {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "source must be an object");
  }
  const kind = stringValue(value.kind, "source.kind", 64);
  if (!SOURCE_KINDS.includes(kind as ExternalQualityPackSourceKind)) {
    throw new ProtocolValidationError(-32602, "source.kind is invalid");
  }
  return {
    kind: kind as ExternalQualityPackSourceKind,
    locator: stringValue(value.locator, "source.locator"),
    pin: stringValue(value.pin, "source.pin", 128),
    digest: stringValue(value.digest, "source.digest", 128),
  };
}

function parseDiagnostics(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_DIAGNOSTICS) {
    throw new ProtocolValidationError(
      -32602,
      "diagnostics must be a bounded array",
    );
  }
  return value.map((entry, index) =>
    stringValue(entry, `diagnostics[${index}]`, MAX_DIAGNOSTIC_LENGTH),
  );
}

export type ExternalSpecializedPackActivationApplyStatus =
  "applied" | "already-applied" | "conflict" | "denied" | "failed";

export interface ExternalSpecializedPackApplyViewModel {
  readonly status: ExternalSpecializedPackActivationApplyStatus;
  readonly projectRoot: string;
  readonly packId: string;
  readonly digest: string;
  readonly pin: string;
  readonly changedPaths: readonly string[];
  readonly writes: number;
  readonly diagnostics: readonly string[];
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
}

const APPLY_STATUSES: readonly ExternalSpecializedPackActivationApplyStatus[] =
  ["applied", "already-applied", "conflict", "denied", "failed"];

const MAX_CHANGED_PATHS = 64;
const MAX_PATH_LENGTH = 512;
const MAX_ROLLBACK_FAILURES = 16;

function parseChangedPaths(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_CHANGED_PATHS) {
    throw new ProtocolValidationError(
      -32602,
      "changedPaths must be a bounded array",
    );
  }
  return value.map((entry, index) =>
    stringValue(entry, `changedPaths[${index}]`, MAX_PATH_LENGTH),
  );
}

function parseRollbackFailures(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length > MAX_ROLLBACK_FAILURES) {
    throw new ProtocolValidationError(
      -32602,
      "rollbackFailures must be a bounded array",
    );
  }
  return value.map((entry, index) =>
    stringValue(entry, `rollbackFailures[${index}]`, MAX_DIAGNOSTIC_LENGTH),
  );
}

function nonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-negative integer`,
    );
  }
  return value;
}

export function parseExternalSpecializedPackApplyViewModel(
  value: unknown,
): ExternalSpecializedPackApplyViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  const status = stringValue(value.status, "status", 64);
  if (
    !APPLY_STATUSES.includes(
      status as ExternalSpecializedPackActivationApplyStatus,
    )
  ) {
    throw new ProtocolValidationError(
      -32602,
      "status must be an activation apply status",
    );
  }
  if (typeof value.rollbackAttempted !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      "rollbackAttempted must be a boolean",
    );
  }
  if (typeof value.rollbackCompleted !== "boolean") {
    throw new ProtocolValidationError(
      -32602,
      "rollbackCompleted must be a boolean",
    );
  }
  return {
    status: status as ExternalSpecializedPackActivationApplyStatus,
    projectRoot: stringValue(value.projectRoot, "projectRoot"),
    packId: stringValue(value.packId, "packId"),
    digest: stringValue(value.digest, "digest", 128),
    pin: stringValue(value.pin, "pin", 128),
    changedPaths: parseChangedPaths(value.changedPaths),
    writes: nonNegativeInteger(value.writes, "writes"),
    diagnostics: parseDiagnostics(value.diagnostics),
    rollbackAttempted: value.rollbackAttempted,
    rollbackCompleted: value.rollbackCompleted,
    rollbackFailures: parseRollbackFailures(value.rollbackFailures),
  };
}

export function parseExternalSpecializedPackPreviewViewModel(
  value: unknown,
): ExternalSpecializedPackPreviewViewModel {
  if (!isObject(value)) {
    throw new ProtocolValidationError(-32602, "viewmodel must be an object");
  }
  const status = stringValue(value.status, "status", 64);
  if (status !== "ready-for-review" && status !== "rejected") {
    throw new ProtocolValidationError(
      -32602,
      "status must be a preview status",
    );
  }
  if (value.activationRequiresApproval !== true) {
    throw new ProtocolValidationError(
      -32602,
      "activationRequiresApproval must be true",
    );
  }
  if (typeof value.compatible !== "boolean") {
    throw new ProtocolValidationError(-32602, "compatible must be a boolean");
  }
  return {
    status,
    packId: stringValue(value.packId, "packId"),
    version: stringValue(value.version, "version", 64),
    name: stringValue(value.name, "name"),
    publisher: stringValue(value.publisher, "publisher"),
    declaredLicense: stringValue(value.declaredLicense, "declaredLicense", 64),
    source: parseSource(value.source),
    digest: stringValue(value.digest, "digest", 128),
    trustLevel: stringValue(value.trustLevel, "trustLevel", 64),
    compatible: value.compatible,
    extensionPlanStatus: stringValue(
      value.extensionPlanStatus,
      "extensionPlanStatus",
      64,
    ),
    diagnostics: parseDiagnostics(value.diagnostics),
    activationRequiresApproval: true,
  };
}
