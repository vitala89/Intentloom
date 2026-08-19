import { resolve } from "node:path";
import {
  parseExistingProjectAdoptionDecisionViewModel,
  supportedAdoptionDecisionKinds,
  type AdoptionDecisionEvaluation,
  type AdoptionDecisionInvalidReason,
  type AdoptionDecisionKind,
  type ExistingProjectAdoptionDecisionViewModel,
  type SelectedAdoptionDecision,
} from "@intentloom/protocol";
import type { FileSystem, ProjectMapping } from "./index.js";
import {
  spreadExistingProjectAdoptionGeneration,
  type ExistingProjectAdoptionGenerationOptions,
} from "./existing-project-adoption-generation.js";
import { prepareExistingProjectAdoptionPlan } from "./existing-project-adoption-plan.js";

export interface ValidateExistingProjectAdoptionDecisionsOptions extends ExistingProjectAdoptionGenerationOptions {
  readonly root: string;
  readonly previewIdentity: string;
  readonly projectId?: string;
  readonly decisions: readonly SelectedAdoptionDecision[];
}

function mappingFor(
  decision: SelectedAdoptionDecision,
): { projectOwned: ProjectMapping[] } | { documentation: ProjectMapping[] } {
  const mapping = { source: decision.path, destination: decision.path };
  if (decision.kind === "keep-project-owned") {
    return { projectOwned: [mapping] };
  }
  return { documentation: [mapping] };
}

export function mappingsFromSelectedAdoptionDecisions(
  decisions: readonly SelectedAdoptionDecision[],
): {
  readonly projectOwnedMappings: readonly ProjectMapping[];
  readonly documentationMappings: readonly ProjectMapping[];
} {
  const projectOwnedMappings: ProjectMapping[] = [];
  const documentationMappings: ProjectMapping[] = [];
  for (const decision of decisions) {
    const mapped = mappingFor(decision);
    if ("projectOwned" in mapped) {
      projectOwnedMappings.push(...mapped.projectOwned);
    } else {
      documentationMappings.push(...mapped.documentation);
    }
  }
  return { projectOwnedMappings, documentationMappings };
}

function duplicatePaths(
  decisions: readonly SelectedAdoptionDecision[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const decision of decisions) {
    if (seen.has(decision.path)) duplicates.add(decision.path);
    seen.add(decision.path);
  }
  return duplicates;
}

function invalidReason(
  stalePreview: boolean,
  duplicates: ReadonlySet<string>,
  decision: SelectedAdoptionDecision,
  supported: readonly AdoptionDecisionKind[],
  itemExists: boolean,
  requiresDecision: boolean,
): AdoptionDecisionInvalidReason | null {
  if (stalePreview) return "stale-preview";
  if (duplicates.has(decision.path)) return "duplicate-decision";
  if (!itemExists) return "unknown-item";
  if (!requiresDecision) return "decision-not-required";
  if (!supported.includes(decision.kind)) return "unsupported-decision";
  return null;
}

export async function validateExistingProjectAdoptionDecisions(
  options: ValidateExistingProjectAdoptionDecisionsOptions,
  fs: FileSystem,
): Promise<ExistingProjectAdoptionDecisionViewModel> {
  const root = resolve(options.root);
  const preview = await prepareExistingProjectAdoptionPlan(
    {
      root,
      ...spreadExistingProjectAdoptionGeneration(options),
      ...(options.projectId !== undefined
        ? { projectId: options.projectId }
        : {}),
    },
    fs,
  );
  const stalePreview = options.previewIdentity !== preview.previewIdentity;
  const duplicates = duplicatePaths(options.decisions);
  const itemByPath = new Map(
    preview.items.map((item) => [item.path, item] as const),
  );
  const structural: AdoptionDecisionEvaluation[] = options.decisions.map(
    (decision) => {
      const item = itemByPath.get(decision.path);
      const supported = item ? supportedAdoptionDecisionKinds(item) : [];
      const reason = invalidReason(
        stalePreview,
        duplicates,
        decision,
        supported,
        item !== undefined,
        item?.manualDecisionRequired === true,
      );
      return {
        path: decision.path,
        kind: decision.kind,
        status: reason === null ? "valid" : "invalid",
        reason,
        supportedChoices: supported,
        resolvedItem: null,
      };
    },
  );
  const structurallyValid = structural.every(
    (evaluation) => evaluation.status === "valid",
  );
  const projectOwnedMappings: ProjectMapping[] = [];
  const documentationMappings: ProjectMapping[] = [];
  if (structurallyValid) {
    const mapped = mappingsFromSelectedAdoptionDecisions(options.decisions);
    projectOwnedMappings.push(...mapped.projectOwnedMappings);
    documentationMappings.push(...mapped.documentationMappings);
  }
  const resolved =
    structurallyValid && options.decisions.length > 0
      ? await prepareExistingProjectAdoptionPlan(
          {
            root,
            ...spreadExistingProjectAdoptionGeneration(options),
            ...(options.projectId !== undefined
              ? { projectId: options.projectId }
              : {}),
            ...(projectOwnedMappings.length > 0
              ? { projectOwnedMappings }
              : {}),
            ...(documentationMappings.length > 0
              ? { documentationMappings }
              : {}),
          },
          fs,
        )
      : preview;
  if (resolved.applied) {
    throw new Error("adoption decision validation must not apply changes");
  }
  const resolvedByPath = new Map(
    resolved.items.map((item) => [item.path, item] as const),
  );
  const evaluations = structural.map((evaluation) => {
    if (evaluation.status === "invalid") return evaluation;
    const resolvedItem = resolvedByPath.get(evaluation.path) ?? null;
    const mappingFailed = resolved.diagnostics.some(
      (diagnostic) =>
        diagnostic.includes("mapping invalid:") &&
        diagnostic.includes(evaluation.path),
    );
    if (mappingFailed || resolvedItem === null) {
      return {
        ...evaluation,
        status: "invalid" as const,
        reason: "invalid-mapping" as const,
      };
    }
    if (resolvedItem.manualDecisionRequired) {
      return {
        ...evaluation,
        status: "invalid" as const,
        reason: "resolution-failed" as const,
        resolvedItem,
      };
    }
    return { ...evaluation, resolvedItem };
  });
  const remainingManualDecisionPaths = resolved.items
    .filter((item) => item.manualDecisionRequired)
    .map((item) => item.path)
    .sort((left, right) => left.localeCompare(right));
  return parseExistingProjectAdoptionDecisionViewModel({
    readOnly: true,
    classification: "read-only",
    applied: false,
    changesApplied: 0,
    root: preview.root,
    projectId: preview.projectId,
    previewIdentity: preview.previewIdentity,
    stalePreview,
    decisionsPrepared: evaluations.filter(
      (evaluation) => evaluation.status === "valid",
    ).length,
    evaluations,
    remainingManualDecisionPaths,
  });
}
