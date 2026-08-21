import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeExternalSpecializedPackDigest,
  createMemoryFileSystem,
  runSpecializedPacksExternalCliCommand,
  type FileSystem,
} from "@intentloom/application";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  type QualitySpecializedPackManifest,
} from "@intentloom/protocol";

const projectRoot = "/project";
const lockPath = `${projectRoot}/.aif/extension-lock.json`;
const declaredLicense = "MIT";

function externalManifest(
  overrides: Partial<QualitySpecializedPackManifest> = {},
): QualitySpecializedPackManifest {
  return {
    schemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    id: "pack-reviewed-org-mlops",
    version: "1.0.0",
    name: "Reviewed Org MLOps Pack",
    publisher: "Example Org",
    targetDisciplineIds: ["discipline-ml-ai"],
    providedArchitectureStrategies: ["batch-inference"],
    providedRuleIds: ["MLOPS-001-dataset-pin"],
    requiredTooling: [],
    permissionsRequired: ["project.files.read"],
    conflicts: [],
    dependencies: [],
    ...overrides,
  };
}

function sourceFor(manifest: QualitySpecializedPackManifest) {
  return {
    kind: "local" as const,
    locator: "./packs/mlops.json",
    pin: "local-v1",
    digest: computeExternalSpecializedPackDigest(manifest),
  };
}

function cliPreviewArgs(manifest = externalManifest()) {
  return {
    manifestJson: JSON.stringify(manifest),
    sourceJson: JSON.stringify(sourceFor(manifest)),
    declaredPublisher: manifest.publisher,
    declaredLicense,
    json: true,
  };
}

function approvalFor(manifest = externalManifest()) {
  return {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve" as const,
    reviewerId: "reviewer-ada",
    source: sourceFor(manifest),
  };
}

function projectFs(initial: Record<string, string> = {}): FileSystem {
  return createMemoryFileSystem({ [projectRoot]: "", ...initial });
}

