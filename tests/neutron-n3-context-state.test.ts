import { describe, expect, it } from "vitest";
import {
  createMemoryFileSystem,
  type FileSystem,
} from "@intentloom/application";
import {
  assembleNeutronContext,
  N3_PROVENANCE_MEMORY,
  N3_PROVENANCE_PROFILE,
  N3_PROVENANCE_TASK_CHECKPOINT,
  N3_PROVENANCE_TASK_SUMMARY,
  N3_WARNING_MEMORY_EMPTY,
  N3_WARNING_SEMANTIC,
  N3_WARNING_TASK_CHECKPOINT,
  N3_WARNING_TASK_SUMMARY,
  profileNotFoundError,
  roleNotAllowedError,
} from "../packages/application/src/neutron-context-assembly.js";
import { NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN } from "../packages/protocol/src/neutron-runtime.js";
import {
  validateNeutronContextBundle,
  validateNeutronUsageBudget,
} from "../packages/validator/src/neutron-runtime.js";

const SKILL = `---
name: sample-code-review
version: 1.2.0
description: Perform automated code review on bounded diffs
packs:
  - frontend
roles:
  - reviewer
trustClass: canonical-policy
capabilities:
  - code-analysis
---

# sample-code-review
`;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function acceptedMemory(
  id: string,
  projectId: string,
  content: string,
): string {
  return json({
    schemaVersion: "1",
    id,
    projectId,
    classification: "accepted-decision",
    lifecycleState: "accepted",
    trustClass: "user-supplied",
    content,
    provenance: "intentloom.memory.persistent.v1",
    retentionState: "active",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    approval: {
      approvedBy: "maintainer",
      evidence: "review",
      approvedAt: "2026-08-01T00:00:00.000Z",
    },
    audit: ["proposed", "accepted"],
  });
}

function profileJson(name: string, roles: readonly string[]): string {
  return json({
    schemaVersion: "1",
    name,
    description: "Review constraints",
    allowedCapabilities: {
      readOnly: false,
      allowedPaths: ["/tmp"],
      allowedTools: ["shell"],
      maxBudget: 99,
      allowNetwork: true,
    },
    activeRoles: roles,
    createdAt: "2026-08-01T00:00:00.000Z",
  });
}

function summaryJson(id: string): string {
  return json({
    schemaVersion: "1",
    id,
    root: "/project",
    intent: "Inspect bounded review work",
    affectedPaths: ["docs/guide.md"],
    validationOutcome: "partial",
    evidenceReferences: [],
    usedSkills: ["sample-code-review"],
    unresolvedWork: ["finish review"],
    provenance: "intentloom.task.summary.v1",
    trustClass: "user-supplied",
    retentionState: "active",
    createdAt: "2026-08-01T00:00:00.000Z",
  });
}

function checkpointJson(
  id: string,
  taskId: string,
  state: string,
  extras: Record<string, unknown> = {},
): string {
  return json({
    schemaVersion: "1",
    id,
    taskId,
    state,
    completedSteps: extras.completedSteps ?? ["collect evidence"],
    unresolvedWork: extras.unresolvedWork ?? ["finish review"],
    createdSnapshotChecksum: "abc123",
    invalidatedPlans: extras.invalidatedPlans ?? [],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: extras.updatedAt ?? "2026-08-02T00:00:00.000Z",
  });
}

function baseFiles(
  extras: Record<string, string> = {},
): Record<string, string> {
  return {
    "/project/docs/specs/SPEC.md": "# Intent\nCanonical policy for assembly.\n",
    "/project/docs/decisions/ADR-0001.md": "# ADR-0001\nArchitecture.\n",
    "/project/PROJECT_STATE.md": "# Project state\nOwnership record.\n",
    "/project/DUTY_WATCH.md": "# Duty watch\nCurrent watch status.\n",
    "/project/docs/guide.md": "# Guide\nBounded documentation.\n",
    "/project/catalog/skills/sample-code-review/SKILL.md": SKILL,
    ...extras,
  };
}

