import type {
  ScaffoldPlan,
  DependencyInstallPlan,
  GitInitPlan,
  PackageManagerKind,
} from "@intentloom/protocol";
import {
  validateScaffoldPlan,
  validateDependencyInstallPlan,
  validateGitInitPlan,
} from "@intentloom/validator";

export interface PrepareGitInitOptions {
  readonly extraGitignore?: readonly string[];
  readonly commitMessage?: string;
}

const DEFAULT_GITIGNORE = [
  "node_modules",
  "dist",
  ".env",
  "*.log",
  ".DS_Store",
];

export function prepareDependencyInstallPlan(
  plan: ScaffoldPlan,
  packageManager: PackageManagerKind = "pnpm",
): DependencyInstallPlan {
  const validatedPlan = validateScaffoldPlan(plan);
  const pm: PackageManagerKind = ["pnpm", "npm", "yarn"].includes(
    packageManager,
  )
    ? packageManager
    : "pnpm";

  const deps = validatedPlan.dependencies;
  let command = "";

  if (pm === "pnpm") {
    command = `pnpm add -D ${deps.join(" ")}`;
  } else if (pm === "yarn") {
    command = `yarn add -D ${deps.join(" ")}`;
  } else {
    command = `npm install --save-dev ${deps.join(" ")}`;
  }

  return validateDependencyInstallPlan({
    packageManager: pm,
    dependencies: deps,
    command,
  });
}

export function prepareGitInitPlan(
  root: string,
  options?: PrepareGitInitOptions,
): GitInitPlan {
  if (typeof root !== "string" || root.trim().length === 0) {
    throw new Error("prepareGitInitPlan requires a non-empty root path");
  }

  const extra = options?.extraGitignore ?? [];
  const gitignoreEntries = Array.from(
    new Set([...DEFAULT_GITIGNORE, ...extra]),
  );
  const commitMessage =
    options?.commitMessage ?? "chore: initial scaffold by Intentloom";

  const commands = [
    "git init",
    "git add .",
    `git commit -m "${commitMessage}"`,
  ];

  return validateGitInitPlan({
    root,
    gitignoreEntries,
    commitMessage,
    commands,
  });
}