describe("Specialized Engineering Packs Phase S8d CLI external surface", () => {
  it("previews a valid external manifest with deterministic JSON", async () => {
    const manifest = externalManifest();
    const first = await runSpecializedPacksExternalCliCommand(
      "preview",
      cliPreviewArgs(manifest),
    );
    const second = await runSpecializedPacksExternalCliCommand(
      "preview",
      cliPreviewArgs(manifest),
    );
    expect(first.exitCode).toBe(0);
    expect(first.stdout).toBe(second.stdout);
    const parsed = JSON.parse(first.stdout) as {
      status: string;
      digest: string;
      packId: string;
    };
    expect(parsed.status).toBe("ready-for-review");
    expect(parsed.digest).toBe(computeExternalSpecializedPackDigest(manifest));
    expect(parsed.packId).toBe(manifest.id);
  });

  it("rejects forbidden permissions", async () => {
    const unsafe = await runSpecializedPacksExternalCliCommand(
      "preview",
      cliPreviewArgs(
        externalManifest({
          id: "pack-unsafe-net",
          permissionsRequired: ["network.connect"],
        }),
      ),
    );
    expect(unsafe.exitCode).toBe(1);
    expect(JSON.parse(unsafe.stdout).status).toBe("rejected");
  });

  it("fails on malformed manifest and performs no filesystem mutation", async () => {
    const root = await mkdtemp(join(tmpdir(), "intentloom-s8d-cli-preview-"));
    try {
      const before = await readdir(root, { recursive: true });
      const res = await runSpecializedPacksExternalCliCommand("preview", {
        manifestJson: "{not-json",
        sourceJson: JSON.stringify(sourceFor(externalManifest())),
        declaredPublisher: "Example Org",
        declaredLicense,
        json: true,
      });
      const after = await readdir(root, { recursive: true });
      expect(res.exitCode).toBe(1);
      expect(after).toEqual(before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("activates a fresh approved pack through S8c and writes extension-lock.json", async () => {
    const fs = projectFs();
    const manifest = externalManifest();
    const res = await runSpecializedPacksExternalCliCommand("activate", {
      ...cliPreviewArgs(manifest),
      root: projectRoot,
      approvalJson: JSON.stringify(approvalFor(manifest)),
      fs,
    });
    expect(res.exitCode).toBe(0);
    expect(JSON.parse(res.stdout)).toMatchObject({
      status: "applied",
      changedPaths: [".aif/extension-lock.json"],
      writes: 1,
    });
    expect(await fs.exists(lockPath)).toBe(true);
  });

  it("returns already-applied on a second identical activation", async () => {
    const fs = projectFs();
    const manifest = externalManifest();
    const args = {
      ...cliPreviewArgs(manifest),
      root: projectRoot,
      approvalJson: JSON.stringify(approvalFor(manifest)),
      fs,
    };
    await runSpecializedPacksExternalCliCommand("activate", args);
    const before = await fs.read(lockPath);
    const second = await runSpecializedPacksExternalCliCommand(
      "activate",
      args,
    );
    const after = await fs.read(lockPath);
    expect(second.exitCode).toBe(0);
    expect(JSON.parse(second.stdout).status).toBe("already-applied");
    expect(after).toBe(before);
  });

  it("returns conflict for a different pin and denied for tampered approval", async () => {
    const fs = projectFs();
    const manifest = externalManifest();
    const approval = approvalFor(manifest);
    await runSpecializedPacksExternalCliCommand("activate", {
      ...cliPreviewArgs(manifest),
      root: projectRoot,
      approvalJson: JSON.stringify(approval),
      fs,
    });

    const conflict = await runSpecializedPacksExternalCliCommand("activate", {
      ...cliPreviewArgs(manifest),
      sourceJson: JSON.stringify({
        ...sourceFor(manifest),
        pin: "local-v2",
      }),
      root: projectRoot,
      approvalJson: JSON.stringify({
        ...approval,
        source: { ...approval.source, pin: "local-v2" },
      }),
      fs,
    });
    expect(conflict.exitCode).toBe(1);
    expect(JSON.parse(conflict.stdout).status).toBe("conflict");

    const tampered = await runSpecializedPacksExternalCliCommand("activate", {
      ...cliPreviewArgs(manifest),
      root: projectRoot,
      approvalJson: JSON.stringify({
        ...approval,
        source: {
          ...approval.source,
          digest:
            "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        },
      }),
      fs,
    });
    expect(tampered.exitCode).toBe(1);
    expect(JSON.parse(tampered.stdout).status).toBe("denied");
  });

  it("rejects malformed existing lock files fail-closed", async () => {
    const fs = projectFs({
      [lockPath]: "{broken",
    });
    const manifest = externalManifest();
    const res = await runSpecializedPacksExternalCliCommand("activate", {
      ...cliPreviewArgs(manifest),
      root: projectRoot,
      approvalJson: JSON.stringify(approvalFor(manifest)),
      fs,
    });
    expect(res.exitCode).toBe(1);
    expect(JSON.parse(res.stdout).status).toBe("denied");
  });

  it("keeps network-looking locators as data only and rejects oversized input", async () => {
    const gitManifest = externalManifest({ id: "pack-git-metadata" });
    const gitSource = {
      kind: "git" as const,
      locator: "https://example.com/org/pack.git",
      pin: "a".repeat(40),
      digest: computeExternalSpecializedPackDigest(gitManifest),
    };
    const preview = await runSpecializedPacksExternalCliCommand("preview", {
      manifestJson: JSON.stringify(gitManifest),
      sourceJson: JSON.stringify(gitSource),
      declaredPublisher: gitManifest.publisher,
      declaredLicense,
      json: true,
    });
    expect(preview.exitCode).toBe(0);
    expect(JSON.parse(preview.stdout).source.locator).toContain("https://");

    const oversized = await runSpecializedPacksExternalCliCommand("preview", {
      manifestJson: JSON.stringify(externalManifest()),
      sourceJson: JSON.stringify({
        ...sourceFor(externalManifest()),
        locator: `./packs/${"x".repeat(3_000)}.json`,
      }),
      declaredPublisher: "Example Org",
      declaredLicense,
      json: true,
    });
    expect(oversized.exitCode).toBe(1);
  });

  it("does not leak credentials in JSON output", async () => {
    const res = await runSpecializedPacksExternalCliCommand(
      "preview",
      cliPreviewArgs(),
    );
    expect(res.stdout).not.toMatch(/token|password|secret/i);
  });

  it("supports manifest and approval files for activate", async () => {
    const fs = projectFs();
    const root = await mkdtemp(join(tmpdir(), "intentloom-s8d-cli-files-"));
    const manifest = externalManifest();
    const manifestPath = join(root, "manifest.json");
    const approvalPath = join(root, "approval.json");
    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(approvalPath, JSON.stringify(approvalFor(manifest)));
    try {
      const res = await runSpecializedPacksExternalCliCommand("activate", {
        root: projectRoot,
        manifestFile: manifestPath,
        sourceJson: JSON.stringify(sourceFor(manifest)),
        declaredPublisher: manifest.publisher,
        declaredLicense,
        approvalFile: approvalPath,
        json: true,
        fs,
      });
      expect(res.exitCode).toBe(0);
      expect(JSON.parse(res.stdout).status).toBe("applied");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
