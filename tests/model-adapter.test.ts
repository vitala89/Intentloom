import { describe, expect, it } from "vitest";
import {
  DeterministicTestModelAdapter,
} from "@intentloom/application/model-adapter";
import type { ModelTurnRequest } from "@intentloom/protocol/model-adapter";
import {
  validateModelAdapterConfig,
  validateModelTurnRequest,
} from "@intentloom/validator/model-adapter";

describe("DeterministicTestModelAdapter", () => {
  it("provides valid deterministic model capabilities", () => {
    const adapter = new DeterministicTestModelAdapter({
      modelId: "test-model-1",
    });
    const capabilities = adapter.getCapabilities();

    expect(capabilities.providerKind).toBe("deterministic-test");
    expect(capabilities.modelId).toBe("test-model-1");
    expect(capabilities.supportsStreaming).toBe(true);
    expect(capabilities.supportsToolCalls).toBe(true);
    expect(capabilities.maxContextTokens).toBe(128_000);
  });

  it("executes a deterministic offline turn", async () => {
    const adapter = new DeterministicTestModelAdapter();
    const request: ModelTurnRequest = {
      schemaVersion: 1,
      sessionId: "session-1",
      messages: [
        { role: "user", content: "Inspect the repository structure" },
      ],
      maxTokens: 100,
    };

    const result = await adapter.executeTurn(request);

    expect(result.responseText).toContain("Inspect the repository structure");
    expect(result.stopReason).toBe("stop");
    expect(result.usage.totalTokens).toBe(
      result.usage.inputTokens + result.usage.outputTokens,
    );
    expect(result.diagnostics).toContain("synthetic-token-usage");
  });

  it("returns validated predefined responses", async () => {
    const adapter = new DeterministicTestModelAdapter({
      predefinedResponses: {
        "session-custom": {
          schemaVersion: 1,
          sessionId: "session-custom",
          responseText: "Custom Predefined Analysis",
          toolCalls: [
            {
              id: "call-1",
              name: "doctorProject",
              argumentsJson: JSON.stringify({ root: "/project" }),
            },
          ],
          stopReason: "tool_call",
          usage: { inputTokens: 50, outputTokens: 20, totalTokens: 70 },
          diagnostics: [],
        },
      },
    });

    const result = await adapter.executeTurn({
      schemaVersion: 1,
      sessionId: "session-custom",
      messages: [{ role: "user", content: "Run doctor" }],
    });

    expect(result.responseText).toBe("Custom Predefined Analysis");
    expect(result.toolCalls[0]?.name).toBe("doctorProject");
  });

  it("rejects output budgets above adapter capability", async () => {
    const adapter = new DeterministicTestModelAdapter();

    await expect(
      adapter.executeTurn({
        schemaVersion: 1,
        sessionId: "session-budget",
        messages: [{ role: "user", content: "Plan" }],
        maxTokens: 8_193,
      }),
    ).rejects.toThrow("exceeds model output capability");
  });

  it("handles cancellation before model execution", async () => {
    const adapter = new DeterministicTestModelAdapter();
    const controller = new AbortController();
    controller.abort();

    await expect(
      adapter.executeTurn(
        {
          schemaVersion: 1,
          sessionId: "session-cancelled",
          messages: [{ role: "user", content: "Run" }],
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow("cancelled");
  });

  it("preserves validated request options", () => {
    const request = validateModelTurnRequest({
      schemaVersion: 1,
      sessionId: "session-options",
      messages: [],
      temperature: 0.2,
      maxTokens: 256,
    });

    expect(request.temperature).toBe(0.2);
    expect(request.maxTokens).toBe(256);
  });

  it("rejects invalid adapter configuration budgets", () => {
    expect(() =>
      validateModelAdapterConfig({
        schemaVersion: 1,
        providerKind: "openai",
        modelId: "model",
        maxTokens: 0,
      }),
    ).toThrow("positive integer");
  });
});
