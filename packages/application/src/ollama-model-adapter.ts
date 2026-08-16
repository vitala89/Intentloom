import type {
  ModelAdapterCapabilities,
  ModelMessage,
  ModelTurnRequest,
  ModelTurnResult,
} from "../../protocol/src/model-adapter.js";
import {
  NEUTRON_N2_MAX_BODY_BYTES,
  NeutronN2Error,
  parseNeutronN2BaseUrl,
} from "../../validator/src/neutron-runtime-n2.js";
import {
  validateModelAdapterCapabilities,
  validateModelTurnRequest,
  validateModelTurnResult,
} from "../../validator/src/model-adapter.js";
import type { ModelAdapter } from "./model-adapter.js";

export interface OllamaModelAdapterOptions {
  readonly baseUrl?: string;
  readonly modelId?: string;
  readonly fetchImpl?: typeof fetch;
}

interface OllamaChatMessage {
  readonly role?: string;
  readonly content?: string;
  readonly tool_calls?: readonly {
    readonly id?: string;
    readonly function?: {
      readonly name?: string;
      readonly arguments?: unknown;
    };
  }[];
}

export class OllamaModelAdapter implements ModelAdapter {
  private readonly endpoint: URL;
  private readonly capabilities: ModelAdapterCapabilities;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OllamaModelAdapterOptions = {}) {
    this.endpoint = parseNeutronN2BaseUrl(
      options.baseUrl ?? "http://127.0.0.1:11434",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.capabilities = validateModelAdapterCapabilities({
      providerKind: "ollama",
      modelId: options.modelId ?? "llama3.2",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
      maxContextTokens: 32_768,
      maxOutputTokens: 4_096,
    });
  }

  getCapabilities(): ModelAdapterCapabilities {
    return this.capabilities;
  }

  async executeTurn(
    request: ModelTurnRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<ModelTurnResult> {
    if (options.signal?.aborted) {
      throw new NeutronN2Error(
        "cancelled",
        "Model turn execution was cancelled",
      );
    }
    const validated = validateModelTurnRequest(request);
    if (
      validated.maxTokens !== undefined &&
      validated.maxTokens > this.capabilities.maxOutputTokens
    ) {
      throw new NeutronN2Error(
        "budget-exceeded",
        "Requested maxTokens exceeds model output capability",
      );
    }
    const body = JSON.stringify({
      model: this.capabilities.modelId,
      stream: false,
      messages: validated.messages.map(toOllamaMessage),
      tools: validated.tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parametersSchema,
        },
      })),
      options:
        validated.maxTokens === undefined
          ? undefined
          : { num_predict: validated.maxTokens },
    });
    if (body.length > NEUTRON_N2_MAX_BODY_BYTES) {
      throw new NeutronN2Error(
        "budget-exceeded",
        "Ollama request exceeds limit",
      );
    }
    const response = await this.postChat(body, options.signal);
    const text = await readBoundedBody(response);
    const parsed = parseChatResponse(text, validated.sessionId);
    return validateModelTurnResult(parsed);
  }

  private async postChat(
    body: string,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    try {
      return await this.fetchImpl(new URL("/api/chat", this.endpoint), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        redirect: "error",
        ...(signal === undefined ? {} : { signal }),
      });
    } catch (error) {
      if (optionsAborted(signal, error)) {
        throw new NeutronN2Error(
          "cancelled",
          "Model turn execution was cancelled",
        );
      }
      throw new NeutronN2Error(
        "adapter-unconfigured",
        "Ollama daemon is unreachable",
      );
    }
  }
}

function toOllamaMessage(message: ModelMessage): Record<string, string> {
  return {
    role: message.role,
    content: message.content,
    ...(message.toolCallId === undefined
      ? {}
      : { tool_call_id: message.toolCallId }),
  };
}

async function readBoundedBody(response: Response): Promise<string> {
  const text = await response.text();
  if (text.length > NEUTRON_N2_MAX_BODY_BYTES) {
    throw new NeutronN2Error(
      "budget-exceeded",
      "Ollama response exceeds limit",
    );
  }
  if (!response.ok) {
    throw new NeutronN2Error(
      "adapter-unconfigured",
      `Ollama daemon returned HTTP ${String(response.status)}`,
    );
  }
  return text;
}

function parseChatResponse(text: string, sessionId: string): ModelTurnResult {
  let payload: { message?: OllamaChatMessage };
  try {
    payload = JSON.parse(text) as { message?: OllamaChatMessage };
  } catch {
    throw new NeutronN2Error(
      "validation-failed",
      "Ollama response is not JSON",
    );
  }
  const message = payload.message ?? {};
  const toolCalls = (message.tool_calls ?? []).map((call, index) => {
    const name = call.function?.name;
    if (typeof name !== "string" || name.length === 0) {
      throw new NeutronN2Error(
        "validation-failed",
        "Ollama tool call is invalid",
      );
    }
    return {
      id:
        typeof call.id === "string" && call.id.length > 0
          ? call.id
          : `call-${String(index)}`,
      name,
      argumentsJson: JSON.stringify(call.function?.arguments ?? {}),
    };
  });
  const responseText =
    typeof message.content === "string" ? message.content : "";
  return {
    schemaVersion: 1,
    sessionId,
    responseText,
    toolCalls,
    stopReason: toolCalls.length > 0 ? "tool_call" : "stop",
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    diagnostics: ["ollama-unmetered-usage"],
  };
}

function optionsAborted(
  signal: AbortSignal | undefined,
  error: unknown,
): boolean {
  return (
    signal?.aborted === true ||
    (error instanceof Error && error.name === "AbortError")
  );
}