function request(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: NEUTRON_CONTEXT_ASSEMBLY_REQUEST_SCHEMA_URN,
    root: "/project",
    sessionId: "neutron-session-n3-3",
    projectId: "proj-n3-3",
    ...overrides,
  };
}

function snapshotFiles(
  fs: FileSystem & { files: Map<string, string> },
): string {
  return JSON.stringify(
    [...fs.files.entries()].toSorted(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
}

function guardWrites(
  inner: FileSystem & { files: Map<string, string> },
): FileSystem & { files: Map<string, string>; writeCount: number } {
  let writeCount = 0;
  return {
    files: inner.files,
    get writeCount() {
      return writeCount;
    },
    exists: (path) => inner.exists(path),
    read: (path) => inner.read(path),
    list: (path) => inner.list(path),
    realpath: (path) => inner.realpath(path),
    isSymbolicLink: (path) => inner.isSymbolicLink(path),
    async write() {
      writeCount += 1;
      throw new Error("write forbidden");
    },
    async mkdir() {
      writeCount += 1;
      throw new Error("mkdir forbidden");
    },
    async remove() {
      writeCount += 1;
      throw new Error("remove forbidden");
    },
  };
}

function includedIds(
  result: Awaited<ReturnType<typeof assembleNeutronContext>>,
): readonly string[] {
  return result.bundle.sources
    .filter((source) => source.included)
    .map((source) => source.sourceId);
}

describe("Neutron N3 Slice 3 memory integration", () => {
  it("includes relevant accepted memory when includeMemory is true", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/items/mem-review.json": acceptedMemory(
          "mem-review",
          "proj-n3-3",
          "accepted review memory about canonical policy",
        ),
      }),
    );
    const result = await assembleNeutronContext(
      request({ includeMemory: true, query: "canonical policy" }),
      { fs },
    );
    const memory = result.bundle.sources.find(
      (source) => source.sourceId === "memory:mem-review",
    );
    expect(memory).toMatchObject({
      kind: "memory",
      trustClass: "user",
      provenance: N3_PROVENANCE_MEMORY,
      included: true,
    });
    expect(memory?.path).toBeUndefined();
    expect(memory?.contentDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(result.warnings).not.toContain(N3_WARNING_MEMORY_EMPTY);
  });

  it("performs no memory query when includeMemory is false", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/items/mem-review.json": acceptedMemory(
          "mem-review",
          "proj-n3-3",
          "canonical policy memory",
        ),
      }),
    );
    const result = await assembleNeutronContext(
      request({ includeMemory: false, query: "canonical policy" }),
      { fs },
    );
    expect(
      result.bundle.sources.some((source) => source.kind === "memory"),
    ).toBe(false);
    expect(result.warnings).not.toContain(N3_WARNING_MEMORY_EMPTY);
  });

  it("defaults includeMemory to true only when query or taskId is set", async () => {
    const files = baseFiles({
      "/project/.aif/memory/items/mem-review.json": acceptedMemory(
        "mem-review",
        "proj-n3-3",
        "canonical policy memory",
      ),
    });
    const withQuery = await assembleNeutronContext(
      request({ query: "canonical policy" }),
      { fs: createMemoryFileSystem(files) },
    );
    expect(includedIds(withQuery)).toContain("memory:mem-review");
    const without = await assembleNeutronContext(request(), {
      fs: createMemoryFileSystem(files),
    });
    expect(
      without.bundle.sources.some((source) => source.kind === "memory"),
    ).toBe(false);
  });

  it("isolates memory by projectId", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/items/mem-a.json": acceptedMemory(
          "mem-a",
          "proj-a",
          "shared retrieval token",
        ),
        "/project/.aif/memory/items/mem-b.json": acceptedMemory(
          "mem-b",
          "proj-b",
          "shared retrieval token",
        ),
      }),
    );
    const left = await assembleNeutronContext(
      request({ projectId: "proj-a", query: "shared retrieval token" }),
      { fs },
    );
    const right = await assembleNeutronContext(
      request({ projectId: "proj-b", query: "shared retrieval token" }),
      { fs },
    );
    expect(includedIds(left)).toContain("memory:mem-a");
    expect(includedIds(left)).not.toContain("memory:mem-b");
    expect(includedIds(right)).toContain("memory:mem-b");
    expect(includedIds(right)).not.toContain("memory:mem-a");
  });

  it("warns when accepted memory is empty and orders ties by id", async () => {
    const empty = await assembleNeutronContext(
      request({ includeMemory: true, query: "no-such-memory" }),
      { fs: createMemoryFileSystem(baseFiles()) },
    );
    expect(empty.warnings).toContain(N3_WARNING_MEMORY_EMPTY);
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/items/mem-z.json": acceptedMemory(
          "mem-z",
          "proj-n3-3",
          "shared retrieval token",
        ),
        "/project/.aif/memory/items/mem-a.json": acceptedMemory(
          "mem-a",
          "proj-n3-3",
          "shared retrieval token",
        ),
      }),
    );
    const first = await assembleNeutronContext(
      request({ query: "shared retrieval token" }),
      { fs },
    );
    const second = await assembleNeutronContext(
      request({ query: "shared retrieval token" }),
      { fs },
    );
    const memoryIds = first.bundle.sources
      .filter((source) => source.kind === "memory" && source.included)
      .map((source) => source.sourceId);
    expect(memoryIds).toEqual(["memory:mem-a", "memory:mem-z"]);
    expect(first.bundle).toEqual(second.bundle);
    expect(JSON.stringify(first.bundle)).toBe(JSON.stringify(second.bundle));
  });
});

