import type {
  QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
  QualityDetectionConfidence,
  QualityDetectionPathMatchKind,
  QualityDetectionSecurityImpact,
} from "./common.js";

export {
  QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN,
} from "./common.js";

export type {
  QualityDetectionConfidence,
  QualityDetectionPathMatchKind,
  QualityDetectionSecurityImpact,
} from "./common.js";

export interface QualitySpecializedPackDetectionSignal {
  readonly pathPattern: string;
  readonly matchKind: QualityDetectionPathMatchKind;
  readonly label?: string;
}

export interface QualitySpecializedPackDetectionRule {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_DETECTION_RULE_SCHEMA_URN;
  readonly packId: string;
  readonly signals: readonly QualitySpecializedPackDetectionSignal[];
  readonly minimumSignalMatches?: number;
  readonly securityImpact?: QualityDetectionSecurityImpact;
}

export interface QualitySpecializedPackDetectionCandidate {
  readonly packId: string;
  readonly evidencePaths: readonly string[];
  readonly matchedSignalLabels: readonly string[];
  readonly confidence: QualityDetectionConfidence;
  readonly ambiguity: boolean;
  readonly securityImpact: QualityDetectionSecurityImpact;
  readonly requiresConfirmation: true;
}

export interface QualitySpecializedPackDetectionResult {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_DETECTION_RESULT_SCHEMA_URN;
  readonly scannedPathCount: number;
  readonly excludedPathCount: number;
  readonly scanLimitReached: boolean;
  readonly candidates: readonly QualitySpecializedPackDetectionCandidate[];
}

export interface QualitySpecializedPackDetectionResolution {
  readonly schemaVersion: typeof QUALITY_SPECIALIZED_PACK_DETECTION_RESOLUTION_SCHEMA_URN;
  readonly detection: QualitySpecializedPackDetectionResult;
  readonly compatiblePackIds: readonly string[];
  readonly rejectedPacks: readonly {
    readonly packId: string;
    readonly reason: string;
  }[];
}
