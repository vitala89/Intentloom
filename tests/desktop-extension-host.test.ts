import { describe, expect, it } from "vitest";
import { validateDesktopExtensionContribution } from "../packages/validator/src/index.js";
import type { DesktopExtensionContribution } from "../packages/protocol/src/index.js";

describe("Desktop Extension Host API validation", () => {
  it("validates a valid desktop theme contribution", () => {
    const themeContrib: DesktopExtensionContribution = {
      kind: "theme",
      id: "theme.custom-dark",
      theme: {
        id: "custom-dark",
        name: "Custom Dark Theme",
        variant: "dark",
        tokens: {
          "--surface": "#121212",
          "--text-primary": "#ffffff",
        },
      },
    };

    const diagnostics = validateDesktopExtensionContribution(themeContrib);
    expect(diagnostics).toHaveLength(0);
  });

  it("validates a valid desktop view contribution", () => {
    const viewContrib: DesktopExtensionContribution = {
      kind: "view",
      id: "view.analytics",
      view: {
        id: "analytics",
        title: "Analytics Dashboard",
        icon: "scan-search",
        category: "Diagnostics",
      },
    };

    const diagnostics = validateDesktopExtensionContribution(viewContrib);
    expect(diagnostics).toHaveLength(0);
  });

  it("detects invalid contribution kind", () => {
    const invalidContrib = {
      kind: "unsupported-kind",
      id: "invalid.item",
    };

    const diagnostics = validateDesktopExtensionContribution(invalidContrib);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-contribution-kind");
  });

  it("detects missing contribution id", () => {
    const invalidContrib = {
      kind: "command",
      id: "",
    };

    const diagnostics = validateDesktopExtensionContribution(invalidContrib);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-contribution-id");
  });

  it("detects non-object contribution input", () => {
    const diagnostics = validateDesktopExtensionContribution("not an object");
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-contribution-object");
  });
});
