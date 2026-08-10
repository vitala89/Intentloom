import { createHash } from "node:crypto";
import {
  QUALITY_DISCIPLINE_SCHEMA_URN,
  QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
  type QualityDisciplineCategory,
  type QualityDisciplineDefinition,
  type QualityRoleComposition,
} from "@intentloom/protocol";
import {
  validateQualityDisciplineDefinition,
  validateQualityRoleComposition,
} from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function registerDisciplineDefinition(options: {
  readonly id?: string;
  readonly name: string;
  readonly category: QualityDisciplineCategory;
  readonly defaultConcerns?: readonly string[];
  readonly supportedArchitectureStrategies?: readonly string[];
}): QualityDisciplineDefinition {
  const id = options.id ?? `discipline-${options.category}`;
  return validateQualityDisciplineDefinition({
    schemaVersion: QUALITY_DISCIPLINE_SCHEMA_URN,
    id,
    name: options.name,
    category: options.category,
    defaultConcerns: options.defaultConcerns ?? [],
    supportedArchitectureStrategies:
      options.supportedArchitectureStrategies ?? [],
  });
}

export function composeRoleDefinition(options: {
  readonly id?: string;
  readonly titleAlias: string;
  readonly primaryDisciplineId: string;
  readonly secondaryDisciplineIds?: readonly string[];
  readonly taskScopeFilter?: readonly string[];
  readonly createdAt?: string;
}): QualityRoleComposition {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const id =
    options.id ??
    `role-${sha256(`${options.titleAlias}:${options.primaryDisciplineId}`).slice(0, 12)}`;

  return validateQualityRoleComposition({
    schemaVersion: QUALITY_ROLE_COMPOSITION_SCHEMA_URN,
    id,
    titleAlias: options.titleAlias,
    primaryDisciplineId: options.primaryDisciplineId,
    secondaryDisciplineIds: options.secondaryDisciplineIds ?? [],
    ...(options.taskScopeFilter !== undefined
      ? { taskScopeFilter: options.taskScopeFilter }
      : {}),
    createdAt,
  });
}

export function resolveRoleCompositionForPath(
  filePath: string,
  roles: readonly QualityRoleComposition[],
  disciplines: readonly QualityDisciplineDefinition[],
): {
  readonly matchingRole: QualityRoleComposition | null;
  readonly effectiveConcerns: readonly string[];
} {
  const normalizedPath = filePath.replaceAll("\\", "/");

  const matchingRole =
    roles.find((r: QualityRoleComposition) => {
      if (r.taskScopeFilter === undefined || r.taskScopeFilter.length === 0)
        return true;
      return r.taskScopeFilter.some((filter: string) =>
        normalizedPath.includes(filter),
      );
    }) ?? null;

  if (matchingRole === null) {
    return { matchingRole: null, effectiveConcerns: [] };
  }

  const disciplineMap = new Map(
    disciplines.map((d: QualityDisciplineDefinition) => [d.id, d]),
  );
  const primary = disciplineMap.get(matchingRole.primaryDisciplineId);
  const secondaries = matchingRole.secondaryDisciplineIds
    .map((id: string) => disciplineMap.get(id))
    .filter(
      (
        d: QualityDisciplineDefinition | undefined,
      ): d is QualityDisciplineDefinition => d !== undefined && d !== null,
    );

  const concernsSet = new Set<string>();
  if (primary !== undefined) {
    for (const c of primary.defaultConcerns) concernsSet.add(c);
  }
  for (const sec of secondaries) {
    for (const c of sec.defaultConcerns) concernsSet.add(c);
  }

  return {
    matchingRole,
    effectiveConcerns: Array.from(concernsSet),
  };
}
