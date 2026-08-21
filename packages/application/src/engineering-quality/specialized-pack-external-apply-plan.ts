import type {
  ExtensionAdoptionPlan,
  ExtensionLockEntry,
  ExtensionLockfile,
  ExternalQualityPackActivationApproval,
} from "@intentloom/protocol";
import { validateExternalQualityPackActivationApproval } from "@intentloom/validator";
import { extensionLockEntryFingerprint } from "../extension-update-files.js";
import {
  computeExternalSpecializedPackDigest,
  prepareExternalSpecializedPackLockEntry,
  validateExternalSpecializedPackLockEntry,
  type ExternalSpecializedPackActivation,
} from "./specialized-pack-external-lock.js";

export type ExternalSpecializedPackActivationPlanStatus =
  "ready" | "already-applied" | "conflict" | "denied";

export interface PrepareExternalSpecializedPackActivationPlanInput {
  readonly activation: ExternalSpecializedPackActivation;
  readonly approval: ExternalQualityPackActivationApproval;
  readonly declaredLicense: string;
  readonly currentLockfile?: ExtensionLockfile | undefined;
}

export interface ExternalSpecializedPackActivationPlan {
  readonly status: ExternalSpecializedPackActivationPlanStatus;
  readonly lockEntry: ExtensionLockEntry;
  readonly adoptionPlan: ExtensionAdoptionPlan;
  readonly diagnostics: readonly string[];
}

const EMPTY_CAPABILITY_DELTA = {
  filesystemReadAdded: [] as string[],
  filesystemWriteAdded: [] as string[],
  processExecAdded: [] as string[],
  networkConnectAdded: [] as string[],
  hasExpansions: false,
};

const COMPATIBLE_REPORT = {
  isCompatible: true,
  nodeCompatible: true,
  osCompatible: true,
  archCompatible: true,
  coreApiCompatible: true,
  diagnostics: [] as string[],
};

function adoptionPlanFromLockEntry(
  entry: ExtensionLockEntry,
): ExtensionAdoptionPlan {
  return {
    status: "ready",
    targetExtensionId: entry.extensionId,
    requestedVersion: entry.requestedVersion,
    resolvedVersion: entry.resolvedVersion,
    integrity: entry.integrity,
    capabilityDelta: EMPTY_CAPABILITY_DELTA,
    compatibility: COMPATIBLE_REPORT,
    licenseAudit: {
      spdxId: entry.license?.spdxId ?? "UNKNOWN",
      noticeRequired: false,
      isPermissive: true,
      hasRestrictiveTerms: false,
      publisherChanged: false,
      diagnostics: [],
    },
    proposedLockEntry: entry,
    requiresApproval: false,
    approvalReasons: [],
    diagnostics: [],
  };
}

function assertApprovalMatchesActivation(
  activation: ExternalSpecializedPackActivation,
  approval: ExternalQualityPackActivationApproval,
): ExternalQualityPackActivationApproval {
  const validated = validateExternalQualityPackActivationApproval(approval);
  if (validated.reviewerId !== activation.reviewerId) {
    throw new Error("activation approver does not match the approval");
  }
  if (validated.source.kind !== activation.source.kind) {
    throw new Error("activation source kind does not match the approval");
  }
  if (validated.source.locator !== activation.source.locator) {
    throw new Error("activation source locator does not match the approval");
  }
  if (validated.source.pin !== activation.source.pin) {
    throw new Error("activation source pin does not match the approval");
  }
  if (validated.source.digest !== activation.digest) {
    throw new Error("activation source digest does not match the approval");
  }
  return validated;
}

function revalidateActivation(
  activation: ExternalSpecializedPackActivation,
  approval: ExternalQualityPackActivationApproval,
  declaredLicense: string,
): ExtensionLockEntry {
  assertApprovalMatchesActivation(activation, approval);
  if (declaredLicense !== activation.declaredLicense) {
    throw new Error("activation license does not match the declared license");
  }
  if (activation.source.digest !== activation.digest) {
    throw new Error("activation source digest does not match the activation");
  }
  const recomputed = computeExternalSpecializedPackDigest(activation.manifest);
  if (recomputed !== activation.digest) {
    throw new Error("activation digest does not match the supplied manifest");
  }
  const entry = prepareExternalSpecializedPackLockEntry({
    activation,
    declaredLicense: activation.declaredLicense,
  });
  validateExternalSpecializedPackLockEntry(activation, entry, {
    declaredLicense: activation.declaredLicense,
  });
  return entry;
}

function conflictDiagnostic(
  existing: ExtensionLockEntry,
  proposed: ExtensionLockEntry,
): string {
  if (existing.resolvedVersion !== proposed.resolvedVersion) {
    return "specialized-pack-lock-update-required:version";
  }
  if (existing.integrity !== proposed.integrity) {
    return "specialized-pack-lock-update-required:digest";
  }
  if (existing.source?.resolved !== proposed.source?.resolved) {
    return "specialized-pack-lock-update-required:pin";
  }
  return "specialized-pack-lock-update-required";
}

export function prepareExternalSpecializedPackActivationPlan(
  input: PrepareExternalSpecializedPackActivationPlanInput,
): ExternalSpecializedPackActivationPlan {
  const lockEntry = revalidateActivation(
    input.activation,
    input.approval,
    input.declaredLicense,
  );
  const adoptionPlan = adoptionPlanFromLockEntry(lockEntry);
  const existing =
    input.currentLockfile?.extensions[input.activation.manifest.id];
  if (!existing) {
    return {
      status: "ready",
      lockEntry,
      adoptionPlan,
      diagnostics: [],
    };
  }
  if (
    extensionLockEntryFingerprint(existing) ===
    extensionLockEntryFingerprint(lockEntry)
  ) {
    return {
      status: "already-applied",
      lockEntry,
      adoptionPlan,
      diagnostics: ["specialized-pack-lock-already-applied"],
    };
  }
  return {
    status: "conflict",
    lockEntry,
    adoptionPlan,
    diagnostics: [conflictDiagnostic(existing, lockEntry)],
  };
}
