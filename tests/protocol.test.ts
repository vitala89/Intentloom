import { describe, expect, it } from "vitest";
import {
  DOCTOR_METHOD,
  PROTOCOL_VERSION,
  ProtocolValidationError,
  createDoctorRequest,
  createDoctorResponse,
  createEngineeringConformanceRequest,
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
});
