import { resolve } from "node:path";
import type { ExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";
import { parseExistingProjectAdoptionPlanViewModel } from "@intentloom/protocol";
import type { FileSystem } from "./index.js";
import { adoptProject, inspectProject } from "./index.js";

export interface PrepareExistingProjectAdoptionPlanOptions {
  readonly root: string;
  readonly projectId?: string;
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
  return parseExistingProjectAdoptionPlanViewModel({
    readOnly: true,
    classification: "read-only",
    root,
    projectId: options.projectId ?? "intentloom-project",
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
    items: proposal.items,
  });
}
