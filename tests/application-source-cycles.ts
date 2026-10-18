import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { createScanner } from "typescript/unstable/ast/scanner";
import { SyntaxKind } from "typescript/unstable/ast";

const sourceRoot = "packages/application/src";

export function relativeSpecifiers(
  file: string,
  includeReexports: boolean,
): string[] {
  const parsed = moduleSpecifiers(readFileSync(join(sourceRoot, file), "utf8"));
  return includeReexports
    ? [...parsed.imports, ...parsed.reexports]
    : parsed.imports;
}

export function applicationCycles(includeReexports: boolean): string[][] {
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
