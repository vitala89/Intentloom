import { resolve } from "node:path";
import {
  createMemoryFileSystem,
  type FileSystem,
} from "@intentloom/application";
import { inside } from "../packages/application/src/project-path.ts";
import type {
  InteractiveWorkspaceReadDependencies,
  LocalWorkspaceSyncDependencies,
} from "../packages/application/src/workspace/interactive-workspace-read-model.ts";

export const root = "/project";
export const catalogRoot = resolve("catalog");
export const readModelPath =
  "packages/application/src/workspace/interactive-workspace-read-model.ts";
export const views = [
  "inspect",
  "doctor",
  "diff",
  "timeline",
  "health",
  "security",
  "sessions",
] as const;
export const interactiveKeys = [
  "projectId",
  "root",
  "activeView",
  "inspect",
  "findings",
  "diff",
  "timeline",
  "auditReport",
  "sessions",
  "generatedAt",
] as const;
export const syncKeys = [
  "projectId",
  "root",
  "readiness",
  "findingsCount",
  "securityScore",
  "activeConversationsCount",
  "subagentTasksCount",
  "syncedAt",
] as const;

export type Inspection = { readonly readiness: string };
export type Doctor = { readonly findings: readonly string[] };
export type PlanShape = {
  readonly changes: readonly { readonly path: string }[];
  readonly diagnostics: readonly string[];
};
export type TimelineShape = {
  readonly root: string;
  readonly diagnostics: readonly string[];
};

export function flush(): Promise<void> {
  return new Promise((resolveFlush) => {
    setTimeout(resolveFlush, 0);
  });
}

export function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolvePromiseInner) => {
    resolvePromise = resolvePromiseInner;
  });
  return { promise, resolve: resolvePromise };
}

export function observedFileSystem(initial?: Record<string, string>): {
  fs: FileSystem & { files: Map<string, string> };
  calls: {
    exists: number;
    read: number;
    write: number;
    mkdir: number;
    remove: number;
    list: number;
  };
} {
  const base = createMemoryFileSystem(initial);
  const calls = { exists: 0, read: 0, write: 0, mkdir: 0, remove: 0, list: 0 };
  return {
    calls,
    fs: {
      files: base.files,
      async exists(path) {
        calls.exists += 1;
        return base.exists(path);
      },
      async read(path) {
        calls.read += 1;
        return base.read(path);
      },
      async write(path, content) {
        calls.write += 1;
        return base.write(path, content);
      },
      async mkdir(path) {
        calls.mkdir += 1;
        return base.mkdir(path);
      },
      async remove(path) {
        calls.remove += 1;
        return base.remove(path);
      },
      async list(path) {
        calls.list += 1;
        return base.list(path);
      },
      realpath: (path) => base.realpath(path),
      isSymbolicLink: (path) => base.isSymbolicLink(path),
    },
  };
}

export function auditReport(healthScore: number) {
  return {
    schemaVersion: "1",
    projectId: "kept-project",
    healthScore,
    invariantChecks: [
      {
        invariantId: 9,
        title: "Kept title",
        status: "passed",
        details: "Kept details",
      },
    ],
    auditHash: `kept-hash-${healthScore}`,
    auditedAt: "2026-01-01T00:00:00.000Z",
  };
}

export function writeAudit(
  fs: FileSystem & { files: Map<string, string> },
  healthScore: number,
): Promise<void> {
  return fs.write(storedAuditPath(), JSON.stringify(auditReport(healthScore)));
}

export function storedAuditPath(): string {
  return inside(root, ".aif/security/audit-report.json");
}

export function interactiveDependencies(
  overrides: Partial<
    InteractiveWorkspaceReadDependencies<
      Inspection,
      Doctor,
      PlanShape,
      TimelineShape
    >
  > = {},
): InteractiveWorkspaceReadDependencies<
  Inspection,
  Doctor,
  PlanShape,
  TimelineShape
> {
  return {
    inspectProject: async () => ({ readiness: "ready" }),
    doctorProject: async () => ({ findings: ["doctor-finding"] }),
    diffProject: async () => ({
      changes: [{ path: "kept.ts" }],
      diagnostics: [],
    }),
    timelineProject: async () => ({ root, diagnostics: ["kept"] }),
    ...overrides,
  };
}

export function syncDependencies(
  overrides: Partial<
    LocalWorkspaceSyncDependencies<
      Inspection,
      Doctor,
      readonly { readonly projectId: string }[],
      readonly { readonly conversationId: string }[]
    >
  > = {},
): LocalWorkspaceSyncDependencies<
  Inspection,
  Doctor,
  readonly { readonly projectId: string }[],
  readonly { readonly conversationId: string }[]
> {
  return {
    inspectProject: async () => ({ readiness: "partial-metadata" }),
    doctorProject: async () => ({ findings: ["one", "two"] }),
    listWorkspaceConversations: async () => [
      { projectId: "other-project" },
      { projectId: "second-project" },
      { projectId: "third-project" },
    ],
    listNeutronSubagentTasks: async () => [
      { conversationId: "conversation-a" },
      { conversationId: "conversation-b" },
    ],
    ...overrides,
  };
}
