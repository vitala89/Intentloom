import {
  type EngineeringQualityDecompositionEvidence,
  type EngineeringQualityDependencyEvidence,
  type EngineeringQualityPublicApiEvidence,
  type EngineeringQualityResponsibilityEvidence,
  type EngineeringQualityTestPreservationEvidence,
  type QualityDecompositionConflictKind,
  type QualityDecompositionOptionKind,
  type QualityDependencyKind,
  type QualityPublicApiCompatibility,
  type QualityResponsibilityCohesion,
} from "@intentloom/protocol";
import { isObject } from "./common.js";
import { nonNegative, stringField } from "./task-validation-common.js";

export const COHESIONS: readonly QualityResponsibilityCohesion[] = [
  "high",
  "medium",
  "low",
];
export const DEPENDENCY_KINDS: readonly QualityDependencyKind[] = [
  "internal",
  "public-api",
  "test",
];
export const API_COMPATIBILITY: readonly QualityPublicApiCompatibility[] = [
  "preserve",
  "review",
];
export const OPTION_KINDS: readonly QualityDecompositionOptionKind[] = [
  "minimal",
  "recommended",
  "keep-together",
  "defer",
  "exception",
];
export const CONFLICT_KINDS: readonly QualityDecompositionConflictKind[] = [
  "insufficient-evidence",
  "no-cohesive-extraction",
  "public-api-risk",
  "dependency-risk",
  "oversized-retained",
];

export function integer(value: unknown, field: string): number {
  const result = nonNegative(value, field);
  if (!Number.isInteger(result)) throw new Error(`${field} must be an integer`);
  return result;
}

export function strings(value: unknown, field: string): readonly string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map((item, index) => stringField(item, `${field}[${index}]`));
}

export function validateResponsibility(
  value: unknown,
): EngineeringQualityResponsibilityEvidence {
  if (!isObject(value)) throw new Error("responsibility must be an object");
  if (!COHESIONS.includes(value.cohesion as QualityResponsibilityCohesion)) {
    throw new Error("responsibility.cohesion must be valid");
  }
  return {
    id: stringField(value.id, "responsibility.id"),
    name: stringField(value.name, "responsibility.name"),
    description: stringField(value.description, "responsibility.description"),
    measuredLines: integer(value.measuredLines, "responsibility.measuredLines"),
    cohesion: value.cohesion as QualityResponsibilityCohesion,
    publicApiSymbols: strings(
      value.publicApiSymbols,
      "responsibility.publicApiSymbols",
    ),
    testIds: strings(value.testIds, "responsibility.testIds"),
  };
}

export function validateDependency(
  value: unknown,
): EngineeringQualityDependencyEvidence {
  if (!isObject(value)) throw new Error("dependency must be an object");
  if (!DEPENDENCY_KINDS.includes(value.kind as QualityDependencyKind)) {
    throw new Error("dependency.kind must be valid");
  }
  if (typeof value.stable !== "boolean") {
    throw new Error("dependency.stable must be a boolean");
  }
  return {
    fromResponsibilityId: stringField(
      value.fromResponsibilityId,
      "dependency.fromResponsibilityId",
    ),
    toResponsibilityId: stringField(
      value.toResponsibilityId,
      "dependency.toResponsibilityId",
    ),
    kind: value.kind as QualityDependencyKind,
    stable: value.stable,
  };
}

export function validatePublicApi(
  value: unknown,
): EngineeringQualityPublicApiEvidence {
  if (!isObject(value))
    throw new Error("public API evidence must be an object");
  if (
    !API_COMPATIBILITY.includes(
      value.compatibility as QualityPublicApiCompatibility,
    )
  ) {
    throw new Error("publicApi.compatibility must be valid");
  }
  return {
    symbol: stringField(value.symbol, "publicApi.symbol"),
    responsibilityId: stringField(
      value.responsibilityId,
      "publicApi.responsibilityId",
    ),
    consumerCount: integer(value.consumerCount, "publicApi.consumerCount"),
    compatibility: value.compatibility as QualityPublicApiCompatibility,
  };
}

export function validateTest(
  value: unknown,
): EngineeringQualityTestPreservationEvidence {
  if (!isObject(value)) throw new Error("test evidence must be an object");
  return {
    id: stringField(value.id, "test.id"),
    path: stringField(value.path, "test.path"),
    behavior: stringField(value.behavior, "test.behavior"),
    responsibilityIds: strings(
      value.responsibilityIds,
      "test.responsibilityIds",
    ),
  };
}

export function validateEvidence(
  value: unknown,
): EngineeringQualityDecompositionEvidence {
  if (!isObject(value))
    throw new Error("decomposition evidence must be an object");
  const currentLines = integer(value.currentLines, "evidence.currentLines");
  const preferredLimit = integer(
    value.preferredLimit,
    "evidence.preferredLimit",
  );
  const hardLimit = integer(value.hardLimit, "evidence.hardLimit");
  if (preferredLimit < 1 || hardLimit < 1 || preferredLimit > hardLimit) {
    throw new Error("evidence limits must be positive and ordered");
  }
  if (
    !Array.isArray(value.responsibilities) ||
    !Array.isArray(value.dependencies) ||
    !Array.isArray(value.publicApi) ||
    !Array.isArray(value.tests)
  ) {
    throw new Error("decomposition evidence collections must be arrays");
  }
  const responsibilities = value.responsibilities.map(validateResponsibility);
  const ids = responsibilities.map((item) => item.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("responsibility IDs must be unique");
  const knownIds = new Set(ids);
  const dependencies = value.dependencies.map(validateDependency);
  for (const dependency of dependencies) {
    if (
      !knownIds.has(dependency.fromResponsibilityId) ||
      !knownIds.has(dependency.toResponsibilityId)
    ) {
      throw new Error("dependency references an unknown responsibility");
    }
  }
  const publicApi = value.publicApi.map(validatePublicApi);
  for (const item of publicApi) {
    if (!knownIds.has(item.responsibilityId))
      throw new Error("publicApi references an unknown responsibility");
  }
  const tests = value.tests.map(validateTest);
  for (const test of tests) {
    if (!test.responsibilityIds.every((id) => knownIds.has(id))) {
      throw new Error("test references an unknown responsibility");
    }
  }
  const modeledLines = responsibilities.reduce(
    (sum, item) => sum + item.measuredLines,
    0,
  );
  if (modeledLines > currentLines)
    throw new Error("responsibility lines exceed currentLines");
  return {
    artifactPath: stringField(value.artifactPath, "evidence.artifactPath"),
    currentLines,
    preferredLimit,
    hardLimit,
    responsibilities,
    dependencies,
    publicApi,
    tests,
  };
}
