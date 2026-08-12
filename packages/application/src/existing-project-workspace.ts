import { resolve } from "node:path";
import type {
  ExistingProjectAdoptionSummary,
  ExistingProjectAssessmentSummary,
  ExistingProjectCapabilityAvailability,
  ExistingProjectDoctorSummary,
  ExistingProjectFlowStep,
  ExistingProjectInspectSummary,
  ExistingProjectScanScope,
  ExistingProjectSpecializedPackSummary,
  ExistingProjectWorkspaceOverview,
} from "@intentloom/protocol";
import { EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN } from "@intentloom/protocol";
import { validateExistingProjectWorkspaceOverview } from "@intentloom/validator";
import type { FileSystem } from "./index.js";
import { doctorProject, inspectProject, planProjectAdoption } from "./index.js";
import { assessProject } from "./engineering-assessment/assess.js";
import { buildAssessmentViewModel } from "./engineering-assessment/viewmodel.js";
import { getFirstPartySpecializedPackEntries } from "./engineering-quality/first-party-specialized-pack-runtime.js";
import { resolveFirstPartySpecializedPackDetection } from "./engineering-quality/specialized-pack-catalog-engine.js";

const DEFAULT_MAX_PATHS = 5000;

export interface PrepareExistingProjectWorkspaceOptions {
  readonly root: string;
  readonly projectId?: string;
  readonly scope?: ExistingProjectScanScope;
  readonly now?: () => number;
}

async function collectProjectPaths(
  root: string,
  fs: FileSystem,
  maxPaths = DEFAULT_MAX_PATHS,
): Promise<readonly string[]> {
  const listed = await fs.list(root);
  return listed.slice(0, maxPaths);
}

function buildFlowSteps(
  scope: ExistingProjectScanScope,
  overview: {
    readonly inspectComplete: boolean;
    readonly adoptionComplete: boolean;
    readonly specializedComplete: boolean;
    readonly doctorComplete: boolean;
    readonly assessmentComplete: boolean;
  },
): ExistingProjectFlowStep[] {
  const steps: ExistingProjectFlowStep[] = [
    {
      id: "inspect",
      label: "Inspect",
      status: overview.inspectComplete ? "complete" : "unavailable",
      readOnly: true,
    },
    {
      id: "adoption-readiness",
      label: "Adoption readiness",
      status: overview.adoptionComplete ? "complete" : "partial",
      readOnly: true,
    },
    {
      id: "specialized-detection",
      label: "Specialized-pack detection",
      status: overview.specializedComplete ? "complete" : "unavailable",
      readOnly: true,
    },
  ];
  if (scope === "standard" || scope === "deep") {
    steps.push(
      {
        id: "doctor",
        label: "Doctor",
        status: overview.doctorComplete ? "complete" : "skipped",
        readOnly: true,
      },
      {
        id: "assessment",
        label: "Engineering assessment",
        status: overview.assessmentComplete ? "complete" : "partial",
        readOnly: true,
      },
    );
  }
  steps.push(
    {
      id: "findings",
      label: "Findings",
      status: overview.assessmentComplete ? "complete" : "skipped",
      readOnly: true,
    },
    {
      id: "remediation-preview",
      label: "Remediation preview",
      status: overview.assessmentComplete ? "partial" : "skipped",
      readOnly: true,
    },
  );
  return steps;
}

function defaultCapabilities(): ExistingProjectCapabilityAvailability {
  return {
    inspect: "available-now",
    adoption: "available-read-only",
    specializedPacks: "available-now",
    assessment: "integration-pending",
    remediation: "integration-pending",
    doctor: "available-now",
    graph: "integration-pending",
    quality: "integration-pending",
  };
}

