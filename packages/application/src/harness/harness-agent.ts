import type {
  HarnessAgentCapabilities,
  HarnessAgentCapabilityNegotiation,
  HarnessAgentDataPolicy,
  HarnessAgentExecutionMode,
  HarnessAgentRequest,
  HarnessAgentResult,
} from "@intentloom/protocol";
import {
  validateHarnessAgentCapabilities,
  validateHarnessAgentRequest,
} from "@intentloom/validator";
import type { HarnessAgentInvocationResult } from "./harness-agent-result.js";
import { normalizeHarnessAgentResult } from "./harness-agent-result.js";

export interface HarnessAgentAdapter {
  readonly adapterId: string;
  readonly mode: HarnessAgentExecutionMode;
  readonly capabilities: HarnessAgentCapabilities;
  readonly dataPolicy: HarnessAgentDataPolicy;
  invoke(
    request: HarnessAgentRequest,
    options: { readonly signal?: AbortSignal },
  ): Promise<HarnessAgentInvocationResult>;
}

export interface ExecuteHarnessAgentOptions {
  readonly adapter: HarnessAgentAdapter;
  readonly request: HarnessAgentRequest;
  readonly signal?: AbortSignal;
}

function validateAdapterPolicy(adapter: HarnessAgentAdapter): void {
  if (!adapter.adapterId) throw new Error("adapterId must be non-empty");
  if (adapter.mode !== "offline" && adapter.mode !== "remote") {
    throw new Error("agent adapter mode must be offline or remote");
  }
  if (adapter.mode === "offline") {
    if (
      adapter.dataPolicy.networkAccess !== "disabled" ||
      adapter.dataPolicy.credentialSource !== "none" ||
      adapter.dataPolicy.retention !== "local-only"
    ) {
      throw new Error(
        "offline agent adapters require a local-only data policy",
      );
    }
    return;
  }
  if (
    adapter.dataPolicy.networkAccess !== "explicit" ||
    adapter.dataPolicy.credentialSource !== "invocation" ||
    adapter.dataPolicy.retention !== "adapter-disclosed" ||
    !adapter.dataPolicy.disclosure?.trim()
  ) {
    throw new Error(
      "remote agent adapters require explicit network, invocation credentials, and retention disclosure",
    );
  }
}

export function negotiateAgentCapabilities(
  required: HarnessAgentRequest["requirements"],
  offeredValue: unknown,
): HarnessAgentCapabilityNegotiation {
  const offered = validateHarnessAgentCapabilities(offeredValue);
  const offeredFeatures = new Set(offered.features);
  const missingFeatures = required.requiredFeatures.filter(
    (feature) => !offeredFeatures.has(feature),
  );
  const diagnostics = missingFeatures.map(
    (feature) => `missing-feature:${feature}`,
  );
  if (offered.maxContextTokens < required.estimatedInputTokens) {
    diagnostics.push("context-limit-exceeded");
  }
  if (offered.maxOutputTokens < required.maxOutputTokens) {
    diagnostics.push("output-limit-exceeded");
  }
  return {
    supported: diagnostics.length === 0,
    missingFeatures,
    diagnostics,
  };
}

function terminalResult(
  adapterId: string,
  requestId: string,
  status: "cancelled" | "error" | "unsupported",
  diagnostics: readonly string[],
): HarnessAgentResult {
  return {
    schemaVersion: 1,
    requestId,
    adapterId,
    status,
    toolCalls: [],
    diagnostics,
  };
}

export async function executeHarnessAgent(
  options: ExecuteHarnessAgentOptions,
): Promise<HarnessAgentResult> {
  validateAdapterPolicy(options.adapter);
  const request = validateHarnessAgentRequest(options.request);
  const negotiation = negotiateAgentCapabilities(
    request.requirements,
    options.adapter.capabilities,
  );
  if (!negotiation.supported) {
    return terminalResult(
      options.adapter.adapterId,
      request.requestId,
      "unsupported",
      negotiation.diagnostics,
    );
  }
  if (options.signal?.aborted) {
    return terminalResult(
      options.adapter.adapterId,
      request.requestId,
      "cancelled",
      ["agent-invocation-cancelled"],
    );
  }
  try {
    const raw = await options.adapter.invoke(
      request,
      options.signal ? { signal: options.signal } : {},
    );
    return normalizeHarnessAgentResult(options.adapter.adapterId, request, raw);
  } catch (error) {
    const cancelled =
      options.signal?.aborted ||
      (error instanceof Error && error.name === "AbortError");
    return terminalResult(
      options.adapter.adapterId,
      request.requestId,
      cancelled ? "cancelled" : "error",
      [cancelled ? "agent-invocation-cancelled" : "agent-invocation-failed"],
    );
  }
}
