import { describe, expect, it } from "vitest";
import { validateDesktopViewContribution } from "../packages/validator/src/index.js";
import {
  createInitMessage,
  isViewSandboxMessage,
} from "../apps/desktop/src/views/view-sandbox-protocol.js";

describe("Desktop View Sandbox & Frame Protocol", () => {
  it("validates a valid desktop view contribution", () => {
    const validView = {
      id: "view.custom-viz",
      title: "Custom Visualization",
    };

    const diagnostics = validateDesktopViewContribution(validView);
    expect(diagnostics).toHaveLength(0);
  });

  it("detects missing view title", () => {
    const invalidView = {
      id: "view.custom-viz",
      title: "",
    };

    const diagnostics = validateDesktopViewContribution(invalidView);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-view-title");
  });

  it("creates and validates init message for sandboxed view", () => {
    const msg = createInitMessage("/home/user/project", "dark", [
      "intentloom.project.inspect.v1",
    ]);

    expect(msg.type).toBe("intentloom:view:init");
    expect(msg.payload.root).toBe("/home/user/project");
    expect(msg.payload.theme).toBe("dark");
    expect(isViewSandboxMessage(msg)).toBe(true);
  });
});
