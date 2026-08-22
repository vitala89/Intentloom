import { describe, expect, it } from "vitest";
import { hasQualityException } from "../scripts/quality-exceptions.mjs";
import {
  HARD_EFFECTIVE_CODE_LINES,
  PHYSICAL_SAFETY_LINES,
  evaluateProductionSourceChange,
  measureProductionSource,
} from "../scripts/production-file-metrics.mjs";

describe("production file metrics scanner", () => {
  it("counts ordinary TypeScript code lines", () => {
    const metrics = measureProductionSource(
      ["const result = calculate();", "if (condition) {", "  run();", "}"].join(
        "\n",
      ),
      "packages/example/src/sample.ts",
    );
    expect(metrics).toEqual({
      physicalLines: 4,
      blankLines: 0,
      commentOnlyLines: 0,
      effectiveCodeLines: 4,
    });
  });

  it("excludes blank lines", () => {
    const metrics = measureProductionSource(
      "const value = 1;\n\nconst other = 2;\n",
      "packages/example/src/sample.ts",
    );
    expect(metrics.blankLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(2);
  });

  it("excludes line-comment-only lines", () => {
    const metrics = measureProductionSource(
      "// explanation\nconst value = 1;\n",
      "packages/example/src/sample.ts",
    );
    expect(metrics.commentOnlyLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("excludes block-comment-only lines", () => {
    const metrics = measureProductionSource(
      "/* block */\nconst value = 1;\n",
      "packages/example/src/sample.ts",
    );
    expect(metrics.commentOnlyLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("excludes JSDoc-only lines", () => {
    const metrics = measureProductionSource(
      ["/**", " * explanation", " */", "export function run() {}", ""].join(
        "\n",
      ),
      "packages/example/src/sample.ts",
    );
    expect(metrics.commentOnlyLines).toBe(3);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts trailing comments as code", () => {
    const metrics = measureProductionSource(
      "doSomething(); // rationale\n",
      "packages/example/src/sample.ts",
    );
    expect(metrics.commentOnlyLines).toBe(0);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts URL strings containing // as code", () => {
    const metrics = measureProductionSource(
      'const url = "https://example.com";\n',
      "packages/example/src/sample.ts",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts strings containing block-comment-like text as code", () => {
    const metrics = measureProductionSource(
      'const text = "/* not a comment */";\n',
      "packages/example/src/sample.ts",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts template literals containing comment-like characters", () => {
    const metrics = measureProductionSource(
      "const value = `prefix // ${name} /* suffix */`;\n",
      "packages/example/src/sample.ts",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts JSX/TSX code", () => {
    const metrics = measureProductionSource(
      ["export function View() {", "  return <button>Save</button>;", "}"].join(
        "\n",
      ),
      "apps/desktop/src/View.tsx",
    );
    expect(metrics.effectiveCodeLines).toBe(3);
  });

  it("handles multiline block comments", () => {
    const metrics = measureProductionSource(
      ["/*", " * one", " * two", " */", "const ok = true;"].join("\n"),
      "packages/example/src/sample.ts",
    );
    expect(metrics.commentOnlyLines).toBe(4);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("handles comments between tokens", () => {
    const metrics = measureProductionSource(
      "const value /* inline */ = 1;\n",
      "packages/example/src/sample.ts",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
    expect(metrics.commentOnlyLines).toBe(0);
  });

  it("counts Rust line comments separately from code", () => {
    const metrics = measureProductionSource(
      "// rationale\nfn run() {}\n",
      "apps/desktop/src/main.rs",
    );
    expect(metrics.commentOnlyLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts Rust block comments separately from code", () => {
    const metrics = measureProductionSource(
      "/* block */\nfn run() {}\n",
      "apps/desktop/src/main.rs",
    );
    expect(metrics.commentOnlyLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts Rust doc comments separately from code", () => {
    const metrics = measureProductionSource(
      "/// docs\nfn run() {}\n",
      "apps/desktop/src/main.rs",
    );
    expect(metrics.commentOnlyLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts Rust strings containing // as code", () => {
    const metrics = measureProductionSource(
      'let url = "https://example.com";\n',
      "apps/desktop/src/main.rs",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts raw Rust strings containing comment-like text as code", () => {
    const metrics = measureProductionSource(
      'let value = r#"not // a comment"#;\n',
      "apps/desktop/src/main.rs",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
  });

  it("counts Rust trailing comments as code lines", () => {
    const metrics = measureProductionSource(
      "run(); // rationale\n",
      "apps/desktop/src/main.rs",
    );
    expect(metrics.effectiveCodeLines).toBe(1);
    expect(metrics.commentOnlyLines).toBe(0);
  });

  it("handles nested Rust block comments", () => {
    const metrics = measureProductionSource(
      "/* outer /* inner */ still comment */\nfn run() {}\n",
      "apps/desktop/src/main.rs",
    );
    expect(metrics.commentOnlyLines).toBe(1);
    expect(metrics.effectiveCodeLines).toBe(1);
  });
});

describe("production file budget governance", () => {
  const underBudgetSource = "export const ok = true;\n".repeat(200).trimEnd();

  it("passes when both metrics are under limit", () => {
    const errors = evaluateProductionSourceChange({
      filePath: "packages/example/src/ok.ts",
      baseSource: null,
      headSource: underBudgetSource,
      hasException: () => false,
    });
    expect(errors).toEqual([]);
  });

  it("fails when effective SLOC hard limit is exceeded", () => {
    const headSource = "export const line = 1;\n".repeat(401).trimEnd();
    const errors = evaluateProductionSourceChange({
      filePath: "packages/example/src/too-much-code.ts",
      baseSource: null,
      headSource,
      hasException: () => false,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("exceeds effective code budget");
    expect(errors[0]).toContain("effective code lines: 401");
    expect(errors[0]).toContain(
      `hard effective-code budget: ${HARD_EFFECTIVE_CODE_LINES}`,
    );
  });

  it("fails when physical safety limit is exceeded independently", () => {
    const headSource = [
      ...Array.from({ length: 250 }, () => "export const ok = true;"),
      ...Array.from({ length: 451 }, () => "// documentation"),
    ].join("\n");
    const metrics = measureProductionSource(
      headSource,
      "packages/example/src/docs-heavy.ts",
    );
    expect(metrics.effectiveCodeLines).toBeLessThanOrEqual(
      HARD_EFFECTIVE_CODE_LINES,
    );
    expect(metrics.physicalLines).toBeGreaterThan(PHYSICAL_SAFETY_LINES);

    const errors = evaluateProductionSourceChange({
      filePath: "packages/example/src/docs-heavy.ts",
      baseSource: null,
      headSource,
      hasException: () => false,
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("exceeds physical safety limit");
    expect(errors[0]).toContain(
      `physical safety limit: ${PHYSICAL_SAFETY_LINES}`,
    );
  });

  it("blocks grandfathered files from growing effective code", () => {
    const baseSource = "export const line = 1;\n".repeat(410).trimEnd();
    const headSource = `${baseSource}\nexport const grown = true;\n`;
    const errors = evaluateProductionSourceChange({
      filePath: "packages/example/src/grandfathered.ts",
      baseSource,
      headSource,
      hasException: () => false,
    });
    expect(
      errors.some((error) => error.includes("grew effective code lines")),
    ).toBe(true);
  });

  it("allows documentation-only changes without code-growth debt", () => {
    const code = "export const line = 1;\n".repeat(410).trimEnd();
    const baseSource = `${code}\n`;
    const headSource = `${code}\n// added rationale\n`;
    const errors = evaluateProductionSourceChange({
      filePath: "packages/example/src/grandfathered.ts",
      baseSource,
      headSource,
      hasException: () => false,
    });
    expect(errors).toEqual([]);
  });

  it("detects mixed code and comment growth correctly", () => {
    const baseSource = "export const line = 1;\n".repeat(410).trimEnd();
    const headSource = `${baseSource}\nexport const grown = true;\n// docs\n`;
    const errors = evaluateProductionSourceChange({
      filePath: "packages/example/src/grandfathered.ts",
      baseSource,
      headSource,
      hasException: () => false,
    });
    expect(
      errors.some((error) => error.includes("grew effective code lines")),
    ).toBe(true);
  });

  it("returns deterministic results across repeated runs", () => {
    const source = [
      "// header",
      'const url = "https://example.com";',
      "/**",
      " * docs",
      " */",
      "export function run() {",
      "  return <span>{url}</span>; // inline",
      "}",
      "",
    ].join("\n");
    const first = measureProductionSource(
      source,
      "apps/desktop/src/sample.tsx",
    );
    const second = measureProductionSource(
      source,
      "apps/desktop/src/sample.tsx",
    );
    expect(first).toEqual(second);
  });

  it("matches legacy physical-only quality exceptions", () => {
    expect(
      hasQualityException({
        path: "packages/cli/src/command.ts",
        baseMetrics: {
          effectiveCodeLines: 3200,
          physicalLines: 3467,
        },
        headMetrics: {
          effectiveCodeLines: 3210,
          physicalLines: 3488,
        },
      }),
    ).toBe(true);
  });
});
