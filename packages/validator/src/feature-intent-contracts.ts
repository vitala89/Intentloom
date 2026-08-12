import type {
  FeatureIntent,
  FeatureIntentAffectedScope,
  FeatureIntentArchitectureImpact,
  FeatureIntentImplementationAlternative,
  FeatureIntentImplementationPlan,
  FeatureIntentWorkspaceOverview,
} from "@intentloom/protocol";
import {
  FEATURE_INTENT_SCHEMA_URN,
  FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN,
} from "@intentloom/protocol";

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${field}: expected non-empty string`);
  }
  return value;
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${field}: expected array`);
  }
  return value.map((entry, index) =>
    nonEmptyString(entry, `${field}[${index}]`),
  );
}

export function validateFeatureIntent(value: unknown): FeatureIntent {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid feature intent: expected object");
  }
  const record = value as FeatureIntent;
  if (record.schemaVersion !== FEATURE_INTENT_SCHEMA_URN) {
    throw new Error("Invalid feature intent: unsupported schema version");
  }
  nonEmptyString(record.id, "intent.id");
  nonEmptyString(record.title, "intent.title");
  nonEmptyString(record.summary, "intent.summary");
  if (typeof record.createdAt !== "number") {
    throw new Error("Invalid intent.createdAt");
  }
  if (record.readOnly !== true) {
    throw new Error("Invalid intent.readOnly");
  }
  return record;
}

function validateScope(value: FeatureIntentAffectedScope): void {
  stringArray(value.packages, "affectedScope.packages");
  stringArray(value.matchedPaths, "affectedScope.matchedPaths");
  stringArray(value.publicApiSurfaces, "affectedScope.publicApiSurfaces");
  stringArray(value.graphNodeIds, "affectedScope.graphNodeIds");
  nonEmptyString(value.graphProviderKind, "affectedScope.graphProviderKind");
  stringArray(value.specializedPackIds, "affectedScope.specializedPackIds");
  stringArray(value.decisionPaths, "affectedScope.decisionPaths");
  if (typeof value.foundationPresent !== "boolean") {
    throw new Error("Invalid affectedScope.foundationPresent");
  }
}

function validateImpact(value: FeatureIntentArchitectureImpact): void {
  nonEmptyString(value.summary, "architectureImpact.summary");
  if (typeof value.assessmentFindingsCount !== "number") {
    throw new Error("Invalid architectureImpact.assessmentFindingsCount");
  }
  if (typeof value.debtItemCount !== "number") {
    throw new Error("Invalid architectureImpact.debtItemCount");
  }
  if (
    value.publicApiChangeRisk !== "none" &&
    value.publicApiChangeRisk !== "possible" &&
    value.publicApiChangeRisk !== "likely"
  ) {
    throw new Error("Invalid architectureImpact.publicApiChangeRisk");
  }
}

function validateAlternative(
  value: FeatureIntentImplementationAlternative,
): void {
  nonEmptyString(value.id, "alternative.id");
  nonEmptyString(value.title, "alternative.title");
  nonEmptyString(value.summary, "alternative.summary");
  if (
    value.strategy !== "narrow-scope" &&
    value.strategy !== "boundary-preserving" &&
    value.strategy !== "phased-with-debt"
  ) {
    throw new Error("Invalid alternative.strategy");
  }
  stringArray(value.tradeoffs, "alternative.tradeoffs");
}

function validatePlan(value: FeatureIntentImplementationPlan): void {
  nonEmptyString(value.selectedAlternativeId, "plan.selectedAlternativeId");
  if (value.reviewRequired !== true) {
    throw new Error("Invalid plan.reviewRequired");
  }
  if (value.mutationAllowed !== false) {
    throw new Error("Invalid plan.mutationAllowed");
  }
  if (value.executionGate !== "w11-blocked") {
    throw new Error("Invalid plan.executionGate");
  }
  if (!Array.isArray(value.steps) || value.steps.length === 0) {
    throw new Error("Invalid plan.steps");
  }
  for (const step of value.steps) {
    nonEmptyString(step.id, "plan.step.id");
    nonEmptyString(step.label, "plan.step.label");
    if (step.mutationAllowed !== false) {
      throw new Error("Invalid plan.step.mutationAllowed");
    }
  }
}

export function validateFeatureIntentWorkspaceOverview(
  value: unknown,
): FeatureIntentWorkspaceOverview {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid feature intent overview: expected object");
  }
  const record = value as FeatureIntentWorkspaceOverview;
  if (record.schemaVersion !== FEATURE_INTENT_WORKSPACE_OVERVIEW_SCHEMA_URN) {
    throw new Error("Invalid overview: unsupported schema version");
  }
  nonEmptyString(record.root, "root");
  nonEmptyString(record.projectId, "projectId");
  if (typeof record.preparedAt !== "number") {
    throw new Error("Invalid preparedAt");
  }
  if (record.readOnly !== true) {
    throw new Error("Invalid readOnly flag");
  }
  validateFeatureIntent(record.intent);
  validateScope(record.affectedScope);
  validateImpact(record.architectureImpact);
  if (!Array.isArray(record.alternatives) || record.alternatives.length === 0) {
    throw new Error("Invalid alternatives");
  }
  record.alternatives.forEach(validateAlternative);
  validatePlan(record.plan);
  return record;
}
