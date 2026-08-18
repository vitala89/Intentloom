import { resolve } from "node:path";
import type { ExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";
import { parseExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";
import type { FileSystem, ProjectMapping } from "./index.js";
import { adoptProject, inspectProject } from "./index.js";
import { computeExistingProjectAdoptionPreviewIdentity } from "./existing-project-adoption-preview-identity.js";

export interface PrepareExistingProjectAdoptionPlanOptions {
  readonly root: string;
  readonly projectId?: string;
  readonly projectOwnedMappings?: readonly ProjectMapping[];
  readonly documentationMappings?: readonly ProjectMapping[];
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export async function prepareExistingProjectAdoptionPlan(
  options: PrepareExistingProjectAdoptionPlanOptions,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionPlanViewModel> {
  const root = resolve(options.root);
  if (typeof root !== "string" || root.length === 0) {
    throw new Error("root must be a non-empty string");
  }
  const inspection = await inspectProject(root, fs);
  const adapters = inspection.detectedAdapters.length
    ? inspection.detectedAdapters
    : (["codex"] as const);
  const proposal = await adoptProject(
    {
      root,
      profile: inspection.profileDetection.selectedProfile,
      adapters: [...adapters],
      dryRun: true,
      ...(options.projectOwnedMappings !== undefined
        ? { projectOwnedMappings: options.projectOwnedMappings }
        : {}),
      ...(options.documentationMappings !== undefined
        ? { documentationMappings: options.documentationMappings }
        : {}),
    },
    fs,
  );
  if (proposal.applied) {
    throw new Error("adoption preview must not apply changes");
  }
  const nextActions = sortedUnique([
    ...inspection.findings.flatMap((finding) => finding.remediation),
    ...proposal.items
      .filter((item) => item.manualDecisionRequired)
      .map((item) => item.safeNextAction),
  ]);
  const projectId = options.projectId ?? "intentloom-project";
  return parseExistingProjectAdoptionPlanViewModel({
    readOnly: true,
    classification: "read-only",
    root,
    projectId,
    profile: inspection.profileDetection.selectedProfile,
    workspaceTopology: inspection.profileDetection.workspaceTopology,
    detectedAdapters: inspection.detectedAdapters,
    readiness: inspection.readiness,
    instructionPaths: inspection.instructionPaths,
    diagnostics: sortedUnique([
      ...inspection.findings.map((finding) => finding.message),
      ...proposal.diagnostics,
    ]),
    nextActions,
    applied: false,
    previewIdentity: computeExistingProjectAdoptionPreviewIdentity({
      root,
      projectId,
      items: proposal.items,
    }),
    items: proposal.items,
  });
}
