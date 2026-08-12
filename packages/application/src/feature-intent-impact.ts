import type {
  FeatureIntent,
  FeatureIntentAffectedScope,
  FeatureIntentArchitectureImpact,
} from "@intentloom/protocol";
import { assessProject } from "./engineering-assessment/assess.js";
import { buildAssessmentViewModel } from "./engineering-assessment/viewmodel.js";

export interface AnalyzeArchitectureImpactOptions {
  readonly root: string;
  readonly projectId: string;
  readonly intent: FeatureIntent;
  readonly affectedScope: FeatureIntentAffectedScope;
  readonly now?: () => number;
}

export async function analyzeArchitectureImpact(
  options: AnalyzeArchitectureImpactOptions,
): Promise<FeatureIntentArchitectureImpact> {
  const preparedAt = options.now ? options.now() : Date.now();
  const report = await assessProject({
    root: options.root,
    projectId: options.projectId,
    now: () => preparedAt,
  });
  const viewmodel = buildAssessmentViewModel(report);
  const haystack =
    `${options.intent.title} ${options.intent.summary}`.toLowerCase();
  const mentionsPublicApi =
    haystack.includes("api") ||
    haystack.includes("export") ||
    haystack.includes("public");
  const publicApiChangeRisk =
    options.affectedScope.publicApiSurfaces.length === 0
      ? "none"
      : mentionsPublicApi ||
          options.affectedScope.matchedPaths.some((path) =>
            options.affectedScope.publicApiSurfaces.includes(path),
          )
        ? "likely"
        : "possible";
  const evidence = [
    `graph:${options.affectedScope.graphProviderKind}`,
    `assessment:${viewmodel.overview.assessmentId}`,
    `packs:${options.affectedScope.specializedPackIds.join(",") || "none"}`,
    `foundation:${options.affectedScope.foundationPresent ? "present" : "absent"}`,
    `decisions:${options.affectedScope.decisionPaths.length}`,
  ];
  const summary =
    `Feature "${options.intent.title}" affects ` +
    `${options.affectedScope.packages.length} package(s) and ` +
    `${options.affectedScope.publicApiSurfaces.length} public API surface(s). ` +
    `Assessment reports ${viewmodel.overview.findingsCount} finding(s) and ` +
    `${viewmodel.technicalDebt.itemsCount} debt item(s).`;
  return {
    summary,
    assessmentFindingsCount: viewmodel.overview.findingsCount,
    debtItemCount: viewmodel.technicalDebt.itemsCount,
    publicApiChangeRisk,
    graphNodeCount: options.affectedScope.graphNodeIds.length,
    evidence,
  };
}
