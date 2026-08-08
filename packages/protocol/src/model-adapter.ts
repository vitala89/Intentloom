export type ModelProviderKind =
  "openai" | "anthropic" | "gemini" | "ollama" | "deterministic-test";

export interface ModelAdapterCapabilities {
  readonly providerKind: ModelProviderKind;
  readonly modelId: string;
  readonly supportsStreaming: boolean;
  readonly supportsToolCalls: boolean;
  readonly supportsVision: boolean;
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
}

export interface ModelAdapterConfig {
  readonly schemaVersion: 1;
  readonly providerKind: ModelProviderKind;
  readonly modelId: string;
  readonly baseUrl?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface ModelMessage {
  readonly role: "system" | "user" | "assistant" | "tool";
  readonly content: string;
  readonly name?: string;
  readonly toolCallId?: string;
}

export interface ModelToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parametersSchema: Record<string, unknown>;
}

export interface ModelToolCall {
  readonly id: string;
  readonly name: string;
  readonly argumentsJson: string;
}

export interface ModelTurnRequest {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly messages: readonly ModelMessage[];
  readonly tools?: readonly ModelToolDefinition[];
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface ModelUsageRecord {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface ModelTurnResult {
  readonly schemaVersion: 1;
  readonly sessionId: string;
  readonly responseText: string;
  readonly toolCalls: readonly ModelToolCall[];
  readonly stopReason: "stop" | "tool_call" | "length" | "error";
  readonly usage: ModelUsageRecord;
  readonly diagnostics: readonly string[];
}
