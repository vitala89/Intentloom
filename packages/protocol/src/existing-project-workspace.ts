export const EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN =
  "urn:intentloom:schema:existing-project-workspace-overview:1" as const;

export const EXISTING_PROJECT_SCAN_SCOPE_SCHEMA_URN =
  "urn:intentloom:schema:existing-project-scan-scope:1" as const;

export type ExistingProjectScanScope = "quick" | "standard" | "deep";

export type ExistingProjectFlowStepStatus =
  "complete" | "partial" | "skipped" | "unavailable";

export type ExistingProjectCapabilityState =
  | "available-now"
  | "available-read-only"
  | "integration-pending"
  | "unavailable"
  | "not-evaluated";

export interface ExistingProjectFlowStep {
  readonly id: string;
  readonly label: string;
  readonly status: ExistingProjectFlowStepStatus;
  readonly readOnly: true;
}

export interface ExistingProjectInspectSummary {
  readonly profile: string;
  readonly readiness: string;
  readonly detectedAdapters: readonly string[];
  readonly findingCount: number;
  readonly manualConfirmationRequired: boolean;
}

export interface ExistingProjectAdoptionSummary {
  readonly readiness: string;
  readonly operationCount: number;
  readonly findingCount: number;
  readonly automaticApplyAllowed: boolean;
}

export interface ExistingProjectSpecializedPackSummary {
  readonly scannedPathCount: number;
  readonly candidateCount: number;
  readonly compatiblePackIds: readonly string[];
  readonly requiresConfirmation: boolean;
}

export interface ExistingProjectDoctorSummary {
  readonly findingCount: number;
  readonly errorCount: number;
  readonly exitCode: number;
}

export interface ExistingProjectAssessmentSummary {
  readonly assessmentId: string;
  readonly status: string;
  readonly findingsCount: number;
  readonly recommendationsCount: number;
  readonly targetOptionId?: string;
}

export interface ExistingProjectCapabilityAvailability {
  readonly inspect: ExistingProjectCapabilityState;
  readonly adoption: ExistingProjectCapabilityState;
  readonly specializedPacks: ExistingProjectCapabilityState;
  readonly assessment: ExistingProjectCapabilityState;
  readonly remediation: ExistingProjectCapabilityState;
  readonly doctor: ExistingProjectCapabilityState;
  readonly graph: ExistingProjectCapabilityState;
  readonly quality: ExistingProjectCapabilityState;
}

export interface ExistingProjectWorkspaceOverview {
  readonly schemaVersion: typeof EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN;
  readonly root: string;
  readonly projectId: string;
  readonly scope: ExistingProjectScanScope;
  readonly preparedAt: number;
  readonly readOnly: true;
  readonly inspect: ExistingProjectInspectSummary;
  readonly adoption?: ExistingProjectAdoptionSummary;
  readonly specializedPacks: ExistingProjectSpecializedPackSummary;
  readonly doctor?: ExistingProjectDoctorSummary;
  readonly assessment?: ExistingProjectAssessmentSummary;
  readonly capabilities: ExistingProjectCapabilityAvailability;
  readonly flowSteps: readonly ExistingProjectFlowStep[];
}
