import type {
  ExternalQualityPackActivationApproval,
  ExternalQualityPackImportRequest,
  ExternalQualityPackSource,
  ExternalQualityPackSourceKind,
} from "@intentloom/protocol";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_PACK_IMPORT_SCHEMA_URN,
} from "@intentloom/protocol";
import { isObject } from "./common.js";

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

function text(value: unknown, field: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum) {
    throw new Error(
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
    throw new Error(
      "external package locator must be an npm package identifier",
    );
  }
  if (kind === "git" && !/^https:\/\/[^\s]+(?:\.git)?$/u.test(locator)) {
    throw new Error("external Git locator must be an HTTPS URL");
  }
  if (
    kind === "local" &&
    (!locator.startsWith("./") || locator.includes(".."))
  ) {
    throw new Error(
      "external local locator must be a repository-relative path",
    );
  }
  if (
    ["organization-registry", "documentation-snapshot"].includes(kind) &&
    !/^(?:https:\/\/|docs\/)[^\s]+$/u.test(locator)
  ) {
    throw new Error(
      "external registry and documentation locators must be HTTPS or repository-relative",
    );
  }
}

function validatePin(kind: ExternalQualityPackSourceKind, pin: string): void {
  if (kind === "git" && !GIT_COMMIT.test(pin)) {
    throw new Error("external Git source pin must be a full commit SHA");
  }
  if (
    ["package", "organization-registry"].includes(kind) &&
    !SEMVER.test(pin)
  ) {
    throw new Error(
      "external package source pin must be an exact semantic version",
    );
  }
  if (kind === "documentation-snapshot" && !pin.startsWith("snapshot-")) {
    throw new Error("documentation source pin must identify an exact snapshot");
  }
  if (kind === "local" && !SAFE_PIN.test(pin)) {
    throw new Error("external local source pin is invalid");
  }
}

export function validateExternalQualityPackSource(
  value: unknown,
): ExternalQualityPackSource {
  if (!isObject(value))
    throw new Error("external pack source must be an object");
  const kind = value.kind as ExternalQualityPackSourceKind;
  if (!SOURCE_KINDS.includes(kind))
    throw new Error("external pack source kind is invalid");
  const locator = text(value.locator, "external source locator", 2_000);
  const pin = text(value.pin, "external source pin", 128);
  const digest = text(value.digest, "external source digest", 71);
  validateLocator(kind, locator);
  validatePin(kind, pin);
  if (!DIGEST.test(digest))
    throw new Error(
      "external source digest must be sha256:<64 lowercase hex characters>",
    );
  return { kind, locator, pin, digest };
}

export function validateExternalQualityPackImportRequest(
  value: unknown,
): ExternalQualityPackImportRequest {
  if (!isObject(value))
    throw new Error("external pack import request must be an object");
  if (value.schemaVersion !== QUALITY_PACK_IMPORT_SCHEMA_URN) {
    throw new Error(
      `external pack import schema must equal ${QUALITY_PACK_IMPORT_SCHEMA_URN}`,
    );
  }
  const payload = text(value.payload, "external pack payload", MAX_PAYLOAD);
  if (!payload.trim().startsWith("{"))
    throw new Error("external pack payload must be a JSON object");
  const declaredPublisher = text(
    value.declaredPublisher,
    "external pack publisher",
    128,
  );
  const declaredLicense = text(
    value.declaredLicense,
    "external pack license",
    64,
  );
  if (!LICENSE.test(declaredLicense))
    throw new Error("external pack license must be an SPDX-like identifier");
  return {
    schemaVersion: QUALITY_PACK_IMPORT_SCHEMA_URN,
    payload,
    source: validateExternalQualityPackSource(value.source),
    declaredPublisher,
    declaredLicense,
  };
}

export function validateExternalQualityPackActivationApproval(
  value: unknown,
): ExternalQualityPackActivationApproval {
  if (!isObject(value))
    throw new Error("external pack activation approval must be an object");
  if (value.schemaVersion !== QUALITY_PACK_ACTIVATION_SCHEMA_URN) {
    throw new Error(
      `external pack activation schema must equal ${QUALITY_PACK_ACTIVATION_SCHEMA_URN}`,
    );
  }
  if (value.decision !== "approve")
    throw new Error("external pack activation decision must be approve");
  const reviewerId = text(value.reviewerId, "external pack reviewerId", 128);
  return {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve",
    reviewerId,
    source: validateExternalQualityPackSource(value.source),
  };
}
