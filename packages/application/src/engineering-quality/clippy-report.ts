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

export function adaptClippyReport(value: unknown): CheckerAdapterOutput {
  const records = Array.isArray(value) ? value : [];
  const candidates: import("./checker-report-common.js").CheckerCandidate[] =
    [];
  const diagnostics = [];
  const tool: EngineeringQualityCheckerTool = { name: "clippy" };
  for (const [index, rawRecord] of records.entries()) {
    const record = asRecord(rawRecord);
    const message = asRecord(record?.message) ?? record;
    if (!message || typeof message.message !== "string") {
      diagnostics.push(
        diagnostic(
          "dropped-record",
          "Clippy diagnostic is malformed",
          String(index),
        ),
      );
      continue;
    }
    const code = asRecord(message.code);
    const spans = Array.isArray(message.spans) ? message.spans : [];
    const span =
      spans.map(asRecord).find((item) => item?.is_primary === true) ??
      asRecord(spans[0]);
    const level = textValue(message.level, "unknown").toLowerCase();
    const severity: QualityCheckerSeverity =
      level === "error"
        ? "error"
        : level === "warning"
          ? "warning"
          : level === "note"
            ? "info"
            : "unknown";
    candidates.push({
      ruleId: `clippy/${textValue(code?.code, "unknown")}`,
      severity,
      message: message.message,
      ...(typeof span?.file_name === "string" ? { path: span.file_name } : {}),
      ...(typeof span?.line_start === "number"
        ? { startLine: span.line_start }
        : {}),
      ...(typeof span?.column_start === "number"
        ? { startColumn: span.column_start }
        : {}),
      ...(typeof span?.line_end === "number" ? { endLine: span.line_end } : {}),
      ...(typeof span?.column_end === "number"
        ? { endColumn: span.column_end }
        : {}),
      sourceRecord: String(index),
    });
  }
  return { tool, candidates, diagnostics };
}
