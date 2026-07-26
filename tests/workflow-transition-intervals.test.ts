import { describe, expect, it } from "vitest";
import {
  summarizeWorkflowTransitionIntervals,
  type GenericTimeline,
} from "../packages/evidence-analysis/src/index.js";

describe("summarizeWorkflowTransitionIntervals", () => {
  it("aggregates valid adjacent timestamp intervals by transition", () => {
    const timelines: readonly GenericTimeline[] = [
      {
        caseType: "release",
        caseId: "release:1",
        events: [
          {
            activity: "release.started",
            source: "fixture",
            sourceId: "1",
            timestamp: "2026-07-26T00:00:00.000Z",
          },
          {
            activity: "checks.finished",
            source: "fixture",
            sourceId: "2",
            timestamp: "2026-07-26T00:01:00.000Z",
          },
          {
            activity: "release.published",
            source: "fixture",
            sourceId: "3",
            timestamp: "2026-07-26T00:03:00.000Z",
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
            sourceId: "4",
            timestamp: "2026-07-26T01:00:00.000Z",
          },
          {
            activity: "checks.finished",
            source: "fixture",
            sourceId: "5",
            timestamp: "2026-07-26T01:02:00.000Z",
          },
          {
            activity: "release.published",
            source: "fixture",
            sourceId: "6",
            timestamp: "2026-07-26T01:05:00.000Z",
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
            sourceId: "7",
          },
          {
            activity: "checks.finished",
            source: "fixture",
            sourceId: "8",
          },
        ],
      },
    ];

    const before = structuredClone(timelines);
    expect(summarizeWorkflowTransitionIntervals(timelines)).toEqual({
      operationVersion: 1,
      caseType: "release",
      timelineCount: 3,
      timestampCoverage: "partial",
      observableIntervalCount: 4,
      transitions: [
        {
          from: "checks.finished",
          to: "release.published",
          intervalCount: 2,
          observableCaseCount: 2,
          elapsedMinutes: { minimum: 2, median: 2.5, maximum: 3 },
        },
        {
          from: "release.started",
          to: "checks.finished",
          intervalCount: 2,
          observableCaseCount: 2,
          elapsedMinutes: { minimum: 1, median: 1.5, maximum: 2 },
        },
      ],
    });
    expect(timelines).toEqual(before);
    expect(
      summarizeWorkflowTransitionIntervals([...timelines].reverse()),
    ).toEqual(summarizeWorkflowTransitionIntervals(timelines));
  });

  it("reports complete, unavailable, and out-of-order timestamp coverage", () => {
    const complete = [
      {
        caseType: "release" as const,
        caseId: "release:1",
        events: [
          {
            activity: "a",
            source: "fixture",
            sourceId: "1",
            timestamp: "2026-07-26T00:00:00.000Z",
          },
          {
            activity: "b",
            source: "fixture",
            sourceId: "2",
            timestamp: "2026-07-26T00:01:00.000Z",
          },
        ],
      },
      { caseType: "release" as const, caseId: "release:2", events: [] },
    ];
    expect(summarizeWorkflowTransitionIntervals(complete)).toMatchObject({
      timestampCoverage: "complete",
      observableIntervalCount: 1,
    });
    expect(
      summarizeWorkflowTransitionIntervals([
        { caseType: "release", caseId: "release:1", events: [] },
        { caseType: "release", caseId: "release:2", events: [] },
      ]),
    ).toMatchObject({ timestampCoverage: "unavailable", transitions: [] });
    expect(
      summarizeWorkflowTransitionIntervals([
        {
          caseType: "release",
          caseId: "release:1",
          events: [
            {
              activity: "a",
              source: "fixture",
              sourceId: "1",
              timestamp: "2026-07-26T00:02:00.000Z",
            },
            {
              activity: "b",
              source: "fixture",
              sourceId: "2",
              timestamp: "2026-07-26T00:01:00.000Z",
            },
          ],
        },
        { caseType: "release", caseId: "release:2", events: [] },
      ]),
    ).toMatchObject({
      timestampCoverage: "complete",
      observableIntervalCount: 0,
    });
    expect(
      summarizeWorkflowTransitionIntervals([
        {
          caseType: "release",
          caseId: "release:1",
          events: [
            {
              activity: "a",
              source: "fixture",
              sourceId: "1",
              timestamp: "07/26/2026",
            },
            {
              activity: "b",
              source: "fixture",
              sourceId: "2",
              timestamp: "2026-07-26T00:01:00.000Z",
            },
          ],
        },
        { caseType: "release", caseId: "release:2", events: [] },
      ]),
    ).toMatchObject({
      timestampCoverage: "partial",
      observableIntervalCount: 0,
    });
  });

  it("rejects insufficient, mixed, duplicate, and invalid timelines", () => {
    const timeline = {
      caseType: "release" as const,
      caseId: "release:1",
      events: [],
    };
    expect(() => summarizeWorkflowTransitionIntervals([timeline])).toThrow(
      "at least two timelines",
    );
    expect(() =>
      summarizeWorkflowTransitionIntervals([
        timeline,
        {
          ...timeline,
          caseType: "pull-request" as const,
          caseId: "pull-request:1",
        },
      ]),
    ).toThrow("share one case type");
    expect(() =>
      summarizeWorkflowTransitionIntervals([timeline, timeline]),
    ).toThrow("case IDs must be unique");
    expect(() =>
      summarizeWorkflowTransitionIntervals([
        timeline,
        {
          ...timeline,
          events: [{ activity: "", source: "fixture", sourceId: "1" }],
        },
      ]),
    ).toThrow();
  });
});
