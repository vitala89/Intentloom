import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { neutronDesktopMethods } from "../apps/desktop/src/desktop-client-neutron.js";
import {
  APPROVED_APPLY_METHOD,
  NEUTRON_GRAPH_CANCEL_METHOD,
  NEUTRON_GRAPH_EXECUTE_METHOD,
  NEUTRON_GRAPH_GET_METHOD,
} from "@intentloom/protocol";
import {
  NEUTRON_ADAPTER_CAPABILITY_SCHEMA_URN,
  NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronGraphSnapshot,
} from "@intentloom/protocol";
import {
  attemptLine,
  graphSummaryLines,
  nodeDependencyLine,
  nodeHeading,
  staleWarning,
} from "../apps/desktop/src/neutron/neutron-graph-copy.js";
import {
  authoritativeGraphSnapshot,
  parseNeutronGraphSnapshot,
} from "../apps/desktop/src/neutron/neutron-graph-viewmodel.js";
import { parseNeutronDesktopViewmodel } from "../apps/desktop/src/neutron/neutron-session-viewmodel.js";

const desktopRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/desktop",
);

function sessionFields() {
  return {
    session: {
      schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
      sessionId: "session-n6",
      root: "/project",
      projectId: "project-n6",
      state: "completed" as const,
      mutationAllowed: false as const,
      createdAt: "2026-09-11T00:00:00.000Z",
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
    contextSummary: null,
    toolActivity: [],
  };
}

function attempt(
  number: number,
  state: "completed" | "failed" | "cancelled" | "timed-out",
  retryReason: string | null = null,
) {
  return {
    attempt: number,
    leaseId: `session-n6:task-a:${number}`,
    state,
    retryReason,
    errorCode:
      state === "completed"
        ? null
        : state === "timed-out"
          ? "timeout"
          : "operation-failed",
  };
}

function node(overrides: Record<string, unknown> = {}) {
  return {
    taskId: "task-a",
    parentId: null,
    role: "context-scout",
    state: "completed",
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
    attemptCount: 1,
    authoritativeAttempt: 1,
    attempts: [attempt(1, "completed")],
    resultStatus: "completed",
    outputDigestPresent: true,
    toolCount: 1,
    contextAvailable: true,
    providerKind: "deterministic-test",
    modelId: "fixture-n6",
    mutationAttempted: false,
    errorCode: null,
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<NeutronGraphSnapshot> & Record<string, unknown> = {},
): NeutronGraphSnapshot {
  return parseNeutronGraphSnapshot({
    schemaVersion: NEUTRON_GRAPH_SNAPSHOT_SCHEMA_URN,
    graphId: "sha256:abc",
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
    nodes: [node()],
    stale: null,
    warnings: [],
    ...overrides,
  }) as NeutronGraphSnapshot;
}

function visible(graph: NeutronGraphSnapshot, responseText = ""): string {
  const viewmodel = parseNeutronDesktopViewmodel({
    ...sessionFields(),
    responseText,
    graphSnapshot: graph,
  });
  const authoritative = authoritativeGraphSnapshot(viewmodel);
  if (authoritative === null) return "No task graph snapshot is available";
  return [
    ...graphSummaryLines(authoritative),
    staleWarning(authoritative) ?? "",
    ...authoritative.nodes.map(nodeHeading),
    ...authoritative.nodes.map(nodeDependencyLine),
    ...authoritative.nodes.flatMap((item) => item.attempts.map(attemptLine)),
  ].join("\n");
}

describe("Neutron N6 Slice 3 Desktop task graph", () => {
  it("renders graph summary, node state, and dependencies", () => {
    const text = visible(
      snapshot({
        nodes: [
          node({ taskId: "task-a" }),
          node({
            taskId: "task-b",
            state: "pending",
            resultStatus: "pending",
            dependencies: ["task-a"],
            blockingDependencyIds: ["task-a"],
            attemptCount: 0,
            authoritativeAttempt: null,
            attempts: [],
          }),
        ],
        nodeCounts: {
          total: 2,
          pending: 1,
          ready: 0,
          running: 0,
          blocked: 0,
          cancelled: 0,
          timedOut: 0,
          failed: 0,
          completed: 1,
        },
        status: "incomplete",
        accepted: false,
        partial: true,
      }),
    );
    expect(text).toContain("Status incomplete");
    expect(text).toContain("task-a completed");
    expect(text).toContain("Blocked by task-a");
  });

  it("shows each canonical graph status without inventing thinking", () => {
    for (const status of [
      "completed",
      "failed",
      "cancelled",
      "timed-out",
      "incomplete",
      "stale",
    ] as const) {
      expect(
        visible(snapshot({ status, accepted: status === "completed" })),
      ).toContain(`Status ${status}`);
      expect(
        visible(snapshot({ status, accepted: status === "completed" })),
      ).not.toContain("thinking");
    }
  });

  it("keeps attempt 1 visible after attempt 2 and distinguishes timeout from failure", () => {
    const retry = visible(
      snapshot({
        nodes: [
          node({
            attemptCount: 2,
            attempts: [
              attempt(1, "failed", "operation-failed"),
              attempt(2, "completed"),
            ],
          }),
        ],
      }),
    );
    expect(retry).toContain("Attempt 1 failed");
    expect(retry).toContain("Attempt 2 completed");
    expect(
      visible(
        snapshot({
          status: "timed-out",
          accepted: false,
          nodes: [
            node({
              state: "timed-out",
              resultStatus: "timed-out",
              attempts: [attempt(1, "timed-out", "timeout")],
            }),
          ],
        }),
      ),
    ).toContain("timed-out");
  });

  it("shows stale warning without auto-rerun and requires cancellation ack", () => {
    const stale = visible(
      snapshot({
        status: "stale",
        accepted: false,
        rerunAttempted: false,
        stale: {
          accepted: false,
          rerunAttempted: false,
          kinds: ["project"],
          mismatches: [{ kind: "project", expected: "aaa", current: "bbb" }],
        },
      }),
    );
    expect(stale).toContain("not accepted");
    expect(stale).toContain("Rerun was not attempted");
    expect(stale).toContain("Rerun not attempted");
    const cancelled = visible(
      snapshot({
        status: "cancelled",
        accepted: false,
        cancellationAcknowledged: true,
      }),
    );
    expect(cancelled).toContain("Cancellation acknowledged");
  });

  it("does not let model prose fabricate graph nodes or status", () => {
    const viewmodel = parseNeutronDesktopViewmodel({
      ...sessionFields(),
      responseText: "Task A completed. Graph completed. Spawned task-z.",
      graphSnapshot: null,
    });
    expect(authoritativeGraphSnapshot(viewmodel)).toBeNull();
    expect(viewmodel.responseText).toContain("Task A completed");
  });

  it("clears graph snapshot when the project root changes", () => {
    const source = readFileSync(
      join(desktopRoot, "src/neutron/use-neutron-session.ts"),
      "utf8",
    );
    expect(source).toMatch(/useEffect\(\(\) => \{[\s\S]*setViewmodel\(null\)/);
    expect(source).toMatch(/\},\s*\[root\]\);/);
  });

  it("issues named graph RPCs rather than a wildcard tunnel", async () => {
    const requests: object[] = [];
    const methods = neutronDesktopMethods(async (request) => {
      requests.push(request);
      return {
        ...sessionFields(),
        responseText: "",
        graphSnapshot: null,
      };
    });
    await methods.neutronGraphGet("/project", "session-n6", "project-n6");
    await methods.neutronGraphExecute("/project", "session-n6", "project-n6", [
      {
        taskId: "task-a",
        parentId: null,
        dependencies: [],
        role: "context-scout",
        requiredCapabilities: ["inspect"],
        state: "ready",
        expectedOutput: "Inspect",
      },
    ]);
    await methods.neutronGraphCancel("/project", "session-n6", "project-n6");
    expect(requests.map((item) => (item as { method: string }).method)).toEqual(
      [
        NEUTRON_GRAPH_GET_METHOD,
        NEUTRON_GRAPH_EXECUTE_METHOD,
        NEUTRON_GRAPH_CANCEL_METHOD,
      ],
    );
  });

  it("does not add mutation or Apply UI on the graph path", () => {
    const files = [
      "src/neutron/NeutronTaskGraphPanel.tsx",
      "src/neutron/NeutronGraphSummary.tsx",
      "src/neutron/NeutronTaskNodeCard.tsx",
      "src/neutron/use-neutron-session.ts",
      "src/desktop-client-neutron.ts",
      "src/neutron/neutron-graph-parse.ts",
      "src/neutron/neutron-graph-parse-node.ts",
    ];
    for (const relative of files) {
      const source = readFileSync(join(desktopRoot, relative), "utf8");
      expect(source).not.toContain("ApprovedApplyModal");
      expect(source).not.toContain(APPROVED_APPLY_METHOD);
      expect(source).not.toContain("approvedApply");
      expect(source).not.toContain("writeFile");
      expect(source).not.toContain("mutationAllowed: true");
    }
  });
});
