import { describe, expect, it } from "vitest";
import {
  summarizeWorkflowRepetitions,
  type GenericTimeline,
} from "../packages/evidence-analysis/src/index.js";
import { summarizeProjectWorkflowRepetitions } from "@intentloom/application";

describe("summarizeWorkflowRepetitions", () => {
  it("counts repeated activities per compatible workflow case", () => {
    const timelines: readonly GenericTimeline[] = [
      {
        caseType: "release",
        caseId: "release:1",
        events: [
          { activity: "checks.failed", source: "fixture", sourceId: "1" },
          { activity: "checks.passed", source: "fixture", sourceId: "2" },
          { activity: "checks.failed", source: "fixture", sourceId: "3" },
          { activity: "checks.failed", source: "fixture", sourceId: "4" },
        ],
      },
      {
        caseType: "release",
        caseId: "release:2",
        events: [
          { activity: "checks.failed", source: "fixture", sourceId: "5" },
          { activity: "checks.failed", source: "fixture", sourceId: "6" },
          { activity: "release.published", source: "fixture", sourceId: "7" },
          { activity: "release.published", source: "fixture", sourceId: "8" },
        ],
      },
      {
        caseType: "release",
        caseId: "release:3",
        events: [
          { activity: "checks.failed", source: "fixture", sourceId: "9" },
          { activity: "release.published", source: "fixture", sourceId: "10" },
        ],
      },
    ];

    expect(summarizeWorkflowRepetitions(timelines)).toEqual({
      operationVersion: 1,
      caseType: "release",
      timelineCount: 3,
      repeatedActivities: [
        {
          activity: "checks.failed",
          caseCount: 2,
          occurrenceCount: 5,
          maxOccurrencesPerCase: 3,
        },
        {
          activity: "release.published",
          caseCount: 1,
          occurrenceCount: 2,
          maxOccurrencesPerCase: 2,
        },
      ],
    });
  });

  it("is input-order independent and matches the application operation", () => {
    const timelines: readonly GenericTimeline[] = [
      {
        caseType: "release",
        caseId: "release:1",
        events: [
          { activity: "checks.failed", source: "fixture", sourceId: "1" },
          { activity: "checks.failed", source: "fixture", sourceId: "2" },
        ],
      },
      {
        caseType: "release",
        caseId: "release:2",
        events: [
          { activity: "checks.failed", source: "fixture", sourceId: "3" },
          { activity: "checks.failed", source: "fixture", sourceId: "4" },
        ],
      },
    ];
    const expected = summarizeWorkflowRepetitions(timelines);
    expect(summarizeWorkflowRepetitions([...timelines].reverse())).toEqual(
      expected,
    );
    expect(summarizeProjectWorkflowRepetitions(timelines)).toEqual(expected);
  });

  it("rejects insufficient, mixed, duplicate, and invalid timelines", () => {
    const timeline: GenericTimeline = {
      caseType: "release",
      caseId: "release:1",
      events: [],
    };
    expect(() => summarizeWorkflowRepetitions([timeline])).toThrow(
      "at least two timelines are required",
    );
    expect(() =>
      summarizeWorkflowRepetitions([
        timeline,
        { ...timeline, caseId: "pr:1", caseType: "pull-request" },
      ]),
    ).toThrow("must share one case type");
    expect(() => summarizeWorkflowRepetitions([timeline, timeline])).toThrow(
      "unique case ids",
    );
    expect(() =>
      summarizeWorkflowRepetitions([
        timeline,
        { ...timeline, operationVersion: 2 as unknown as 1 },
      ]),
    ).toThrow("unique case ids");
  });

  it("returns an empty repeated-activity list when no case repeats", () => {
    expect(
      summarizeWorkflowRepetitions([
        {
          caseType: "release",
          caseId: "release:1",
          events: [
            { activity: "release.started", source: "fixture", sourceId: "1" },
          ],
        },
        {
          caseType: "release",
          caseId: "release:2",
          events: [
            { activity: "release.started", source: "fixture", sourceId: "2" },
          ],
        },
      ]),
    ).toEqual({
      operationVersion: 1,
      caseType: "release",
      timelineCount: 2,
      repeatedActivities: [],
    });
  });
});
