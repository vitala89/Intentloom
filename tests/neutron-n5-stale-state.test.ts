import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  createProfile,
  createTaskCheckpoint,
  inspectProject,
  pauseTask,
  type FileSystem,
} from "../packages/application/src/index.js";
import {
  detectNeutronGraphStaleness,
  executeReadyNeutronTaskNodes,
  fingerprintNeutronProfileAuthority,
  isNeutronSchedulerStatePath,
  reconcileNeutronTaskGraphExecution,
  snapshotNeutronCheckpoint,
  snapshotNeutronProfile,
} from "../packages/application/src/neutron-scheduler.js";
import type { ModelAdapter } from "../packages/application/src/model-adapter.js";
import { validateModelAdapterCapabilities } from "../packages/validator/src/model-adapter.js";
import type {
  ModelTurnRequest,
  ModelTurnResult,
} from "../packages/protocol/src/model-adapter.js";
import {
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  NEUTRON_TASK_GRAPH_SCHEMA_URN,
  type NeutronRuntimeSession,
  type NeutronTaskGraph,
  type NeutronTaskNode,
} from "../packages/protocol/src/neutron-runtime.js";
import type { AgentRoleCapabilities } from "../packages/protocol/src/index.js";

const ROOT = "/project";
const SESSION = "session-n5-5s";
const PROJECT = "project-n5-5s";

function caps(): AgentRoleCapabilities {
  return {
    allowNetwork: false,
    allowedPaths: [],
    allowedTools: ["inspect"],
    maxBudget: 50,
    readOnly: true,
  };
}

function session(): NeutronRuntimeSession {
  return {
    createdAt: "2026-09-07T00:00:00.000Z",
    mutationAllowed: false,
    projectId: PROJECT,
    root: ROOT,
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: SESSION,
    state: "inspecting",
  };
}

function node(
  taskId: string,
  overrides: Partial<NeutronTaskNode> = {},
): NeutronTaskNode {
  return {
    dependencies: [],
    expectedOutput: `Complete ${taskId}`,
    parentId: null,
    requiredCapabilities: ["inspect"],
    role: "context-scout",
    state: "ready",
    taskId,
    ...overrides,
  };
}

function graph(nodes: NeutronTaskNode[]): NeutronTaskGraph {
  return {
    nodes,
    root: ROOT,
    schemaVersion: NEUTRON_TASK_GRAPH_SCHEMA_URN,
    sessionId: SESSION,
  };
}

function projectFiles(): Record<string, string> {
  return {
    "/project/README.md": "safe",
    "/project/src/main.ts": "export const ok = true;\n",
  };
}

