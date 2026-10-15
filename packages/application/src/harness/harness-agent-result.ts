import type {
  HarnessAgentRequest,
  HarnessAgentResult,
  HarnessAgentToolCall,
  HarnessAgentUsage,
} from "@intentloom/protocol";

export interface HarnessAgentInvocationResult {
  readonly outputText?: unknown;
  readonly structuredOutput?: unknown;
  readonly toolCalls?: unknown;
  readonly usage?: unknown;
}

interface NormalizedToolCalls {
  readonly toolCalls: readonly HarnessAgentToolCall[];
  readonly invalid: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function terminalResult(
  adapterId: string,
  requestId: string,
  diagnostic: string,
): HarnessAgentResult {
  return {
    schemaVersion: 1,
    requestId,
    adapterId,
    status: "error",
    toolCalls: [],
    diagnostics: [diagnostic],
  };
}

function normalizeToolCalls(value: unknown): NormalizedToolCalls {
  if (value === undefined) return { toolCalls: [], invalid: false };
  if (!Array.isArray(value)) return { toolCalls: [], invalid: true };
  const toolCalls = value.flatMap((candidate) => {
    if (
      !isObject(candidate) ||
      typeof candidate.callId !== "string" ||
      !candidate.callId ||
      typeof candidate.name !== "string" ||
      !candidate.name ||
      !isObject(candidate.arguments)
    ) {
      return [];
    }
    return [
      {
        callId: candidate.callId,
        name: candidate.name,
        arguments: candidate.arguments,
      },
    ];
  });
  return { toolCalls, invalid: toolCalls.length !== value.length };
}

function normalizeUsage(value: unknown): HarnessAgentUsage | undefined {
  if (!isObject(value)) return undefined;
  const inputTokens = value.inputTokens;
  const outputTokens = value.outputTokens;
  if (
    typeof inputTokens !== "number" ||
    !Number.isInteger(inputTokens) ||
    inputTokens < 0 ||
    typeof outputTokens !== "number" ||
    !Number.isInteger(outputTokens) ||
    outputTokens < 0
  ) {
    return undefined;
  }
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

export function normalizeHarnessAgentResult(
  adapterId: string,
  request: HarnessAgentRequest,
  raw: HarnessAgentInvocationResult,
): HarnessAgentResult {
  const structuredOutput = isObject(raw.structuredOutput)
    ? raw.structuredOutput
    : undefined;
  const outputText =
    typeof raw.outputText === "string" ? raw.outputText : undefined;
  const usage = normalizeUsage(raw.usage);
  const normalizedCalls = normalizeToolCalls(raw.toolCalls);
  if (normalizedCalls.invalid) {
    return terminalResult(adapterId, request.requestId, "invalid-tool-call");
  }
  const allowedTools = new Set((request.tools ?? []).map((tool) => tool.name));
  const undeclaredCall = normalizedCalls.toolCalls.find(
    (call) => !allowedTools.has(call.name),
  );
  if (undeclaredCall) {
    return terminalResult(
      adapterId,
      request.requestId,
      `undeclared-tool-call:${undeclaredCall.name}`,
    );
  }
  if (request.responseFormat === "json" && !structuredOutput) {
    return terminalResult(
      adapterId,
      request.requestId,
      "invalid-structured-output",
    );
  }
  if (request.responseFormat === "text" && outputText === undefined) {
    return terminalResult(adapterId, request.requestId, "invalid-text-output");
  }
  if (
    request.requirements.requiredFeatures.includes("usage-reporting") &&
    !usage
  ) {
    return terminalResult(adapterId, request.requestId, "invalid-usage-report");
  }
  return {
    schemaVersion: 1,
    requestId: request.requestId,
    adapterId,
    status: "completed",
    ...(request.responseFormat === "text" && outputText !== undefined
      ? { outputText }
      : {}),
    ...(request.responseFormat === "json" && structuredOutput !== undefined
      ? { structuredOutput }
      : {}),
    toolCalls: normalizedCalls.toolCalls,
    ...(usage ? { usage } : {}),
    diagnostics: [],
  };
}
