import { readFileSync } from "node:fs";

const document = JSON.parse(
  readFileSync(
    new URL("../docs/governance/quality-exceptions.json", import.meta.url),
    "utf8",
  ),
);

export function hasQualityException(path, baseLines, headLines) {
  return document.exceptions.some(
    (exception) =>
      exception.path === path &&
      exception.rule === "existing-oversized-growth" &&
      exception.baseLines === baseLines &&
      exception.headLines === headLines,
  );
}
