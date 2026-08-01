export type DesktopPanelRegion = "sidebar-bottom" | "inspector" | "dock";

export interface DesktopPanelDeclaration {
  readonly id: string;
  readonly title: string;
  readonly region: DesktopPanelRegion;
  readonly defaultExpanded?: boolean;
}

export interface RegisteredDesktopPanel {
  readonly declaration: DesktopPanelDeclaration;
  readonly render: () => unknown;
}

export class DesktopPanelRegistry {
  private readonly panels = new Map<string, RegisteredDesktopPanel>();

  public register(
    declaration: DesktopPanelDeclaration,
    render: () => unknown,
  ): () => void {
    this.panels.set(declaration.id, { declaration, render });
    return () => {
      this.panels.delete(declaration.id);
    };
  }

  public getByRegion(
    region: DesktopPanelRegion,
  ): readonly RegisteredDesktopPanel[] {
    const matched: RegisteredDesktopPanel[] = [];
    for (const panel of this.panels.values()) {
      if (panel.declaration.region === region) {
        matched.push(panel);
      }
    }
    return matched;
  }
}

export const globalPanelRegistry = new DesktopPanelRegistry();
