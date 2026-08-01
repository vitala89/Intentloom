export interface DesktopContributionDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export function validateDesktopExtensionContribution(
  contribution: unknown,
): readonly DesktopContributionDiagnostic[] {
  const diagnostics: DesktopContributionDiagnostic[] = [];
  if (!contribution || typeof contribution !== "object") {
    diagnostics.push({
      code: "invalid-contribution-object",
      path: "/",
      message: "contribution must be a non-null object",
    });
    return diagnostics;
  }
  const obj = contribution as Record<string, unknown>;
  const validKinds = ["theme", "view", "panel", "command", "menu", "settings"];
  if (typeof obj.kind !== "string" || !validKinds.includes(obj.kind)) {
    diagnostics.push({
      code: "invalid-contribution-kind",
      path: "/kind",
      message: `kind must be one of: ${validKinds.join(", ")}`,
    });
  }
  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    diagnostics.push({
      code: "invalid-contribution-id",
      path: "/id",
      message: "contribution id must be a non-empty string",
    });
  }
  return diagnostics;
}

export const ALLOWED_THEME_TOKEN_NAMES = [
  "--surface-base",
  "--surface-raised",
  "--surface-overlay",
  "--surface-subtle",
  "--text-primary",
  "--text-secondary",
  "--text-tertiary",
  "--text-action",
  "--action-primary",
  "--action-primary-hover",
  "--action-subtle",
  "--status-success",
  "--status-warning",
  "--status-error",
  "--status-info",
  "--border-subtle",
  "--border-default",
  "--border-focus",
] as const;

export function validateDesktopThemeContribution(
  theme: unknown,
): readonly DesktopContributionDiagnostic[] {
  const diagnostics: DesktopContributionDiagnostic[] = [];
  if (!theme || typeof theme !== "object") {
    diagnostics.push({
      code: "invalid-theme-object",
      path: "/",
      message: "theme must be a non-null object",
    });
    return diagnostics;
  }
  const obj = theme as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    diagnostics.push({
      code: "invalid-theme-id",
      path: "/id",
      message: "theme id must be a non-empty string",
    });
  }
  if (typeof obj.name !== "string" || obj.name.trim() === "") {
    diagnostics.push({
      code: "invalid-theme-name",
      path: "/name",
      message: "theme name must be a non-empty string",
    });
  }
  if (obj.variant !== "dark" && obj.variant !== "light") {
    diagnostics.push({
      code: "invalid-theme-variant",
      path: "/variant",
      message: "theme variant must be 'dark' or 'light'",
    });
  }
  if (!obj.tokens || typeof obj.tokens !== "object") {
    diagnostics.push({
      code: "invalid-theme-tokens",
      path: "/tokens",
      message: "theme tokens must be a Record<string, string>",
    });
  } else {
    for (const [key, val] of Object.entries(
      obj.tokens as Record<string, unknown>,
    )) {
      if (!key.startsWith("--")) {
        diagnostics.push({
          code: "invalid-token-name",
          path: `/tokens/${key}`,
          message: `token name "${key}" must start with "--"`,
        });
      }
      if (typeof val !== "string") {
        diagnostics.push({
          code: "invalid-token-value",
          path: `/tokens/${key}`,
          message: `token value for "${key}" must be a string`,
        });
      }
    }
  }
  return diagnostics;
}

export function validateDesktopViewContribution(
  view: unknown,
): readonly DesktopContributionDiagnostic[] {
  const diagnostics: DesktopContributionDiagnostic[] = [];
  if (!view || typeof view !== "object") {
    diagnostics.push({
      code: "invalid-view-object",
      path: "/",
      message: "view must be a non-null object",
    });
    return diagnostics;
  }
  const obj = view as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    diagnostics.push({
      code: "invalid-view-id",
      path: "/id",
      message: "view id must be a non-empty string",
    });
  }
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    diagnostics.push({
      code: "invalid-view-title",
      path: "/title",
      message: "view title must be a non-empty string",
    });
  }
  return diagnostics;
}

export function validateDesktopCommandContribution(
  cmd: unknown,
): readonly DesktopContributionDiagnostic[] {
  const diagnostics: DesktopContributionDiagnostic[] = [];
  if (!cmd || typeof cmd !== "object") {
    diagnostics.push({
      code: "invalid-command-object",
      path: "/",
      message: "command must be a non-null object",
    });
    return diagnostics;
  }
  const obj = cmd as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    diagnostics.push({
      code: "invalid-command-id",
      path: "/id",
      message: "command id must be a non-empty string",
    });
  }
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    diagnostics.push({
      code: "invalid-command-title",
      path: "/title",
      message: "command title must be a non-empty string",
    });
  }
  const validCategories = ["Navigation", "Actions", "Diagnostics"];
  if (
    typeof obj.category !== "string" ||
    !validCategories.includes(obj.category)
  ) {
    diagnostics.push({
      code: "invalid-command-category",
      path: "/category",
      message: `command category must be one of: ${validCategories.join(", ")}`,
    });
  }
  return diagnostics;
}

export function validateDesktopSettingsContribution(
  settings: unknown,
): readonly DesktopContributionDiagnostic[] {
  const diagnostics: DesktopContributionDiagnostic[] = [];
  if (!settings || typeof settings !== "object") {
    diagnostics.push({
      code: "invalid-settings-object",
      path: "/",
      message: "settings must be a non-null object",
    });
    return diagnostics;
  }
  const obj = settings as Record<string, unknown>;
  if (typeof obj.id !== "string" || obj.id.trim() === "") {
    diagnostics.push({
      code: "invalid-settings-id",
      path: "/id",
      message: "settings id must be a non-empty string",
    });
  }
  if (typeof obj.title !== "string" || obj.title.trim() === "") {
    diagnostics.push({
      code: "invalid-settings-title",
      path: "/title",
      message: "settings title must be a non-empty string",
    });
  }
  return diagnostics;
}
