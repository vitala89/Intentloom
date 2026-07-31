import { describe, expect, it, vi } from "vitest";
import { validateDesktopCommandContribution } from "../packages/validator/src/index.js";
import { DesktopCommandRegistry } from "../apps/desktop/src/views/command-registry.js";
import type { DesktopCommandContribution } from "../packages/protocol/src/index.js";

describe("Desktop Command Palette Contribution & Registry", () => {
  it("validates a valid desktop command contribution", () => {
    const validCmd: DesktopCommandContribution = {
      id: "extension.git.diff",
      title: "Review Extension Diffs",
      category: "Actions",
      shortcut: "⌘Shift+D",
    };

    const diagnostics = validateDesktopCommandContribution(validCmd);
    expect(diagnostics).toHaveLength(0);
  });

  it("detects invalid command category", () => {
    const invalidCmd = {
      id: "extension.git.diff",
      title: "Review Extension Diffs",
      category: "UnknownCategory",
    };

    const diagnostics = validateDesktopCommandContribution(invalidCmd);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-command-category");
  });

  it("registers, converts options, and executes command in registry", async () => {
    const registry = new DesktopCommandRegistry();
    const mockAction = vi.fn();

    const cmdDecl: DesktopCommandContribution = {
      id: "cmd.test",
      title: "Test Command",
      category: "Navigation",
    };

    const unregister = registry.register(cmdDecl, mockAction);
    expect(registry.get("cmd.test")).toBeDefined();

    const options = registry.toCommandOptions();
    expect(options).toHaveLength(1);
    expect(options[0]?.label).toBe("Test Command");

    const executed = await registry.execute("cmd.test");
    expect(executed).toBe(true);
    expect(mockAction).toHaveBeenCalledTimes(1);

    unregister();
    expect(registry.get("cmd.test")).toBeUndefined();
  });
});
