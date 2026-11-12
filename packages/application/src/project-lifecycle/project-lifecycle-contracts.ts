import type { AdapterName, Catalog } from "@intentloom/core";
import type {
  ArtifactValidationResult,
  ArtifactValidator,
} from "@intentloom/validator";
import type { Plan } from "../project-change.js";
import type { ProfileDetectionResult } from "../project-profile-detection.js";

export interface DoctorPlan extends Plan {
  readonly findings: readonly DoctorFinding[];
  readonly errors: readonly DoctorError[];
}

export type DoctorSeverity = "error" | "warning" | "info";
export type DoctorCategory =
  | "config"
  | "schema"
  | "ownership"
  | "generated-file"
  | "adapter"
  | "profile"
  | "documentation"
  | "migration"
  | "security"
  | "drift";

export interface DoctorFinding {
  readonly code: string;
  readonly severity: DoctorSeverity;
  readonly category: DoctorCategory;
  readonly path: string;
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
  readonly adapter: AdapterName | null;
  readonly profile: string | null;
}

export interface DoctorError extends DoctorFinding {
  readonly phase: "semantic";
  readonly artifactType: "generated-state";
  readonly schemaId: "urn:aif:semantic:generated-state:1";
  readonly schemaVersion: "1";
  readonly documentPath: string;
  readonly affectedPath: string;
  readonly fieldPath: "/";
}

export function doctorExitCode(report: DoctorPlan): 0 | 3 {
  return report.findings.some((finding) => finding.severity === "error")
    ? 3
    : 0;
}

export interface ProjectMapping {
  readonly source: string;
  readonly destination: string;
}

export interface InitOptions {
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly dryRun?: boolean;
  readonly catalog?: Catalog;
  readonly catalogRoot?: string;
  readonly canonicalSourceHashes?: Readonly<Record<string, string>>;
  readonly validator?: ArtifactValidator;
  readonly existingValidationResults?: readonly ArtifactValidationResult[];
  readonly profileConfirmed?: boolean;
  readonly projectOwnedMappings?: readonly ProjectMapping[];
  readonly documentationMappings?: readonly ProjectMapping[];
}

export interface SyncOptions extends InitOptions {
  readonly force?: boolean;
}

export interface SyncDryRunResult extends Plan {
  readonly dryRun: true;
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
  readonly conflictFiles: readonly string[];
}

export type ProjectInspectionCapability = "project.files.read";
export type InspectionReadiness =
  "not-initialized" | "partial-metadata" | "ready";
export type InspectionFindingSeverity = "warning" | "error" | "info";

export interface ProjectInspectionFinding {
  readonly code:
    | "inspection-root-symlink"
    | "intentloom-not-initialized"
    | "intentloom-metadata-partial"
    | "inspection-ready";
  readonly severity: InspectionFindingSeverity;
  readonly path: "." | ".aif/";
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
}

export interface ProjectInspection {
  readonly operationVersion: 1;
  readonly capabilities: readonly [ProjectInspectionCapability];
  readonly readOnly: true;
  readonly profileDetection: Omit<ProfileDetectionResult, "scannedPaths">;
  readonly supportedAdapters: readonly AdapterName[];
  readonly detectedAdapters: readonly AdapterName[];
  readonly instructionPaths: readonly string[];
  readonly intentloomMetadata: readonly {
    readonly path:
      ".aif/config.yaml" | ".aif/manifest.lock.json" | ".aif/source-map.json";
    readonly present: boolean;
  }[];
  readonly readiness: InspectionReadiness;
  readonly exclusions: readonly string[];
  readonly findings: readonly ProjectInspectionFinding[];
}

export const configPath = ".aif/config.yaml";
