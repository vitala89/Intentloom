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

export function prepareProjectScaffoldPlan(
  blueprint: ProjectBlueprint,
  root: string,
): ScaffoldPlan {
  const validatedBlueprint = validateProjectBlueprint(blueprint);
  if (typeof root !== "string" || root.trim().length === 0) {
    throw new Error(
      "prepareProjectScaffoldPlan requires a non-empty root path",
    );
  }

  const rawName = validatedBlueprint.name.replace(/^Blueprint for /i, "");
  const pkgName = rawName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/gu, "-")
    .replace(/^-+|-+$/g, "");
  const now = Date.now();

  const packageJsonContent = JSON.stringify(
    {
      name: pkgName,
      version: "0.1.0-alpha.1",
      type: "module",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      scripts: {
        build: "tsc",
        test: "vitest run",
      },
    },
    null,
    2,
  );

  const tsconfigContent = JSON.stringify(
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

  const srcIndexContent = `export function hello(): string {\n  return "Hello from ${validatedBlueprint.name}!";\n}\n`;
  const testIndexContent = `import { describe, expect, it } from "vitest";\nimport { hello } from "../src/index.js";\n\ndescribe("${pkgName}", () => {\n  it("returns greeting", () => {\n    expect(hello()).toContain("Hello");\n  });\n});\n`;
  const readmeContent = `# ${validatedBlueprint.name}\n\n${validatedBlueprint.name} — minimal TypeScript library scaffolded by Intentloom.\n`;

  const files: ScaffoldFilePlan[] = [
    {
      path: "package.json",
      action: "create",
      content: packageJsonContent,
      isManaged: true,
    },
    {
      path: "tsconfig.json",
      action: "create",
      content: tsconfigContent,
      isManaged: true,
    },
    {
      path: "src/index.ts",
      action: "create",
      content: srcIndexContent,
      isManaged: false,
    },
    {
      path: "tests/index.test.ts",
      action: "create",
      content: testIndexContent,
      isManaged: false,
    },
    {
      path: "README.md",
      action: "create",
      content: readmeContent,
      isManaged: false,
    },
  ];

  const plan: ScaffoldPlan = {
    planId: `scaffold_${now}`,
    root,
    blueprintDigest: validatedBlueprint.digest,
    files,
    dependencies: ["typescript", "vitest"],
    scripts: {
      build: "tsc",
      test: "vitest run",
    },
    createdAt: now,
  };

  return validateScaffoldPlan(plan);
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

  return {
    created,
    skipped,
    collisions,
  };
}
