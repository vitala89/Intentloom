import type { HarnessAgentCapabilities } from "@intentloom/protocol";
import type { HarnessAgentInvocationResult } from "./harness-agent-result.js";
import type { HarnessAgentAdapter } from "./harness-agent.js";

export interface FakeHarnessAgentAdapterOptions {
  readonly adapterId?: string;
  readonly capabilities?: Partial<HarnessAgentCapabilities>;
  readonly response?: HarnessAgentInvocationResult;
}

export function createFakeHarnessAgentAdapter(
  options: FakeHarnessAgentAdapterOptions = {},
): HarnessAgentAdapter {
  const capabilities: HarnessAgentCapabilities = {
    schemaVersion: 1,
    features: [
      "structured-output",
      "tool-calling",
      "deterministic-settings",
      "cancellation",
      "usage-reporting",
    ],
    maxContextTokens: 16_384,
    maxOutputTokens: 4_096,
    ...options.capabilities,
  };
  return {
    adapterId: options.adapterId ?? "fake-offline-agent",
    mode: "offline",
    capabilities,
    dataPolicy: {
      networkAccess: "disabled",
      credentialSource: "none",
      retention: "local-only",
    },
    async invoke(request) {
      return (
        options.response ?? {
          outputText: request.input,
          usage: { inputTokens: 0, outputTokens: 0 },
        }
      );
    },
  };
}
