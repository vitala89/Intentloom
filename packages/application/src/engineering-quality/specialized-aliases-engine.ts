import { createHash } from "node:crypto";
import {
  QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
  type QualityDisciplineAlias,
  type QualityDisciplineDefinition,
} from "@intentloom/protocol";
import { validateQualityDisciplineAlias } from "@intentloom/validator";

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function registerDisciplineAlias(options: {
  readonly aliasId?: string;
  readonly humanTitle: string;
  readonly targetDisciplineId: string;
  readonly organizationScope?: string;
  readonly createdAt?: string;
}): QualityDisciplineAlias {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const aliasId =
    options.aliasId ??
    `alias-${sha256(`${options.humanTitle}:${options.targetDisciplineId}`).slice(0, 12)}`;

  return validateQualityDisciplineAlias({
    schemaVersion: QUALITY_DISCIPLINE_ALIAS_SCHEMA_URN,
    aliasId,
    humanTitle: options.humanTitle,
    targetDisciplineId: options.targetDisciplineId,
    ...(options.organizationScope !== undefined
      ? { organizationScope: options.organizationScope }
      : {}),
    createdAt,
  });
}

export function resolveDisciplineFromAlias(
  query: string,
  aliases: readonly QualityDisciplineAlias[],
  disciplines: readonly QualityDisciplineDefinition[],
): {
  readonly matchingAlias: QualityDisciplineAlias | null;
  readonly canonicalDiscipline: QualityDisciplineDefinition | null;
} {
  const normalizedQuery = query.trim().toLowerCase();

  const matchingAlias =
    aliases.find((a) => {
      if (a.aliasId.toLowerCase() === normalizedQuery) return true;
      if (a.humanTitle.toLowerCase() === normalizedQuery) return true;
      return false;
    }) ?? null;

  if (matchingAlias === null) {
    return { matchingAlias: null, canonicalDiscipline: null };
  }

  const canonicalDiscipline =
    disciplines.find((d) => d.id === matchingAlias.targetDisciplineId) ?? null;

  return { matchingAlias, canonicalDiscipline };
}
