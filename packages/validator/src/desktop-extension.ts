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