describe("Neutron N3 Slice 3 task integration", () => {
  it("includes summary and checkpoint without mutating state", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/tasks/task-review.json":
          summaryJson("task-review"),
        "/project/.aif/memory/checkpoints/chk-active.json": checkpointJson(
          "chk-active",
          "task-review",
          "active",
        ),
      }),
    );
    const result = await assembleNeutronContext(
      request({ taskId: "task-review" }),
      { fs },
    );
    expect(result.bundle.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "task-summary:task-review",
          kind: "task",
          trustClass: "user",
          provenance: N3_PROVENANCE_TASK_SUMMARY,
          included: true,
        }),
        expect.objectContaining({
          sourceId: "task-checkpoint:chk-active",
          kind: "task",
          provenance: N3_PROVENANCE_TASK_CHECKPOINT,
          included: true,
        }),
      ]),
    );
    expect(result.warnings).not.toContain(N3_WARNING_TASK_SUMMARY);
    expect(result.warnings).not.toContain(N3_WARNING_TASK_CHECKPOINT);
  });

  it("warns when summary or checkpoint is missing and skips lookup without taskId", async () => {
    const missing = await assembleNeutronContext(
      request({ taskId: "task-missing" }),
      { fs: createMemoryFileSystem(baseFiles()) },
    );
    expect(missing.warnings).toEqual(
      expect.arrayContaining([
        N3_WARNING_TASK_SUMMARY,
        N3_WARNING_TASK_CHECKPOINT,
      ]),
    );
    expect(
      missing.bundle.sources.filter(
        (source) => source.exclusionReason === "record-missing",
      ),
    ).toHaveLength(2);
    const idle = await assembleNeutronContext(request(), {
      fs: createMemoryFileSystem(
        baseFiles({
          "/project/.aif/memory/tasks/task-review.json":
            summaryJson("task-review"),
        }),
      ),
    });
    expect(idle.bundle.sources.some((source) => source.kind === "task")).toBe(
      false,
    );
  });

  it("exposes cancelled and redirected checkpoints with invalidated plans", async () => {
    const cancelled = await assembleNeutronContext(
      request({ taskId: "task-cancel" }),
      {
        fs: createMemoryFileSystem(
          baseFiles({
            "/project/.aif/memory/tasks/task-cancel.json":
              summaryJson("task-cancel"),
            "/project/.aif/memory/checkpoints/chk-cancel.json": checkpointJson(
              "chk-cancel",
              "task-cancel",
              "cancelled",
            ),
          }),
        ),
      },
    );
    expect(includedIds(cancelled)).toContain("task-checkpoint:chk-cancel");
    const redirected = await assembleNeutronContext(
      request({ taskId: "task-redirect" }),
      {
        fs: createMemoryFileSystem(
          baseFiles({
            "/project/.aif/memory/tasks/task-redirect.json":
              summaryJson("task-redirect"),
            "/project/.aif/memory/checkpoints/chk-old.json": checkpointJson(
              "chk-old",
              "task-redirect",
              "active",
              { updatedAt: "2026-08-01T00:00:00.000Z" },
            ),
            "/project/.aif/memory/checkpoints/chk-redirect.json":
              checkpointJson("chk-redirect", "task-redirect", "redirected", {
                invalidatedPlans: ["plan-stale"],
                updatedAt: "2026-08-03T00:00:00.000Z",
              }),
          }),
        ),
      },
    );
    expect(includedIds(redirected)).toContain("task-checkpoint:chk-redirect");
    expect(includedIds(redirected)).not.toContain("task-checkpoint:chk-old");
    const digest = redirected.bundle.sources.find(
      (source) => source.sourceId === "task-checkpoint:chk-redirect",
    )?.contentDigest;
    const older = redirected.bundle.sources.find(
      (source) => source.sourceId === "task-checkpoint:chk-old",
    )?.contentDigest;
    expect(digest).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(digest).not.toBe(older);
  });
});

