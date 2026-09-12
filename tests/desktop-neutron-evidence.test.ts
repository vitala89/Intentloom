import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { APPROVED_APPLY_METHOD } from "@intentloom/protocol";
import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
} from "@intentloom/protocol";
import { evidencePanelLines } from "../apps/desktop/src/neutron/neutron-evidence-copy.js";
import {
  authoritativeNeutronOutcome,
  modelProseClaimsSuccess,
} from "../apps/desktop/src/neutron/neutron-evidence-outcome.js";
import { parseNeutronDesktopViewmodel } from "../apps/desktop/src/neutron/neutron-session-viewmodel.js";
import { parseNeutronGraphSnapshot } from "../apps/desktop/src/neutron/neutron-graph-viewmodel.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);
const SECRET_BODY = "N6_SLICE4_SECRET=must-not-appear";

function sessionFields(overrides: Record<string, unknown> = {}) {
  return {
    session: {
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "session-n6",
      root: "/project",
      projectId: "project-n6",
      state: "completed" as const,
      mutationAllowed: false as const,
      createdAt: "2026-09-12T00:00:00.000Z",
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
    prompt: "Run graph",
    errorCode: null,
    errorMessage: null,
    projectFingerprintBefore: "sha256:project-before",
    projectFingerprintAfter: "sha256:project-after",
    cancellationAcknowledged: false,
    contextSummary: null,
    toolActivity: [],
    graphSnapshot: null,
    ...overrides,
  };
}

function graphNode() {
  return {
    taskId: "task-a",
    parentId: null,
    role: "context-scout",
    state: "completed" as const,
    dependencies: [],
    blockingDependencyIds: [],
    requestedCapabilities: ["inspect"],
    effectiveCapabilities: {
      readOnly: true,
      allowNetwork: false,
      allowedTools: ["inspect"],
      maxBudget: 100,
    },
    allowedTools: ["inspect"],
    attemptCount: 2,
    authoritativeAttempt: 2,
    attempts: [
      {
        attempt: 1,
        leaseId: "lease-1",
        state: "timed-out" as const,
        retryReason: "timeout" as const,
        errorCode: "timeout",
      },
      {
        attempt: 2,
        leaseId: "lease-2",
        state: "completed" as const,
        retryReason: null,
        errorCode: null,
      },
    ],
    resultStatus: "completed" as const,
    outputDigestPresent: true,
    toolCount: 1,
    contextAvailable: true,
    providerKind: "deterministic-test",
    modelId: "fixture-n6",
    mutationAttempted: false as const,
    errorCode: null,
    contextSourceIds: ["policy:spec"],
    toolInvocations: [
      {
        invocationId: "inv-1",
        toolName: "inspect",
        payloadDigestPresent: true,
      },
    ],
  };
}

function graphSnapshot(overrides: Record<string, unknown> = {}) {
  return parseNeutronGraphSnapshot({
    schemaVersion: NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
    graphId: "sha256:graph-id",
    sessionId: "session-n6",
    root: "/project",
    projectId: "project-n6",
    status: "completed",
    partial: false,
    accepted: true,
    mutationAttempted: false,
    rerunAttempted: false,
    cancellationAcknowledged: false,
    budgetExceeded: false,
    digestPresent: true,
    outputDigest: "sha256:output-digest-value",
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      contextTokens: 25,
      tokenBudget: 4000,
      limitExceeded: false,
    },
    concurrency: {
      defaultConcurrency: 1,
      maxConcurrency: 1,
      hardMaximum: 4,
      runningCount: 0,
      availableCapacity: 1,
    },
    nodeCounts: {
      total: 1,
      pending: 0,
      ready: 0,
      running: 0,
      blocked: 0,
      cancelled: 0,
      timedOut: 0,
      failed: 0,
      completed: 1,
    },
    nodes: [graphNode()],
    stale: null,
    warnings: [],
    ...overrides,
  });
}

