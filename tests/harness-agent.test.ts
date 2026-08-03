import type {
  HarnessAgentAdapter,
  HarnessAgentInvocationResult,
} from "../packages/application/src/index.js";
import {
  createFakeHarnessAgentAdapter,
  executeHarnessAgent,
  negotiateAgentCapabilities,
} from "../packages/application/src/index.js";
import type {
  HarnessAgentCapabilities,
  HarnessAgentRequest,
} from "@intentloom/protocol";
import {
  validateHarnessAgentCapabilities,
  validateHarnessAgentRequest,
} from "@intentloom/validator";
import { describe, expect, it, vi } from "vitest";

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
};

const request: HarnessAgentRequest = {
  schemaVersion: 1,
  requestId: "agent-request-1",
  input: "Inspect the supplied evidence",
  responseFormat: "json",
  requirements: {
    requiredFeatures: ["structured-output", "tool-calling", "usage-reporting"],
    estimatedInputTokens: 512,
    maxOutputTokens: 256,
  },
  tools: [
    {
      name: "inspect-evidence",
      description: "Inspect already normalized evidence",
      inputSchema: { type: "object" },
    },
  ],
};

describe("harness agent and model adapters (Phase H5)", () => {
  it("validates versioned capabilities and rejects unknown features", () => {
    expect(validateHarnessAgentCapabilities(capabilities)).toEqual(
      capabilities,
    );
    expect(() =>
      validateHarnessAgentCapabilities({
        ...capabilities,
        features: ["structured-output", "unbounded-shell"],
      }),
    ).toThrow("unknown feature");
    expect(() =>
      validateHarnessAgentRequest({
        ...request,
        requirements: {
          ...request.requirements,
          requiredFeatures: ["tool-calling", "tool-calling"],
        },
      }),
    ).toThrow("must not contain duplicates");
    expect(() =>
      validateHarnessAgentRequest({
        ...request,
        requirements: {
          ...request.requirements,
          requiredFeatures: ["tool-calling", "usage-reporting"],
        },
      }),
    ).toThrow("json responseFormat requires structured-output");
    expect(() =>
      validateHarnessAgentRequest({ ...request, tools: "inspect-evidence" }),
    ).toThrow("agent tools must be an array");
  });

  it("negotiates provider-neutral features and token limits fail closed", () => {
    const result = negotiateAgentCapabilities(request.requirements, {
      ...capabilities,
      features: ["structured-output"],
      maxContextTokens: 128,
      maxOutputTokens: 64,
    });

    expect(result.supported).toBe(false);
    expect(result.missingFeatures).toEqual(["tool-calling", "usage-reporting"]);
    expect(result.diagnostics).toEqual([
      "missing-feature:tool-calling",
      "missing-feature:usage-reporting",
      "context-limit-exceeded",
      "output-limit-exceeded",
    ]);
  });

  it("normalizes structured output, declared tool calls, and usage", async () => {
    const response = {
      structuredOutput: { verdict: "passed" },
      toolCalls: [
        {
          callId: "call-1",
          name: "inspect-evidence",
          arguments: { project: "fixture" },
        },
      ],
      usage: { inputTokens: 21, outputTokens: 8, totalTokens: 999 },
      credential: "must-not-enter-result",
    } as HarnessAgentInvocationResult & { readonly credential: string };
    const result = await executeHarnessAgent({
      adapter: createFakeHarnessAgentAdapter({ response }),
      request,
    });

    expect(result.status).toBe("completed");
    expect(result.structuredOutput).toEqual({ verdict: "passed" });
    expect(result.toolCalls).toEqual([
      {
        callId: "call-1",
        name: "inspect-evidence",
        arguments: { project: "fixture" },
      },
    ]);
    expect(result.usage).toEqual({
      inputTokens: 21,
      outputTokens: 8,
      totalTokens: 29,
    });
    expect(JSON.stringify(result)).not.toContain("must-not-enter-result");
  });

  it("does not invoke an adapter when required capabilities are missing", async () => {
    const invoke = vi.fn().mockResolvedValue({ structuredOutput: {} });
    const adapter: HarnessAgentAdapter = {
      ...createFakeHarnessAgentAdapter(),
      capabilities: { ...capabilities, features: ["structured-output"] },
      invoke,
    };

    const result = await executeHarnessAgent({ adapter, request });

    expect(result.status).toBe("unsupported");
    expect(result.diagnostics).toContain("missing-feature:tool-calling");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects undeclared or malformed tool calls instead of forwarding them", async () => {
    const undeclared = await executeHarnessAgent({
      adapter: createFakeHarnessAgentAdapter({
        response: {
          structuredOutput: {},
          toolCalls: [{ callId: "call-2", name: "publish", arguments: {} }],
          usage: { inputTokens: 1, outputTokens: 1 },
        },
      }),
      request,
    });
    const malformed = await executeHarnessAgent({
      adapter: createFakeHarnessAgentAdapter({
        response: {
          structuredOutput: {},
          toolCalls: [{ name: "inspect-evidence", arguments: {} }],
          usage: { inputTokens: 1, outputTokens: 1 },
        },
      }),
      request,
    });

    expect(undeclared.status).toBe("error");
    expect(undeclared.diagnostics).toEqual(["undeclared-tool-call:publish"]);
    expect(undeclared.toolCalls).toEqual([]);
    expect(malformed.diagnostics).toEqual(["invalid-tool-call"]);
  });

  it("requires explicit remote network, credential, and retention policy", async () => {
    const invoke = vi.fn().mockResolvedValue({ structuredOutput: {} });
    const adapter: HarnessAgentAdapter = {
      ...createFakeHarnessAgentAdapter(),
      mode: "remote",
      dataPolicy: {
        networkAccess: "explicit",
        credentialSource: "none",
        retention: "adapter-disclosed",
        disclosure: "Provider retention applies",
      },
      invoke,
    };

    await expect(executeHarnessAgent({ adapter, request })).rejects.toThrow(
      "remote agent adapters require explicit network",
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("normalizes cancellation and invocation failures without raw errors", async () => {
    const controller = new AbortController();
    controller.abort();
    const cancelled = await executeHarnessAgent({
      adapter: createFakeHarnessAgentAdapter(),
      request,
      signal: controller.signal,
    });
    const failedAdapter: HarnessAgentAdapter = {
      ...createFakeHarnessAgentAdapter(),
      async invoke() {
        throw new Error("provider failed with secret-token-value");
      },
    };
    const failed = await executeHarnessAgent({
      adapter: failedAdapter,
      request,
    });

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.diagnostics).toEqual(["agent-invocation-cancelled"]);
    expect(failed.status).toBe("error");
    expect(failed.diagnostics).toEqual(["agent-invocation-failed"]);
    expect(JSON.stringify(failed)).not.toContain("secret-token-value");
  });

  it("keeps normalized behavior stable when the adapter identity changes", async () => {
    const response: HarnessAgentInvocationResult = {
      structuredOutput: { answer: 42 },
      usage: { inputTokens: 2, outputTokens: 1 },
    };
    const first = await executeHarnessAgent({
      adapter: createFakeHarnessAgentAdapter({
        adapterId: "adapter-a",
        response,
      }),
      request: { ...request, tools: undefined },
    });
    const second = await executeHarnessAgent({
      adapter: createFakeHarnessAgentAdapter({
        adapterId: "adapter-b",
        response,
      }),
      request: { ...request, tools: undefined },
    });
    const { adapterId: firstId, ...firstCanonical } = first;
    const { adapterId: secondId, ...secondCanonical } = second;

    expect(firstId).not.toBe(secondId);
    expect(firstCanonical).toEqual(secondCanonical);
  });
});
