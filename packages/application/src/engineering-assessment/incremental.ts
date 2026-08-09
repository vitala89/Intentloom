import type {
  AssessmentEnvelope,
  AssessmentReportModel,
} from "@intentloom/protocol";
import {
  validateAssessmentEnvelope,
  validateAssessmentReportModel,
} from "@intentloom/validator";
import { assessProject, type AssessProjectOptions } from "./assess.js";

export interface AssessProjectIncrementalOptions extends AssessProjectOptions {
  readonly changedFiles?: readonly string[];
  readonly baselineReport?: AssessmentReportModel;
  readonly fallbackToFull?: boolean;
}

export async function assessProjectIncremental(
  options: AssessProjectIncrementalOptions,
): Promise<AssessmentReportModel> {
  const changedFiles = options.changedFiles ?? [];

  if (
    options.fallbackToFull === true ||
    changedFiles.length === 0 ||
    !options.baselineReport
  ) {
    return assessProject(options);
  }

  const baseline = options.baselineReport;
  const fullResult = await assessProject(options);

  const affectedScopes = new Set(
    changedFiles.map((file) => {
      const parts = file.split("/");
      return parts.length > 1 ? parts.slice(0, 2).join("/") : file;
    }),
  );

  const baselineFindings = baseline.envelope.findingProjections ?? [];
  const unaffectedBaselineFindings = baselineFindings.filter(
    (fp) => !affectedScopes.has(fp.scope),
  );

  const currentFindings = fullResult.envelope.findingProjections ?? [];
  const affectedCurrentFindings = currentFindings.filter((fp) =>
    affectedScopes.has(fp.scope),
  );

  const mergedFindingProjections = [
    ...unaffectedBaselineFindings,
    ...affectedCurrentFindings,
  ];

  const updatedEnvelope: AssessmentEnvelope = {
    ...fullResult.envelope,
    findingReferences: mergedFindingProjections.map((fp) => fp.id),
    findingProjections: mergedFindingProjections,
  };

  const validatedEnvelope = validateAssessmentEnvelope(updatedEnvelope);

  const reportInput: AssessmentReportModel = {
    ...fullResult,
    envelope: validatedEnvelope,
    summary: `Incremental assessment complete for ${changedFiles.length} changed file(s): ${mergedFindingProjections.length} total finding projection(s).`,
  };

  return validateAssessmentReportModel(reportInput);
}
