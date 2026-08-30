import {
  NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
  NEUTRON_CONTEXT_SOURCE_TYPES,
  NEUTRON_DELEGATED_AGENT_ROLES,
  NEUTRON_SKILL_LOADING_LEVELS,
  type AssembleNeutronContextRequest,
  type NeutronContextSourceType,
  type NeutronDelegatedAgentRole,
  type NeutronSkillLoadingLevel,
} from "../../protocol/src/neutron-runtime.js";
import {
  isObject,
  nonEmpty,
  oneOf,
  positiveInt,
} from "./neutron-runtime-helpers.js";

function optionalNonEmpty(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return nonEmpty(value, field);
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be a boolean`);
  }
  return value;
}

function optionalSourceTypes(
  value: unknown,
  field: string,
): readonly NeutronContextSourceType[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array`);
  }
  return value.map((item, index) =>
    oneOf(item, NEUTRON_CONTEXT_SOURCE_TYPES, `${field}[${String(index)}]`),
  );
}

export function validateAssembleNeutronContextRequest(
  value: unknown,
): AssembleNeutronContextRequest {
  if (!isObject(value)) {
    throw new Error("context assembly request must be an object");
  }
  if (value.schemaVersion !== NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN) {
    throw new Error("unsupported neutron context assembly request schema");
  }

  const request: AssembleNeutronContextRequest = {
    schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
    root: nonEmpty(value.root, "request.root"),
    sessionId: nonEmpty(value.sessionId, "request.sessionId"),
    projectId: nonEmpty(value.projectId, "request.projectId"),
  };

  const taskId = optionalNonEmpty(value.taskId, "request.taskId");
  const query = optionalNonEmpty(value.query, "request.query");
  const profileName = optionalNonEmpty(
    value.profileName,
    "request.profileName",
  );
  const role =
    value.role === undefined
      ? undefined
      : (oneOf(
          value.role,
          NEUTRON_DELEGATED_AGENT_ROLES,
          "request.role",
        ) as NeutronDelegatedAgentRole);
  const skillLevel =
    value.skillLevel === undefined
      ? undefined
      : (oneOf(
          value.skillLevel,
          NEUTRON_SKILL_LOADING_LEVELS,
          "request.skillLevel",
        ) as NeutronSkillLoadingLevel);
  const maxTokens =
    value.maxTokens === undefined
      ? undefined
      : positiveInt(value.maxTokens, "request.maxTokens");
  const maxItems =
    value.maxItems === undefined
      ? undefined
      : positiveInt(value.maxItems, "request.maxItems");
  const sourceTypes = optionalSourceTypes(
    value.sourceTypes,
    "request.sourceTypes",
  );
  const includeMemory = optionalBoolean(
    value.includeMemory,
    "request.includeMemory",
  );
  const semanticRanking = optionalBoolean(
    value.semanticRanking,
    "request.semanticRanking",
  );

  return {
    ...request,
    ...(taskId !== undefined ? { taskId } : {}),
    ...(query !== undefined ? { query } : {}),
    ...(profileName !== undefined ? { profileName } : {}),
    ...(role !== undefined ? { role } : {}),
    ...(skillLevel !== undefined ? { skillLevel } : {}),
    ...(maxTokens !== undefined ? { maxTokens } : {}),
    ...(maxItems !== undefined ? { maxItems } : {}),
    ...(sourceTypes !== undefined ? { sourceTypes } : {}),
    ...(includeMemory !== undefined ? { includeMemory } : {}),
    ...(semanticRanking !== undefined ? { semanticRanking } : {}),
  };
}
