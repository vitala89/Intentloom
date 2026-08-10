import type {
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
} from "./common.js";

export {
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN,
} from "./common.js";

export type QualitySpecializedPackTrustLevel =
  | "verified-first-party"
  | "reviewed-organization"
  | "untrusted-external"
  | "quarantined";

export interface QualitySpecializedPackManifest {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_SCHEMA_URN;
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly publisher: string;
  readonly targetDisciplineIds: readonly string[];
  readonly providedArchitectureStrategies: readonly string[];
  readonly providedRuleIds: readonly string[];
  readonly requiredTooling: readonly string[];
  readonly permissionsRequired: readonly string[];
  readonly conflicts: readonly string[];
  readonly dependencies: readonly string[];
}

export interface QualitySpecializedPackTrustState {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_TRUST_STATE_SCHEMA_URN;
  readonly packId: string;
  readonly trustLevel: QualitySpecializedPackTrustLevel;
  readonly verifiedAt: string;
  readonly verifiedBy?: string;
  readonly revocationReason?: string;
}
