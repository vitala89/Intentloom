import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createMemoryFileSystem,
  inspectProject,
} from "../packages/application/src/index.js";
import {
  createNeutronReadOnlyDispatch,
  routeNeutronToolInvocation,
} from "../packages/application/src/neutron-tool-router.js";
import {
  NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
  type NeutronRuntimeSession,
} from "../packages/protocol/src/neutron-runtime.js";
import type { AgentRoleCapabilities } from "../packages/protocol/src/index.js";

const ALL_TOOLS = [
  "inspect",
  "doctor",
  "memorySearch",
  "timeline",
  "conformance",
  "securityAudit",
  "projectDiff",
] as const;

function caps(
  allowedTools: readonly string[] = ALL_TOOLS,
): AgentRoleCapabilities {
  return {
    readOnly: true,
    allowedPaths: [],
    allowedTools: [...allowedTools],
    maxBudget: 100,
    allowNetwork: false,
  };
}

function session(
  overrides: Partial<NeutronRuntimeSession> = {},
): NeutronRuntimeSession {
  return {
    schemaVersion: NEUTRON_RUNTIME_SESSION_SCHEMA_URN,
    sessionId: "session-n4",
    root: "/project",
    projectId: "project-n4",
    state: "inspecting",
    mutationAllowed: false,
    createdAt: "2026-08-16T00:00:00.000Z",
    ...overrides,
  };
}

function invocation(
  toolName: string,
  args: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    invocationId: "inv-1",
    toolName,
    root: "/project",
    sessionId: "session-n4",
    argumentsJson: JSON.stringify(args),
    timeoutMs: 15_000,
    ...overrides,
  };
}

