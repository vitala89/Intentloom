import { describe, expect, it, vi } from "vitest";
import {
  acceptPersistentMemory,
  createMemoryFileSystem,
  inspectProject,
  proposePersistentMemory,
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

const CAPS: AgentRoleCapabilities = {
  readOnly: true,
  allowedPaths: [],
  allowedTools: ["memorySearch"],
  maxBudget: 100,
  allowNetwork: false,
};

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
  args: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    invocationId: "inv-mem",
    toolName: "memorySearch",
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

async function seedMemory(
  fs: ReturnType<typeof createMemoryFileSystem>,
  projectId: string,
  id: string,
  content: string,
): Promise<void> {
  const options = { root: "/project", projectId };
  await proposePersistentMemory(
    {
      id,
      projectId,
      classification: "accepted-decision",
      content,
      provenance: "user",
    },
    options,
    fs,
  );
  await acceptPersistentMemory(
    id,
    { approvedBy: "maintainer", evidence: "review" },
    options,
    fs,
  );
}

describe("Neutron N4 memory search tool", () => {
  it("searches only the session project and does not mutate memory", async () => {
    const fs = createMemoryFileSystem();
    await seedMemory(
      fs,
      "project-n4",
      "keep",
      "Use deterministic local retrieval",
    );
    await seedMemory(
      fs,
      "other-project",
      "leak",
      "Use deterministic local retrieval",
    );
    const before = fingerprint(fs);
    const dispatch = createNeutronReadOnlyDispatch({
      fs,
      inspect: (root) => inspectProject(root, fs),
    });
    const spy = vi.fn(dispatch);
    const result = await routeNeutronToolInvocation({
      invocation: invocation({
        root: "/project",
        query: "deterministic retrieval",
      }),
      session: session(),
      capabilities: CAPS,
      dispatch: spy,
    });
    expect(result.envelope.result.ok).toBe(true);
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      items: { id: string; projectId: string }[];
    };
    expect(payload.items.map((item) => item.id)).toEqual(["keep"]);
    expect(payload.items.every((item) => item.projectId === "project-n4")).toBe(
      true,
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(fingerprint(fs)).toBe(before);
  });

  it("rejects a cross-project projectId argument without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation({
        root: "/project",
        query: "deterministic",
        projectId: "other-project",
      }),
      session: session(),
      capabilities: CAPS,
      dispatch,
    });
    expect(result.operationExecuted).toBe(false);
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects memory mutation flags without dispatch", async () => {
    const dispatch = vi.fn();
    const result = await routeNeutronToolInvocation({
      invocation: invocation({
        root: "/project",
        query: "deterministic",
        write: true,
      }),
      session: session(),
      capabilities: CAPS,
      dispatch,
    });
    expect(result.envelope.result.errorCode).toBe("validation-failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("bounds result count", async () => {
    const fs = createMemoryFileSystem();
    for (let index = 0; index < 8; index += 1) {
      await seedMemory(
        fs,
        "project-n4",
        `item-${index}`,
        "deterministic retrieval note",
      );
    }
    const result = await routeNeutronToolInvocation({
      invocation: invocation({
        root: "/project",
        query: "deterministic",
        maxItems: 3,
      }),
      session: session(),
      capabilities: CAPS,
      dispatch: createNeutronReadOnlyDispatch({
        fs,
        inspect: (root) => inspectProject(root, fs),
      }),
    });
    const payload = JSON.parse(result.envelope.result.payloadJson ?? "{}") as {
      items: unknown[];
    };
    expect(payload.items).toHaveLength(3);
  });
});
