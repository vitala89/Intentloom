import { describe, expect, it } from "vitest";
import {
  summarizeWorkflowVariants,
  type GenericTimeline,
} from "../packages/evidence-analysis/src/index.js";
import { summarizeProjectWorkflowVariants } from "@intentloom/application";

describe("summarizeWorkflowVariants", () => {
  const timelines: readonly GenericTimeline[] = [
    {
      caseType: "pull-request",
      caseId: "pr:2",
      events: [
        { activity: "branch.created", source: "fixture", sourceId: "2a" },
        {
          activity: "pull-request.merged",
          source: "fixture",
          sourceId: "2b",
          timestamp: "2026-07-26T00:00:00.000Z",
        },
      ],
    },
    {
      caseType: "pull-request",
      caseId: "pr:1",
      events: [
        { activity: "branch.created", source: "fixture", sourceId: "1a" },
        {
          activity: "pull-request.merged",
          source: "fixture",
          sourceId: "1b",
        },
      ],
    },
    {
      caseType: "pull-request",
      caseId: "pr:3",
      events: [
        { activity: "branch.created", source: "fixture", sourceId: "3a" },
      ],
    },
  ];

  it("groups recurring normalized activity sequences deterministically", () => {
    const first = summarizeWorkflowVariants(timelines);
    const second = summarizeWorkflowVariants(timelines);

    expect(first).toEqual(second);
    expect(first.timestampCoverage).toBe("partial");
    expect(first.variants).toHaveLength(2);
    expect(first.variants[0]).toMatchObject({
      activities: ["branch.created", "pull-request.merged"],
      occurrenceCount: 2,
      caseIds: ["pr:1", "pr:2"],
    });
    expect(first.variants[0]?.variantId).toMatch(
      /^variant:sha256:[a-f0-9]{64}$/,
    );
  });

  it("uses the same report through the shared application operation", () => {
    expect(summarizeProjectWorkflowVariants(timelines)).toEqual(
      summarizeWorkflowVariants(timelines),
    );
  });

  it("rejects insufficient, mixed, and duplicate timeline cases", () => {
    expect(() => summarizeWorkflowVariants([timelines[0]!])).toThrow(
      "at least two timelines are required",
    );
    expect(() =>
      summarizeWorkflowVariants([
        timelines[0]!,
        { ...timelines[1]!, caseType: "release" },
      ]),
    ).toThrow("workflow variant timelines must share one case type");
    expect(() =>
      summarizeWorkflowVariants([
        timelines[0]!,
        { ...timelines[1]!, caseId: "pr:2" },
      ]),
    ).toThrow("workflow variant timeline case IDs must be unique");
  });
});