function fingerprint(fs: { files: Map<string, string> }): string {
  return [...fs.files.entries()]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path}:${content}`)
    .join("\n");
}

const gitRun = async () => ({
  stdout: [
    `${"a".repeat(40)}\u0000\u00001`,
    "README.md",
    `${"b".repeat(40)}\u0000${"a".repeat(40)}\u00002`,
    "src/index.ts",
  ].join("\n"),
  stderr: "",
});

describe("Neutron N4 read-only catalog", () => {
  it.each(ALL_TOOLS)(
    "routes %s once with structured output",
    async (toolName) => {
      const root =
        toolName === "timeline"
          ? join(await mkdtemp(join(tmpdir(), "n4-timeline-")), "project")
          : "/project";
      if (toolName === "timeline") await mkdir(root);
      const fs = createMemoryFileSystem({
        [`${root}/package.json`]: "{}",
        [`${root}/README.md`]: "hello",
      });
      const dispatch = createNeutronReadOnlyDispatch({
        fs,
        inspect: (inspectRoot) => inspectProject(inspectRoot, fs),
        timelineRun: gitRun,
      });
      const spy = vi.fn(dispatch);
      const args: Record<string, unknown> = { root };
      if (toolName === "memorySearch") args.query = "hello";
      if (toolName === "conformance") {
        args.timeline = {
          caseType: "pull-request",
          caseId: "pr:1",
          events: [{ activity: "commit", source: "git", sourceId: "c1" }],
        };
      }
      const before = fingerprint(fs);
      const result = await routeNeutronToolInvocation({
        invocation: invocation(toolName, args, { root }),
        session: session({ root }),
        capabilities: caps(),
        dispatch: spy,
      });
      expect(result.envelope.result.ok).toBe(true);
      expect(result.operationExecuted).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(JSON.parse(result.envelope.result.payloadJson ?? "{}")).toEqual(
        expect.any(Object),
      );
      expect(fingerprint(fs)).toBe(before);
    },
  );

  it.each(ALL_TOOLS)(
    "denies %s when the tool is not granted",
    async (toolName) => {
      const dispatch = vi.fn();
      const result = await routeNeutronToolInvocation({
        invocation: invocation(toolName, { root: "/project", query: "x" }),
        session: session(),
        capabilities: caps(ALL_TOOLS.filter((name) => name !== toolName)),
        dispatch,
      });
      expect(result.operationExecuted).toBe(false);
      expect(result.envelope.result.errorCode).toBe("capability-denied");
      expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("rejects doctor fix flags without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation("doctor", { root: "/project", fix: true }),
      session: session(),
      capabilities: caps(),
      dispatch,
    });
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects projectDiff apply flags without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation("projectDiff", { root: "/project", apply: true }),
      session: session(),
      capabilities: caps(),
      dispatch,
    });
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects conformance remediation flags without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation("conformance", {
        root: "/project",
        remediate: true,
      }),
      session: session(),
      capabilities: caps(),
      dispatch,
    });
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects security remediation and shell flags without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation("securityAudit", {
        root: "/project",
        shell: true,
      }),
      session: session(),
      capabilities: caps(),
      dispatch,
    });
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects root mismatch and traversal before dispatch", async () => {
    const dispatch = vi.fn();
    const mismatch = await routeNeutronToolInvocation({
      invocation: invocation("doctor", { root: "/other" }),
      session: session(),
      capabilities: caps(),
      dispatch,
    });
    expect(mismatch.envelope.result.errorCode).toBe("root-mismatch");
    const traversal = await routeNeutronToolInvocation({
      invocation: invocation("doctor", { root: "/project/../other" }),
      session: session(),
      capabilities: caps(),
      dispatch,
    });
    expect(traversal.envelope.result.errorCode).toBe("root-mismatch");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects cancelled and expired sessions before dispatch", async () => {
    const dispatch = vi.fn();
    const cancelled = await routeNeutronToolInvocation({
      invocation: invocation("timeline", { root: "/project" }),
      session: session({ state: "cancelled" }),
      capabilities: caps(),
      dispatch,
    });
    expect(cancelled.envelope.result.errorCode).toBe("cancelled");
    const expired = await routeNeutronToolInvocation({
      invocation: invocation("timeline", { root: "/project" }),
      session: session(),
      capabilities: caps(),
      dispatch,
      nowMs: 2_000,
      deadlineMs: 1_000,
    });
    expect(expired.envelope.result.errorCode).toBe("timeout");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("returns structured doctor findings without applying repairs", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "x" });
    const before = fingerprint(fs);
    const result = await routeNeutronToolInvocation({
      invocation: invocation("doctor", { root: "/project" }),
      session: session(),
      capabilities: caps(),
      dispatch: createNeutronReadOnlyDispatch({
        fs,
        inspect: (root) => inspectProject(root, fs),
      }),
    });
    expect(result.envelope.result.ok).toBe(true);
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      readOnly: boolean;
      findings: unknown[];
      changes: { content?: string }[];
    };
    expect(payload.readOnly).toBe(true);
    expect(payload.findings.length).toBeGreaterThan(0);
    expect(
      payload.changes.every((change) => change.content === undefined),
    ).toBe(true);
    expect(fingerprint(fs)).toBe(before);
  });

  it("returns a structured diff plan that is not applied", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "x" });
    const before = fingerprint(fs);
    const result = await routeNeutronToolInvocation({
      invocation: invocation("projectDiff", { root: "/project" }),
      session: session(),
      capabilities: caps(),
      dispatch: createNeutronReadOnlyDispatch({
        fs,
        inspect: (root) => inspectProject(root, fs),
      }),
    });
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      applied: boolean;
      changes: { content?: string }[];
    };
    expect(payload.applied).toBe(false);
    expect(
      payload.changes.every((change) => change.content === undefined),
    ).toBe(true);
    expect(fingerprint(fs)).toBe(before);
  });

  it("bounds timeline events from the application timeline operation", async () => {
    const root = join(await mkdtemp(join(tmpdir(), "n4-timeline-")), "project");
    await mkdir(root);
    const fs = createMemoryFileSystem({ [`${root}/README.md`]: "x" });
    const before = fingerprint(fs);
    const result = await routeNeutronToolInvocation({
      invocation: invocation("timeline", { root, limit: 1 }, { root }),
      session: session({ root }),
      capabilities: caps(),
      dispatch: createNeutronReadOnlyDispatch({
        fs,
        inspect: (root) => inspectProject(root, fs),
        timelineRun: gitRun,
      }),
    });
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      events: unknown[];
    };
    expect(payload.events.length).toBeGreaterThan(0);
    expect(payload.events.length).toBeLessThanOrEqual(100);
    expect(fingerprint(fs)).toBe(before);
  });

  it("reports conformance without rewriting policy or config", async () => {
    const fs = createMemoryFileSystem({ "/project/README.md": "x" });
    const before = fingerprint(fs);
    const result = await routeNeutronToolInvocation({
      invocation: invocation("conformance", {
        root: "/project",
        timeline: {
          caseType: "pull-request",
          caseId: "pr:1",
          events: [{ activity: "commit", source: "git", sourceId: "c1" }],
        },
      }),
      session: session(),
      capabilities: caps(),
      dispatch: createNeutronReadOnlyDispatch({
        fs,
        inspect: (root) => inspectProject(root, fs),
      }),
    });
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      policyId: string;
      findings: unknown[];
      summary: { violations: number };
    };
    expect(payload.policyId).toBe("policy:default-engineering-conformance");
    expect(Array.isArray(payload.findings)).toBe(true);
    expect(fingerprint(fs)).toBe(before);
  });

  it("inspects stored security findings without remediation", async () => {
    const finding = {
      schemaVersion: "1",
      id: "finding-a",
      ruleId: "rule.x",
      title: "Example",
      severity: "low",
      state: "open",
      category: "secrets",
      description: "example finding",
      scanner: "fixture",
      evidence: [{ path: "src/a.ts" }],
      trustClass: "user-supplied",
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
    };
    const fs = createMemoryFileSystem({
      "/project/.aif/security/findings/finding-a.json": JSON.stringify(finding),
    });
    const before = fingerprint(fs);
    const result = await routeNeutronToolInvocation({
      invocation: invocation("securityAudit", { root: "/project" }),
      session: session(),
      capabilities: caps(),
      dispatch: createNeutronReadOnlyDispatch({
        fs,
        inspect: (root) => inspectProject(root, fs),
      }),
    });
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      findings: { id: string }[];
      total: number;
    };
    expect(payload.findings.map((item) => item.id)).toEqual(["finding-a"]);
    expect(payload.total).toBe(1);
    expect(fingerprint(fs)).toBe(before);
  });
});
