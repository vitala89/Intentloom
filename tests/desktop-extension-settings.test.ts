import { describe, expect, it } from "vitest";
import { validateDesktopSettingsContribution } from "../packages/validator/src/index.js";
import { ExtensionSettingsStore } from "../apps/desktop/src/views/extension-settings.js";

describe("Desktop Provider UI & Extension Settings", () => {
  it("validates a valid desktop settings contribution", () => {
    const validSettings = {
      id: "settings.extension.mcp-github",
      title: "GitHub MCP Server Settings",
    };

    const diagnostics = validateDesktopSettingsContribution(validSettings);
    expect(diagnostics).toHaveLength(0);
  });

  it("detects missing settings title", () => {
    const invalidSettings = {
      id: "settings.extension.mcp-github",
      title: "",
    };

    const diagnostics = validateDesktopSettingsContribution(invalidSettings);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-settings-title");
  });

  it("registers section, initializes defaults, and sets valid values", () => {
    const store = new ExtensionSettingsStore();
    const section = {
      id: "ext.github",
      title: "GitHub Settings",
      properties: {
        autoSync: {
          type: "boolean" as const,
          title: "Auto-sync repositories",
          default: true,
        },
        syncIntervalMin: {
          type: "number" as const,
          title: "Sync interval (minutes)",
          default: 15,
        },
      },
    };

    const unregister = store.registerSection(section);
    expect(store.get("ext.github", "autoSync")).toBe(true);
    expect(store.get("ext.github", "syncIntervalMin")).toBe(15);

    const updated = store.set("ext.github", "syncIntervalMin", 30);
    expect(updated).toBe(true);
    expect(store.get("ext.github", "syncIntervalMin")).toBe(30);

    const invalidType = store.set(
      "ext.github",
      "syncIntervalMin",
      "thirty" as unknown as number,
    );
    expect(invalidType).toBe(false);

    unregister();
    expect(store.getSection("ext.github")).toBeUndefined();
  });
});
