export type DesktopContributionKind =
  "theme" | "view" | "panel" | "command" | "menu" | "settings";

export interface DesktopThemeContribution {
  readonly id: string;
  readonly name: string;
  readonly variant: "dark" | "light";
  readonly tokens: Record<string, string>;
}

export interface DesktopViewContribution {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly category?: string;
}

export interface DesktopCommandContribution {
  readonly id: string;
  readonly title: string;
  readonly category: "Navigation" | "Actions" | "Diagnostics";
  readonly shortcut?: string;
}

export interface DesktopExtensionContribution {
  readonly kind: DesktopContributionKind;
  readonly id: string;
  readonly theme?: DesktopThemeContribution;
  readonly view?: DesktopViewContribution;
  readonly command?: DesktopCommandContribution;
}
