import { describe, expect, it } from "vitest";
import {
  NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
  NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
  NEUTRON_USAGE_BUDGET_SCHEMA_URN,
} from "@intentloom/protocol";
import { validateNeutronSessionViewmodel } from "../packages/validator/src/neutron-session-rpc.js";
import {
  projectContextBundle,
  projectNeutronToolActivity,
  projectionContainsSecretBody,
} from "../packages/application/src/neutron-session-activity.js";
import {
  auditFields,
  buildNeutronToolFailureEnvelope,
  NeutronToolRouterError,
} from "../packages/application/src/neutron-tool-errors.js";

const SECRET_BODY = "SUPER_SECRET_VALUE=n6-slice2-body";

function usage() {
  return {
    schemaVersion: NEUTRON_USAGE_BUDGET_SCHEMA_URN,
    sessionId: "session-n6",
    inputTokens: 0,
    outputTokens: 0,
    contextTokens: 12,
    tokenBudget: 4000,
    limitExceeded: false,
  };
}

function bundle() {
  return {
    schemaVersion: NEUTRON_CONTEXT_BUNDLE_SCHEMA_URN,
    root: "/project",
    sessionId: "session-n6",
    estimatedTokens: 12,
    excludedSecretLikePaths: [".env"],
    sources: [
      {
        sourceId: "policy:spec",
        kind: "policy" as const,
        trustClass: "project" as const,
        provenance: "intentloom.context.bounded.v1",
        included: true,
        path: "docs/specs/SPEC.md",
      },
      {
        sourceId: "secret-excluded",
        kind: "inspect" as const,
        trustClass: "project" as const,
        provenance: "intentloom.context.bounded.v1",
        included: false,
        exclusionReason: "secret-like",
        path: ".env",
      },
    ],
  };
}

function inspectEnvelope(ok: boolean, errorCode: null | "capability-denied") {
  return {
    schemaVersion: NEUTRON_TOOL_ENVELOPE_SCHEMA_URN,
    invocation: {
      invocationId: "call-inspect",
      toolName: "inspect" as const,
      root: "/project",
      sessionId: "session-n6",
      argumentsJson: JSON.stringify({ root: "/project" }),
      timeoutMs: 15_000,
    },
    result: {
      invocationId: "call-inspect",
      ok,
      payloadJson: ok
        ? JSON.stringify({
            readiness: "ready",
            findings: [{ code: "inspection-ready" }],
            profileDetection: { profile: "typescript" },
            secretDump: SECRET_BODY,
          })
        : JSON.stringify({
            denialClass: "missing-capability",
            reason: "inspect is not in the granted capability set",
          }),
      errorCode,
    },
  };
}

describe("Neutron N6 Slice 2 activity projection", () => {
  it("projects bounded N3 summary fields without excerpts or secret bodies", () => {
    const summary = projectContextBundle(bundle(), usage());
    const serialized = JSON.stringify(summary);
    expect(summary.itemCount).toBe(2);
    expect(summary.includedCount).toBe(1);
    expect(summary.excludedCount).toBe(1);
    expect(summary.estimatedTokens).toBe(12);
    expect(summary.tokenBudget).toBe(4000);
    expect(summary.contextTokens).toBe(12);
    expect(summary.excludedSecretLikePaths).toEqual([".env"]);
    expect(summary.sources[0]?.kind).toBe("policy");
    expect(summary.sources[0]?.path).toBe("docs/specs/SPEC.md");
    expect(serialized).toContain(".env");
    expect(serialized).not.toContain(SECRET_BODY);
    expect(serialized).not.toContain("excerpt");
    expect(projectionContainsSecretBody(summary, [SECRET_BODY])).toBe(false);
  });

  it("projects structured N4 activity and keeps denials denied", () => {
    const completed = projectNeutronToolActivity([inspectEnvelope(true, null)]);
    expect(completed).toHaveLength(1);
    expect(completed[0]?.toolName).toBe("inspect");
    expect(completed[0]?.status).toBe("completed");
    expect(completed[0]?.ok).toBe(true);
    expect(completed[0]?.resultSummary).toContain("findings=1");
    expect(JSON.stringify(completed)).not.toContain(SECRET_BODY);
    expect(JSON.stringify(completed)).not.toContain("payloadJson");

    const invocation = inspectEnvelope(false, "capability-denied").invocation;
    const deniedEnvelope = buildNeutronToolFailureEnvelope(
      invocation,
      new NeutronToolRouterError(
        "capability-denied",
        auditFields(
          invocation,
          "inspect",
          "missing-capability",
          "inspect is not granted",
        ),
      ),
    );
    const denied = projectNeutronToolActivity([deniedEnvelope]);
    expect(denied[0]?.status).toBe("denied");
    expect(denied[0]?.allowed).toBe(false);
    expect(denied[0]?.ok).toBe(false);
    expect(denied[0]?.errorCode).toBe("capability-denied");
  });

  it("does not copy unbounded tool payloads into the session viewmodel", () => {
    const huge = inspectEnvelope(true, null);
    huge.result = {
      ...huge.result,
      payloadJson: JSON.stringify({
        document: "x".repeat(5000),
        findings: [1, 2, 3],
      }),
    };
    const projected = projectNeutronToolActivity([huge]);
    expect(projected[0]?.resultSummary.length).toBeLessThanOrEqual(240);
    const viewmodel = validateNeutronSessionViewmodel({
      session: {
        schemaVersion: "urn:intentloom:schema:neutron-runtime-session:1",
        sessionId: "session-n6",
        root: "/project",
        projectId: "project-n6",
        state: "completed",
        mutationAllowed: false,
        createdAt: "2026-09-09T00:00:00.000Z",
      },
      adapter: {
        schemaVersion: "urn:intentloom:schema:neutron-adapter-capability:1",
        providerKind: "deterministic-test",
        modelId: "fixture-n6",
        supportsStreaming: false,
        supportsToolCalls: true,
        networkMode: "offline",
        dataHandling: "ephemeral",
        credentialIsolation: "outside-project-metadata",
      },
      prompt: "Inspect",
      responseText: "I ran doctor successfully",
      toolName: null,
      errorCode: null,
      errorMessage: null,
      projectFingerprintBefore: "a",
      projectFingerprintAfter: "a",
      cancellationAcknowledged: false,
      contextSummary: projectContextBundle(bundle(), usage()),
      toolActivity: projected,
    });
    expect(viewmodel.toolActivity).toHaveLength(1);
    expect(JSON.stringify(viewmodel)).not.toContain("x".repeat(500));
  });
});
