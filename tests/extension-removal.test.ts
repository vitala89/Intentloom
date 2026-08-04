import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { ExtensionLockfile } from "@intentloom/protocol";
import {
  createMemoryFileSystem,
  previewExtensionRemoval,
  removeExtension,
  type ExtensionRemovalRuntime,
} from "@intentloom/application";

const root = "/workspace";
const extensionId = "ext:org/vector-search";
const lockfilePath = `${root}/.aif/extension-lock.json`;
const artifactPath = `${root}/.aif/extensions/vector-search/index.js`;
const configPath = `${root}/.aif/config.yaml`;
const noticePath = ".aif/notices/vector-search.txt";

function digest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

function lockfile(): ExtensionLockfile {
  return {
    lockVersion: 1,
    updatedAt: "2026-08-04T15:00:00.000Z",
    extensions: {
      [extensionId]: {
        extensionId,
        category: "knowledge-provider",
        requestedVersion: "^1.0.0",
        resolvedVersion: "1.4.0",
        source: { registry: "npm", package: "@org/vector-search" },
        publisher: { name: "Original Publisher" },
        integrity: "sha256:artifact",
        grantedCapabilities: { filesystem: { read: ["src/**"] } },
        license: { spdxId: "MIT" },
        approvedAt: "2026-08-01T00:00:00.000Z",
        approvedBy: "maintainer",
        installationType: "downloaded",
      },
    },
  };
}

function fixture() {
  const artifact = "export const query = true;\n";
  const config = "extensions:\n  vector-search: enabled\n";
  const fs = createMemoryFileSystem({
    [lockfilePath]: `${JSON.stringify(lockfile(), null, 2)}\n`,
    [artifactPath]: artifact,
    [configPath]: config,
    [`${root}/${noticePath}`]: "Copyright Original Publisher\n",
    [`${root}/src/project.ts`]: "export const owned = true;\n",
  });
  return { fs, artifact, config };
}

function options(artifact: string, config: string) {
  return {
    root,
    extensionId,
    filesToRemove: [
      {
        path: ".aif/extensions/vector-search/index.js",
        description: "extension executable artifact",
        beforeDigest: digest(artifact),
      },
    ],
    configurationChanges: [
      {
        path: ".aif/config.yaml",
        description: "remove extension registration",
        beforeDigest: digest(config),
        afterDigest: digest("extensions:\n"),
        afterContent: "extensions:\n",
      },
    ],
    processesToStop: ["vector-search-daemon"],
    projectOwnedPaths: ["src/project.ts"],
    retainedPaths: [noticePath, ".aif/audit/extension-removal.jsonl"],
    noticePaths: [noticePath],
  } as const;
}

function runtime(overrides: Partial<ExtensionRemovalRuntime> = {}) {
  return {
    stop: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    ...overrides,
  } satisfies ExtensionRemovalRuntime;
}

describe("Phase E6: safe extension removal and rollback", () => {
  it("previews read-only targets, retained notices, and project-owned files", async () => {
    const { fs, artifact, config } = fixture();
    const originalLock = await fs.read(lockfilePath);
    const plan = await previewExtensionRemoval(options(artifact, config), fs);

    expect(plan.status).toBe("requires-approval");
    expect(plan.filesToRemove.map((file) => file.path)).toEqual([
      ".aif/extensions/vector-search/index.js",
    ]);
    expect(plan.configurationChanges[0]?.path).toBe(".aif/config.yaml");
    expect(plan.retainedPaths).toContain(noticePath);
    expect(plan.projectOwnedPaths).toEqual(["src/project.ts"]);
    expect(await fs.read(lockfilePath)).toBe(originalLock);
  });

  it("rejects unsafe ownership, missing notice retention, and stale digests", async () => {
    const { fs, artifact, config } = fixture();
    const unsafe = await previewExtensionRemoval(
      {
        ...options(artifact, config),
        configurationChanges: [],
        filesToRemove: [
          {
            path: ".aif/config.yaml",
            description: "must remain",
            beforeDigest: digest(config),
          },
        ],
      },
      fs,
    );
    expect(unsafe.status).toBe("rejected");
    expect(unsafe.diagnostics).toContain(
      "removal-path-not-extension-owned:.aif/config.yaml",
    );

    const missingNotice = await previewExtensionRemoval(
      { ...options(artifact, config), retainedPaths: [] },
      fs,
    );
    expect(missingNotice.diagnostics).toContain(
      `removal-notice-not-retained:${noticePath}`,
    );

    const stale = await previewExtensionRemoval(
      {
        ...options(artifact, config),
        filesToRemove: [
          {
            ...options(artifact, config).filesToRemove[0],
            beforeDigest: digest("changed"),
          },
        ],
      },
      fs,
    );
    expect(stale.diagnostics).toContain(
      "removal-target-digest-mismatch:.aif/extensions/vector-search/index.js",
    );
  });

  it("requires approval and keeps runtime untouched", async () => {
    const { fs, artifact, config } = fixture();
    const plan = await previewExtensionRemoval(options(artifact, config), fs);
    const isolatedRuntime = runtime();
    const result = await removeExtension({ root, plan }, fs, isolatedRuntime);

    expect(result.status).toBe("unchanged");
    expect(result.diagnostics).toContain(
      `extension-removal-approval-required:${extensionId}`,
    );
    expect(isolatedRuntime.stop).not.toHaveBeenCalled();
    expect(await fs.exists(artifactPath)).toBe(true);
  });

  it("removes only explicit extension state and preserves notices and project code", async () => {
    const { fs, artifact, config } = fixture();
    const plan = await previewExtensionRemoval(options(artifact, config), fs);
    const removalRuntime = runtime();
    const result = await removeExtension(
      {
        root,
        plan,
        approval: {
          approvedBy: "maintainer",
          approvedAt: "2026-08-04T16:00:00Z",
        },
      },
      fs,
      removalRuntime,
    );

    expect(result.status).toBe("removed");
    expect(await fs.exists(artifactPath)).toBe(false);
    expect(await fs.read(configPath)).toBe("extensions:\n");
    expect(await fs.exists(`${root}/${noticePath}`)).toBe(true);
    expect(await fs.exists(`${root}/src/project.ts`)).toBe(true);
    expect(
      JSON.parse(await fs.read(lockfilePath)).extensions[extensionId],
    ).toBeUndefined();
    expect(removalRuntime.stop).toHaveBeenCalledWith(plan);
    expect(removalRuntime.remove).toHaveBeenCalledWith(plan);
  });

  it("restores lock, configuration, and artifacts when runtime removal fails", async () => {
    const { fs, artifact, config } = fixture();
    const originalLock = await fs.read(lockfilePath);
    const plan = await previewExtensionRemoval(options(artifact, config), fs);
    const removalRuntime = runtime({
      remove: vi.fn(async () => {
        throw new Error("runtime cleanup failed");
      }),
    });
    const result = await removeExtension(
      {
        root,
        plan,
        approval: {
          approvedBy: "maintainer",
          approvedAt: "2026-08-04T16:00:00Z",
        },
      },
      fs,
      removalRuntime,
    );

    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("remove");
    expect(result.rollbackCompleted).toBe(true);
    expect(await fs.read(lockfilePath)).toBe(originalLock);
    expect(await fs.read(artifactPath)).toBe(artifact);
    expect(await fs.read(configPath)).toBe(config);
    expect(removalRuntime.rollback).toHaveBeenCalledWith(plan);
  });
});
