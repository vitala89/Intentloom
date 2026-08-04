import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type {
  ExtensionLockfile,
  ExtensionManifest,
  ExtensionUpdateCandidate,
} from "@intentloom/protocol";
import { discoverExtensionUpdatePlans } from "@intentloom/validator";
import {
  applyExtensionUpdate,
  createMemoryFileSystem,
  discoverExtensionUpdates,
  type ExtensionUpdateRuntime,
} from "@intentloom/application";

const extensionId = "ext:org/vector-search";
const timestamp = "2026-08-04T15:00:00.000Z";

function digest(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

const currentLockfile: ExtensionLockfile = {
  lockVersion: 1,
  updatedAt: "2026-08-01T00:00:00.000Z",
  extensions: {
    [extensionId]: {
      extensionId,
      category: "knowledge-provider",
      requestedVersion: "^1.0.0",
      resolvedVersion: "1.4.0",
      source: {
        registry: "npm",
        package: "@org/vector-search",
        resolved: "https://registry.example/vector-search-1.4.0.tgz",
      },
      publisher: { name: "Original Publisher" },
      integrity: "sha256:old-artifact",
      grantedCapabilities: { filesystem: { read: ["src/**"] } },
      license: { spdxId: "MIT" },
      approvedAt: "2026-08-01T00:00:00.000Z",
      approvedBy: "maintainer",
      installationType: "downloaded",
    },
  },
};

const candidateManifest: ExtensionManifest = {
  extensionId,
  name: "Vector Search",
  category: "knowledge-provider",
  version: "2.0.0",
  publisher: { name: "New Publisher" },
  source: { registry: "npm", package: "@org/vector-search" },
  compatibility: { intentloomCore: "^1.0.0", node: ">=20.0.0" },
  license: { spdxId: "Apache-2.0", noticeRequired: true },
  capabilities: {
    filesystem: { read: ["src/**"], write: [".aif/vector-cache/**"] },
  },
  entrypoint: { type: "module", command: "./dist/index.js" },
  updateChannel: "stable",
  installationType: "downloaded",
};

const oldConfig = '{"schemaVersion":1}\n';
const newConfig = '{"schemaVersion":2}\n';

const candidate: ExtensionUpdateCandidate = {
  manifest: candidateManifest,
  resolvedVersion: "2.0.0",
  integrity: "sha256:new-artifact",
  resolvedUrl: "https://registry.example/vector-search-2.0.0.tgz",
  releaseNotes: ["Adds the v2 query protocol"],
  breakingChanges: ["Configuration schema v2 is required"],
  migrations: [
    {
      id: "config-v2",
      target: "configuration",
      path: ".aif/extensions/vector-search.json",
      description: "Upgrade configuration schema to v2",
      action: "update",
      beforeDigest: digest(oldConfig),
      afterDigest: digest(newConfig),
      reversible: true,
    },
  ],
};

const approval = { approvedBy: "maintainer", approvedAt: timestamp };
const migrationStep = {
  id: "config-v2",
  path: candidate.migrations![0]!.path,
  nextContent: newConfig,
};

function updatePlan() {
  return discoverExtensionUpdatePlans(currentLockfile, [candidate]).updates[0]!;
}

function runtime(overrides: Partial<ExtensionUpdateRuntime> = {}) {
  const implementation: ExtensionUpdateRuntime = {
    stage: vi.fn(async () => undefined),
    verifyIntegrity: vi.fn(async () => true),
    healthCheck: vi.fn(async () => ({ healthy: true })),
    commit: vi.fn(async () => undefined),
    rollback: vi.fn(async () => undefined),
    ...overrides,
  };
  return implementation;
}

describe("Phase E4: Extension Update Discovery & Migration Pipeline", () => {
  it("discovers updates read-only and highlights review-sensitive changes", async () => {
    const root = "/workspace";
    const lockfilePath = `${root}/.aif/extension-lock.json`;
    const originalLockfile = `${JSON.stringify(currentLockfile, null, 2)}\n`;
    const fs = createMemoryFileSystem({ [lockfilePath]: originalLockfile });

    const report = await discoverExtensionUpdates(
      {
        root,
        candidates: [candidate],
        environment: { nodeVersion: "v22.0.0", coreVersion: "1.0.2" },
      },
      fs,
    );

    expect(report.updates).toHaveLength(1);
    const plan = report.updates[0];
    expect(plan?.status).toBe("requires-approval");
    expect(plan?.capabilityDelta.filesystemWriteAdded).toEqual([
      ".aif/vector-cache/**",
    ]);
    expect(plan?.licenseChanged).toBe(true);
    expect(plan?.publisherChanged).toBe(true);
    expect(plan?.breakingChanges).toContain(
      "major version changes from 1 to 2",
    );
    expect(plan?.migrations[0]?.path).toBe(
      ".aif/extensions/vector-search.json",
    );
    expect(await fs.read(lockfilePath)).toBe(originalLockfile);
  });

  it("reports same or older candidates as up to date", () => {
    const report = discoverExtensionUpdatePlans(currentLockfile, [
      { ...candidate, resolvedVersion: "1.4.0" },
    ]);

    expect(report.updates).toEqual([]);
    expect(report.upToDateExtensionIds).toEqual([extensionId]);
  });

  it("rejects downloaded candidates without integrity or reversible migration", () => {
    const unsafeCandidate: ExtensionUpdateCandidate = {
      ...candidate,
      integrity: undefined,
      migrations: [{ ...candidate.migrations![0]!, reversible: false }],
    };

    const report = discoverExtensionUpdatePlans(currentLockfile, [
      unsafeCandidate,
    ]);
    const plan = report.updates[0];

    expect(plan?.status).toBe("rejected");
    expect(plan?.diagnostics).toContain("candidate-integrity-required");
    expect(plan?.diagnostics).toContain("irreversible-migration-not-supported");
  });

  it("leaves lock and runtime untouched without explicit approval", async () => {
    const root = "/workspace";
    const lockfilePath = `${root}/.aif/extension-lock.json`;
    const originalLockfile = `${JSON.stringify(currentLockfile, null, 2)}\n`;
    const fs = createMemoryFileSystem({ [lockfilePath]: originalLockfile });
    const plan = updatePlan();
    const isolatedRuntime = runtime();

    const result = await applyExtensionUpdate(
      { root, plan },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("unchanged");
    expect(result.diagnostics).toContain(
      `extension-update-approval-required:${extensionId}`,
    );
    expect(isolatedRuntime.stage).not.toHaveBeenCalled();
    expect(await fs.read(lockfilePath)).toBe(originalLockfile);
  });

  it("applies an approved update after migration, integrity, and health checks", async () => {
    const root = "/workspace";
    const lockfilePath = `${root}/.aif/extension-lock.json`;
    const configPath = `${root}/.aif/extensions/vector-search.json`;
    const fs = createMemoryFileSystem({
      [lockfilePath]: `${JSON.stringify(currentLockfile, null, 2)}\n`,
      [configPath]: oldConfig,
    });
    const plan = updatePlan();
    const isolatedRuntime = runtime();

    const result = await applyExtensionUpdate(
      {
        root,
        plan,
        approval,
        migrations: [migrationStep],
      },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("updated");
    expect(await fs.read(configPath)).toBe(newConfig);
    const updatedLockfile = JSON.parse(
      await fs.read(lockfilePath),
    ) as ExtensionLockfile;
    expect(updatedLockfile.extensions[extensionId]?.resolvedVersion).toBe(
      "2.0.0",
    );
    expect(updatedLockfile.extensions[extensionId]?.pendingMigration).toBe(
      false,
    );
    expect(updatedLockfile.extensions[extensionId]?.approvedAt).toBe(timestamp);
    expect(isolatedRuntime.commit).toHaveBeenCalledOnce();
    expect(isolatedRuntime.rollback).not.toHaveBeenCalled();
  });

  it("rolls back lock and migration bytes when health validation fails", async () => {
    const root = "/workspace";
    const lockfilePath = `${root}/.aif/extension-lock.json`;
    const configPath = `${root}/.aif/extensions/vector-search.json`;
    const originalLockfile = `${JSON.stringify(currentLockfile, null, 2)}\n`;
    const fs = createMemoryFileSystem({
      [lockfilePath]: originalLockfile,
      [configPath]: oldConfig,
    });
    const plan = updatePlan();
    const isolatedRuntime = runtime({
      healthCheck: vi.fn(async () => ({
        healthy: false,
        diagnostics: ["candidate-health-check-failed"],
      })),
    });

    const result = await applyExtensionUpdate(
      {
        root,
        plan,
        approval,
        migrations: [migrationStep],
      },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("health-check");
    expect(result.rollbackCompleted).toBe(true);
    expect(await fs.read(lockfilePath)).toBe(originalLockfile);
    expect(await fs.read(configPath)).toBe(oldConfig);
    expect(isolatedRuntime.rollback).toHaveBeenCalledOnce();
  });

  it("aborts before migration and rolls back staged runtime on integrity failure", async () => {
    const root = "/workspace";
    const lockfilePath = `${root}/.aif/extension-lock.json`;
    const configPath = `${root}/.aif/extensions/vector-search.json`;
    const originalLockfile = `${JSON.stringify(currentLockfile, null, 2)}\n`;
    const fs = createMemoryFileSystem({
      [lockfilePath]: originalLockfile,
      [configPath]: oldConfig,
    });
    const plan = updatePlan();
    const isolatedRuntime = runtime({
      verifyIntegrity: vi.fn(async () => false),
    });

    const result = await applyExtensionUpdate(
      {
        root,
        plan,
        approval,
        migrations: [migrationStep],
      },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("integrity");
    expect(await fs.read(configPath)).toBe(oldConfig);
    expect(await fs.read(lockfilePath)).toBe(originalLockfile);
    expect(isolatedRuntime.healthCheck).not.toHaveBeenCalled();
    expect(isolatedRuntime.rollback).toHaveBeenCalledOnce();
  });

  it("rejects stale lock state before staging the candidate", async () => {
    const root = "/workspace";
    const staleLockfile: ExtensionLockfile = {
      ...currentLockfile,
      extensions: {
        [extensionId]: {
          ...currentLockfile.extensions[extensionId]!,
          resolvedVersion: "1.5.0",
        },
      },
    };
    const fs = createMemoryFileSystem({
      [`${root}/.aif/extension-lock.json`]: JSON.stringify(staleLockfile),
    });
    const plan = updatePlan();
    const isolatedRuntime = runtime();

    const result = await applyExtensionUpdate(
      {
        root,
        plan,
        approval,
        migrations: [migrationStep],
      },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("unchanged");
    expect(result.diagnostics).toContain(
      `extension-update-lock-stale:${extensionId}`,
    );
    expect(isolatedRuntime.stage).not.toHaveBeenCalled();
  });

  it("rejects migration paths outside the explicit project root", async () => {
    const root = "/workspace";
    const fs = createMemoryFileSystem({
      [`${root}/.aif/extension-lock.json`]: JSON.stringify(currentLockfile),
    });
    const discoveredPlan = discoverExtensionUpdatePlans(currentLockfile, [
      candidate,
    ]).updates[0]!;
    const plan = {
      ...discoveredPlan,
      migrations: [
        { ...discoveredPlan.migrations[0]!, path: "../outside.json" },
      ],
    };
    const isolatedRuntime = runtime();

    const result = await applyExtensionUpdate(
      {
        root,
        plan,
        approval,
        migrations: [
          { id: "config-v2", path: "../outside.json", nextContent: newConfig },
        ],
      },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("unchanged");
    expect(result.diagnostics).toContain(
      "migration-path-outside-root:../outside.json",
    );
    expect(isolatedRuntime.stage).not.toHaveBeenCalled();
  });

  it("rejects extension-owned migration paths that traverse a symbolic link", async () => {
    const root = "/workspace";
    const fs = createMemoryFileSystem({
      [`${root}/.aif/extension-lock.json`]: JSON.stringify(currentLockfile),
      [`${root}/.aif/extensions/vector-search.json`]: oldConfig,
    });
    fs.isSymbolicLink = vi.fn(
      async (path) => path === `${root}/.aif/extensions`,
    );
    const isolatedRuntime = runtime();

    const result = await applyExtensionUpdate(
      {
        root,
        plan: updatePlan(),
        approval,
        migrations: [migrationStep],
      },
      fs,
      isolatedRuntime,
    );

    expect(result.status).toBe("unchanged");
    expect(result.diagnostics).toContain(
      "migration-path-symbolic-link:.aif/extensions/vector-search.json",
    );
    expect(isolatedRuntime.stage).not.toHaveBeenCalled();
  });
});
