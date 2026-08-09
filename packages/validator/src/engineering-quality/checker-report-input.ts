import type { QualityCheckerReportSource } from "@intentloom/protocol";
import { QUALITY_CHECKER_LIMITS } from "./checker-report.js";
import { isObject } from "./common.js";

function boundedArray(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  if (value.length > QUALITY_CHECKER_LIMITS.maxRecords) {
    throw new Error(
      `${field} exceeds the ${QUALITY_CHECKER_LIMITS.maxRecords}-record limit`,
    );
  }
  return value;
}

function isSupportedSource(source: QualityCheckerReportSource): boolean {
  return (
    source === "eslint" ||
    source === "typescript" ||
    source === "sarif" ||
    source === "clippy"
  );
}

export function validateCheckerReportInput(
  value: unknown,
  source: QualityCheckerReportSource,
): unknown {
  if (!isSupportedSource(source))
    throw new Error("checker report source is unsupported");
  if (source === "eslint" || source === "clippy") {
    const records = boundedArray(value, `${source} report`);
    for (const [index, record] of records.entries()) {
      if (!isObject(record)) continue;
      if (source === "eslint" && record.messages !== undefined) {
        boundedArray(record.messages, `eslint record ${index} messages`);
      }
      if (source === "clippy" && record.spans !== undefined) {
        boundedArray(record.spans, `clippy record ${index} spans`);
      }
    }
  } else if (source === "typescript") {
    if (Array.isArray(value)) {
      boundedArray(value, "typescript report");
    } else {
      if (!isObject(value))
        throw new Error("typescript report must be an object or array");
      boundedArray(value.diagnostics, "typescript report diagnostics");
    }
  } else {
    if (!isObject(value)) throw new Error("sarif report must be an object");
    const runs = boundedArray(value.runs, "sarif report runs");
    for (const [index, run] of runs.entries()) {
      if (!isObject(run) || run.results === undefined) continue;
      const results = boundedArray(run.results, `SARIF run ${index} results`);
      for (const [resultIndex, result] of results.entries()) {
        if (!isObject(result) || result.locations === undefined) continue;
        boundedArray(
          result.locations,
          `SARIF result ${index}.${resultIndex} locations`,
        );
      }
    }
  }
  return value;
}
