import { describe, expect, it } from "vitest";
import {
  DAEMON_INFO_METHOD,
  DOCTOR_METHOD,
  PROJECT_DIFF_METHOD,
  PROJECT_TIMELINE_METHOD,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createDaemonInfoRequest,
  createDaemonInfoResponse,
  createProjectDiffRequest,
  createProjectDiffResponse,
  createProjectTimelineRequest,
  createProjectTimelineResponse,
  createInspectResponse,
  parseDaemonInfoResponse,
  parseProjectDiffResponse,
  parseProjectTimelineResponse,
  parseInspectResponse,
  createDoctorRequest,
  createDoctorResponse,
  createEngineeringConformanceRequest,
  createWorkflowVariantSummaryRequest,
  createWorkflowDurationSummaryRequest,
  createConformanceTrendSummaryRequest,
  createWorkflowRepetitionSummaryRequest,
  createWorkflowRepetitionSummaryResponse,
  createWorkflowTransitionIntervalsRequest,
  createWorkflowTransitionIntervalsResponse,
  parseDoctorRequest,
  parseSerializedRequest,
  serializeRequest,
} from "../packages/protocol/src/index.js";

describe("versioned local protocol", () => {
  it("round-trips a JSON-RPC-compatible doctor request", () => {
    const request = createDoctorRequest("request-1", {
      root: "/project",
      profile: "generic",
      adapters: ["codex"],
    });
    const serialized = serializeRequest(request);

    expect(JSON.parse(serialized)).toEqual({
      jsonrpc: "2.0",
      id: "request-1",
      method: DOCTOR_METHOD,
      params: {
        protocolVersion: PROTOCOL_VERSION,
        root: "/project",
        profile: "generic",
        adapters: ["codex"],
      },
    });
    expect(parseSerializedRequest(serialized)).toEqual(request);
  });

  it("round-trips daemon capability discovery with compatibility metadata", () => {
    const request = createDaemonInfoRequest("info-1", 2);
    expect(request).toEqual({
      jsonrpc: "2.0",
      id: "info-1",
      method: DAEMON_INFO_METHOD,
      params: {
        protocolVersion: PROTOCOL_VERSION,
        clientProtocolVersion: 2,
      },
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
    const response = createDaemonInfoResponse("info-1", {
      daemonVersion: "0.6.0-dev",
      capabilities: [
        {
          method: DAEMON_INFO_METHOD,
          operation: "daemon.info",
          classification: "read-only",
        },
      ],
      limits: {
        maxMessageBytes: 1024,
        maxResponseBytes: 1024,
        maxConnections: 4,
        requestTimeoutMs: 5000,
      },
      compatibility: {
        status: "incompatible",
        clientProtocolVersion: 2,
        daemonProtocolVersion: PROTOCOL_VERSION,
        reason: "client protocol version is not supported",
      },
    });
    expect(parseDaemonInfoResponse(response).result).toEqual(response.result);
    expect(response.result.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(response.result.compatibility.status).toBe("incompatible");
    expect(response.result.capabilities[0]?.method).toBe(DAEMON_INFO_METHOD);
    expect(() =>
      parseDaemonInfoResponse({
        ...response,
        result: {
          ...response.result,
          limits: { ...response.result.limits, maxMessageBytes: 0 },
        },
      }),
    ).toThrow("maxMessageBytes must be a positive integer");
  });

  it("rejects unknown methods and protocol versions", () => {
    expect(() =>
      parseDoctorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "intentloom.project.sync.v1",
        params: {},
      }),
    ).toThrow(ProtocolValidationError);
    expect(() =>
      parseDoctorRequest({
        jsonrpc: "2.0",
        id: 1,
        method: DOCTOR_METHOD,
        params: {
          protocolVersion: 2,
          root: "/project",
          profile: "generic",
          adapters: [],
        },
      }),
    ).toThrow("unsupported protocol version");
  });

  it("round-trips bounded project diff and root-bound timeline contracts", () => {
    const diffRequest = createProjectDiffRequest("diff-1", {
      root: "/project",
      profile: "generic",
      adapters: ["codex"],
    });
    expect(diffRequest.method).toBe(PROJECT_DIFF_METHOD);
    expect(parseSerializedRequest(serializeRequest(diffRequest))).toEqual(
      diffRequest,
    );
    const diffResponse = createProjectDiffResponse("diff-1", {
      operationVersion: 1,
      root: "/canonical/project",
      changes: [
        {
          path: ".aif/config.yaml",
          kind: "create",
          reason: "configuration is missing",
          content: "profile: generic\n",
        },
      ],
      diagnostics: [],
    });
    expect(parseProjectDiffResponse(diffResponse).result).toEqual(
      diffResponse.result,
    );

    const timelineRequest = createProjectTimelineRequest("timeline-1", {
      root: "/project",
      caseId: "release:project",
    });
    expect(timelineRequest.method).toBe(PROJECT_TIMELINE_METHOD);
    expect(timelineRequest.params.limit).toBe(50);
    expect(parseSerializedRequest(serializeRequest(timelineRequest))).toEqual(
      timelineRequest,
    );
    expect(() =>
      createProjectTimelineRequest("timeline-invalid", {
        root: "/project",
        caseId: "release:project",
        limit: 501,
      }),
    ).toThrow("limit must be between 1 and 500");
    const timelineResponse = createProjectTimelineResponse("timeline-1", {
      operationVersion: 1,
      root: "/canonical/project",
      caseType: "release",
      caseId: "release:project",
      quality: "complete",
      events: [],
      findings: [],
      diagnostics: [],
    });
    expect(parseProjectTimelineResponse(timelineResponse).result).toEqual(
      timelineResponse.result,
    );
  });

  it("validates the existing Inspect response for the typed client", () => {
    const response = createInspectResponse("inspect-1", {
      projectId: "project-local",
      root: "/canonical/project",
    });
    expect(parseInspectResponse(response).result).toEqual(response.result);
    expect(() =>
      parseInspectResponse({
        ...response,
        result: { ...response.result, root: "" },
      }),
    ).toThrow("root must be a non-empty string");
  });

  it("creates a versioned, content-safe doctor response", () => {
    expect(
      createDoctorResponse(1, {
        findings: [
          {
            code: "metadata-missing",
            severity: "warning",
            category: "config",
            path: ".aif/config.yaml",
            message: "configuration is missing",
          },
        ],
        diagnostics: ["configuration is missing"],
        exitCode: 0,
      }),
    ).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        findings: [
          {
            code: "metadata-missing",
            severity: "warning",
            category: "config",
            path: ".aif/config.yaml",
            message: "configuration is missing",
          },
        ],
        diagnostics: ["configuration is missing"],
        exitCode: 0,
      },
    });
  });

  it("validates a versioned engineering conformance request", () => {
    const request = createEngineeringConformanceRequest("conformance-1", {
      root: "/project",
      timeline: {
        caseType: "release",
        caseId: "release:1",
        events: [],
      },
      policy: {
        schemaVersion: "1",
        policyId: "policy:release",
        rules: [],
      },
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
    expect(() =>
      parseSerializedRequest(
        JSON.stringify({
          ...request,
          params: {
            ...request.params,
            policy: { ...request.params.policy, schemaVersion: "2" },
          },
        }),
      ),
    ).toThrow("unsupported engineering workflow policy schema version");
  });

  it("round-trips a workflow variant summary request", () => {
    const request = createWorkflowVariantSummaryRequest("variants-1", {
      timelines: [
        { caseType: "release", caseId: "release:1", events: [] },
        { caseType: "release", caseId: "release:2", events: [] },
      ],
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
  });

  it("round-trips a workflow duration summary request", () => {
    const request = createWorkflowDurationSummaryRequest("durations-1", {
      timelines: [
        { caseType: "release", caseId: "release:1", events: [] },
        { caseType: "release", caseId: "release:2", events: [] },
      ],
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
  });

  it("round-trips a conformance trend summary request", () => {
    const report = {
      operationVersion: 1 as const,
      policyId: "policy:release-v1",
      evaluatedAt: "2026-07-26T00:00:00.000Z",
      caseType: "release" as const,
      caseId: "release:1",
      summary: {
        totalRules: 0,
        passed: 0,
        violations: 0,
        missingEvidence: 0,
        ambiguousEvidence: 0,
        unsupported: 0,
      },
      findings: [],
    };
    const request = createConformanceTrendSummaryRequest("trend-1", {
      reports: [report, { ...report, caseId: "release:2" }],
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
  });

  it("round-trips a workflow repetition summary request", () => {
    const timeline = {
      caseType: "release" as const,
      caseId: "release:1",
      events: [
        { activity: "checks.failed", source: "fixture", sourceId: "1" },
        { activity: "checks.failed", source: "fixture", sourceId: "2" },
      ],
    };
    const request = createWorkflowRepetitionSummaryRequest("repetition-1", {
      timelines: [timeline, { ...timeline, caseId: "release:2" }],
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
  });

  it("validates workflow repetition summary responses", () => {
    expect(() =>
      createWorkflowRepetitionSummaryResponse("repetition-2", {
        report: {
          operationVersion: 1,
          caseType: "release",
          timelineCount: 1,
          repeatedActivities: [],
        },
      }),
    ).toThrow("timelineCount must be at least two");
    expect(
      createWorkflowRepetitionSummaryResponse("repetition-3", {
        report: {
          operationVersion: 1,
          caseType: "release",
          timelineCount: 2,
          repeatedActivities: [
            {
              activity: "checks.failed",
              caseCount: 1,
              occurrenceCount: 2,
              maxOccurrencesPerCase: 2,
            },
          ],
        },
      }).result.report.repeatedActivities,
    ).toHaveLength(1);
  });

  it("round-trips workflow transition interval requests and validates reports", () => {
    const timeline = {
      caseType: "release" as const,
      caseId: "release:1",
      events: [
        {
          activity: "release.started",
          source: "fixture",
          sourceId: "1",
          timestamp: "2026-07-26T00:00:00.000Z",
        },
        {
          activity: "release.published",
          source: "fixture",
          sourceId: "2",
          timestamp: "2026-07-26T00:02:00.000Z",
        },
      ],
    };
    const request = createWorkflowTransitionIntervalsRequest("transitions-1", {
      timelines: [timeline, { ...timeline, caseId: "release:2" }],
    });
    expect(parseSerializedRequest(serializeRequest(request))).toEqual(request);
    expect(() =>
      createWorkflowTransitionIntervalsResponse("transitions-2", {
        report: {
          operationVersion: 1,
          caseType: "release",
          timelineCount: 1,
          timestampCoverage: "unavailable",
          observableIntervalCount: 0,
          transitions: [],
        },
      }),
    ).toThrow("timelineCount must be at least two");
    expect(
      createWorkflowTransitionIntervalsResponse("transitions-3", {
        report: {
          operationVersion: 1,
          caseType: "release",
          timelineCount: 2,
          timestampCoverage: "complete",
          observableIntervalCount: 1,
          transitions: [
            {
              from: "release.started",
              to: "release.published",
              intervalCount: 1,
              observableCaseCount: 1,
              elapsedMinutes: { minimum: 2, median: 2, maximum: 2 },
            },
          ],
        },
      }).result.report.observableIntervalCount,
    ).toBe(1);
  });
});
