export type HarnessAgentFeature =
  | "structured-output"
  | "tool-calling"
  | "streaming"
  | "deterministic-settings"
  | "cancellation"
  | "usage-reporting";

export interface HarnessAgentCapabilities {
  readonly schemaVersion: 1;
  readonly features: readonly HarnessAgentFeature[];
  readonly maxContextTokens: number;
  readonly maxOutputTokens: number;
}

export interface HarnessAgentRequirements {
  readonly requiredFeatures: readonly HarnessAgentFeature[];
  readonly estimatedInputTokens: number;
  readonly maxOutputTokens: number;
}

export interface HarnessAgentToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

export interface HarnessAgentRequest {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly input: string;
  readonly responseFormat: "text" | "json";
  readonly requirements: HarnessAgentRequirements;
  readonly tools?: readonly HarnessAgentToolDefinition[];
}

export interface HarnessAgentToolCall {
  readonly callId: string;
  readonly name: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}

export interface HarnessAgentUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export type HarnessAgentResultStatus =
  "completed" | "cancelled" | "error" | "unsupported";

export interface HarnessAgentResult {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly adapterId: string;
  readonly status: HarnessAgentResultStatus;
  readonly outputText?: string;
  readonly structuredOutput?: Readonly<Record<string, unknown>>;
  readonly toolCalls: readonly HarnessAgentToolCall[];
  readonly usage?: HarnessAgentUsage;
  readonly diagnostics: readonly string[];
}

export type HarnessAgentExecutionMode = "offline" | "remote";

export interface HarnessAgentDataPolicy {
  readonly networkAccess: "disabled" | "explicit";
  readonly credentialSource: "none" | "invocation";
  readonly retention: "local-only" | "adapter-disclosed";
  readonly disclosure?: string;
}

export interface HarnessAgentCapabilityNegotiation {
  readonly supported: boolean;
  readonly missingFeatures: readonly HarnessAgentFeature[];
  readonly diagnostics: readonly string[];
}
