import type {
  ModelAdapterCapabilities,
  ModelAdapterConfig,
  ModelMessage,
  ModelProviderKind,
  ModelToolCall,
  ModelToolDefinition,
  ModelTurnRequest,
  ModelTurnResult,
  ModelUsageRecord,
} from "@intentloom/protocol/model-adapter";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, field: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value;
}

const PROVIDER_KINDS: readonly ModelProviderKind[] = [
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "deterministic-test",
];

function providerKind(value: unknown): ModelProviderKind {
  if (!PROVIDER_KINDS.includes(value as ModelProviderKind)) {
    throw new Error("invalid model provider kind");
  }
  return value as ModelProviderKind;
}

function optionalFiniteNumber(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite number`);
  }
  return value;
}

function optionalPositiveInteger(
  value: unknown,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return value;
}

export function validateModelAdapterCapabilities(
  value: unknown,
): ModelAdapterCapabilities {
  if (!isObject(value)) {
    throw new Error("model adapter capabilities must be an object");
  }
  const kind = providerKind(value.providerKind);
  if (typeof value.modelId !== "string" || !value.modelId.trim()) {
    throw new Error("modelId must be a non-empty string");
  }
  if (typeof value.supportsStreaming !== "boolean") {
    throw new Error("supportsStreaming must be a boolean");
  }
  if (typeof value.supportsToolCalls !== "boolean") {
    throw new Error("supportsToolCalls must be a boolean");
  }
  if (typeof value.supportsVision !== "boolean") {
    throw new Error("supportsVision must be a boolean");
  }
  const maxContextTokens = optionalPositiveInteger(
    value.maxContextTokens,
    "maxContextTokens",
  );
  const maxOutputTokens = optionalPositiveInteger(
    value.maxOutputTokens,
    "maxOutputTokens",
  );
  if (maxContextTokens === undefined || maxOutputTokens === undefined) {
    throw new Error("model token limits are required");
  }
  return {
    providerKind: kind,
    modelId: value.modelId,
    supportsStreaming: value.supportsStreaming,
    supportsToolCalls: value.supportsToolCalls,
    supportsVision: value.supportsVision,
    maxContextTokens,
    maxOutputTokens,
  };
}

export function validateModelAdapterConfig(value: unknown): ModelAdapterConfig {
  if (!isObject(value)) {
    throw new Error("model adapter config must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("model adapter config schemaVersion must equal 1");
  }
  const kind = providerKind(value.providerKind);
  if (typeof value.modelId !== "string" || !value.modelId.trim()) {
    throw new Error("modelId must be a non-empty string");
  }
  if (
    value.baseUrl !== undefined &&
    (typeof value.baseUrl !== "string" || !value.baseUrl.trim())
  ) {
    throw new Error("baseUrl must be a non-empty string when provided");
  }
  const temperature = optionalFiniteNumber(value.temperature, "temperature");
  const maxTokens = optionalPositiveInteger(value.maxTokens, "maxTokens");
  return {
    schemaVersion: 1,
    providerKind: kind,
    modelId: value.modelId,
    ...(value.baseUrl !== undefined ? { baseUrl: value.baseUrl as string } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { maxTokens } : {}),
  };
}

export function validateModelMessage(value: unknown): ModelMessage {
  if (!isObject(value)) {
    throw new Error("model message must be an object");
  }
  if (!["system", "user", "assistant", "tool"].includes(value.role as string)) {
    throw new Error("invalid message role");
  }
  if (typeof value.content !== "string") {
    throw new Error("message content must be a string");
  }
  return {
    role: value.role as ModelMessage["role"],
    content: value.content,
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    ...(typeof value.toolCallId === "string"
      ? { toolCallId: value.toolCallId }
      : {}),
  };
}

export function validateModelToolCall(value: unknown): ModelToolCall {
  if (!isObject(value)) {
    throw new Error("model tool call must be an object");
  }
  if (typeof value.id !== "string" || !value.id.trim()) {
    throw new Error("tool call id must be a non-empty string");
  }
  if (typeof value.name !== "string" || !value.name.trim()) {
    throw new Error("tool call name must be a non-empty string");
  }
  if (typeof value.argumentsJson !== "string") {
    throw new Error("argumentsJson must be a string");
  }
  return {
    id: value.id,
    name: value.name,
    argumentsJson: value.argumentsJson,
  };
}

function validateToolDefinition(value: unknown): ModelToolDefinition {
  if (
    !isObject(value) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.description !== "string"
  ) {
    throw new Error("invalid tool definition");
  }
  return {
    name: value.name,
    description: value.description,
    parametersSchema: isObject(value.parametersSchema)
      ? value.parametersSchema
      : {},
  };
}

export function validateModelTurnRequest(value: unknown): ModelTurnRequest {
  if (!isObject(value)) {
    throw new Error("model turn request must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("model turn request schemaVersion must equal 1");
  }
  if (typeof value.sessionId !== "string" || !value.sessionId.trim()) {
    throw new Error("sessionId must be a non-empty string");
  }
  if (!Array.isArray(value.messages)) {
    throw new Error("messages must be an array");
  }
  if (value.tools !== undefined && !Array.isArray(value.tools)) {
    throw new Error("tools must be an array if provided");
  }
  const temperature = optionalFiniteNumber(value.temperature, "temperature");
  const maxTokens = optionalPositiveInteger(value.maxTokens, "maxTokens");
  return {
    schemaVersion: 1,
    sessionId: value.sessionId,
    messages: value.messages.map(validateModelMessage),
    ...(Array.isArray(value.tools)
      ? { tools: value.tools.map(validateToolDefinition) }
      : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(maxTokens !== undefined ? { maxTokens } : {}),
  };
}

export function validateModelTurnResult(value: unknown): ModelTurnResult {
  if (!isObject(value)) {
    throw new Error("model turn result must be an object");
  }
  if (value.schemaVersion !== 1) {
    throw new Error("model turn result schemaVersion must equal 1");
  }
  if (typeof value.sessionId !== "string" || !value.sessionId.trim()) {
    throw new Error("sessionId must be a non-empty string");
  }
  if (typeof value.responseText !== "string") {
    throw new Error("responseText must be a string");
  }
  if (!Array.isArray(value.toolCalls)) {
    throw new Error("toolCalls must be an array");
  }
  if (
    !["stop", "tool_call", "length", "error"].includes(
      value.stopReason as string,
    )
  ) {
    throw new Error("invalid stopReason");
  }
  if (!isObject(value.usage)) {
    throw new Error("usage must be an object");
  }
  const inputTokens = optionalPositiveIntegerOrZero(
    value.usage.inputTokens,
    "usage.inputTokens",
  );
  const outputTokens = optionalPositiveIntegerOrZero(
    value.usage.outputTokens,
    "usage.outputTokens",
  );
  const totalTokens = optionalPositiveIntegerOrZero(
    value.usage.totalTokens,
    "usage.totalTokens",
  );
  if (totalTokens !== inputTokens + outputTokens) {
    throw new Error("usage.totalTokens must equal inputTokens + outputTokens");
  }
  const usage: ModelUsageRecord = { inputTokens, outputTokens, totalTokens };
  return {
    schemaVersion: 1,
    sessionId: value.sessionId,
    responseText: value.responseText,
    toolCalls: value.toolCalls.map(validateModelToolCall),
    stopReason: value.stopReason as ModelTurnResult["stopReason"],
    usage,
    diagnostics: stringArray(value.diagnostics, "diagnostics"),
  };
}

function optionalPositiveIntegerOrZero(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`);
  }
  return value;
}
