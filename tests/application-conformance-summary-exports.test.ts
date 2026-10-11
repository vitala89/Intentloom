import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateProjectEngineeringConformance,
  summarizeProjectConformanceTrend,
  summarizeProjectWorkflowDurations,
  summarizeProjectWorkflowRepetitions,
  summarizeProjectWorkflowTransitionIntervals,
  summarizeProjectWorkflowVariants,
} from "@intentloom/application";

const rootOperations = [
  evaluateProjectEngineeringConformance,
  summarizeProjectWorkflowVariants,
  summarizeProjectWorkflowDurations,
  summarizeProjectConformanceTrend,
  summarizeProjectWorkflowRepetitions,
  summarizeProjectWorkflowTransitionIntervals,
] as const;

describe("application conformance summary root exports", () => {
  it("keeps the six summary operations importable from the application root", () => {
    for (const operation of rootOperations) {
      expect(typeof operation).toBe("function");
    }
  });

  it("keeps the extracted module off the application root barrel", () => {
    const source = readFileSync(
      "packages/application/src/project-conformance-summaries.ts",
      "utf8",
    );
    expect(source).not.toMatch(/from\s+["'](?:\.\.?\/)*index\.(?:js|ts)["']/);
    expect(source).not.toMatch(
      /@intentloom\/(?:cli|daemon|mcp-server)|apps\/desktop|from\s+["']react["']|@tauri-apps\//,
    );
  });
});