function sourceFingerprint(
  fs: FileSystem & { files: Map<string, string> },
): string {
  return [...fs.files.entries()]
    .filter(([path]) => !isNeutronSchedulerStatePath(path))
    .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

class InspectAdapter implements ModelAdapter {
  visits = 0;

  getCapabilities() {
    return validateModelAdapterCapabilities({
      maxContextTokens: 8192,
      maxOutputTokens: 1024,
      modelId: "fixture-n5-5s",
      providerKind: "ollama",
      supportsStreaming: false,
      supportsToolCalls: true,
      supportsVision: false,
    });
  }

  async executeTurn(request: ModelTurnRequest): Promise<ModelTurnResult> {
    this.visits += 1;
    if (this.visits % 2 === 1) {
      return {
        diagnostics: ["n5-slice5-stale"],
        responseText: "",
        schemaVersion: 1,
        sessionId: request.sessionId,
        stopReason: "tool_call",
        toolCalls: [
          {
            argumentsJson: JSON.stringify({ root: ROOT }),
            id: "call-inspect",
            name: "inspect",
          },
        ],
        usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
      };
    }
    return {
      diagnostics: ["n5-slice5-stale"],
      responseText: "done",
      schemaVersion: 1,
      sessionId: request.sessionId,
      stopReason: "stop",
      toolCalls: [],
      usage: { inputTokens: 2, outputTokens: 1, totalTokens: 3 },
    };
  }
}

describe("Neutron N5 Slice 5 — stale-state", () => {
  it("accepts an unchanged project fingerprint", () => {
    const report = detectNeutronGraphStaleness({
      baseline: { projectFingerprint: "fp-1" },
      current: { projectFingerprint: "fp-1" },
    });
    expect(report.accepted).toBe(true);
    expect(report.kinds).toEqual([]);
    expect(report.rerunAttempted).toBe(false);
  });

  it("rejects a changed project source fingerprint", () => {
    const report = detectNeutronGraphStaleness({
      baseline: { projectFingerprint: "fp-1" },
      current: { projectFingerprint: "fp-2" },
    });
    expect(report.accepted).toBe(false);
    expect(report.kinds).toEqual(["project"]);
    expect(report.mismatches[0]).toEqual({
      current: "fp-2",
      expected: "fp-1",
      kind: "project",
    });
  });

  it("does not treat scheduler lease metadata as project drift", async () => {
    const fs = createMemoryFileSystem(projectFiles());
    const before = sourceFingerprint(fs);
    await fs.mkdir("/project/.aif/neutron/scheduler/leases");
    await fs.write(
      "/project/.aif/neutron/scheduler/leases/lease.json",
      JSON.stringify({ leaseId: "session:task-a:1" }),
    );
    expect(sourceFingerprint(fs)).toBe(before);
    expect(
      detectNeutronGraphStaleness({
        baseline: { projectFingerprint: before },
        current: { projectFingerprint: sourceFingerprint(fs) },
      }).accepted,
    ).toBe(true);
  });

  it("accepts unchanged checkpoint authority and rejects a changed checkpoint", async () => {
    const fs = createMemoryFileSystem(projectFiles());
    const created = await createTaskCheckpoint("task-a", { root: ROOT }, fs);
    const baseline = snapshotNeutronCheckpoint(created);
    expect(
      detectNeutronGraphStaleness({
        baseline: { checkpoint: baseline, projectFingerprint: "fp" },
        current: { checkpoint: baseline, projectFingerprint: "fp" },
      }).accepted,
    ).toBe(true);
    const paused = await pauseTask(created.id, { root: ROOT }, fs);
    const report = detectNeutronGraphStaleness({
      baseline: { checkpoint: baseline, projectFingerprint: "fp" },
      current: {
        checkpoint: snapshotNeutronCheckpoint(paused),
        projectFingerprint: "fp",
      },
    });
    expect(report.accepted).toBe(false);
    expect(report.kinds).toEqual(["checkpoint"]);
  });

  it("accepts unchanged profile authority and rejects a capability change", async () => {
    const fs = createMemoryFileSystem(projectFiles());
    const profile = await createProfile(
      {
        activeRoles: ["context-scout"],
        allowedCapabilities: caps(),
        createdAt: "2026-09-07T00:00:00.000Z",
        name: "scout",
        schemaVersion: "1",
      },
      { root: ROOT },
      fs,
    );
    const baseline = snapshotNeutronProfile(profile);
    expect(
      detectNeutronGraphStaleness({
        baseline: { profile: baseline, projectFingerprint: "fp" },
        current: { profile: baseline, projectFingerprint: "fp" },
      }).accepted,
    ).toBe(true);
    const widened = await createProfile(
      {
        ...profile,
        allowedCapabilities: { ...caps(), allowedTools: ["inspect", "doctor"] },
      },
      { root: ROOT },
      fs,
    );
    const report = detectNeutronGraphStaleness({
      baseline: { profile: baseline, projectFingerprint: "fp" },
      current: {
        profile: snapshotNeutronProfile(widened),
        projectFingerprint: "fp",
      },
    });
    expect(report.accepted).toBe(false);
    expect(report.kinds).toEqual(["profile"]);
    expect(baseline.fingerprint).not.toBe(
      fingerprintNeutronProfileAuthority({
        allowedTools: ["inspect", "doctor"],
        profileName: "scout",
        capabilities: widened.allowedCapabilities,
        activeRoles: widened.activeRoles,
      }),
    );
  });

  it("never reruns after stale detection", async () => {
    const adapter = new InspectAdapter();
    const fs = createMemoryFileSystem(projectFiles());
    const baseline = sourceFingerprint(fs);
    const wave = await executeReadyNeutronTaskNodes({
      adapter,
      fingerprintProject: async () => sourceFingerprint(fs),
      fs,
      graph: graph([node("task-a")]),
      inspect: async (root) => inspectProject(root, fs),
      projectId: PROJECT,
      session: session(),
      sessionCapabilities: caps(),
    });
    await fs.write("/project/README.md", "changed");
    const visits = adapter.visits;
    const reconciled = reconcileNeutronTaskGraphExecution({
      baseline: { projectFingerprint: baseline },
      current: { projectFingerprint: sourceFingerprint(fs) },
      graph: wave.graph,
      outcomes: wave.outcomes,
      session: session(),
    });
    expect(reconciled.status).toBe("stale");
    expect(reconciled.rerunAttempted).toBe(false);
    expect(adapter.visits).toBe(visits);
  });
});
