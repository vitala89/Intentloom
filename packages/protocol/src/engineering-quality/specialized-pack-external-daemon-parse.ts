import type {
  ExternalQualityPackActivationApproval,
  ExternalQualityPackSource,
  ExternalQualityPackSourceKind,
} from "./external-pack-import.js";
import { QUALITY_PACK_ACTIVATION_SCHEMA_URN } from "./external-pack-import.js";
import { ProtocolValidationError } from "../protocol-validation-error.js";
import { isObject } from "../workspace-daemon-request-helpers.js";

const MAX_PAYLOAD = 2_000_000;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const GIT_COMMIT = /^[a-f0-9]{40}$/u;
const SAFE_PIN = /^[A-Za-z0-9._-]{1,128}$/u;
const LICENSE = /^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$/u;
const SOURCE_KINDS: readonly ExternalQualityPackSourceKind[] = [
  "package",
  "git",
  "local",
  "organization-registry",
  "documentation-snapshot",
];

function boundedText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new ProtocolValidationError(
      -32602,
      `${field} must be a non-empty string of at most ${maximum} characters`,
    );
  }
  return value;
}

function validateLocator(
  kind: ExternalQualityPackSourceKind,
  locator: string,
): void {
  if (
    kind === "package" &&
    !/^npm:(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/u.test(locator)
  ) {
    throw new ProtocolValidationError(
      -32602,
      "external package locator must be an npm package identifier",
    );
  }
  if (kind === "git" && !/^https:\/\/[^\s]+(?:\.git)?$/u.test(locator)) {
    throw new ProtocolValidationError(
      -32602,
      "external Git locator must be an HTTPS URL",
    );
  }
  if (
    kind === "local" &&
    (!locator.startsWith("./") || locator.includes(".."))
  ) {
    throw new ProtocolValidationError(
      -32602,
      "external local locator must be a repository-relative path",
    );
  }
  if (
    ["organization-registry", "documentation-snapshot"].includes(kind) &&
    !/^(?:https:\/\/|docs\/)[^\s]+$/u.test(locator)
  ) {
    throw new ProtocolValidationError(
      -32602,
      "external registry and documentation locators must be HTTPS or repository-relative",
    );
  }
}

function validatePin(kind: ExternalQualityPackSourceKind, pin: string): void {
  if (kind === "git" && !GIT_COMMIT.test(pin)) {
    throw new ProtocolValidationError(
      -32602,
      "external Git source pin must be a full commit SHA",
    );
  }
  if (
    ["package", "organization-registry"].includes(kind) &&
    !SEMVER.test(pin)
  ) {
    throw new ProtocolValidationError(
      -32602,
      "external package source pin must be an exact semantic version",
    );
  }
  if (kind === "documentation-snapshot" && !pin.startsWith("snapshot-")) {
    throw new ProtocolValidationError(
      -32602,
      "documentation source pin must identify an exact snapshot",
    );
  }
  if (kind === "local" && !SAFE_PIN.test(pin)) {
    throw new ProtocolValidationError(
      -32602,
      "external local source pin is invalid",
    );
  }
}

export function parseExternalQualityPackSource(
  value: unknown,
): ExternalQualityPackSource {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      "external pack source must be an object",
    );
  }
  const kind = value.kind as ExternalQualityPackSourceKind;
  if (!SOURCE_KINDS.includes(kind)) {
    throw new ProtocolValidationError(
      -32602,
      "external pack source kind is invalid",
    );
  }
  const locator = boundedText(value.locator, "external source locator", 2_000);
  const pin = boundedText(value.pin, "external source pin", 128);
  const digest = boundedText(value.digest, "external source digest", 71);
  validateLocator(kind, locator);
  validatePin(kind, pin);
  if (!DIGEST.test(digest)) {
    throw new ProtocolValidationError(
      -32602,
      "external source digest must be sha256:<64 lowercase hex characters>",
    );
  }
  return { kind, locator, pin, digest };
}

export function parseExternalSpecializedPackPreviewFields(
  params: Record<string, unknown>,
): {
  readonly payload: string;
  readonly source: ExternalQualityPackSource;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
} {
  rejectUnknownFields(params, [
    "protocolVersion",
    "root",
    "payload",
    "source",
    "declaredPublisher",
    "declaredLicense",
  ]);
  const payload = boundedText(
    params.payload,
    "external pack payload",
    MAX_PAYLOAD,
  );
  if (!payload.trim().startsWith("{")) {
    throw new ProtocolValidationError(
      -32602,
      "external pack payload must be a JSON object",
    );
  }
  const declaredPublisher = boundedText(
    params.declaredPublisher,
    "external pack publisher",
    128,
  );
  const declaredLicense = boundedText(
    params.declaredLicense,
    "external pack license",
    64,
  );
  if (!LICENSE.test(declaredLicense)) {
    throw new ProtocolValidationError(
      -32602,
      "external pack license must be an SPDX-like identifier",
    );
  }
  return {
    payload,
    source: parseExternalQualityPackSource(params.source),
    declaredPublisher,
    declaredLicense,
  };
}

export function parseExternalSpecializedPackActivateFields(
  params: Record<string, unknown>,
): {
  readonly payload: string;
  readonly source: ExternalQualityPackSource;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
  readonly approval: ExternalQualityPackActivationApproval;
} {
  rejectUnknownFields(params, [
    "protocolVersion",
    "root",
    "payload",
    "source",
    "declaredPublisher",
    "declaredLicense",
    "approval",
  ]);
  const approval = parseExternalQualityPackActivationApproval(params.approval);
  const preview = parseExternalSpecializedPackPreviewFields({
    protocolVersion: params.protocolVersion,
    root: params.root,
    payload: params.payload,
    source: params.source,
    declaredPublisher: params.declaredPublisher,
    declaredLicense: params.declaredLicense,
  });
  return { ...preview, approval };
}

export function parseExternalQualityPackActivationApproval(
  value: unknown,
): ExternalQualityPackActivationApproval {
  if (!isObject(value)) {
    throw new ProtocolValidationError(
      -32602,
      "external pack activation approval must be an object",
    );
  }
  rejectUnknownFields(value, [
    "schemaVersion",
    "decision",
    "reviewerId",
    "source",
  ]);
  if (value.schemaVersion !== QUALITY_PACK_ACTIVATION_SCHEMA_URN) {
    throw new ProtocolValidationError(
      -32602,
      `external pack activation schema must equal ${QUALITY_PACK_ACTIVATION_SCHEMA_URN}`,
    );
  }
  if (value.decision !== "approve") {
    throw new ProtocolValidationError(
      -32602,
      "external pack activation decision must be approve",
    );
  }
  const reviewerId = boundedText(
    value.reviewerId,
    "external pack reviewerId",
    128,
  );
  return {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve",
    reviewerId,
    source: parseExternalQualityPackSource(value.source),
  };
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new ProtocolValidationError(-32602, `unknown field ${key}`);
    }
  }
}
