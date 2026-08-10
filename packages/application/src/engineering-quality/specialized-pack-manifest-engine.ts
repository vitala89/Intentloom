import {
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
  type QualitySpecializedPackManifest,
  type QualitySpecializedPackTrustLevel,
  type QualitySpecializedPackTrustState,
} from "@intentloom/protocol";
import {
  validateQualitySpecializedPackManifest,
  validateQualitySpecializedPackTrustState,
} from "@intentloom/validator";

export function registerSpecializedPackManifest(options: {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly publisher: string;
  readonly targetDisciplineIds?: readonly string[];
  readonly providedArchitectureStrategies?: readonly string[];
  readonly providedRuleIds?: readonly string[];
  readonly requiredTooling?: readonly string[];
  readonly permissionsRequired?: readonly string[];
  readonly conflicts?: readonly string[];
  readonly dependencies?: readonly string[];
}): QualitySpecializedPackManifest {
  return validateQualitySpecializedPackManifest({
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: options.id,
    version: options.version,
    name: options.name,
    publisher: options.publisher,
    targetDisciplineIds: options.targetDisciplineIds ?? [],
    providedArchitectureStrategies:
      options.providedArchitectureStrategies ?? [],
    providedRuleIds: options.providedRuleIds ?? [],
    requiredTooling: options.requiredTooling ?? [],
    permissionsRequired: options.permissionsRequired ?? [],
    conflicts: options.conflicts ?? [],
    dependencies: options.dependencies ?? [],
  });
}

export function evaluateSpecializedPackTrustState(options: {
  readonly packId: string;
  readonly trustLevel: QualitySpecializedPackTrustLevel;
  readonly verifiedAt?: string;
  readonly verifiedBy?: string;
  readonly revocationReason?: string;
}): QualitySpecializedPackTrustState {
  const verifiedAt = options.verifiedAt ?? new Date().toISOString();
  return validateQualitySpecializedPackTrustState({
    schemaVersion: QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
    packId: options.packId,
    trustLevel: options.trustLevel,
    verifiedAt,
    ...(options.verifiedBy !== undefined
      ? { verifiedBy: options.verifiedBy }
      : {}),
    ...(options.revocationReason !== undefined
      ? { revocationReason: options.revocationReason }
      : {}),
  });
}

export function evaluateSpecializedPackCompatibility(
  manifests: readonly QualitySpecializedPackManifest[],
  trustStates: readonly QualitySpecializedPackTrustState[],
): {
  readonly compatiblePacks: readonly QualitySpecializedPackManifest[];
  readonly rejectedPacks: readonly {
    readonly packId: string;
    readonly reason: string;
  }[];
} {
  const trustMap = new Map(trustStates.map((ts) => [ts.packId, ts]));
  const manifestMap = new Map(manifests.map((m) => [m.id, m]));

  const compatiblePacks: QualitySpecializedPackManifest[] = [];
  const rejectedPacks: { readonly packId: string; readonly reason: string }[] =
    [];

  for (const manifest of manifests) {
    const trust = trustMap.get(manifest.id);
    if (trust !== undefined && trust.trustLevel === "quarantined") {
      rejectedPacks.push({
        packId: manifest.id,
        reason: `Pack is quarantined: ${trust.revocationReason ?? "unspecified"}`,
      });
      continue;
    }

    let missingDep: string | null = null;
    for (const depId of manifest.dependencies) {
      if (!manifestMap.has(depId)) {
        missingDep = depId;
        break;
      }
    }
    if (missingDep !== null) {
      rejectedPacks.push({
        packId: manifest.id,
        reason: `Missing dependency: ${missingDep}`,
      });
      continue;
    }

    let conflictWith: string | null = null;
    for (const conflictId of manifest.conflicts) {
      if (manifestMap.has(conflictId)) {
        conflictWith = conflictId;
        break;
      }
    }
    if (conflictWith !== null) {
      rejectedPacks.push({
        packId: manifest.id,
        reason: `Conflicting pack detected: ${conflictWith}`,
      });
      continue;
    }

    compatiblePacks.push(manifest);
  }

  return { compatiblePacks, rejectedPacks };
}
