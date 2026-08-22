import { readFileSync } from "node:fs";

const document = JSON.parse(
  readFileSync(
    new URL("../docs/governance/quality-exceptions.json", import.meta.url),
    "utf8",
  ),
);

export function hasQualityException({ path, baseMetrics, headMetrics }) {
  return document.exceptions.some((exception) => {
    if (exception.path !== path || exception.rule !== "existing-oversized-growth") {
      return false;
    }
    if (
      exception.baseEffectiveCodeLines !== undefined &&
      exception.headEffectiveCodeLines !== undefined
    ) {
      const basePhysical =
        exception.basePhysicalLines ?? exception.baseLines ?? baseMetrics.physicalLines;
      const headPhysical =
        exception.headPhysicalLines ?? exception.headLines ?? headMetrics.physicalLines;
      return (
        exception.baseEffectiveCodeLines === baseMetrics.effectiveCodeLines &&
        exception.headEffectiveCodeLines === headMetrics.effectiveCodeLines &&
        basePhysical === baseMetrics.physicalLines &&
        headPhysical === headMetrics.physicalLines
      );
    }
    return (
      exception.baseLines === baseMetrics.physicalLines &&
      exception.headLines === headMetrics.physicalLines
    );
  });
}
