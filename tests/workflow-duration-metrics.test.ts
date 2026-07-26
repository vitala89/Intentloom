import { describe, expect, it } from "vitest";
import {
  summarizeWorkflowDurations,
  type GenericTimeline,
} from "../packages/evidence-analysis/src/index.js";
import { summarizeProjectWorkflowDurations } from "@intentloom/application";

describe("summarizeWorkflowDurations", () => {
  const timelines: readonly GenericTimeline[] = [
    {
      caseType: "release",
      caseId: "release:1",
      events: [
        {
          activity: "release.started",
          source: "fixture",
          sourceId: "1a",
          timestamp: "2026-07-26T00:00:00.000Z",
        },
        {
          activity: "release.finished",
          source: "fixture",
          sourceId: "1b",
          timestamp: "2026-07-26T00:18:00.000Z",
        },
      ],
    },
    {
      caseType: "release",
      caseId: "release:2",
      events: [
        {
          activity: "release.started",
          source: "fixture",
          sourceId: "2a",
          timestamp: "2026-07-26T00:00:00.000Z",
        },
        {
          activity: "release.finished",
          source: "fixture",
          sourceId: "2b",
          timestamp: "2026-07-26T01:06:00.000Z",
        },
      ],
    },
    {
      caseType: "release",
      caseId: "release:3",
      events: [
        {
          activity: "release.started",
          source: "fixture",
          sourceId: "3a",
          timestamp: "not-a-date",
        },
      ],
    },
  ];

  it("reports deterministic aggregate elapsed minutes and evidence coverage", () => {
    const report = summarizeWorkflowDurations([...timelines].reverse());

    expect(report).toMatchObject({
      caseType: "release",
      timelineCount: 3,
      timestampCoverage: "partial",
      observableCaseCount: 2,
      elapsedMinutes: { minimum: 18, median: 42, maximum: 66 },
    });
  });

  it("returns no duration when timestamps are unavailable and matches application", () => {
    const unavailable = summarizeWorkflowDurations([
      { ...timelines[0]!, events: [] },
      { ...timelines[1]!, events: [] },
    ]);
    expect(unavailable).toMatchObject({
      timestampCoverage: "unavailable",
      observableCaseCount: 0,
    });
    expect(unavailable.elapsedMinutes).toBeUndefined();
    expect(summarizeProjectWorkflowDurations(timelines)).toEqual(
      summarizeWorkflowDurations(timelines),
    );
  });

  it("rejects insufficient, mixed, and duplicate timeline cases", () => {
    expect(() => summarizeWorkflowDurations([timelines[0]!])).toThrow(
      "at least two timelines are required",
    );
    expect(() =>
      summarizeWorkflowDurations([
        timelines[0]!,
        { ...timelines[1]!, caseType: "pull-request" },
      ]),
    ).toThrow("workflow duration timelines must share one case type");
    expect(() =>
      summarizeWorkflowDurations([
        timelines[0]!,
        { ...timelines[1]!, caseId: "release:1" },
      ]),
    ).toThrow("workflow duration timeline case IDs must be unique");
  });
});
