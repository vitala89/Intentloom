import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  activateExternalSpecializedPack,
  applyExternalSpecializedPackActivation,
  computeExternalSpecializedPackDigest,
  createMemoryFileSystem,
  previewExternalSpecializedPack,
  type FileSystem,
} from "@intentloom/application";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
  type ExtensionLockEntry,
  type ExtensionLockfile,
  type QualitySpecializedPackManifest,
} from "@intentloom/protocol";
import {
  createArtifactValidator,
  validateExtensionLockDocument,
} from "@intentloom/validator";

const schemaRoot = resolve("catalog/schemas");
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

function previewInput(manifest: QualitySpecializedPackManifest) {
  return {
    payload: JSON.stringify(manifest),
    source: {
      kind: "local" as const,
      locator: "./packs/mlops.json",
      pin: "local-v1",
      digest: computeExternalSpecializedPackDigest(manifest),
    },
    declaredPublisher: manifest.publisher,
    declaredLicense,
  };
}

function activatedPack(manifest = externalManifest()) {
  const preview = previewExternalSpecializedPack(previewInput(manifest));
  return {
    preview,
    activation: activateExternalSpecializedPack(preview, {
      schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
      decision: "approve",
      reviewerId: "reviewer-ada",
      source: preview.source,
    }),
  };
}

function approvalFor(pack: ReturnType<typeof activatedPack>) {
  return {
    schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
    decision: "approve" as const,
    reviewerId: pack.activation.reviewerId,
    source: pack.preview.source,
  };
}

function applyInput(
  pack: ReturnType<typeof activatedPack>,
  overrides: Partial<{
    activation: ReturnType<typeof activatedPack>["activation"];
    approval: ReturnType<typeof approvalFor>;
    declaredLicense: string;
  }> = {},
) {
  return {
    root: projectRoot,
    activation: overrides.activation ?? pack.activation,
    approval: overrides.approval ?? approvalFor(pack),
    declaredLicense: overrides.declaredLicense ?? declaredLicense,
  };
}

function memoryPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "");
}

function projectFs(
  initial: Record<string, string> = {},
  options?: { failAfterWrites?: number; symlinkPaths?: readonly string[] },
): FileSystem {
  const base = createMemoryFileSystem(
    { [projectRoot]: "", ...initial },
    options?.failAfterWrites,
  );
  const symlinks = new Set(
    (options?.symlinkPaths ?? []).map((path) => memoryPath(path)),
  );
  return {
    ...base,
    async isSymbolicLink(path) {
      return symlinks.has(memoryPath(path));
    },
  };
}

