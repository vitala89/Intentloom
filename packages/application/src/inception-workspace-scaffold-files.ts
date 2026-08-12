import type { ScaffoldFilePlan } from "@intentloom/protocol";

function pkgJson(content: object): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

function tsConfig(content: object): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

export function buildWorkspaceScaffoldFiles(
  pkgName: string,
  name: string,
  hasNx: boolean,
): ScaffoldFilePlan[] {
  const coreScope = `@${pkgName}/core`;
  const reactScope = `@${pkgName}/react`;
  const pnpmWorkspace = 'packages:\n  - "packages/*"\n  - "examples/*"\n';

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
      content: pkgJson({
        name: `${pkgName}-workspace`,
        private: true,
        type: "module",
        scripts: { build: "pnpm -r build", test: "pnpm -r test" },
      }),
      isManaged: true,
    },
    {
      path: "tsconfig.json",
      action: "create",
      content: tsConfig({
        files: [],
        references: [
          { path: "packages/core" },
          { path: "packages/react" },
          { path: "packages/testing" },
          { path: "examples/vanilla-basic" },
          { path: "examples/react-basic" },
        ],
      }),
      isManaged: true,
    },
    {
      path: "packages/core/package.json",
      action: "create",
      content: pkgJson({
        name: coreScope,
        version: "0.1.0",
        type: "module",
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        scripts: { build: "tsc", test: "vitest run" },
      }),
      isManaged: true,
    },
    {
      path: "packages/core/tsconfig.json",
      action: "create",
      content: tsConfig({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          declaration: true,
          strict: true,
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*"],
      }),
      isManaged: true,
    },
    {
      path: "packages/core/src/index.ts",
      action: "create",
      content: `export function create${toPascalCase(name)}Core(): string {\n  return "${name} core";\n}\n`,
      isManaged: false,
    },
    {
      path: "packages/core/tests/index.test.ts",
      action: "create",
      content: `import { describe, expect, it } from "vitest";\nimport { create${toPascalCase(name)}Core } from "../src/index.js";\n\ndescribe("${coreScope}", () => {\n  it("returns core label", () => {\n    expect(create${toPascalCase(name)}Core()).toContain("core");\n  });\n});\n`,
      isManaged: false,
    },
    {
      path: "packages/react/package.json",
      action: "create",
      content: pkgJson({
        name: reactScope,
        version: "0.1.0",
        type: "module",
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        scripts: { build: "tsc", test: "vitest run" },
        dependencies: { [coreScope]: "workspace:*" },
      }),
      isManaged: true,
    },
    {
      path: "packages/react/tsconfig.json",
      action: "create",
      content: tsConfig({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          declaration: true,
          strict: true,
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*"],
        references: [{ path: "../core" }],
      }),
      isManaged: true,
    },
    {
      path: "packages/react/src/index.ts",
      action: "create",
      content: `import { create${toPascalCase(name)}Core } from "${coreScope}";\n\nexport function render${toPascalCase(name)}Label(): string {\n  return create${toPascalCase(name)}Core();\n}\n`,
      isManaged: false,
    },
    {
      path: "packages/testing/package.json",
      action: "create",
      content: pkgJson({
        name: `@${pkgName}/testing`,
        version: "0.1.0",
        type: "module",
        main: "./dist/index.js",
        types: "./dist/index.d.ts",
        scripts: { build: "tsc", test: "vitest run" },
        dependencies: { [coreScope]: "workspace:*" },
      }),
      isManaged: true,
    },
    {
      path: "packages/testing/tsconfig.json",
      action: "create",
      content: tsConfig({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          declaration: true,
          strict: true,
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*"],
        references: [{ path: "../core" }],
      }),
      isManaged: true,
    },
    {
      path: "packages/testing/src/index.ts",
      action: "create",
      content: `import { create${toPascalCase(name)}Core } from "${coreScope}";\n\nexport function expectCoreLabel(value: string): boolean {\n  return value === create${toPascalCase(name)}Core();\n}\n`,
      isManaged: false,
    },
    {
      path: "examples/vanilla-basic/package.json",
      action: "create",
      content: pkgJson({
        name: `${pkgName}-example-vanilla`,
        private: true,
        type: "module",
        scripts: { start: "node dist/index.js", build: "tsc" },
        dependencies: { [coreScope]: "workspace:*" },
      }),
      isManaged: true,
    },
    {
      path: "examples/vanilla-basic/tsconfig.json",
      action: "create",
      content: tsConfig({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*"],
        references: [{ path: "../../packages/core" }],
      }),
      isManaged: true,
    },
    {
      path: "examples/vanilla-basic/src/index.ts",
      action: "create",
      content: `import { create${toPascalCase(name)}Core } from "${coreScope}";\n\nconsole.log(create${toPascalCase(name)}Core());\n`,
      isManaged: false,
    },
    {
      path: "examples/react-basic/package.json",
      action: "create",
      content: pkgJson({
        name: `${pkgName}-example-react`,
        private: true,
        type: "module",
        scripts: { start: "node dist/index.js", build: "tsc" },
        dependencies: {
          [coreScope]: "workspace:*",
          [reactScope]: "workspace:*",
        },
      }),
      isManaged: true,
    },
    {
      path: "examples/react-basic/tsconfig.json",
      action: "create",
      content: tsConfig({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          outDir: "./dist",
          rootDir: "./src",
        },
        include: ["src/**/*"],
        references: [
          { path: "../../packages/core" },
          { path: "../../packages/react" },
        ],
      }),
      isManaged: true,
    },
    {
      path: "examples/react-basic/src/index.ts",
      action: "create",
      content: `import { render${toPascalCase(name)}Label } from "${reactScope}";\n\nconsole.log(render${toPascalCase(name)}Label());\n`,
      isManaged: false,
    },
    {
      path: "README.md",
      action: "create",
      content: `# ${name} Workspace\n\npnpm workspace starter for ${name}. Packages expose public APIs; examples consume packages only.\n`,
      isManaged: false,
    },
  ];

  if (hasNx) {
    files.push({
      path: "nx.json",
      action: "create",
      content: pkgJson({
        $schema: "./node_modules/nx/schemas/nx-schema.json",
        targetDefaults: { build: { cache: true }, test: { cache: true } },
      }),
      isManaged: true,
    });
  }

  return files;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}
