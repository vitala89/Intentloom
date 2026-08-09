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

export function adaptEslintReport(value: unknown): CheckerAdapterOutput {
  const records = Array.isArray(value) ? value : [];
  const candidates = [];
  const diagnostics = [];
  const tool: EngineeringQualityCheckerTool = { name: "eslint" };
  for (const [index, rawRecord] of records.entries()) {
    const record = asRecord(rawRecord);
    if (!record || !Array.isArray(record.messages)) {
      diagnostics.push(
        diagnostic(
          "dropped-record",
          "ESLint file result is malformed",
          String(index),
        ),
      );
      continue;
    }
    const path =
      typeof record.filePath === "string" ? record.filePath : undefined;
    for (const [messageIndex, rawMessage] of record.messages.entries()) {
      const message = asRecord(rawMessage);
      if (!message || typeof message.message !== "string") {
        diagnostics.push(
          diagnostic(
            "dropped-record",
            "ESLint message is malformed",
            `${index}.${messageIndex}`,
          ),
        );
        continue;
      }
      const severity: QualityCheckerSeverity =
        message.severity === 2
          ? "error"
          : message.severity === 1
            ? "warning"
            : "unknown";
      candidates.push({
        ruleId: textValue(message.ruleId, "eslint/unknown"),
        severity,
        message: message.message,
        ...(path === undefined ? {} : { path }),
        ...(typeof message.line === "number"
          ? { startLine: message.line }
          : {}),
        ...(typeof message.column === "number"
          ? { startColumn: message.column }
          : {}),
        ...(typeof message.endLine === "number"
          ? { endLine: message.endLine }
          : {}),
        ...(typeof message.endColumn === "number"
          ? { endColumn: message.endColumn }
          : {}),
        ...(typeof message.messageId === "string"
          ? { fingerprint: message.messageId }
          : {}),
        ...(typeof message.documentationUrl === "string"
          ? { helpUri: message.documentationUrl }
          : {}),
        sourceRecord: `${index}.${messageIndex}`,
      });
    }
  }
  return { tool, candidates, diagnostics };
}
