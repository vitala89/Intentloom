import { createHash } from "node:crypto";
import type { EngineeringQualityEvidence } from "@intentloom/protocol";
import {
  classifyEngineeringArtifact,
  type ClassifyArtifactOptions,
} from "./classifier.js";

export interface MeasureArtifactOptions extends ClassifyArtifactOptions {
  readonly content: string;
}

export function measureEngineeringArtifact(
  options: MeasureArtifactOptions,
): EngineeringQualityEvidence {
  const content = options.content;
  const classification = classifyEngineeringArtifact(options);

  const hasCrlf = content.includes("\r\n");
  const hasLf = /[^\r]\n/.test(content);
  const lineEnding = hasCrlf && hasLf ? "mixed" : hasCrlf ? "crlf" : "lf";

  const lines = content.split(/\r?\n/);
  const measuredValue = lines.length;

  const contentDigest = createHash("sha256").update(content).digest("hex");

  return {
    artifactPath: options.path,
    classification,
    measuredValue,
    unit: "physical-lines",
    contentDigest,
    lineEnding,
  };
}