describe("Neutron N3 Slice 3 profile integration", () => {
  it("includes a requested profile as metadata without granting capabilities", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/profiles/reviewer.json": profileJson("reviewer", [
          "reviewer",
        ]),
      }),
    );
    const result = await assembleNeutronContext(
      request({ profileName: "reviewer", role: "reviewer" }),
      { fs },
    );
    expect(result.bundle.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "profile:reviewer",
          kind: "policy",
          trustClass: "user",
          provenance: N3_PROVENANCE_PROFILE,
          included: true,
        }),
      ]),
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('mutationAllowed":true');
    expect(
      result.bundle.sources.some((source) => "allowedTools" in source),
    ).toBe(false);
  });

  it("blocks a missing profile and a role the profile does not allow", async () => {
    await expect(
      assembleNeutronContext(request({ profileName: "missing" }), {
        fs: createMemoryFileSystem(baseFiles()),
      }),
    ).rejects.toThrow(profileNotFoundError("missing"));
    await expect(
      assembleNeutronContext(
        request({ profileName: "reviewer", role: "context-scout" }),
        {
          fs: createMemoryFileSystem(
            baseFiles({
              "/project/.aif/memory/profiles/reviewer.json": profileJson(
                "reviewer",
                ["reviewer"],
              ),
            }),
          ),
        },
      ),
    ).rejects.toThrow(roleNotAllowedError("context-scout", "reviewer"));
  });

  it("uses role only for skill filtering when profileName is absent", async () => {
    const fs = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/profiles/reviewer.json": profileJson("reviewer", [
          "reviewer",
        ]),
      }),
    );
    const result = await assembleNeutronContext(
      request({ role: "context-scout" }),
      { fs },
    );
    expect(
      result.bundle.sources.some((source) =>
        source.sourceId.startsWith("profile:"),
      ),
    ).toBe(false);
    expect(
      result.bundle.sources.some(
        (source) =>
          source.kind === "skill" && source.exclusionReason === "skill-filter",
      ),
    ).toBe(true);
  });
});

