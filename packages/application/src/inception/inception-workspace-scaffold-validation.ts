import type { ScaffoldPlan } from "@intentloom/protocol";
import { validateScaffoldPlan } from "@intentloom/validator";

const REQUIRED_WORKSPACE_PATHS = [
  "pnpm-workspace.yaml",
  "packages/core/package.json",
  "packages/react/package.json",
  "packages/testing/package.json",
  "examples/vanilla-basic/package.json",
  "examples/react-basic/package.json",
] as const;

export interface WorkspaceScaffoldValidationResult {
  readonly valid: boolean;
  readonly violations: readonly string[];
}

export function validateWorkspaceScaffoldPlan(
  plan: ScaffoldPlan,
): WorkspaceScaffoldValidationResult {
  const validated = validateScaffoldPlan(plan);
  const violations: string[] = [];
  const paths = new Set(validated.files.map((file) => file.path));
  const contentByPath = new Map(
    validated.files.map((file) => [file.path, file.content]),
  );

  for (const required of REQUIRED_WORKSPACE_PATHS) {
    if (!paths.has(required)) {
      violations.push(`missing required workspace path: ${required}`);
    }
  }

  for (const file of validated.files) {
    if (!file.path.startsWith("packages/")) continue;
    if (file.content.includes("examples/")) {
      violations.push(`packages must not reference examples: ${file.path}`);
    }
  }

  const nxContent = contentByPath.get("nx.json");
  if (nxContent) {
    if (/nxCloud/i.test(nxContent) || /nxCloudAccessToken/i.test(nxContent)) {
      violations.push(
        "nx.json must remain local-first without Nx Cloud wiring",
      );
    }
  }

  const corePkg = contentByPath.get("packages/core/package.json");
  if (corePkg && /workspace:\*/.test(corePkg) && corePkg.includes("react")) {
    violations.push("packages/core must not depend on react or examples");
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
