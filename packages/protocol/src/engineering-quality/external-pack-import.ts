import type { EngineeringQualityPack } from "./packs.js";

export const QUALITY_PACK_IMPORT_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-pack-import:1" as const;

export const QUALITY_PACK_ACTIVATION_SCHEMA_URN =
  "urn:intentloom:schema:engineering-quality-pack-activation:1" as const;

export type ExternalQualityPackSourceKind =
  | "package"
  | "git"
  | "local"
  | "organization-registry"
  | "documentation-snapshot";

export interface ExternalQualityPackSource {
  readonly kind: ExternalQualityPackSourceKind;
  readonly locator: string;
  readonly pin: string;
  readonly digest: string;
}

export interface ExternalQualityPackImportRequest {
  readonly schemaVersion: typeof QUALITY_PACK_IMPORT_SCHEMA_URN;
  readonly payload: string;
  readonly source: ExternalQualityPackSource;
  readonly declaredPublisher: string;
  readonly declaredLicense: string;
}

export interface ExternalQualityPackImportResult {
  readonly schemaVersion: typeof QUALITY_PACK_IMPORT_SCHEMA_URN;
  readonly status: "imported";
  readonly reviewStatus: "pending";
  readonly pinStatus: "verified";
  readonly source: ExternalQualityPackSource;
  readonly digest: string;
  readonly pack: EngineeringQualityPack;
}

export interface ExternalQualityPackActivationApproval {
  readonly schemaVersion: typeof QUALITY_PACK_ACTIVATION_SCHEMA_URN;
  readonly decision: "approve";
  readonly reviewerId: string;
  readonly source: ExternalQualityPackSource;
}

export interface ExternalQualityPackActivation {
  readonly schemaVersion: typeof QUALITY_PACK_ACTIVATION_SCHEMA_URN;
  readonly status: "activated";
  readonly reviewerId: string;
  readonly source: ExternalQualityPackSource;
  readonly digest: string;
  readonly pack: EngineeringQualityPack;
}
