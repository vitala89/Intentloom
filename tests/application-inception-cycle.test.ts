import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { InceptionSummary } from "@intentloom/application";
import * as application from "@intentloom/application";
import { createScanner } from "typescript/unstable/ast/scanner";
import { SyntaxKind } from "typescript/unstable/ast";

const sourceRoot = "packages/application/src";
const summaryModule = "inception/inception-summary-types.ts";

const importComponents = [
  ["approved-apply-baseline.ts", "generated-file-sync-declared.ts", "index.ts"],
  [
    "foundation-discovery.ts",
    "foundation-viewmodel.ts",
    "foundation-workshop.ts",
  ],
  [
    "foundation-scaffold-client-viewmodel.ts",
    "foundation-scaffold-workspace-viewmodel.ts",
  ],
  [
    "neutron/mutation/apply/neutron-mutation-apply-durable-record.ts",
    "neutron/mutation/apply/neutron-mutation-apply-store.ts",
    "neutron/mutation/verification/neutron-mutation-verification-retry-eligibility.ts",
  ],
];

const indexReexportComponent = [
  "approved-apply-baseline.ts",
  "approved-apply-engine.ts",
  "bounded-execution-apply.ts",
  "bounded-execution-w11.ts",
  "bounded-execution-workspace-cli.ts",
  "bounded-execution-workspace.ts",
  "engineering-quality-entry.ts",
  "engineering-quality/cli-specialized-packs-external.ts",
  "engineering-quality/index.ts",
  "engineering-quality/specialized-pack-external-apply.ts",
  "engineering-quality/specialized-pack-external-viewmodel.ts",
  "existing-project-adoption-apply-gates.ts",
  "existing-project-adoption-apply-health.ts",
  "existing-project-adoption-apply.ts",
  "existing-project-adoption-approval.ts",
  "existing-project-adoption-decisions.ts",
  "existing-project-adoption-plan.ts",
  "existing-project-adoption-prepared-plan-revalidate.ts",
  "existing-project-adoption-prepared-plan.ts",
  "existing-project-w9.ts",
  "existing-project-workspace-cli.ts",
  "existing-project-workspace.ts",
  "foundation-flow.ts",
  "generated-file-sync-declared.ts",
  "harness/harness-benchmark-sample.ts",
  "harness/harness-benchmark.ts",
  "harness/harness.ts",
  "inception-flow.ts",
  "index.ts",
];

const reexportComponents = [
  [
    "apply-extension-update.ts",
    "discover-and-apply-extension-update.ts",
    "extension-update-files.ts",
    "propose-and-apply-extension-adoption.ts",
  ],
  indexReexportComponent,
  ...importComponents.slice(1),
];

const summaryFixture = {
  sessionId: "inc_summary",
  root: "/project",
  idea: "idea",
  status: "in-progress",
  totalQuestions: 1,
  answeredQuestions: 0,
  pendingQuestions: 1,
  confirmedAnswers: 0,
  assumptionsCount: 0,
  constraintsCount: 0,
  alternativesCount: 0,
} satisfies InceptionSummary;

describe("application inception viewmodel cycle", () => {
  it("keeps InceptionSummary importable from the application root", () => {
    expect(summaryFixture.sessionId).toBe("inc_summary");
    expect(application).not.toHaveProperty("InceptionSummary");
  });

  it("keeps the shared summary type off both cycle members", () => {
    expect(relativeSpecifiers(summaryModule, true)).toEqual([]);
    expect(relativeSpecifiers("inception-viewmodel.ts", true)).not.toContain(
      "./inception.js",
    );
    expect(relativeSpecifiers("inception.ts", false)).toContain(
      "./inception-viewmodel.js",
    );
    expect(relativeSpecifiers("inception.ts", false)).toContain(
      "./inception/inception-summary-types.js",
    );
    expect(relativeSpecifiers("inception-viewmodel.ts", false)).toContain(
      "./inception/inception-summary-types.js",
    );
  });

  it("drops the inception pair and leaves the other cycles unchanged", () => {
    expect(applicationCycles(false)).toEqual(importComponents);
    expect(applicationCycles(true)).toEqual(reexportComponents);
  });
});

function relativeSpecifiers(file: string, includeReexports: boolean): string[] {
  const parsed = moduleSpecifiers(readFileSync(join(sourceRoot, file), "utf8"));
  return includeReexports
    ? [...parsed.imports, ...parsed.reexports]
    : parsed.imports;
}

function applicationCycles(includeReexports: boolean): string[][] {
  const files = walkSources(sourceRoot);
  const relativeFiles = files.map((file) => posixRelative(sourceRoot, file));
  const known = new Set(relativeFiles);
  const edges = new Map<string, string[]>();
  for (const file of files) {
    const owner = posixRelative(sourceRoot, file);
    const parsed = moduleSpecifiers(readFileSync(file, "utf8"));
    const specifiers = includeReexports
      ? [...parsed.imports, ...parsed.reexports]
      : parsed.imports;
    const dependencies = specifiers
      .filter((specifier) => specifier.startsWith("."))
      .map((specifier) => resolveSpecifier(file, specifier))
      .filter((resolved): resolved is string => resolved !== null)
      .map((resolved) => posixRelative(sourceRoot, resolved))
      .filter((dependency) => known.has(dependency));
    edges.set(owner, [...new Set(dependencies)].toSorted());
  }
  return stronglyConnectedComponents(
    relativeFiles,
    (node) => edges.get(node) ?? [],
  );
}

