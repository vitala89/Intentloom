import type {
  HarnessAgentCapabilities,
  HarnessAgentDataPolicy,
  HarnessAgentFeature,
  HarnessAgentRequest,
  HarnessAgentRequirements,
  HarnessAgentToolDefinition,
} from "@intentloom/protocol";

const AGENT_FEATURES: readonly HarnessAgentFeature[] = [
  "structured-output",
  "tool-calling",
  "streaming",
  "deterministic-settings",
  "cancellation",
  "usage-reporting",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

function validateFeatures(value: unknown, name: string): HarnessAgentFeature[] {
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  const features = value.map((feature) => {
    if (
      typeof feature !== "string" ||
      !AGENT_FEATURES.includes(feature as HarnessAgentFeature)
    ) {
      throw new Error(`${name} contains an unknown feature`);
    }
    return feature as HarnessAgentFeature;
  });
  if (new Set(features).size !== features.length) {
    throw new Error(`${name} must not contain duplicates`);
  }
  return features;
}

export function validateHarnessAgentCapabilities(
  value: unknown,
): HarnessAgentCapabilities {
  if (!isObject(value)) throw new Error("agent capabilities must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("agent capabilities schemaVersion must equal 1");
  }
  return {
    schemaVersion: 1,
    features: validateFeatures(value.features, "features"),
    maxContextTokens: positiveInteger(
      value.maxContextTokens,
      "maxContextTokens",
    ),
    maxOutputTokens: positiveInteger(value.maxOutputTokens, "maxOutputTokens"),
  };
}

function validateRequirements(value: unknown): HarnessAgentRequirements {
  if (!isObject(value)) throw new Error("agent requirements must be an object");
  return {
    requiredFeatures: validateFeatures(
      value.requiredFeatures,
      "requiredFeatures",
    ),
    estimatedInputTokens: nonNegativeInteger(
      value.estimatedInputTokens,
      "estimatedInputTokens",
    ),
    maxOutputTokens: positiveInteger(value.maxOutputTokens, "maxOutputTokens"),
  };
}

function validateTool(value: unknown): HarnessAgentToolDefinition {
  if (!isObject(value)) throw new Error("agent tool must be an object");
  if (typeof value.name !== "string" || !value.name) {
    throw new Error("agent tool name must be a non-empty string");
  }
  if (typeof value.description !== "string") {
    throw new Error("agent tool description must be a string");
  }
  if (!isObject(value.inputSchema)) {
    throw new Error("agent tool inputSchema must be an object");
  }
  return {
    name: value.name,
    description: value.description,
    inputSchema: value.inputSchema,
  };
}

export function validateHarnessAgentRequest(
  value: unknown,
): HarnessAgentRequest {
  if (!isObject(value)) throw new Error("agent request must be an object");
  if (value.schemaVersion !== 1) {
    throw new Error("agent request schemaVersion must equal 1");
  }
  if (typeof value.requestId !== "string" || !value.requestId) {
    throw new Error("agent requestId must be a non-empty string");
  }
  if (typeof value.input !== "string") {
    throw new Error("agent input must be a string");
  }
  if (value.responseFormat !== "text" && value.responseFormat !== "json") {
    throw new Error("agent responseFormat must be text or json");
  }
  const requirements = validateRequirements(value.requirements);
  if (value.tools !== undefined && !Array.isArray(value.tools)) {
    throw new Error("agent tools must be an array");
  }
  const tools = Array.isArray(value.tools)
    ? value.tools.map(validateTool)
    : undefined;
  if (tools && new Set(tools.map((tool) => tool.name)).size !== tools.length) {
    throw new Error("agent tool names must be unique");
  }
  if (
    value.responseFormat === "json" &&
    !requirements.requiredFeatures.includes("structured-output")
  ) {
    throw new Error("json responseFormat requires structured-output");
  }
  if (
    tools?.length &&
    !requirements.requiredFeatures.includes("tool-calling")
  ) {
    throw new Error("agent tools require tool-calling");
  }
  return {
    schemaVersion: 1,
    requestId: value.requestId,
    input: value.input,
    responseFormat: value.responseFormat,
    requirements,
    ...(tools ? { tools } : {}),
  };
}

export function validateHarnessAgentDataPolicy(
  value: unknown,
): HarnessAgentDataPolicy {
  if (!isObject(value)) throw new Error("agent data policy must be an object");
  if (
    value.networkAccess !== "disabled" &&
    value.networkAccess !== "explicit"
  ) {
    throw new Error("agent data policy networkAccess is invalid");
  }
  if (
    value.credentialSource !== "none" &&
    value.credentialSource !== "invocation"
  ) {
    throw new Error("agent data policy credentialSource is invalid");
  }
  if (
    value.retention !== "local-only" &&
    value.retention !== "adapter-disclosed"
  ) {
    throw new Error("agent data policy retention is invalid");
  }
  return {
    networkAccess: value.networkAccess,
    credentialSource: value.credentialSource,
    retention: value.retention,
    ...(typeof value.disclosure === "string"
      ? { disclosure: value.disclosure }
      : {}),
  };
}
