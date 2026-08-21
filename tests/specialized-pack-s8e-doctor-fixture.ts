import type {
  ExtensionLockEntry,
  ExtensionLockfile,
  QualitySpecializedPackManifest,
} from "@intentloom/protocol";
import {
  QUALITY_PACK_ACTIVATION_SCHEMA_URN,
  QUALITY_SPECIALIZED_PACK_SCHEMA_URN,
} from "@intentloom/protocol";
import {
  activateExternalSpecializedPack,
  applyExternalSpecializedPackActivation,
  computeExternalSpecializedPackDigest,
  createMemoryFileSystem,
  initProject,
  previewExternalSpecializedPack,
  type FileSystem,
} from "@intentloom/application";

export const projectRoot = "/project";
export const lockPath = `${projectRoot}/.aif/extension-lock.json`;
export const localManifestPath = `${projectRoot}/packs/mlops.json`;
export const declaredLicense = "MIT";
export const gitCommitPin = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export const doctorInit = {
  root: projectRoot,
  profile: "generic" as const,
  adapters: ["codex"] as const,
};

export function externalManifest(
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

export function previewInput(
  manifest: QualitySpecializedPackManifest,
  source?: {
    readonly kind: "local" | "git" | "package";
    readonly locator: string;
    readonly pin: string;
  },
) {
  const digest = computeExternalSpecializedPackDigest(manifest);
  return {
    payload: JSON.stringify(manifest),
    source: {
      kind: source?.kind ?? ("local" as const),
      locator: source?.locator ?? "./packs/mlops.json",
      pin: source?.pin ?? "local-v1",
      digest,
    },
    declaredPublisher: manifest.publisher,
    declaredLicense,
  };
}

export function activatedPack(
  manifest = externalManifest(),
  source?: Parameters<typeof previewInput>[1],
) {
  const preview = previewExternalSpecializedPack(
    previewInput(manifest, source),
  );
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

export function memoryPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "");
}

export function projectFs(
  initial: Record<string, string> = {},
  options?: { symlinkPaths?: readonly string[] },
): FileSystem & { files: Map<string, string> } {
  const base = createMemoryFileSystem({
    [projectRoot]: "",
    [`${projectRoot}/README.md`]: "project",
    ...initial,
  });
  const symlinks = new Set(
    (options?.symlinkPaths ?? []).map((path) => memoryPath(path)),
  );
  return {
    ...base,
    files: base.files,
    async isSymbolicLink(path) {
      return symlinks.has(memoryPath(path));
    },
  };
}

export async function adoptedProject(
  fs: FileSystem = projectFs(),
): Promise<FileSystem & { files?: Map<string, string> }> {
  await initProject(doctorInit, fs);
  return fs;
}

export async function applyActivatedPack(
  fs: FileSystem,
  pack = activatedPack(),
) {
  const result = await applyExternalSpecializedPackActivation(
    {
      root: projectRoot,
      activation: pack.activation,
      approval: {
        schemaVersion: QUALITY_PACK_ACTIVATION_SCHEMA_URN,
        decision: "approve",
        reviewerId: pack.activation.reviewerId,
        source: pack.preview.source,
      },
      declaredLicense,
    },
    fs,
  );
  if (result.status !== "applied" && result.status !== "already-applied") {
    throw new Error(
      `expected specialized-pack apply, received ${result.status}: ${result.diagnostics.join("; ")}`,
    );
  }
  return result;
}

export async function readLock(fs: FileSystem): Promise<ExtensionLockfile> {
  return JSON.parse(await fs.read(lockPath)) as ExtensionLockfile;
}

export async function writeLock(
  fs: FileSystem,
  lockfile: ExtensionLockfile,
): Promise<void> {
  await fs.write(lockPath, `${JSON.stringify(lockfile, null, 2)}\n`);
}

export async function tamperLockEntry(
  fs: FileSystem,
  mutate: (entry: ExtensionLockEntry) => ExtensionLockEntry,
): Promise<void> {
  const lockfile = await readLock(fs);
  const next: ExtensionLockfile = {
    ...lockfile,
    extensions: Object.fromEntries(
      Object.entries(lockfile.extensions).map(([key, entry]) => [
        key,
        mutate(entry),
      ]),
    ),
  };
  await writeLock(fs, next);
}

export function firstPartyLockEntry(): ExtensionLockEntry {
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
    lastHealthCheck: "2026-08-01T00:00:00.000Z",
    installationType: "downloaded",
  };
}

export function findingCodes(report: {
  readonly findings: readonly { readonly code: string }[];
}): string[] {
  return report.findings.map((finding) => finding.code);
}