function walkSources(directory: string, files: string[] = []): string[] {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walkSources(path, files);
    else if (name.endsWith(".ts")) files.push(path);
  }
  return files;
}

function posixRelative(from: string, to: string): string {
  return relative(from, to).split("\\").join("/");
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  const lexical = resolve(dirname(fromFile), specifier);
  const stem = lexical.endsWith(".js") ? lexical.slice(0, -3) : lexical;
  const candidates = lexical.endsWith(".js")
    ? [`${stem}.ts`, `${stem}.tsx`, join(stem, "index.ts")]
    : [lexical, `${lexical}.ts`, join(lexical, "index.ts")];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function moduleSpecifiers(source: string): {
  imports: string[];
  reexports: string[];
} {
  const tokens = scannedTokens(source);
  const imports: string[] = [];
  const reexports: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      token?.kind === SyntaxKind.ImportKeyword &&
      tokens[index + 1]?.kind === SyntaxKind.StringLiteral
    ) {
      imports.push(tokens[index + 1]?.text ?? "");
    }
    if (token?.kind !== SyntaxKind.FromKeyword) continue;
    const specifier = tokens[index + 1];
    if (specifier?.kind !== SyntaxKind.StringLiteral) continue;
    const clause = clauseKind(tokens, index);
    if (clause === "import") imports.push(specifier.text);
    if (clause === "export") reexports.push(specifier.text);
  }
  return { imports, reexports };
}

function clauseKind(
  tokens: readonly { kind: SyntaxKind; text: string }[],
  fromIndex: number,
): "import" | "export" | null {
  for (let index = fromIndex - 1; index >= 0; index -= 1) {
    const kind = tokens[index]?.kind;
    if (kind === SyntaxKind.SemicolonToken) return null;
    if (kind === SyntaxKind.ImportKeyword) return "import";
    if (kind === SyntaxKind.ExportKeyword) return "export";
  }
  return null;
}

function scannedTokens(source: string): { kind: SyntaxKind; text: string }[] {
  const scanner = createScanner(false, 0, source);
  const tokens: { kind: SyntaxKind; text: string }[] = [];
  const templateStack: number[] = [];
  let position = 0;
  while (position < source.length) {
    scanner.resetTokenState(position);
    let kind = scanner.scan();
    if (
      kind === SyntaxKind.CloseBraceToken &&
      templateStack.length > 0 &&
      templateStack[templateStack.length - 1] === 0
    ) {
      kind = scanner.reScanTemplateToken(false);
    }
    const end = scanner.getTokenEnd();
    if (end <= position || kind === SyntaxKind.EndOfFileToken) break;
    if (kind === SyntaxKind.TemplateHead) templateStack.push(0);
    else if (kind === SyntaxKind.TemplateTail) templateStack.pop();
    else if (kind === SyntaxKind.OpenBraceToken && templateStack.length > 0) {
      templateStack[templateStack.length - 1] += 1;
    } else if (
      kind === SyntaxKind.CloseBraceToken &&
      templateStack.length > 0
    ) {
      templateStack[templateStack.length - 1] -= 1;
    }
    if (!isTrivia(kind)) {
      tokens.push({
        kind,
        text: kind === SyntaxKind.StringLiteral ? scanner.getTokenValue() : "",
      });
    }
    position = end;
  }
  return tokens;
}

function isTrivia(kind: SyntaxKind): boolean {
  return (
    kind === SyntaxKind.NewLineTrivia ||
    kind === SyntaxKind.WhitespaceTrivia ||
    kind === SyntaxKind.SingleLineCommentTrivia ||
    kind === SyntaxKind.MultiLineCommentTrivia ||
    kind === SyntaxKind.ConflictMarkerTrivia
  );
}

function stronglyConnectedComponents(
  nodes: readonly string[],
  dependencies: (node: string) => readonly string[],
): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let next = 0;
  const visit = (node: string): void => {
    index.set(node, next);
    low.set(node, next);
    next += 1;
    stack.push(node);
    onStack.add(node);
    for (const dependency of dependencies(node)) {
      if (!index.has(dependency)) {
        visit(dependency);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(dependency) ?? 0));
      } else if (onStack.has(dependency)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(dependency) ?? 0));
      }
    }
    if (low.get(node) !== index.get(node)) return;
    const component: string[] = [];
    let cursor = "";
    do {
      cursor = stack.pop() ?? "";
      onStack.delete(cursor);
      component.push(cursor);
    } while (cursor !== node);
    if (component.length > 1) components.push(component.toSorted());
  };
  for (const node of nodes) {
    if (!index.has(node)) visit(node);
  }
  return components.toSorted((left, right) =>
    left.join().localeCompare(right.join()),
  );
}
