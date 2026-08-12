import type { ScaffoldPlan, ScaffoldResult } from "./inception.js";

export const FOUNDATION_SCAFFOLD_PLAN_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-plan:1" as const;

export const FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-prepare:1" as const;

export const FOUNDATION_SCAFFOLD_GET_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-get:1" as const;

export const FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-compare:1" as const;

export const FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-validate:1" as const;

export const FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-apply:1" as const;

export const FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN =
  "urn:intentloom:schema:foundation-scaffold-rollback:1" as const;
export interface FoundationScaffoldTemplateVersion {
  readonly id: string;
  readonly version: string;
}

export interface FoundationScaffoldPlanRecord {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_PLAN_SCHEMA_URN;
  readonly workshopId: string;
  readonly plan: ScaffoldPlan;
  readonly planDigest: string;
  readonly expiresAt: number;
  readonly verificationChecks: readonly string[];
  readonly requiredCapabilities: readonly string[];
  readonly templateVersions: readonly FoundationScaffoldTemplateVersion[];
  readonly dryRun: string;
}

export interface FoundationScaffoldPrepareResult {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_PREPARE_SCHEMA_URN;
  readonly workshopId: string;
  readonly record: FoundationScaffoldPlanRecord;
  readonly workshopUnchanged: true;
}

export interface FoundationScaffoldGetResult {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_GET_SCHEMA_URN;
  readonly workshopId: string;
  readonly record: FoundationScaffoldPlanRecord;
}

export interface FoundationScaffoldCompareResult {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_COMPARE_SCHEMA_URN;
  readonly workshopId: string;
  readonly planId: string;
  readonly created: readonly string[];
  readonly skipped: readonly string[];
  readonly collisions: readonly string[];
}

export interface FoundationScaffoldValidateResult {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_VALIDATE_SCHEMA_URN;
  readonly workshopId: string;
  readonly planId: string;
  readonly valid: true;
  readonly planDigest: string;
  readonly approvalRequired: true;
  readonly expiresAt: number;
}

export interface FoundationScaffoldApplyResult {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_APPLY_SCHEMA_URN;
  readonly workshopId: string;
  readonly planId: string;
  readonly result: ScaffoldResult;
  readonly revalidatedAt: number;
}

export interface FoundationScaffoldRollbackResult {
  readonly schemaVersion: typeof FOUNDATION_SCAFFOLD_ROLLBACK_SCHEMA_URN;
  readonly workshopId: string;
  readonly planId: string;
  readonly result: ScaffoldResult;
  readonly rolledBackAt: number;
}
