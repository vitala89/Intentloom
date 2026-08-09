import type {
  EngineeringQualityCheckerTool,
  QualityCheckerSeverity,
} from "@intentloom/protocol";
import {
  asRecord,
  diagnostic,
  textValue,
  type CheckerAdapterOutput,
  type CheckerCandidate,
} from "./checker-report-common.js";

export function adaptSarifReport(value: unknown): CheckerAdapterOutput {
  const root = asRecord(value);
  const runs = root?.runs;
  const candidates: CheckerCandidate[] = [];
  const diagnostics = [];
  const tools: EngineeringQualityCheckerTool[] = [];
  let tool: EngineeringQualityCheckerTool = { name: "sarif-scanner" };
  if (!Array.isArray(runs)) {
    return {
      tool,
      candidates,
      diagnostics: [
        diagnostic("unsupported", "SARIF report has no runs array"),
      ],
    };
  }
  for (const [runIndex, rawRun] of runs.entries()) {
    const run = asRecord(rawRun);
    const toolObject = asRecord(run?.tool);
    const driver = asRecord(toolObject?.driver);
    const runTool: EngineeringQualityCheckerTool =
      typeof driver?.name === "string"
        ? {
            name: driver.name,
            ...(typeof driver.version === "string"
              ? { version: driver.version }
              : {}),
          }
        : { name: "sarif-scanner" };
    if (typeof driver?.name === "string") tools.push(runTool);
    const results = run?.results;
    if (!Array.isArray(results)) {
      diagnostics.push(
        diagnostic(
          "unsupported",
          "SARIF run has no results array",
          String(runIndex),
        ),
      );
      continue;
    }
    for (const [resultIndex, rawResult] of results.entries()) {
      const result = asRecord(rawResult);
      const message = asRecord(result?.message);
      if (!result || !message) {
        diagnostics.push(
          diagnostic(
            "dropped-record",
            "SARIF result is malformed",
            `${runIndex}.${resultIndex}`,
          ),
        );
        continue;
      }
      const location = Array.isArray(result.locations)
        ? asRecord(result.locations[0])
        : undefined;
      const physical = asRecord(location?.physicalLocation);
      const artifact = asRecord(physical?.artifactLocation);
      const region = asRecord(physical?.region);
      const level = textValue(result.level, "unknown").toLowerCase();
      const severity: QualityCheckerSeverity =
        level === "error"
          ? "error"
          : level === "warning"
            ? "warning"
            : level === "note"
              ? "info"
              : "unknown";
      const fingerprints = asRecord(result.fingerprints);
      const fingerprint = fingerprints
        ? Object.values(fingerprints).find(
            (item): item is string => typeof item === "string",
          )
        : undefined;
      candidates.push({
        ruleId: textValue(result.ruleId, "sarif/unknown"),
        severity,
        message: textValue(message.text, "SARIF finding"),
        ...(typeof artifact?.uri === "string" ? { path: artifact.uri } : {}),
        ...(typeof region?.startLine === "number"
          ? { startLine: region.startLine }
          : {}),
        ...(typeof region?.startColumn === "number"
          ? { startColumn: region.startColumn }
          : {}),
        ...(typeof region?.endLine === "number"
          ? { endLine: region.endLine }
          : {}),
        ...(typeof region?.endColumn === "number"
          ? { endColumn: region.endColumn }
          : {}),
        ...(fingerprint === undefined ? {} : { fingerprint }),
        ...(typeof result.helpUri === "string"
          ? { helpUri: result.helpUri }
          : {}),
        tool: runTool,
        sourceRecord: `${runIndex}.${resultIndex}`,
      });
    }
  }
  tools.sort((a, b) =>
    `${a.name}@${a.version ?? ""}`.localeCompare(
      `${b.name}@${b.version ?? ""}`,
    ),
  );
  tool = tools[0] ?? tool;
  return { tool, candidates, diagnostics };
}