describe("Neutron N6 Slice 4 evidence and provenance", () => {
  it("shows graph completed with accepted false without inventing acceptance", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      graphSnapshot: graphSnapshot({ accepted: false, status: "completed" }),
    });
    const outcome = authoritativeNeutronOutcome(vm);
    expect(outcome?.accepted).toBe(false);
    expect(evidencePanelLines(vm)).toContain("Completed (not accepted)");
    expect(evidencePanelLines(vm)).toContain(
      "Runtime did not accept this result.",
    );
  });

  it("shows accepted completed graph outcome", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      responseText: "All good",
      graphSnapshot: graphSnapshot(),
    });
    expect(evidencePanelLines(vm)).toContain("Completed (accepted)");
    expect(evidencePanelLines(vm)).toContain("Runtime accepted this result.");
  });

  it("does not derive acceptance for session-only completed turns", () => {
    const positiveProse =
      "Verified. All tasks succeeded. Everything completed successfully.";
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      responseText: positiveProse,
      graphSnapshot: null,
      contextSummary: {
        sessionId: "session-n6",
        root: "/project",
        itemCount: 1,
        includedCount: 1,
        excludedCount: 0,
        estimatedTokens: 10,
        tokenBudget: 4000,
        contextTokens: 10,
        limitExceeded: false,
        excludedSecretLikePaths: [],
        sources: [],
      },
    });
    const outcome = authoritativeNeutronOutcome(vm);
    expect(outcome?.kind).toBe("session-completed");
    expect(outcome?.accepted).toBeNull();
    const lines = evidencePanelLines(vm);
    expect(lines).toContain("Session completed");
    expect(lines).not.toContain("Runtime accepted this result.");
    expect(modelProseClaimsSuccess(positiveProse)).toBe(true);
    expect(lines).toContain("model-prose-ignored-for-status");
    expect(outcome).toEqual(
      authoritativeNeutronOutcome({
        ...vm,
        responseText: "failure prose",
      }),
    );
  });

  it("shows budget warning without inventing session acceptance", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      graphSnapshot: null,
      contextSummary: {
        sessionId: "session-n6",
        root: "/project",
        itemCount: 1,
        includedCount: 0,
        excludedCount: 1,
        estimatedTokens: 5000,
        tokenBudget: 100,
        contextTokens: 5000,
        limitExceeded: true,
        excludedSecretLikePaths: [],
        sources: [],
      },
    });
    const outcome = authoritativeNeutronOutcome(vm);
    expect(outcome?.accepted).toBeNull();
    expect(outcome?.budgetExceeded).toBe(true);
    expect(evidencePanelLines(vm)).toContain("context-budget-exceeded");
    expect(evidencePanelLines(vm)).not.toContain(
      "Runtime accepted this result.",
    );
    expect(evidencePanelLines(vm)).not.toContain(
      "Runtime did not accept this result.",
    );
  });

  it("rejects model prose success when graph is stale and not accepted", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      responseText: "Verified. All tasks succeeded. Files were updated.",
      graphSnapshot: graphSnapshot({
        status: "stale",
        accepted: false,
        stale: {
          accepted: false,
          rerunAttempted: false,
          kinds: ["project"],
          mismatches: [
            {
              kind: "project",
              expected: "sha256:expected",
              current: "sha256:current",
            },
          ],
        },
      }),
    });
    const lines = evidencePanelLines(vm);
    expect(lines).toContain("Stale");
    expect(lines).toContain("Runtime did not accept this result.");
    expect(lines).toContain("model-prose-claims-success");
    expect(lines).toContain("model-prose-ignored-for-status");
    expect(lines.join("\n")).not.toContain("Runtime accepted");
  });

  it("preserves evidence for failed graph results", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields({
        session: { ...sessionFields().session, state: "failed" },
      }),
      responseText: null,
      graphSnapshot: graphSnapshot({
        status: "failed",
        accepted: false,
        nodes: [
          {
            ...graphNode(),
            state: "failed",
            resultStatus: "failed",
            attempts: [
              {
                attempt: 1,
                leaseId: "lease-1",
                state: "failed",
                retryReason: "operation-failed",
                errorCode: "operation-failed",
              },
            ],
          },
        ],
      }),
    });
    expect(evidencePanelLines(vm)).toContain("Failed");
  });

  it("distinguishes timed-out from failed", () => {
    const timedOut = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      graphSnapshot: graphSnapshot({ status: "timed-out", accepted: false }),
    });
    const failed = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      graphSnapshot: graphSnapshot({ status: "failed", accepted: false }),
    });
    expect(evidencePanelLines(timedOut)[0]).toBe("Timed out");
    expect(evidencePanelLines(failed)[0]).toBe("Failed");
  });

  it("surfaces budget exceeded warnings", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      graphSnapshot: graphSnapshot({
        budgetExceeded: true,
        accepted: false,
        warnings: ["budget-exceeded"],
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          contextTokens: 25,
          tokenBudget: 100,
          limitExceeded: true,
        },
      }),
    });
    expect(evidencePanelLines(vm)).toContain("budget-exceeded");
  });

  it("does not leak secret bodies from context summaries", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      contextSummary: {
        sessionId: "session-n6",
        root: "/project",
        itemCount: 1,
        includedCount: 0,
        excludedCount: 1,
        estimatedTokens: 0,
        tokenBudget: 1000,
        contextTokens: 0,
        limitExceeded: false,
        excludedSecretLikePaths: [".env"],
        sources: [
          {
            sourceId: "secret:env",
            kind: "policy",
            trustClass: "project",
            provenance: "test",
            included: false,
            exclusionReason: "secret-like",
            path: ".env",
          },
        ],
      },
      responseText: SECRET_BODY,
    });
    expect(JSON.stringify(vm.contextSummary)).not.toContain(SECRET_BODY);
    expect(evidencePanelLines(vm).join("\n")).not.toContain(SECRET_BODY);
    expect(vm.contextSummary?.excludedSecretLikePaths).toEqual([".env"]);
  });

  it("keeps mutationAttempted false and excludes Apply UI", () => {
    const vm = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      graphSnapshot: graphSnapshot(),
      responseText: "I changed the files on disk.",
    });
    expect(evidencePanelLines(vm)).toContain("Mutation attempted: false");
    const workspace = readFileSync(
      join(desktopRoot, "src/neutron/NeutronWorkspace.tsx"),
      "utf8",
    );
    expect(workspace).not.toContain("ApprovedApplyModal");
    expect(workspace).not.toContain(APPROVED_APPLY_METHOD);
  });

  it("clears evidence when root changes in session hook", () => {
    const hookSource = readFileSync(
      join(desktopRoot, "src/neutron/use-neutron-session.ts"),
      "utf8",
    );
    expect(hookSource).toContain("setViewmodel(null)");
    expect(hookSource).toMatch(/\[root\]/);
  });
});
