import type {
  ModelAdapterCapabilities,
  ModelTurnRequest,
  ModelTurnResult,
} from "@intentloom/protocol/model-adapter";
import {
  validateModelAdapterCapabilities,
  validateModelTurnRequest,
  validateModelTurnResult,
} from "@intentloom/validator/model-adapter";

export interface ModelAdapter {
  getCapabilities(): ModelAdapterCapabilities;
  executeTurn(
    request: ModelTurnRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ModelTurnResult>;
}

export class DeterministicTestModelAdapter implements ModelAdapter {
  private readonly capabilities: ModelAdapterCapabilities;
  private readonly predefinedResponses: Map<string, ModelTurnResult>;

  constructor(
    options: {
      modelId?: string;
      predefinedResponses?: Record<string, ModelTurnResult>;
    } = {},
  ) {
    this.capabilities = validateModelAdapterCapabilities({
      providerKind: "deterministic-test",
      modelId: options.modelId ?? "deterministic-v1",
      supportsStreaming: true,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 128_000,
      maxOutputTokens: 8_192,
    });
    this.predefinedResponses = new Map();
    for (const [key, result] of Object.entries(
      options.predefinedResponses ?? {},
    )) {
      this.predefinedResponses.set(key, validateModelTurnResult(result));
    }
  }

  getCapabilities(): ModelAdapterCapabilities {
    return this.capabilities;
  }

  async executeTurn(
    request: ModelTurnRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ModelTurnResult> {
    if (options.signal?.aborted) {
      throw new Error("Model turn execution was cancelled");
    }

    const validatedRequest = validateModelTurnRequest(request);
    if (
      validatedRequest.maxTokens !== undefined &&
      validatedRequest.maxTokens > this.capabilities.maxOutputTokens
    ) {
      throw new Error("Requested maxTokens exceeds model output capability");
    }

    const predefined = this.predefinedResponses.get(validatedRequest.sessionId);
    if (predefined) return predefined;

    const userPrompt = validatedRequest.messages.at(-1)?.content ?? "";
    const responseText = `[Deterministic Reference Model Output]: Processing prompt "${userPrompt}"`;
    const inputTokens = syntheticTokenCount(userPrompt);
    const outputTokens = syntheticTokenCount(responseText);

    return validateModelTurnResult({
      schemaVersion: 1,
      sessionId: validatedRequest.sessionId,
      responseText,
      toolCalls: [],
      stopReason: "stop",
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      diagnostics: ["synthetic-token-usage"],
    });
  }
}

function syntheticTokenCount(value: string): number {
  return value.length === 0 ? 0 : Math.ceil(value.length / 4);
}
