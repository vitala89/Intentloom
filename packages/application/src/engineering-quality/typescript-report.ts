import type {
  EngineeringQualityCheckerTool,
  QualityCheckerSeverity,
} from "@intentloom/protocol";
import {
  asRecord,
  diagnostic,
  textValue,
  type CheckerAdapterOutput,
} from "./checker-report-common.js";

function flattenMessage(value: unknown, depth = 0): string {
  if (depth > 8) return "[TRUNCATED MESSAGE]";
  if (typeof value === "string") return value;
  const record = asRecord(value);
  if (!record) return "TypeScript diagnostic";
  const head = textValue(record.messageText, "TypeScript diagnostic");
  const next = Array.isArray(record.next)
    ? record.next.map((item) => flattenMessage(item, depth + 1)).join(" ")
    : "";
  return next ? `${head} ${next}` : head;
}

export function adaptTypescriptReport(value: unknown): CheckerAdapterOutput {
  const root = asRecord(value);
  const records = Array.isArray(value) ? value : root?.diagnostics;
  const candidates: import("./checker-report-common.js").CheckerCandidate[] =
    [];
  const diagnostics = [];
  const tool: EngineeringQualityCheckerTool = { name: "tsc" };
  if (!Array.isArray(records)) {
    return {
      tool,
      candidates,
      diagnostics: [
        diagnostic("unsupported", "TypeScript report has no diagnostics array"),
      ],
    };
  }
  for (const [index, rawDiagnostic] of records.entries()) {
    const record = asRecord(rawDiagnostic);
    if (!record) {
      diagnostics.push(
        diagnostic(
          "dropped-record",
          "TypeScript diagnostic is malformed",
          String(index),
        ),
      );
      continue;
    }
    const category = textValue(record.category, "unknown").toLowerCase();
    const severity: QualityCheckerSeverity =
      category === "error"
        ? "error"
        : category === "warning"
          ? "warning"
          : category === "message" || category === "suggestion"
            ? "info"
            : "unknown";
    const file = asRecord(record.file);
    const path =
      typeof record.fileName === "string"
        ? record.fileName
        : typeof file?.fileName === "string"
          ? file.fileName
          : undefined;
    const start = asRecord(record.start) ?? asRecord(file?.start);
    const code =
      typeof record.code === "number" || typeof record.code === "string"
        ? String(record.code)
        : "unknown";
    candidates.push({
      ruleId: `tsc/${code}`,
      severity,
      message: flattenMessage(record.messageText ?? record.message),
      ...(path === undefined ? {} : { path }),
      ...(typeof record.line === "number" ? { startLine: record.line } : {}),
      ...(typeof record.column === "number"
        ? { startColumn: record.column }
        : {}),
      ...(typeof start?.line === "number" ? { startLine: start.line } : {}),
      ...(typeof start?.column === "number"
        ? { startColumn: start.column }
        : {}),
      sourceRecord: String(index),
    });
  }
  return { tool, candidates, diagnostics };
}
