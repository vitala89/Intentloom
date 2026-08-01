import type {
  ProjectBlueprint,
  ScaffoldPlan,
  ScaffoldFilePlan,
} from "@intentloom/protocol";
import {
  validateProjectBlueprint,
  validateScaffoldPlan,
} from "@intentloom/validator";

export interface ScaffoldPlanDiffResult {
  readonly created: readonly string[];
  readonly skipped: readonly string[];
  readonly collisions: readonly string[];
}

function buildSinglePkgFiles(
  pkgName: string,
  name: string,
): ScaffoldFilePlan[] {
  const pkgJson = JSON.stringify(
    {
      name: pkgName,
      version: "0.1.0-alpha.1",
      type: "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      scripts: { build: "tsc", test: "vitest run" },
    },
    null,
    2,
  );
  const tsConfig = JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        declaration: true,
        strict: true,
        outDir: "./dist",
      },
      include: ["src/**/*"],
    },
    null,
    2,
  );
  return [
    {
      path: "package.json",
      action: "create",
      content: pkgJson,
      isManaged: true,
    },
    {
      path: "tsconfig.json",
      action: "create",
      content: tsConfig,
      isManaged: true,
    },
    {
      path: "src/index.ts",
      action: "create",
      content: `export function hello(): string {\n  return "Hello from ${name}!";\n}\n`,
      isManaged: false,
    },
    {
      path: "tests/index.test.ts",
      action: "create",
      content: `import { describe, expect, it } from "vitest";\nimport { hello } from "../src/index.js";\n\ndescribe("${pkgName}", () => {\n  it("returns greeting", () => {\n    expect(hello()).toContain("Hello");\n  });\n});\n`,
      isManaged: false,
    },
    {
      path: "README.md",
      action: "create",
      content: `# ${name}\n\n${name} — minimal TypeScript library scaffolded by Intentloom.\n`,
      isManaged: false,
    },
  ];
}

function buildWorkspaceFiles(
  pkgName: string,
  name: string,
  hasNx: boolean,
): ScaffoldFilePlan[] {
  const pnpmWorkspace = 'packages:\n  - "packages/*"\n';
  const rootPkg = JSON.stringify(
    {
      name: `${pkgName}-workspace`,
      private: true,
      type: "module",
      scripts: { build: "pnpm -r build", test: "pnpm -r test" },
    },
    null,
    2,
  );
  const rootTsConfig = JSON.stringify(
    {
      files: [],
      references: [{ path: "packages/core" }, { path: "packages/adapter" }],
    },
    null,
    2,
  );
  const corePkg = JSON.stringify(
    {
      name: `@${pkgName}/core`,
      version: "0.1.0",
      type: "module",
      main: "./dist/index.js",
    },
    null,
    2,
  );
  const adapterPkg = JSON.stringify(
    {
      name: `@${pkgName}/adapter`,
      version: "0.1.0",
      type: "module",
      main: "./dist/index.js",
    },
    null,
    2,
  );

  const files: ScaffoldFilePlan[] = [
    {
      path: "pnpm-workspace.yaml",
      action: "create",
      content: pnpmWorkspace,
      isManaged: true,
    },
    {
      path: "package.json",
      action: "create",
      content: rootPkg,
      isManaged: true,
    },
    {
      path: "tsconfig.json",
      action: "create",
      content: rootTsConfig,
      isManaged: true,
    },
    {
      path: "packages/core/package.json",
      action: "create",
      content: corePkg,
      isManaged: true,
    },
    {
      path: "packages/core/src/index.ts",
      action: "create",
      content: 'export function core(): string {\n  return "core";\n}\n',
      isManaged: false,
    },
    {
      path: "packages/core/tests/index.test.ts",
      action: "create",
      content:
        'import { describe, expect, it } from "vitest";\nimport { core } from "../src/index.js";\n\ndescribe("core", () => {\n  it("returns core", () => {\n    expect(core()).toBe("core");\n  });\n});\n',
      isManaged: false,
    },
    {
      path: "packages/adapter/package.json",
      action: "create",
      content: adapterPkg,
      isManaged: true,
    },
    {
      path: "packages/adapter/src/index.ts",
      action: "create",
      content: 'export function adapter(): string {\n  return "adapter";\n}\n',
      isManaged: false,
    },
    {
      path: "README.md",
      action: "create",
      content: `# ${name} Workspace\n\npnpm monorepo workspace for ${name}.\n`,
      isManaged: false,
    },
  ];

  if (hasNx) {
    const nxJson = JSON.stringify(
      {
        $schema: "./node_modules/nx/schemas/nx-schema.json",
        targetDefaults: { build: { cache: true } },
      },
      null,
      2,
    );
    files.push({
      path: "nx.json",
      action: "create",
      content: nxJson,
      isManaged: true,
    });
  }

  return files;
}

export function prepareProjectScaffoldPlan(
  blueprint: ProjectBlueprint,
  root: string,
): ScaffoldPlan {
  const validated = validateProjectBlueprint(blueprint);
  if (typeof root !== "string" || root.trim().length === 0) {
    throw new Error(
      "prepareProjectScaffoldPlan requires a non-empty root path",
    );
  }

  const rawName = validated.name.replace(/^Blueprint for /i, "");
  const pkgName = rawName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/gu, "-")
    .replace(/^-+|-+$/g, "");
  const now = Date.now();
  const isWorkspace = validated.topology === "pnpm-workspace";
  const hasNx = validated.recommendedPacks.includes("nx-monorepo");

  const files = isWorkspace
    ? buildWorkspaceFiles(pkgName, validated.name, hasNx)
    : buildSinglePkgFiles(pkgName, validated.name);
  const dependencies = isWorkspace
    ? hasNx
      ? ["nx", "typescript", "vitest"]
      : ["typescript", "vitest"]
    : ["typescript", "vitest"];

  return validateScaffoldPlan({
    planId: `scaffold_${now}`,
    root,
    blueprintDigest: validated.digest,
    files,
    dependencies,
    scripts: isWorkspace
      ? { build: "pnpm -r build", test: "pnpm -r test" }
      : { build: "tsc", test: "vitest run" },
    createdAt: now,
  });
}

export function formatScaffoldPlanDryRun(plan: ScaffoldPlan): string {
  const validated = validateScaffoldPlan(plan);
  const lines: string[] = [];
  lines.push(`Scaffold Dry-Run Plan: ${validated.planId}`);
  lines.push(`Target Root: ${validated.root}`);
  lines.push(`Blueprint Digest: ${validated.blueprintDigest}`);
  lines.push("");
  lines.push("Files to be created:");
  for (const f of validated.files) {
    lines.push(
      `  [${f.action.toUpperCase()}] ${f.path} (${f.isManaged ? "managed" : "project-owned"})`,
    );
  }
  lines.push("");
  lines.push(`Proposed Dependencies: ${validated.dependencies.join(", ")}`);
  lines.push("(Note: No dependencies will be installed automatically)");
  return lines.join("\n");
}

export function diffScaffoldPlan(
  plan: ScaffoldPlan,
  existingPaths: readonly string[] = [],
): ScaffoldPlanDiffResult {
  const validated = validateScaffoldPlan(plan);
  const existingSet = new Set(existingPaths);
  const created: string[] = [];
  const skipped: string[] = [];
  const collisions: string[] = [];

  for (const file of validated.files) {
    if (existingSet.has(file.path)) {
      collisions.push(file.path);
    } else if (file.action === "skip") {
      skipped.push(file.path);
    } else {
      created.push(file.path);
    }
  }

  return { created, skipped, collisions };
}
