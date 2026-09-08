import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APPROVED_APPLY_METHOD } from "@intentloom/protocol";
import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  contextSourceLine,
  contextSummaryLines,
  toolActivityHeading,
} from "../apps/desktop/src/neutron/neutron-activity-copy.js";
import {
  authoritativeToolActivity,
  parseNeutronContextSummary,
} from "../apps/desktop/src/neutron/neutron-activity-viewmodel.js";
import { parseNeutronDesktopViewmodel } from "../apps/desktop/src/neutron/neutron-session-viewmodel.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);
const SECRET_BODY = "N6_SLICE2_SECRET_BODY=do-not-render";

function sessionFields() {
  return {
    session: {
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "session-n6",
      root: "/project",
      projectId: "project-n6",
      state: "completed" as const,
      mutationAllowed: false as const,
      createdAt: "2026-09-09T00:00:00.000Z",
    },
    adapter: {
      schemaVersion: NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
      providerKind: "deterministic-test" as const,
      modelId: "fixture-n6",
      supportsStreaming: false,
      supportsToolCalls: true,
      networkMode: "offline" as const,
      dataHandling: "ephemeral" as const,
      credentialIsolation: "outside-project-metadata" as const,
    },
    prompt: "Inspect",
    errorCode: null,
    errorMessage: null,
    projectFingerprintBefore: "abc",
    projectFingerprintAfter: "abc",
    cancellationAcknowledged: false,
  };
}

function contextSummary() {
  return {
    sessionId: "session-n6",
    root: "/project",
    itemCount: 2,
    includedCount: 1,
    excludedCount: 1,
    estimatedTokens: 12,
    tokenBudget: 4000,
    contextTokens: 12,
    limitExceeded: false,
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
    ],
  };
}

function inspectActivity() {
  return [
    {
      invocationId: "call-inspect",
      toolName: "inspect" as const,
      status: "completed" as const,
      allowed: true,
      ok: true,
      errorCode: null,
      capability: "inspect",
      inputSummary: "root=/project",
      resultSummary: "findings=1, readiness=ready",
    },
  ];
}

function deniedActivity() {
  return [
    {
      invocationId: "call-denied",
      toolName: "inspect" as const,
      status: "denied" as const,
      allowed: false,
      ok: false,
      errorCode: "capability-denied" as const,
      capability: "inspect",
      inputSummary: "root=/project",
      resultSummary: "capability-denied: missing-capability",
    },
  ];
}

function visibleCopy(
  payload: Parameters<typeof parseNeutronDesktopViewmodel>[0],
): string {
  const viewmodel = parseNeutronDesktopViewmodel(payload);
  const lines = [
    ...(viewmodel.contextSummary === null
      ? []
      : [
          ...contextSummaryLines(viewmodel.contextSummary),
          ...viewmodel.contextSummary.excludedSecretLikePaths,
          ...viewmodel.contextSummary.sources.map(contextSourceLine),
        ]),
    ...authoritativeToolActivity(viewmodel).map(toolActivityHeading),
    ...authoritativeToolActivity(viewmodel).map((row) => row.resultSummary),
  ];
  if (authoritativeToolActivity(viewmodel).length === 0) {
    lines.push("No structured tool activity was recorded");
  }
  return lines.join("\n");
}

describe("Neutron N6 Slice 2 Desktop context and tool activity", () => {
  it("renders context summary, source rows, and excluded secret paths without secret bodies", () => {
    const text = visibleCopy({
      ...sessionFields(),
      responseText: `I read ${SECRET_BODY}`,
      toolName: "inspect",
      contextSummary: contextSummary(),
      toolActivity: inspectActivity(),
    });
    expect(text).toContain("Context items: 2");
    expect(text).toContain("Token estimate: 12");
    expect(text).toContain("Budget: 4000");
    expect(text).toContain(".env");
    expect(text).toContain("policy");
    expect(text).toContain("docs/specs/SPEC.md");
    expect(text).toContain("inspect completed");
    expect(text).not.toContain(SECRET_BODY);
    const parsed = parseNeutronContextSummary(contextSummary());
    expect(JSON.stringify(parsed)).not.toContain(SECRET_BODY);
  });

  it("renders denied tool activity as denied, not completed", () => {
    const text = visibleCopy({
      ...sessionFields(),
      responseText: "Tool unavailable",
      toolName: "inspect",
      contextSummary: contextSummary(),
      toolActivity: deniedActivity(),
    });
    expect(text).toContain("inspect denied");
    expect(text).toContain("capability-denied");
    expect(text).not.toContain("inspect completed");
  });

  it("does not fabricate tool cards from model prose", () => {
    const payload = {
      ...sessionFields(),
      responseText:
        "I ran doctor successfully. Tool: inspect completed. Apply succeeded.",
      toolName: null,
      contextSummary: contextSummary(),
      toolActivity: [],
    };
    const viewmodel = parseNeutronDesktopViewmodel(payload);
    expect(authoritativeToolActivity(viewmodel)).toEqual([]);
    const text = visibleCopy(payload);
    expect(text).toContain("No structured tool activity was recorded");
    expect(text).not.toContain("doctor completed");
    expect(text).not.toContain("ApprovedApply");
    expect(text).not.toContain("Apply succeeded");
  });

  it("replaces previous turn activity instead of mixing snapshots", () => {
    const first = visibleCopy({
      ...sessionFields(),
      responseText: "inspect done",
      toolName: "inspect",
      contextSummary: contextSummary(),
      toolActivity: inspectActivity(),
    });
    const second = visibleCopy({
      ...sessionFields(),
      session: {
        ...sessionFields().session,
        sessionId: "session-n6-second",
      },
      responseText: "denied",
      toolName: "inspect",
      contextSummary: {
        ...contextSummary(),
        sessionId: "session-n6-second",
      },
      toolActivity: deniedActivity(),
    });
    expect(first).toContain("inspect completed");
    expect(second).toContain("inspect denied");
    expect(second).not.toContain("inspect completed");
  });

  it("does not import provider clients or Approved Apply from activity modules", () => {
    const files = [
      "src/neutron/NeutronActivityPanel.tsx",
      "src/neutron/NeutronContextSummary.tsx",
      "src/neutron/NeutronContextSources.tsx",
      "src/neutron/NeutronToolActivity.tsx",
      "src/neutron/neutron-activity-viewmodel.ts",
      "src/neutron/neutron-activity-copy.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(desktopRoot, relative), "utf8");
      expect(source).not.toContain("ollama");
      expect(source).not.toContain("Ollama");
      expect(source).not.toContain("ApprovedApplyModal");
      expect(source).not.toContain(APPROVED_APPLY_METHOD);
      expect(source).not.toContain("approvedApply");
    }
  });
});