function snapshot(files: Map<string, string>): string {
  return JSON.stringify(
    [...files.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function unrelatedLockEntry(): ExtensionLockEntry {
  return {
    extensionId: "org.intentloom.vector-search",
    category: "knowledge-provider",
    requestedVersion: "1.0.0",
    resolvedVersion: "1.0.0",
    source: {
      registry: "npm",
      package: "@intentloom/vector-search",
      resolved: "sha256:abc123",
    },
    publisher: { name: "Intentloom" },
    integrity: "sha256:abc123",
    grantedCapabilities: {},
    license: { spdxId: "MIT" },
    approvedAt: "2026-08-01T00:00:00.000Z",
    approvedBy: "operator",
    installationType: "downloaded",
  };
}

function existingLock(
  extensions: Record<string, ExtensionLockEntry>,
): ExtensionLockfile {
  return {
    lockVersion: 1,
    updatedAt: "2026-08-01T00:00:00.000Z",
    extensions,
  };
}

describe("Specialized Engineering Packs Phase S8c", () => {
  it("creates extension-lock.json on fresh apply", async () => {
    const fs = projectFs();
    const pack = activatedPack();
    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );

    expect(result.status).toBe("applied");
    expect(result.writes).toBe(1);
    expect(result.changedPaths).toEqual([".aif/extension-lock.json"]);
    expect(await fs.exists(lockPath)).toBe(true);

    const validator = await createArtifactValidator(schemaRoot);
    const lockResult = validateExtensionLockDocument(
      validator,
      ".aif/extension-lock.json",
      await fs.read(lockPath),
    );
    expect(lockResult.status).toBe("valid");

    const entry = JSON.parse(await fs.read(lockPath)).extensions[
      pack.activation.manifest.id
    ];
    expect(entry.extensionId).toBe(pack.activation.manifest.id);
    expect(entry.resolvedVersion).toBe("1.0.0");
    expect(entry.source).toEqual({
      registry: "local",
      package: "./packs/mlops.json",
      resolved: "local-v1",
    });
    expect(entry.integrity).toBe(pack.activation.digest);
    expect(entry.category).toBe("policy-pack");
    expect(entry.installationType).toBe("referenced");
    expect(entry.publisher).toEqual({ name: "Example Org" });
    expect(entry.license).toEqual({ spdxId: declaredLicense });
    expect(entry.approvedBy).toBe("reviewer-ada");
  });

  it("adds a specialized pack without changing an unrelated lock entry", async () => {
    const other = unrelatedLockEntry();
    const fs = projectFs({
      [lockPath]: `${JSON.stringify(existingLock({ [other.extensionId]: other }), null, 2)}\n`,
    });
    const pack = activatedPack();
    const beforeOther = JSON.parse(await fs.read(lockPath)).extensions[
      other.extensionId
    ];

    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(result.status).toBe("applied");

    const lock = JSON.parse(await fs.read(lockPath));
    expect(lock.extensions[other.extensionId]).toEqual(beforeOther);
    expect(lock.extensions[pack.activation.manifest.id].integrity).toBe(
      pack.activation.digest,
    );
    expect(Object.keys(lock.extensions).sort()).toEqual(
      [pack.activation.manifest.id, other.extensionId].sort(),
    );
  });

  it("returns already-applied with zero writes on identical re-apply", async () => {
    const fs = projectFs();
    const pack = activatedPack();
    const first = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(first.status).toBe("applied");
    const bytes = await fs.read(lockPath);
    const before = snapshot(fs.files);

    const second = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(second.status).toBe("already-applied");
    expect(second.writes).toBe(0);
    expect(second.changedPaths).toEqual([]);
    expect(await fs.read(lockPath)).toBe(bytes);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("fails closed on same pack id with different pin", async () => {
    const pack = activatedPack();
    const conflicting = prepareConflictingEntry(pack, {
      source: {
        registry: "local",
        package: "./packs/mlops.json",
        resolved: "other-pin",
      },
    });
    const fs = projectFs({
      [lockPath]: `${JSON.stringify(existingLock({ [pack.activation.manifest.id]: conflicting }), null, 2)}\n`,
    });
    const before = snapshot(fs.files);

    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(result.status).toBe("conflict");
    expect(result.writes).toBe(0);
    expect(result.diagnostics[0]).toMatch(/pin/);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("fails closed on same pack id with different digest", async () => {
    const pack = activatedPack();
    const conflicting = prepareConflictingEntry(pack, {
      integrity:
        "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    });
    const fs = projectFs({
      [lockPath]: `${JSON.stringify(existingLock({ [pack.activation.manifest.id]: conflicting }), null, 2)}\n`,
    });
    const before = snapshot(fs.files);

    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(result.status).toBe("conflict");
    expect(result.writes).toBe(0);
    expect(result.diagnostics[0]).toMatch(/digest/);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("fails closed on same pack id with different version", async () => {
    const pack = activatedPack();
    const conflicting = prepareConflictingEntry(pack, {
      requestedVersion: "9.9.9",
      resolvedVersion: "9.9.9",
    });
    const fs = projectFs({
      [lockPath]: `${JSON.stringify(existingLock({ [pack.activation.manifest.id]: conflicting }), null, 2)}\n`,
    });
    const before = snapshot(fs.files);

    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(result.status).toBe("conflict");
    expect(result.writes).toBe(0);
    expect(result.diagnostics[0]).toMatch(/version/);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("rejects digest tampering after approval with zero writes", async () => {
    const pack = activatedPack();
    const fs = projectFs({
      [lockPath]: `${JSON.stringify(existingLock({}), null, 2)}\n`,
    });
    const before = snapshot(fs.files);
    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack, {
        activation: {
          ...pack.activation,
          digest:
            "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        },
      }),
      fs,
    );
    expect(result.status).toBe("denied");
    expect(result.writes).toBe(0);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("rejects locator, pin, reviewer, and license tampering with zero writes", async () => {
    const pack = activatedPack();
    const fs = projectFs();
    const before = snapshot(fs.files);

    const locator = await applyExternalSpecializedPackActivation(
      applyInput(pack, {
        activation: {
          ...pack.activation,
          source: {
            ...pack.activation.source,
            locator: "./packs/other.json",
          },
        },
      }),
      fs,
    );
    expect(locator.status).toBe("denied");
    expect(locator.writes).toBe(0);

    const pin = await applyExternalSpecializedPackActivation(
      applyInput(pack, {
        activation: {
          ...pack.activation,
          source: { ...pack.activation.source, pin: "wrong-pin" },
        },
      }),
      fs,
    );
    expect(pin.status).toBe("denied");
    expect(pin.writes).toBe(0);

    const reviewer = await applyExternalSpecializedPackActivation(
      applyInput(pack, {
        activation: { ...pack.activation, reviewerId: "wrong-reviewer" },
      }),
      fs,
    );
    expect(reviewer.status).toBe("denied");
    expect(reviewer.writes).toBe(0);

    const license = await applyExternalSpecializedPackActivation(
      applyInput(pack, { declaredLicense: "Apache-2.0" }),
      fs,
    );
    expect(license.status).toBe("denied");
    expect(license.writes).toBe(0);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("rejects source digest drift from activation with zero writes", async () => {
    const pack = activatedPack();
    const fs = projectFs();
    const before = snapshot(fs.files);
    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack, {
        activation: {
          ...pack.activation,
          source: {
            ...pack.activation.source,
            digest:
              "sha256:0000000000000000000000000000000000000000000000000000000000000000",
          },
        },
      }),
      fs,
    );
    expect(result.status).toBe("denied");
    expect(result.writes).toBe(0);
    expect(snapshot(fs.files)).toBe(before);
  });

  it("rejects malformed lock files and lock path symlinks", async () => {
    const pack = activatedPack();
    const malformedFs = projectFs({ [lockPath]: "{ not-json" });
    const malformed = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      malformedFs,
    );
    expect(malformed.status).toBe("denied");
    expect(malformed.diagnostics[0]).toMatch(/malformed/);
    expect(malformed.writes).toBe(0);

    const symlinkFs = projectFs({}, { symlinkPaths: [lockPath] });
    const symlink = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      symlinkFs,
    );
    expect(symlink.status).toBe("denied");
    expect(symlink.diagnostics[0]).toMatch(/symbolic-link/);
    expect(symlink.writes).toBe(0);
  });

  it("rejects missing and symlink project roots", async () => {
    const pack = activatedPack();
    const missing = await applyExternalSpecializedPackActivation(
      { ...applyInput(pack), root: "/missing-project" },
      projectFs(),
    );
    expect(missing.status).toBe("denied");
    expect(missing.diagnostics[0]).toMatch(/invalid_root/);

    const symlinkRootFs = projectFs({}, { symlinkPaths: [projectRoot] });
    const stale = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      symlinkRootFs,
    );
    expect(stale.status).toBe("denied");
    expect(stale.diagnostics[0]).toMatch(/stale_root/);
  });

  it("rolls back when the lock write fails", async () => {
    const fs = projectFs({}, { failAfterWrites: 0 });
    const pack = activatedPack();
    const before = snapshot(fs.files);
    const result = await applyExternalSpecializedPackActivation(
      applyInput(pack),
      fs,
    );
    expect(result.status).toBe("failed");
    expect(result.rollbackAttempted).toBe(true);
    expect(result.rollbackCompleted).toBe(true);
    expect(result.writes).toBe(0);
    expect(snapshot(fs.files)).toBe(before);
    expect(await fs.exists(lockPath)).toBe(false);
  });
});

function prepareConflictingEntry(
  pack: ReturnType<typeof activatedPack>,
  overrides: Partial<ExtensionLockEntry>,
): ExtensionLockEntry {
  return {
    extensionId: pack.activation.manifest.id,
    category: "policy-pack",
    requestedVersion: pack.activation.manifest.version,
    resolvedVersion: pack.activation.manifest.version,
    source: {
      registry: "local",
      package: "./packs/mlops.json",
      resolved: pack.activation.source.pin,
    },
    publisher: { name: pack.activation.manifest.publisher },
    integrity: pack.activation.digest,
    manifestSchemaVersion: QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
    grantedCapabilities: {},
    license: { spdxId: declaredLicense },
    approvedAt: pack.activation.trustState.verifiedAt,
    approvedBy: pack.activation.reviewerId,
    installationType: "referenced",
    ...overrides,
  };
}
