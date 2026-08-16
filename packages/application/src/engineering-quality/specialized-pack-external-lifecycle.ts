import { createHash } from "node:crypto";
import type {
  ExtensionAdoptionPlan,
  ExtensionManifest,
  ExternalQualityPackSource,
  QualitySpecializedPackManifest,
  QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import {
  resolveExtensionAdoptionProposal,
  validateExternalQualityPackActivationApproval,
  validateExternalQualityPackSource,
  validateQualitySpecializedPackManifest,
} from "@intentloom/validator";
import {
  evaluateSpecializedPackCompatibility,
  evaluateSpecializedPackTrustState,
} from "./specialized-pack-manifest-engine.js";

const FORBIDDEN_PERMISSION_MARKERS = [
  "network",
  "process",
  "exec",
  "write",
  "secret",
  "deploy",
  "shell",
  "connect",
] as const;

export interface PreviewExternalSpecializedPackInput {
  readonly payload: string;
  readonly source: unknown;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
  readonly existingManifests?: readonly QualitySpecializedPackManifest[];
  readonly existingTrustStates?: readonly QualitySpecializedPackTrustState[];
}

export interface ExternalSpecializedPackPreview {
  readonly status: "ready-for-review" | "rejected";
  readonly source: ExternalQualityPackSource;
  readonly digest: string;
  readonly manifest: QualitySpecializedPackManifest;
  readonly trustState: QualitySpecializedPackTrustState;
  readonly extensionPlan: ExtensionAdoptionPlan;
  readonly compatible: boolean;
  readonly diagnostics: readonly string[];
}

export interface ExternalSpecializedPackActivation {
  readonly status: "activated";
  readonly reviewerId: string;
  readonly source: ExternalQualityPackSource;
  readonly digest: string;
  readonly manifest: QualitySpecializedPackManifest;
  readonly trustState: QualitySpecializedPackTrustState;
}

export function computeExternalSpecializedPackDigest(
  manifest: QualitySpecializedPackManifest,
): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex")}`;
}

export function previewExternalSpecializedPack(
  input: PreviewExternalSpecializedPackInput,
): ExternalSpecializedPackPreview {
  const source = validateExternalQualityPackSource(input.source);
  const manifest = parseManifest(input.payload);
  if (manifest.publisher !== input.declaredPublisher) {
    throw new Error(
      "specialized pack publisher does not match the declaration",
    );
  }
  const digest = computeExternalSpecializedPackDigest(manifest);
  if (digest !== source.digest) {
    throw new Error("specialized pack digest does not match the pinned source");
  }
  const diagnostics = collectDiagnostics(
    manifest,
    input.existingManifests ?? [],
  );
  const trustState = evaluateSpecializedPackTrustState({
    packId: manifest.id,
    trustLevel: "untrusted-external",
    verifiedAt: "2026-08-16T00:00:00.000Z",
  });
  const compatibility = evaluateSpecializedPackCompatibility(
    [...(input.existingManifests ?? []), manifest],
    [...(input.existingTrustStates ?? []), trustState],
  );
  const extensionPlan = resolveExtensionAdoptionProposal(
    toExtensionManifest(manifest, source, input.declaredLicense, digest),
  );
  const status =
    diagnostics.length > 0 || extensionPlan.status === "rejected"
      ? "rejected"
      : "ready-for-review";
  return {
    status,
    source,
    digest,
    manifest,
    trustState,
    extensionPlan,
    compatible: compatibility.compatiblePacks.some(
      (item) => item.id === manifest.id,
    ),
    diagnostics,
  };
}

export function activateExternalSpecializedPack(
  preview: ExternalSpecializedPackPreview,
  approval: unknown,
): ExternalSpecializedPackActivation {
  if (preview.status !== "ready-for-review") {
    throw new Error(
      "only a ready-for-review specialized pack can be activated",
    );
  }
  const decision = validateExternalQualityPackActivationApproval(approval);
  if (
    decision.source.kind !== preview.source.kind ||
    decision.source.locator !== preview.source.locator ||
    decision.source.pin !== preview.source.pin ||
    decision.source.digest !== preview.digest
  ) {
    throw new Error("activation approval does not match the previewed pack");
  }
  return {
    status: "activated",
    reviewerId: decision.reviewerId,
    source: preview.source,
    digest: preview.digest,
    manifest: preview.manifest,
    trustState: evaluateSpecializedPackTrustState({
      packId: preview.manifest.id,
      trustLevel: "reviewed-organization",
      verifiedAt: "2026-08-16T00:00:00.000Z",
      verifiedBy: decision.reviewerId,
    }),
  };
}

function parseManifest(payload: string): QualitySpecializedPackManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload) as unknown;
  } catch {
    throw new Error("specialized pack payload must contain valid JSON");
  }
  return validateQualitySpecializedPackManifest(parsed);
}

function collectDiagnostics(
  manifest: QualitySpecializedPackManifest,
  existing: readonly QualitySpecializedPackManifest[],
): string[] {
  const diagnostics: string[] = [];
  if (existing.some((item) => item.id === manifest.id)) {
    diagnostics.push("external pack must not replace a first-party pack id");
  }
  for (const permission of manifest.permissionsRequired) {
    const normalized = permission.toLowerCase();
    if (
      FORBIDDEN_PERMISSION_MARKERS.some((marker) => normalized.includes(marker))
    ) {
      diagnostics.push(
        `external pack permission ${permission} would expand a safety capability`,
      );
    }
  }
  return diagnostics;
}

function toExtensionManifest(
  manifest: QualitySpecializedPackManifest,
  source: ExternalQualityPackSource,
  license: string,
  digest: string,
): ExtensionManifest {
  return {
    extensionId: manifest.id,
    name: manifest.name,
    category: "policy-pack",
    version: manifest.version,
    publisher: { name: manifest.publisher },
    source: {
      registry: source.kind,
      package: source.locator,
      resolved: digest,
    },
    compatibility: { intentloomCore: "1.0.2" },
    license: { spdxId: license },
    capabilities: {},
    entrypoint: { type: "specialized-pack" },
    installationType: "referenced",
  };
}
