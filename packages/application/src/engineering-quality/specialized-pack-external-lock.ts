import { createHash } from "node:crypto";
import type {
  ExtensionLockEntry,
  ExternalQualityPackSource,
  QualitySpecializedPackManifest,
  QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import { QUALITY_SPECIALIZED_PACK_SCHEMA_URN } from "@intentloom/protocol";
import { validateQualitySpecializedPackManifest } from "@intentloom/validator";
import { canonicalJson } from "../canonical-json.js";

export interface ExternalSpecializedPackActivation {
  readonly status: "activated";
  readonly reviewerId: string;
  readonly declaredLicense: string;
  readonly source: ExternalQualityPackSource;
  readonly digest: string;
  readonly manifest: QualitySpecializedPackManifest;
  readonly trustState: QualitySpecializedPackTrustState;
}

function lexicalSort(values: readonly string[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    let index = 0;
    while (index < result.length && result[index]!.localeCompare(value) <= 0) {
      index += 1;
    }
    result.splice(index, 0, value);
  }
  return result;
}

export function normalizeSpecializedPackManifest(
  manifest: QualitySpecializedPackManifest,
): QualitySpecializedPackManifest {
  return {
    ...manifest,
    targetDisciplineIds: lexicalSort(manifest.targetDisciplineIds),
    providedArchitectureStrategies: lexicalSort(
      manifest.providedArchitectureStrategies,
    ),
    providedRuleIds: lexicalSort(manifest.providedRuleIds),
    requiredTooling: lexicalSort(manifest.requiredTooling),
    permissionsRequired: lexicalSort(manifest.permissionsRequired),
    conflicts: lexicalSort(manifest.conflicts),
    dependencies: lexicalSort(manifest.dependencies),
  };
}

export function computeExternalSpecializedPackDigest(
  manifest: QualitySpecializedPackManifest,
): string {
  const normalized = normalizeSpecializedPackManifest(
    validateQualitySpecializedPackManifest(manifest),
  );
  return `sha256:${createHash("sha256")
    .update(canonicalJson(normalized))
    .digest("hex")}`;
}

export interface PrepareExternalSpecializedPackLockEntryInput {
  readonly activation: ExternalSpecializedPackActivation;
  readonly declaredLicense: string;
}

function assertActivatedReviewedPack(
  activation: ExternalSpecializedPackActivation,
): void {
  if (activation.status !== "activated") {
    throw new Error(
      "only an activated specialized pack can prepare a lock entry",
    );
  }
  if (activation.trustState.trustLevel !== "reviewed-organization") {
    throw new Error(
      "lock entry preparation requires reviewed-organization trust",
    );
  }
  if (activation.trustState.packId !== activation.manifest.id) {
    throw new Error("activation trust state does not match the manifest id");
  }
  if (activation.trustState.verifiedBy !== activation.reviewerId) {
    throw new Error("activation reviewer does not match trust verification");
  }
  const expectedDigest = computeExternalSpecializedPackDigest(
    activation.manifest,
  );
  if (expectedDigest !== activation.digest) {
    throw new Error("activation digest does not match the manifest");
  }
}

function mapSourceToLockSource(
  source: ExternalQualityPackSource,
): NonNullable<ExtensionLockEntry["source"]> {
  return {
    registry: source.kind,
    package: source.locator,
    resolved: source.pin,
  };
}

export function prepareExternalSpecializedPackLockEntry(
  input: PrepareExternalSpecializedPackLockEntryInput,
): ExtensionLockEntry {
  assertActivatedReviewedPack(input.activation);
  const { manifest, source, digest, reviewerId, trustState } = input.activation;

  return {
    extensionId: manifest.id,
    category: "policy-pack",
    requestedVersion: manifest.version,
    resolvedVersion: manifest.version,
    source: mapSourceToLockSource(source),
    publisher: { name: manifest.publisher },
    integrity: digest,
    manifestSchemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    grantedCapabilities: {},
    license: { spdxId: input.declaredLicense },
    approvedAt: trustState.verifiedAt,
    approvedBy: reviewerId,
    installationType: "referenced",
  };
}

function assertSourceMatches(
  activationSource: ExternalQualityPackSource,
  entrySource: ExtensionLockEntry["source"],
): void {
  const expected = mapSourceToLockSource(activationSource);
  if (entrySource?.registry !== expected.registry) {
    throw new Error("lock entry source kind does not match the activation");
  }
  if (entrySource?.package !== expected.package) {
    throw new Error("lock entry source locator does not match the activation");
  }
  if (entrySource?.resolved !== expected.resolved) {
    throw new Error("lock entry source pin does not match the activation");
  }
}

export function validateExternalSpecializedPackLockEntry(
  activation: ExternalSpecializedPackActivation,
  entry: ExtensionLockEntry,
  options: { readonly declaredLicense: string },
): void {
  assertActivatedReviewedPack(activation);
  const expected = prepareExternalSpecializedPackLockEntry({
    activation,
    declaredLicense: options.declaredLicense,
  });

  if (entry.extensionId !== expected.extensionId) {
    throw new Error("lock entry pack id does not match the activation");
  }
  if (entry.integrity !== expected.integrity) {
    throw new Error("lock entry digest does not match the activation");
  }
  assertSourceMatches(activation.source, entry.source);
  if (entry.category !== "policy-pack") {
    throw new Error("lock entry category must be policy-pack");
  }
  if (entry.installationType !== "referenced") {
    throw new Error("lock entry installation type must be referenced");
  }
  if (entry.resolvedVersion !== activation.manifest.version) {
    throw new Error("lock entry version does not match the activation");
  }
  if (entry.publisher?.name !== activation.manifest.publisher) {
    throw new Error("lock entry publisher does not match the activation");
  }
  if (entry.license?.spdxId !== options.declaredLicense) {
    throw new Error("lock entry license does not match the activation");
  }
  if (entry.approvedBy !== activation.reviewerId) {
    throw new Error("lock entry approver does not match the activation");
  }
  if (entry.manifestSchemaVersion !== QUALITY_SPECIALIZED_PACK_SCHEMA_URN) {
    throw new Error(
      "lock entry manifest schema must identify a specialized pack",
    );
  }
}
