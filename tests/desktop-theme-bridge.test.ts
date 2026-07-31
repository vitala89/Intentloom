import { describe, expect, it } from "vitest";
import { validateDesktopThemeContribution } from "../packages/validator/src/index.js";
import type { DesktopThemeContribution } from "../packages/protocol/src/index.js";

describe("Desktop Theme Contribution & Bridge", () => {
  it("validates a valid desktop theme contribution", () => {
    const validTheme: DesktopThemeContribution = {
      id: "theme.nord",
      name: "Nord Theme",
      variant: "dark",
      tokens: {
        "--surface-base": "#2e3440",
        "--text-primary": "#eceff4",
        "--action-primary": "#88c0d0",
      },
    };

    const diagnostics = validateDesktopThemeContribution(validTheme);
    expect(diagnostics).toHaveLength(0);
  });

  it("detects invalid token names without '--' prefix", () => {
    const invalidTheme = {
      id: "theme.invalid",
      name: "Invalid Theme",
      variant: "dark",
      tokens: {
        surfaceBase: "#2e3440",
      },
    };

    const diagnostics = validateDesktopThemeContribution(invalidTheme);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-token-name");
  });

  it("detects invalid theme variant", () => {
    const invalidTheme = {
      id: "theme.invalid",
      name: "Invalid Theme",
      variant: "neon",
      tokens: {
        "--surface-base": "#000000",
      },
    };

    const diagnostics = validateDesktopThemeContribution(invalidTheme);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-theme-variant");
  });
});