export async function prepareExistingProjectWorkspace(
  options: PrepareExistingProjectWorkspaceOptions,
  fs: FileSystem,
): Promise<ExistingProjectWorkspaceOverview> {
  const root = resolve(options.root);
  if (typeof root !== "string" || root.length === 0) {
    throw new Error("root must be a non-empty string");
  }
  const scope = options.scope ?? "standard";
  const projectId = options.projectId ?? "intentloom-project";
  const preparedAt = options.now ? options.now() : Date.now();

  const inspection = await inspectProject(root, fs);
  const inspect: ExistingProjectInspectSummary = {
    profile: inspection.profileDetection.selectedProfile,
    readiness: inspection.readiness,
    detectedAdapters: inspection.detectedAdapters,
    findingCount: inspection.findings.length,
    manualConfirmationRequired:
      inspection.profileDetection.manualConfirmationRequired,
  };

  const absolutePaths = await collectProjectPaths(root, fs);
  const specializedResolution = resolveFirstPartySpecializedPackDetection({
    projectPaths: absolutePaths,
    entries: getFirstPartySpecializedPackEntries(),
    maxPaths: DEFAULT_MAX_PATHS,
  });
  const specializedPacks: ExistingProjectSpecializedPackSummary = {
    scannedPathCount: specializedResolution.detection.scannedPathCount,
    candidateCount: specializedResolution.detection.candidates.length,
    compatiblePackIds: specializedResolution.compatiblePackIds,
    requiresConfirmation: specializedResolution.detection.candidates.some(
      (candidate) => candidate.requiresConfirmation,
    ),
  };

  let adoption: ExistingProjectAdoptionSummary | undefined;
  try {
    const adoptionPlan = await planProjectAdoption({ root, projectId }, fs);
    adoption = {
      readiness: inspection.readiness,
      operationCount: adoptionPlan.operations.length,
      findingCount: adoptionPlan.findings.length,
      automaticApplyAllowed: adoptionPlan.automaticApplyAllowed,
    };
  } catch {
    adoption = undefined;
  }

  let doctor: ExistingProjectDoctorSummary | undefined;
  let assessment: ExistingProjectAssessmentSummary | undefined;
  if (scope === "standard" || scope === "deep") {
    const doctorReport = await doctorProject(
      {
        root,
        profile: inspection.profileDetection.selectedProfile,
        adapters: inspection.detectedAdapters.length
          ? inspection.detectedAdapters
          : ["codex"],
        dryRun: true,
      },
      fs,
    );
    doctor = {
      findingCount: doctorReport.findings.length,
      errorCount: doctorReport.findings.filter(
        (finding) => finding.severity === "error",
      ).length,
      exitCode: doctorReport.findings.some(
        (finding) => finding.severity === "error",
      )
        ? 3
        : 0,
    };

    const assessmentReport = await assessProject({
      root,
      projectId,
      now: () => preparedAt,
    });
    const assessmentViewModel = buildAssessmentViewModel(assessmentReport);
    assessment = {
      assessmentId: assessmentViewModel.overview.assessmentId,
      status: assessmentViewModel.overview.status,
      findingsCount: assessmentViewModel.overview.findingsCount,
      recommendationsCount: assessmentViewModel.recommendations.length,
      ...(assessmentViewModel.roadmap.targetOptionId !== undefined
        ? { targetOptionId: assessmentViewModel.roadmap.targetOptionId }
        : {}),
    };
  }

  const capabilities: ExistingProjectCapabilityAvailability = {
    ...defaultCapabilities(),
    assessment:
      assessment !== undefined ? "available-read-only" : "integration-pending",
    remediation:
      assessment !== undefined ? "available-read-only" : "integration-pending",
  };

  const overview: ExistingProjectWorkspaceOverview = {
    schemaVersion: EXISTING_PROJECT_WORKSPACE_OVERVIEW_SCHEMA_URN,
    root,
    projectId,
    scope,
    preparedAt,
    readOnly: true,
    inspect,
    ...(adoption !== undefined ? { adoption } : {}),
    specializedPacks,
    ...(doctor !== undefined ? { doctor } : {}),
    ...(assessment !== undefined ? { assessment } : {}),
    capabilities,
    flowSteps: buildFlowSteps(scope, {
      inspectComplete: true,
      adoptionComplete: adoption !== undefined,
      specializedComplete: true,
      doctorComplete: doctor !== undefined,
      assessmentComplete: assessment !== undefined,
    }),
  };

  return validateExistingProjectWorkspaceOverview(overview);
}

export const EXISTING_PROJECT_SCAN_SCOPES: readonly ExistingProjectScanScope[] =
  ["quick", "standard", "deep"];

export function listExistingProjectScanScopes(): readonly ExistingProjectScanScope[] {
  return EXISTING_PROJECT_SCAN_SCOPES;
}
