import { describe, expect, it } from "vitest";
import type {
  ExtensionHealthEvidence,
  ExtensionLockfile,
} from "@intentloom/protocol";
import {
  checkExtensionHealth,
  createMemoryFileSystem,
  doctorExitCode,
  doctorProject,
} from "@intentloom/application";

const root = "/project";
const lockfilePath = `${root}/.aif/extension-lock.json`;
const now = "2026-08-04T15:00:00.000Z";
const extensionId = "ext:org/demo";

function lockEntry(
  overrides: Partial<ExtensionLockfile["extensions"][string]> = {},
) {
  return {
    extensionId,
    category: "skill" as const,
    requestedVersion: "1.2.3",
    resolvedVersion: "1.2.3",
    source: { registry: "npm", package: "@org/demo" },
    publisher: { name: "Org" },
    integrity: "sha256:verified",
    grantedCapabilities: { filesystem: { read: ["src/**"] } },
    license: { spdxId: "MIT" },
    configDigest: "sha256:config",
    approvedAt: now,
    approvedBy: "maintainer",
    lastHealthCheck: now,
    installationType: "downloaded" as const,
    ...overrides,
  };
}

function lockfile(
  overrides: Partial<ExtensionLockfile["extensions"][string]> = {},
): ExtensionLockfile {
  return {
    lockVersion: 1,
    updatedAt: now,
    extensions: { [extensionId]: lockEntry(overrides) },
  };
}

function writeLock(
  fs: ReturnType<typeof createMemoryFileSystem>,
  value: unknown,
) {
  return fs.write(lockfilePath, `${JSON.stringify(value, null, 2)}\n`);
}

describe("Phase E5: Extension Doctor Diagnostics & Health Verification", () => {
  it("returns a healthy empty report when no extension lock exists", async () => {
    const fs = createMemoryFileSystem();
    await expect(checkExtensionHealth({ root }, fs)).resolves.toMatchObject({
      status: "healthy",
      checkedExtensionIds: [],
      findings: [],
    });
  });

  it("detects stale, unpinned, and incomplete lock metadata without writing", async () => {
    const fs = createMemoryFileSystem();
    await writeLock(
      fs,
      lockfile({
        requestedVersion: "^1.2.0",
        resolvedVersion: "1.2.3",
        integrity: undefined,
        license: { spdxId: "Apache-2.0", noticeRequired: true },
        lastHealthCheck: "2026-08-01T00:00:00.000Z",
      }),
    );
    const before = [...fs.files.entries()];

    const report = await checkExtensionHealth(
      { root, now, maxAgeMs: 60 * 60 * 1000 },
      fs,
    );

    expect(report.status).toBe("failed");
    expect(report.findings.map((item) => item.code)).toEqual([
      "extension-lock-unpinned",
      "extension-health-stale",
      "extension-integrity-missing",
      "extension-notice-metadata-missing",
    ]);
    expect([...fs.files.entries()]).toEqual(before);
  });

  it("verifies a pinned artifact and injected runtime evidence", async () => {
    const fs = createMemoryFileSystem();
    await writeLock(fs, lockfile());
    const evidence: ExtensionHealthEvidence = {
      extensionId,
      sourceStatus: "available",
      artifactIntegrity: "sha256:verified",
      declaredCapabilities: { filesystem: { read: ["src/**"] } },
      grantedCapabilities: { filesystem: { read: ["src/**"] } },
      configDigest: "sha256:config",
      entrypointAvailable: true,
      healthCheckStatus: "healthy",
    };

    const report = await checkExtensionHealth(
      { root, now, evidence: [evidence] },
      fs,
    );

    expect(report).toEqual({
      status: "healthy",
      checkedExtensionIds: [extensionId],
      findings: [],
      diagnostics: [],
    });
  });

  it("reports compromised, modified, unavailable, and unapproved runtime state", async () => {
    const fs = createMemoryFileSystem();
    await writeLock(fs, lockfile());
    const evidence: ExtensionHealthEvidence = {
      extensionId,
      sourceStatus: "compromised",
      artifactIntegrity: "sha256:modified",
      declaredCapabilities: { filesystem: { read: ["src/**"] } },
      grantedCapabilities: { filesystem: { write: [".aif/**"] } },
      configDigest: "sha256:changed",
      entrypointAvailable: false,
      healthCheckStatus: "unhealthy",
    };

    const report = await checkExtensionHealth(
      { root, now, evidence: [evidence] },
      fs,
    );

    expect(report.status).toBe("failed");
    expect(report.findings.map((item) => item.code)).toEqual([
      "extension-source-compromised",
      "extension-integrity-mismatch",
      "extension-capability-unapproved",
      "extension-capability-drift",
      "extension-configuration-drift",
      "extension-entrypoint-unavailable",
      "extension-health-check-failed",
    ]);
  });

  it("includes extension findings in the read-only project doctor", async () => {
    const fs = createMemoryFileSystem();
    await writeLock(fs, lockfile({ integrity: undefined }));
    const before = [...fs.files.entries()];
    const report = await doctorProject(
      {
        root,
        profile: "generic",
        adapters: ["codex"],
      },
      fs,
    );

    expect(report.findings.map((item) => item.code)).toContain(
      "extension-integrity-missing",
    );
    expect(doctorExitCode(report)).toBe(3);
    expect([...fs.files.entries()]).toEqual(before);
  });
});
