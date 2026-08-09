import { describe, expect, it } from "vitest";
import { ingestEngineeringQualityCheckerReport } from "@intentloom/application";
import {
  QUALITY_CHECKER_REPORT_SCHEMA_URN,
  type EngineeringQualityCheckerReport,
} from "@intentloom/protocol";
import {
  validateCheckerReportInput,
  validateEngineeringQualityCheckerReport,
} from "@intentloom/validator";

describe("Engineering Quality Phase Q7 checker report ingestion", () => {
  it("normalizes ESLint JSON and deduplicates equivalent findings", () => {
    const input = [
      {
        filePath: "/project/src/app.ts",
        messages: [
          {
            ruleId: "no-eval",
            severity: 2,
            message: "eval is forbidden",
            line: 4,
            column: 2,
          },
          {
            ruleId: "no-eval",
            severity: 2,
            message: "eval is forbidden",
            line: 4,
            column: 2,
          },
        ],
      },
    ];
    const report = ingestEngineeringQualityCheckerReport({
      source: "eslint",
      input,
      projectRoot: "/project",
    });

    expect(report.schemaVersion).toBe(QUALITY_CHECKER_REPORT_SCHEMA_URN);
    expect(report.status).toBe("partial");
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0]?.location?.path).toBe("src/app.ts");
    expect(report.diagnostics[0]?.kind).toBe("duplicate");
  });

  it("normalizes TypeScript diagnostic chains and keeps unknown severity truthful", () => {
    const report = ingestEngineeringQualityCheckerReport({
      source: "typescript",
      input: {
        diagnostics: [
          {
            code: 2322,
            category: "error",
            messageText: {
              messageText: "Type mismatch",
              next: [{ messageText: "Expected string" }],
            },
            file: { fileName: "src/app.ts", start: { line: 8, column: 3 } },
          },
          {
            code: 9999,
            category: "unknown",
            messageText: "Unknown diagnostic",
          },
        ],
      },
    });

    expect(report.findings).toHaveLength(2);
    const mismatch = report.findings.find(
      (finding) => finding.ruleId === "tsc/2322",
    );
    const unknown = report.findings.find(
      (finding) => finding.ruleId === "tsc/9999",
    );
    expect(mismatch?.message).toContain("Expected string");
    expect(unknown?.severity).toBe("unknown");

    const arrayReport = ingestEngineeringQualityCheckerReport({
      source: "typescript",
      input: [{ code: 100, category: "warning", messageText: "array form" }],
    });
    expect(arrayReport.findings[0]?.ruleId).toBe("tsc/100");
  });

  it("normalizes SARIF locations and redacts secret paths and snippets in messages", () => {
    const report = ingestEngineeringQualityCheckerReport({
      source: "sarif",
      input: {
        version: "2.1.0",
        runs: [
          {
            tool: { driver: { name: "CodeQL", version: "2.0.0" } },
            results: [
              {
                ruleId: "js/secret",
                level: "warning",
                message: { text: "API_KEY=secret-value" },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: ".env.production" },
                      region: { startLine: 1, startColumn: 1 },
                    },
                  },
                ],
              },
              {
                ruleId: "js/external",
                level: "note",
                message: { text: "outside project" },
                locations: [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: "/other/private.ts" },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      projectRoot: "/project",
    });

    const secretFinding = report.findings.find(
      (finding) => finding.ruleId === "js/secret",
    );
    const externalFinding = report.findings.find(
      (finding) => finding.ruleId === "js/external",
    );
    expect(secretFinding?.tool.name).toBe("CodeQL");
    expect(secretFinding?.location?.path).toBe("[REDACTED]");
    expect(secretFinding?.message).toContain("[REDACTED]");
    expect(externalFinding?.location?.path).toBe("[REDACTED]");
    expect(
      report.diagnostics.some((item) => item.kind === "redacted-path"),
    ).toBe(true);
  });

  it("normalizes Clippy JSON lines without executing cargo", () => {
    const report = ingestEngineeringQualityCheckerReport({
      source: "clippy",
      input: JSON.stringify({
        reason: "compiler-message",
        message: {
          message: "needless borrow",
          level: "warning",
          code: { code: "clippy::needless_borrow" },
          spans: [
            {
              is_primary: true,
              file_name: "src/lib.rs",
              line_start: 12,
              column_start: 5,
            },
          ],
        },
      }),
    });

    expect(report.status).toBe("resolved");
    expect(report.findings[0]?.ruleId).toBe("clippy/clippy::needless_borrow");
    expect(report.findings[0]?.location?.path).toBe("src/lib.rs");
  });

  it("reports conflicting meanings instead of silently overwriting findings", () => {
    const report = ingestEngineeringQualityCheckerReport({
      source: "eslint",
      input: [
        {
          filePath: "src/app.ts",
          messages: [
            {
              ruleId: "rule-x",
              severity: 2,
              message: "first",
              line: 1,
              column: 1,
            },
            {
              ruleId: "rule-x",
              severity: 2,
              message: "second",
              line: 1,
              column: 1,
            },
          ],
        },
      ],
      projectRoot: ".",
    });

    expect(report.findings).toHaveLength(2);
    expect(
      report.diagnostics.some((item) => item.kind === "conflicting-meaning"),
    ).toBe(true);
  });

  it("rejects malformed and oversized untrusted input at the validator boundary", () => {
    expect(() => validateCheckerReportInput({ runs: "bad" }, "sarif")).toThrow(
      /must be an array/,
    );
    expect(() =>
      validateCheckerReportInput(
        Array.from({ length: 5_001 }, () => ({})),
        "eslint",
      ),
    ).toThrow(/record limit/);
    expect(() =>
      validateEngineeringQualityCheckerReport({
        schemaVersion: QUALITY_CHECKER_REPORT_SCHEMA_URN,
        source: "eslint",
        tool: { name: "eslint" },
        status: "resolved",
        findings: [
          {
            findingId: "f-1",
            source: "eslint",
            tool: { name: "eslint" },
            ruleId: "r-1",
            severity: "error",
            message: "ok",
          },
        ],
        diagnostics: [],
      } satisfies EngineeringQualityCheckerReport),
    ).not.toThrow();
  });

  it("does not mutate the input report and is deterministic", () => {
    const input = [
      {
        filePath: "src/b.ts",
        messages: [
          { ruleId: "b", severity: 1, message: "b", line: 2, column: 1 },
        ],
      },
      {
        filePath: "src/a.ts",
        messages: [
          { ruleId: "a", severity: 1, message: "a", line: 1, column: 1 },
        ],
      },
    ];
    const snapshot = structuredClone(input);
    const first = ingestEngineeringQualityCheckerReport({
      source: "eslint",
      input,
    });
    const second = ingestEngineeringQualityCheckerReport({
      source: "eslint",
      input,
    });

    expect(input).toEqual(snapshot);
    expect(first).toEqual(second);
    expect(first.findings.map((finding) => finding.ruleId)).toEqual(["a", "b"]);
  });
});