describe("Neutron N3 Slice 3 priority, budget, and safety", () => {
  it("keeps policy above profile, task, skills, and memory under tight budgets", async () => {
    const files = baseFiles({
      "/project/.aif/memory/profiles/reviewer.json": profileJson("reviewer", [
        "reviewer",
      ]),
      "/project/.aif/memory/tasks/task-review.json": summaryJson("task-review"),
      "/project/.aif/memory/checkpoints/chk-active.json": checkpointJson(
        "chk-active",
        "task-review",
        "active",
      ),
      "/project/.aif/memory/items/mem-review.json": acceptedMemory(
        "mem-review",
        "proj-n3-3",
        "canonical policy memory",
      ),
    });
    const fs = createMemoryFileSystem(files);
    const full = await assembleNeutronContext(
      request({
        profileName: "reviewer",
        taskId: "task-review",
        query: "canonical policy",
      }),
      { fs },
    );
    const included = full.bundle.sources.filter((source) => source.included);
    const order = included.map((source) => source.sourceId);
    expect(order.indexOf("profile:reviewer")).toBeGreaterThan(
      included.findIndex((source) => source.path === "docs/specs/SPEC.md"),
    );
    expect(order.indexOf("task-summary:task-review")).toBeGreaterThan(
      order.indexOf("profile:reviewer"),
    );
    expect(order.indexOf("memory:mem-review")).toBeGreaterThan(
      order.indexOf("task-summary:task-review"),
    );
    const tightItems = await assembleNeutronContext(
      request({
        profileName: "reviewer",
        taskId: "task-review",
        query: "canonical policy",
        maxItems: 3,
      }),
      { fs: createMemoryFileSystem(files) },
    );
    const tightIncluded = tightItems.bundle.sources.filter(
      (source) => source.included,
    );
    const tightIds = tightIncluded.map((source) => source.sourceId);
    const specIndex = tightIncluded.findIndex(
      (source) => source.path === "docs/specs/SPEC.md",
    );
    expect(specIndex).toBe(0);
    expect(tightIds).toContain("profile:reviewer");
    expect(tightIds.indexOf("profile:reviewer")).toBeGreaterThan(specIndex);
    expect(
      tightIncluded.some((source) => source.sourceId.startsWith("memory:")),
    ).toBe(false);
    expect(
      tightItems.bundle.sources.some(
        (source) =>
          source.sourceId === "memory:mem-review" &&
          source.exclusionReason === "item-budget",
      ),
    ).toBe(true);
    const tightTokens = await assembleNeutronContext(
      request({
        profileName: "reviewer",
        taskId: "task-review",
        query: "canonical policy",
        maxTokens: 1,
      }),
      { fs: createMemoryFileSystem(files) },
    );
    expect(
      tightTokens.bundle.sources.some(
        (source) => source.exclusionReason === "token-budget",
      ),
    ).toBe(true);
    expect(tightTokens.usage.limitExceeded).toBe(true);
  });

  it("keeps semantic ranking deferred and does not write or call network", async () => {
    const inner = createMemoryFileSystem(
      baseFiles({
        "/project/.aif/memory/profiles/reviewer.json": profileJson("reviewer", [
          "reviewer",
        ]),
        "/project/.aif/memory/items/mem-review.json": acceptedMemory(
          "mem-review",
          "proj-n3-3",
          "canonical policy memory",
        ),
      }),
    );
    const before = snapshotFiles(inner);
    const fs = guardWrites(inner);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("network forbidden");
    }) as typeof fetch;
    try {
      const result = await assembleNeutronContext(
        request({
          profileName: "reviewer",
          query: "canonical policy",
          semanticRanking: true,
        }),
        { fs },
      );
      validateNeutronContextBundle(result.bundle);
      validateNeutronUsageBudget(result.usage);
      expect(result.warnings).toContain(N3_WARNING_SEMANTIC);
      expect(result.bundle.sources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sourceId: "deferred:semantic",
            included: false,
            exclusionReason: "deferred",
          }),
        ]),
      );
      expect(fs.writeCount).toBe(0);
      expect(snapshotFiles(inner)).toBe(before);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
