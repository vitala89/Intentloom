import { describe, expect, it } from "vitest";
import type { HarnessCapabilities } from "@intentloom/protocol";
import {
  createContainerSandbox,
  createFakeSandbox,
  createLocalReadonlySandbox,
  negotiateExecutorCapabilities,
} from "../packages/application/src/harness-sandbox.js";

describe("harness execution isolation adapters (Phase H3)", () => {
  const baseRequestedCapabilities: HarnessCapabilities = {
    readonlyFs: true,
    writeFs: true,
    processExecution: true,
    networkAccess: true,
    maxDurationMs: 120_000,
    maxMemoryMb: 1024,
  };

  describe("capability negotiation", () => {
    it("negotiates local-readonly capabilities with zero mutation and zero network", () => {
      const negotiated = negotiateExecutorCapabilities(
        "local-readonly",
        baseRequestedCapabilities,
      );
      expect(negotiated.readonlyFs).toBe(true);
      expect(negotiated.writeFs).toBe(false);
      expect(negotiated.processExecution).toBe(false);
      expect(negotiated.networkAccess).toBe(false);
      expect(negotiated.maxDurationMs).toBeLessThanOrEqual(60_000);
      expect(negotiated.maxMemoryMb).toBeLessThanOrEqual(512);
    });

    it("negotiates container capabilities with default-denied network", () => {
      const negotiated = negotiateExecutorCapabilities(
        "container",
        baseRequestedCapabilities,
      );
      expect(negotiated.readonlyFs).toBe(true);
      expect(negotiated.writeFs).toBe(true);
      expect(negotiated.processExecution).toBe(true);
      expect(negotiated.networkAccess).toBe(false);
      expect(negotiated.maxMemoryMb).toBeLessThanOrEqual(2048);
    });

    it("returns requested capabilities as-is for fake executor", () => {
      const negotiated = negotiateExecutorCapabilities(
        "fake",
        baseRequestedCapabilities,
      );
      expect(negotiated).toEqual(baseRequestedCapabilities);
    });
  });

  describe("local-readonly isolation adapter", () => {
    it("allows read-only inspection actions", async () => {
      const sandbox = createLocalReadonlySandbox({
        projectRoot: "/test/project",
      });
      expect(sandbox.name).toBe("local-readonly");
      expect(sandbox.capabilities.writeFs).toBe(false);

      const result = await sandbox.executeStep({
        stepId: "step-1",
        action: "inspect",
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain("inspect");

      await sandbox.cleanup();
    });

    it("forbids non-allowed mutating actions", async () => {
      const sandbox = createLocalReadonlySandbox({
        projectRoot: "/test/project",
      });

      const result = await sandbox.executeStep({
        stepId: "step-2",
        action: "mutate-file",
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("forbidden");
    });
  });

  describe("container isolation adapter", () => {
    it("formats docker run arguments with mounts, env allowlist, and network isolation", async () => {
      let executedCmd = "";
      let executedArgs: readonly string[] = [];

      const sandbox = createContainerSandbox({
        image: "intentloom-harness:latest",
        envAllowlist: ["NODE_ENV", "TEST_KEY"],
        mounts: [
          {
            hostPath: "/host/project",
            containerPath: "/workspace",
            readonly: true,
          },
        ],
        commandRunner: async (cmd, args) => {
          executedCmd = cmd;
          executedArgs = args;
          return { success: true, message: "Docker run completed" };
        },
      });

      expect(sandbox.name).toBe("container");
      expect(sandbox.capabilities.networkAccess).toBe(false);

      const result = await sandbox.executeStep({
        stepId: "step-3",
        action: "test-suite",
      });

      expect(result.success).toBe(true);
      expect(executedCmd).toBe("docker");
      expect(executedArgs).toEqual([
        "run",
        "--rm",
        "--network",
        "none",
        "-m",
        "1024m",
        "-e",
        "NODE_ENV",
        "-e",
        "TEST_KEY",
        "-v",
        "/host/project:/workspace:ro",
        "intentloom-harness:latest",
        "test-suite",
      ]);
    });

    it("handles container cleanup and prevents step execution afterwards", async () => {
      const sandbox = createContainerSandbox({ image: "node:22" });
      await sandbox.cleanup();

      const result = await sandbox.executeStep({
        stepId: "step-4",
        action: "build",
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain("cleaned up");
    });
  });

  describe("fake isolation adapter", () => {
    it("executes steps with predefined results or fallback success", async () => {
      const sandbox = createFakeSandbox(
        { writeFs: false },
        { "step-custom": { success: true, message: "Custom result" } },
      );

      expect(sandbox.name).toBe("fake");
      expect(sandbox.capabilities.writeFs).toBe(false);

      const customResult = await sandbox.executeStep({
        stepId: "step-custom",
        action: "dummy",
      });
      expect(customResult.message).toBe("Custom result");

      const defaultResult = await sandbox.executeStep({
        stepId: "step-other",
        action: "dummy",
      });
      expect(defaultResult.success).toBe(true);
    });
  });
});
