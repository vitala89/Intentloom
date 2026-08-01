import { describe, expect, it } from "vitest";
import {
  validateDesktopPanelContribution,
  validateDesktopRendererContribution,
} from "../packages/validator/src/index.js";
import { DesktopPanelRegistry } from "../apps/desktop/src/views/panel-registry.js";

describe("Desktop Renderer & Extension Panel Placement", () => {
  it("validates a valid desktop panel contribution", () => {
    const validPanel = {
      id: "panel.git-status",
      title: "Git Workspace Status",
      region: "sidebar-bottom",
    };

    const diagnostics = validateDesktopPanelContribution(validPanel);
    expect(diagnostics).toHaveLength(0);
  });

  it("detects invalid panel region", () => {
    const invalidPanel = {
      id: "panel.git-status",
      title: "Git Workspace Status",
      region: "header-top",
    };

    const diagnostics = validateDesktopPanelContribution(invalidPanel);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("invalid-panel-region");
  });

  it("validates a valid desktop renderer contribution", () => {
    const validRenderer = {
      id: "renderer.mermaid-diagram",
      resourceType: "application/vnd.intentloom.diagram+json",
    };

    const diagnostics = validateDesktopRendererContribution(validRenderer);
    expect(diagnostics).toHaveLength(0);
  });

  it("registers panels and retrieves them filtered by region", () => {
    const registry = new DesktopPanelRegistry();
    const panelDecl = {
      id: "panel.status",
      title: "Status Panel",
      region: "sidebar-bottom" as const,
    };

    const unregister = registry.register(panelDecl, () => "Panel UI");
    const sidebarPanels = registry.getByRegion("sidebar-bottom");
    expect(sidebarPanels).toHaveLength(1);
    expect(sidebarPanels[0]?.declaration.title).toBe("Status Panel");

    const inspectorPanels = registry.getByRegion("inspector");
    expect(inspectorPanels).toHaveLength(0);

    unregister();
    expect(registry.getByRegion("sidebar-bottom")).toHaveLength(0);
  });
});
