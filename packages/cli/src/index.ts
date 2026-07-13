import {
  mkdir,
  lstat,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";
import { adapterVersion, generateAdapter } from "@aif/adapters";
import {
  AIF_VERSION,
  checksum,
  loadCatalog,
  normalizeOutputPath,
  type AdapterName,
  type Catalog,
  type GeneratedFile,
} from "@aif/core";
import {
  type ArtifactValidationResult,
  type ArtifactValidator,
  validateSkillSet,
} from "@aif/validator";
import { parse, stringify } from "yaml";

export type ChangeKind =
  | "create"
  | "update"
  | "conflict"
  | "modified"
  | "missing"
  | "stale"
  | "security-error";
export interface Change {
  readonly path: string;
  readonly kind: ChangeKind;
  readonly reason: string;
  readonly content?: string;
}
export interface Plan {
  readonly changes: readonly Change[];
  readonly diagnostics: readonly string[];
}
export interface DoctorPlan extends Plan {
  readonly errors: readonly {
    readonly code: string;
    readonly message: string;
    readonly fieldPath: string;
    readonly phase: "semantic";
    readonly artifactType: "generated-state";
    readonly schemaId: "urn:aif:semantic:generated-state:1";
    readonly schemaVersion: "1";
    readonly documentPath: string;
    readonly affectedPath: string;
  }[];
}
export type TransactionStage =
  | "generated-stage"
  | "generated-commit"
  | "manifest-stage"
  | "manifest-finalize"
  | "source-map-stage"
  | "source-map-finalize"
  | "post-write-consistency"
  | "success-cleanup";
export interface TransactionResult extends Plan {
  readonly status: "success" | "failed";
  readonly failedStage?: TransactionStage;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
  readonly manifestUpdated: boolean;
  readonly sourceMapUpdated: boolean;
  readonly consistencyValidated: boolean;
  readonly cleanupCompleted: boolean;
  readonly postWriteValidation?: PostWriteValidationResult;
}
export type PostWriteCorruptionCode =
  | "manifest-json-malformed"
  | "source-map-json-malformed"
  | "manifest-entry-missing"
  | "source-map-entry-missing"
  | "manifest-destination-missing"
  | "source-map-destination-missing"
  | "generated-checksum-mismatch"
  | "manifest-source-map-checksum-mismatch"
  | "manifest-generated-checksum-mismatch"
  | "manifest-absolute-path"
  | "source-map-absolute-path"
  | "manifest-path-escape"
  | "source-map-path-escape"
  | "manifest-duplicate-destination"
  | "source-map-duplicate-ownership"
  | "ownership-classification-invalid"
  | "adapter-id-missing"
  | "adapter-id-mismatch"
  | "canonical-source-id-missing"
  | "canonical-source-id-mismatch"
  | "framework-version-missing"
  | "framework-version-incompatible"
  | "adapter-output-version-missing"
  | "adapter-output-version-incompatible"
  | "metadata-format-version-incompatible"
  | "committed-generated-bytes-mismatch"
  | "committed-manifest-bytes-mismatch"
  | "committed-source-map-bytes-mismatch"
  | "generated-file-without-ownership"
  | "ownership-record-without-generated-file"
  | "normalized-destination-duplicate";
export interface ValidPostWriteValidation {
  readonly status: "valid";
  readonly checkedGeneratedFileCount: number;
  readonly checkedManifestEntryCount: number;
  readonly checkedSourceMapEntryCount: number;
  readonly checksumsValidated: true;
  readonly ownershipValidated: true;
  readonly pathsValidated: true;
  readonly versionsValidated: true;
  readonly metadataBytesValidated: true;
}
export interface InvalidPostWriteValidation {
  readonly status: "invalid";
  readonly code: PostWriteCorruptionCode;
  readonly affectedPaths: readonly string[];
  readonly affectedIdentifiers: readonly string[];
}
export type PostWriteValidationResult =
  ValidPostWriteValidation | InvalidPostWriteValidation;
export interface FileSystem {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  list(path: string): Promise<string[]>;
  realpath(path: string): Promise<string>;
  isSymbolicLink(path: string): Promise<boolean>;
}
export interface InitOptions {
  readonly root: string;
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly dryRun?: boolean;
  readonly catalog?: Catalog;
  readonly catalogRoot?: string;
  readonly canonicalSourceHashes?: Readonly<Record<string, string>>;
  readonly validator?: ArtifactValidator;
}
export interface SyncOptions extends InitOptions {
  readonly force?: boolean;
}
export interface PostWriteCorruptionContext {
  readonly root: string;
  readonly fileSystem: FileSystem;
}
export interface TransactionOptions {
  readonly failAt?: TransactionStage;
  readonly rollbackFailPaths?: readonly string[];
  readonly corruptAfterFinalization?: (
    context: PostWriteCorruptionContext,
  ) => void | Promise<void>;
}
export interface SyncDryRunResult extends Plan {
  readonly dryRun: true;
  readonly createdFiles: readonly string[];
  readonly updatedFiles: readonly string[];
  readonly unchangedFiles: readonly string[];
  readonly conflictFiles: readonly string[];
}

const emptyCatalog: Catalog = {
  policies: [],
  workflows: [],
  templates: [],
  skills: [],
};
const configPath = ".aif/config.yaml";
const lockPath = ".aif/manifest.lock.json";
const sourceMapPath = ".aif/source-map.json";
const metadataFormatVersion = "1";
const adapterOutputVersion = adapterVersion;
const transactionAdapterId = "aif:generated-files";

function inside(root: string, path: string): string {
  const target = resolve(root, path);
  if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`))
    throw new Error(`path traversal: ${path}`);
  return target;
}

export function destinationCollisionKey(path: string): string {
  if (
    path.includes("\0") ||
    path.startsWith("/") ||
    /^[A-Za-z]:[\\/]/u.test(path)
  )
    throw new Error(`invalid destination: ${path}`);
  const normalized = posix.normalize(path.replaceAll("\\", "/"));
  if (normalized === ".." || normalized.startsWith("../"))
    throw new Error(`destination escapes project root: ${path}`);
  return normalized.replace(/^\.\//u, "").normalize("NFC").toLowerCase();
}

export interface DestinationCollision {
  readonly code: "destination-collision";
  readonly key: string;
  readonly paths: readonly string[];
  readonly sources: readonly string[];
}

export function findDestinationCollisions(
  inputs: readonly { path: string; sources: readonly string[] }[],
): DestinationCollision[] {
  const groups = new Map<
    string,
    { paths: Set<string>; sources: Set<string>; count: number }
  >();
  for (const input of inputs) {
    const key = destinationCollisionKey(input.path);
    const group = groups.get(key) ?? {
      paths: new Set(),
      sources: new Set(),
      count: 0,
    };
    group.paths.add(input.path);
    input.sources.forEach((source) => group.sources.add(source));
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.count > 1)
    .map(([key, group]) => ({
      code: "destination-collision" as const,
      key,
      paths: [...group.paths].sort(),
      sources: [...group.sources].sort(),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function collisionPlan(files: readonly GeneratedFile[]): Plan | null {
  const collisions = findDestinationCollisions(files);
  if (collisions.length === 0) return null;
  return {
    changes: collisions.map((collision) => ({
      path: collision.paths.join(", "),
      kind: "conflict" as const,
      reason: JSON.stringify(collision),
    })),
    diagnostics: ["destination-collision"],
  };
}

type MetadataObject = Record<string, unknown>;
type MetadataRecord = Record<string, unknown>;

interface PostWriteValidationInput {
  readonly root: string;
  readonly files: readonly GeneratedFile[];
  readonly manifestBytes: string;
  readonly sourceMapBytes: string;
  readonly createdGeneratedPaths: ReadonlySet<string>;
  readonly fs: FileSystem;
}

interface TransactionMetadata {
  readonly manifest: string;
  readonly sourceMap: string;
}

interface MetadataPins {
  readonly profile: string;
  readonly adapters: readonly AdapterName[];
  readonly sourceHashes: readonly {
    readonly id: string;
    readonly checksum: string;
  }[];
}

function buildTransactionMetadata(
  files: readonly GeneratedFile[],
  pins: MetadataPins = {
    profile: "generic",
    adapters: ["codex"],
    sourceHashes: [
      {
        id: "transaction:generated",
        checksum: checksum("transaction:generated"),
      },
    ],
  },
): TransactionMetadata {
  const canonicalSourceId = checksum(
    JSON.stringify([...new Set(files.flatMap((file) => file.sources))].sort()),
  );
  const sharedMetadata = {
    metadataFormatVersion,
    frameworkVersion: AIF_VERSION,
    adapterOutputVersion,
    adapterId: transactionAdapterId,
    canonicalSourceId,
  };
  return {
    manifest: `${JSON.stringify(
      {
        schemaVersion: metadataFormatVersion,
        lockVersion: metadataFormatVersion,
        ownershipPolicy: "aif-owned-generated",
        profile: pins.profile,
        schemaVersions: {
          config: "1",
          manifestLock: "1",
          sourceMap: "1",
          planning: "1",
          agentSkillPolicy: "1",
        },
        adapters: [...pins.adapters]
          .sort()
          .map((id) => ({ id, version: adapterOutputVersion })),
        sourceHashes: [...pins.sourceHashes].sort((left, right) =>
          left.id.localeCompare(right.id),
        ),
        ...sharedMetadata,
        generated: files.map(({ path, checksum }) => ({ path, checksum })),
      },
      null,
      2,
    )}\n`,
    sourceMap: `${JSON.stringify(
      {
        schemaVersion: metadataFormatVersion,
        ...sharedMetadata,
        files: files.map(({ path, checksum, sources }) => ({
          path,
          checksum,
          sources,
          ownership: "aif-owned-generated",
        })),
      },
      null,
      2,
    )}\n`,
  };
}

function transactionSummary(
  files: readonly GeneratedFile[],
  changes: readonly Change[],
): Pick<
  TransactionResult,
  | "createdFiles"
  | "updatedFiles"
  | "unchangedFiles"
  | "manifestUpdated"
  | "sourceMapUpdated"
> {
  const generatedChanges = changes.filter(
    (change) => change.path !== lockPath && change.path !== sourceMapPath,
  );
  const changedPaths = new Set(generatedChanges.map((change) => change.path));
  return {
    createdFiles: generatedChanges
      .filter((change) => change.kind === "create")
      .map((change) => change.path)
      .sort(),
    updatedFiles: generatedChanges
      .filter((change) => change.kind === "update")
      .map((change) => change.path)
      .sort(),
    unchangedFiles: files
      .map((file) => file.path)
      .filter((path) => !changedPaths.has(path))
      .sort(),
    manifestUpdated: changes.some((change) => change.path === lockPath),
    sourceMapUpdated: changes.some((change) => change.path === sourceMapPath),
  };
}

class PostWriteValidationFailure extends Error {
  constructor(readonly validation: InvalidPostWriteValidation) {
    super(validation.code);
  }
}

function invalidPostWriteState(
  code: PostWriteCorruptionCode,
  affectedPaths: readonly string[],
  affectedIdentifiers: readonly string[] = [],
): InvalidPostWriteValidation {
  return {
    status: "invalid",
    code,
    affectedPaths: [...new Set(affectedPaths)].sort(),
    affectedIdentifiers: [...new Set(affectedIdentifiers)].sort(),
  };
}

function metadataRecords(
  value: MetadataObject,
  key: "generated" | "files",
): MetadataRecord[] {
  return Array.isArray(value[key])
    ? (value[key] as MetadataRecord[]).filter(
        (record) => typeof record === "object" && record !== null,
      )
    : [];
}

function pathFailure(
  metadata: "manifest" | "source-map",
  records: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const metadataPath = metadata === "manifest" ? lockPath : sourceMapPath;
  const absoluteCode = `${metadata}-absolute-path` as PostWriteCorruptionCode;
  const escapeCode = `${metadata}-path-escape` as PostWriteCorruptionCode;
  for (const [index, record] of records.entries()) {
    const path = record.path;
    const identifier = `${metadata}.${index}`;
    if (
      typeof path !== "string" ||
      path.startsWith("/") ||
      /^[A-Za-z]:[\\/]/u.test(path)
    )
      return invalidPostWriteState(absoluteCode, [metadataPath], [identifier]);
    try {
      destinationCollisionKey(path);
    } catch {
      return invalidPostWriteState(escapeCode, [metadataPath], [identifier]);
    }
  }
  return null;
}

function duplicateFailure(
  metadata: "manifest" | "source-map",
  records: readonly MetadataRecord[],
): InvalidPostWriteValidation | null {
  const metadataPath = metadata === "manifest" ? lockPath : sourceMapPath;
  const exact = new Set<string>();
  for (const [index, record] of records.entries()) {
    if (typeof record.path !== "string") continue;
    if (exact.has(record.path))
      return invalidPostWriteState(
        metadata === "manifest"
          ? "manifest-duplicate-destination"
          : "source-map-duplicate-ownership",
        [metadataPath, record.path],
        [`${metadata}.${index}`],
      );
    exact.add(record.path);
  }
  const normalized = new Map<string, string>();
  for (const [index, record] of records.entries()) {
    if (typeof record.path !== "string") continue;
    const key = destinationCollisionKey(record.path);
    const previous = normalized.get(key);
    if (previous !== undefined && previous !== record.path)
      return invalidPostWriteState(
        "normalized-destination-duplicate",
        [metadataPath, previous, record.path],
        [`${metadata}.${index}`, key],
      );
    normalized.set(key, record.path);
  }
  return null;
}

function missingIdentity(
  manifest: MetadataObject,
  sourceMap: MetadataObject,
  key: "adapterId" | "canonicalSourceId",
  code: "adapter-id-missing" | "canonical-source-id-missing",
): InvalidPostWriteValidation | null {
  const affected: string[] = [];
  if (typeof manifest[key] !== "string" || manifest[key] === "")
    affected.push(lockPath);
  if (typeof sourceMap[key] !== "string" || sourceMap[key] === "")
    affected.push(sourceMapPath);
  return affected.length === 0
    ? null
    : invalidPostWriteState(code, affected, [key]);
}

async function validateCommittedOwnershipState({
  root,
  files,
  manifestBytes,
  sourceMapBytes,
  createdGeneratedPaths,
  fs,
}: PostWriteValidationInput): Promise<PostWriteValidationResult> {
  const committedManifestBytes = await fs.read(inside(root, lockPath));
  const committedSourceMapBytes = await fs.read(inside(root, sourceMapPath));
  let manifest: MetadataObject;
  let sourceMap: MetadataObject;
  try {
    manifest = JSON.parse(committedManifestBytes) as MetadataObject;
  } catch {
    return invalidPostWriteState("manifest-json-malformed", [lockPath]);
  }
  try {
    sourceMap = JSON.parse(committedSourceMapBytes) as MetadataObject;
  } catch {
    return invalidPostWriteState("source-map-json-malformed", [sourceMapPath]);
  }

  const adapterMissing = missingIdentity(
    manifest,
    sourceMap,
    "adapterId",
    "adapter-id-missing",
  );
  if (adapterMissing) return adapterMissing;
  if (manifest.adapterId !== sourceMap.adapterId)
    return invalidPostWriteState(
      "adapter-id-mismatch",
      [lockPath, sourceMapPath],
      ["adapterId"],
    );
  const canonicalMissing = missingIdentity(
    manifest,
    sourceMap,
    "canonicalSourceId",
    "canonical-source-id-missing",
  );
  if (canonicalMissing) return canonicalMissing;
  if (manifest.canonicalSourceId !== sourceMap.canonicalSourceId)
    return invalidPostWriteState(
      "canonical-source-id-mismatch",
      [lockPath, sourceMapPath],
      ["canonicalSourceId"],
    );

  const frameworkPaths: string[] = [];
  if (typeof manifest.frameworkVersion !== "string")
    frameworkPaths.push(lockPath);
  if (typeof sourceMap.frameworkVersion !== "string")
    frameworkPaths.push(sourceMapPath);
  if (frameworkPaths.length > 0)
    return invalidPostWriteState("framework-version-missing", frameworkPaths, [
      "frameworkVersion",
    ]);
  if (
    manifest.frameworkVersion !== AIF_VERSION ||
    sourceMap.frameworkVersion !== AIF_VERSION
  )
    return invalidPostWriteState(
      "framework-version-incompatible",
      [lockPath, sourceMapPath],
      ["frameworkVersion"],
    );

  const adapterVersionPaths: string[] = [];
  if (typeof manifest.adapterOutputVersion !== "string")
    adapterVersionPaths.push(lockPath);
  if (typeof sourceMap.adapterOutputVersion !== "string")
    adapterVersionPaths.push(sourceMapPath);
  if (adapterVersionPaths.length > 0)
    return invalidPostWriteState(
      "adapter-output-version-missing",
      adapterVersionPaths,
      ["adapterOutputVersion"],
    );
  if (
    manifest.adapterOutputVersion !== adapterOutputVersion ||
    sourceMap.adapterOutputVersion !== adapterOutputVersion
  )
    return invalidPostWriteState(
      "adapter-output-version-incompatible",
      [lockPath, sourceMapPath],
      ["adapterOutputVersion"],
    );
  if (
    manifest.metadataFormatVersion !== metadataFormatVersion ||
    sourceMap.metadataFormatVersion !== metadataFormatVersion ||
    manifest.lockVersion !== metadataFormatVersion ||
    sourceMap.schemaVersion !== metadataFormatVersion
  )
    return invalidPostWriteState(
      "metadata-format-version-incompatible",
      [lockPath, sourceMapPath],
      ["metadataFormatVersion"],
    );

  const manifestRecords = metadataRecords(manifest, "generated");
  const sourceMapRecords = metadataRecords(sourceMap, "files");
  if (manifest.ownershipPolicy !== "aif-owned-generated")
    return invalidPostWriteState(
      "ownership-classification-invalid",
      [lockPath],
      ["ownershipPolicy"],
    );
  const manifestPathFailure = pathFailure("manifest", manifestRecords);
  if (manifestPathFailure) return manifestPathFailure;
  const sourceMapPathFailure = pathFailure("source-map", sourceMapRecords);
  if (sourceMapPathFailure) return sourceMapPathFailure;
  const manifestDuplicate = duplicateFailure("manifest", manifestRecords);
  if (manifestDuplicate) return manifestDuplicate;
  const sourceMapDuplicate = duplicateFailure("source-map", sourceMapRecords);
  if (sourceMapDuplicate) return sourceMapDuplicate;

  for (const [index, record] of sourceMapRecords.entries())
    if (record.ownership !== "aif-owned-generated")
      return invalidPostWriteState(
        "ownership-classification-invalid",
        [sourceMapPath, String(record.path ?? "")].filter(Boolean),
        [`source-map.${index}`, "ownership"],
      );

  const plannedByPath = new Map(files.map((file) => [file.path, file]));
  const manifestByPath = new Map(
    manifestRecords
      .filter((record) => typeof record.path === "string")
      .map((record) => [record.path as string, record]),
  );
  const sourceMapByPath = new Map(
    sourceMapRecords
      .filter((record) => typeof record.path === "string")
      .map((record) => [record.path as string, record]),
  );

  for (const record of manifestRecords) {
    const path = record.path as string;
    if (!(await fs.exists(inside(root, path))))
      return invalidPostWriteState(
        "manifest-destination-missing",
        [lockPath, path],
        [path],
      );
  }
  for (const record of sourceMapRecords) {
    const path = record.path as string;
    if (!(await fs.exists(inside(root, path))))
      return invalidPostWriteState(
        plannedByPath.has(path)
          ? "source-map-destination-missing"
          : sourceMapRecords.length > files.length
            ? "ownership-record-without-generated-file"
            : "source-map-destination-missing",
        [sourceMapPath, path],
        [path],
      );
  }

  for (const file of files) {
    if (!manifestByPath.has(file.path))
      return invalidPostWriteState(
        "manifest-entry-missing",
        [lockPath, file.path],
        [file.path],
      );
    if (!sourceMapByPath.has(file.path))
      return invalidPostWriteState(
        createdGeneratedPaths.has(file.path)
          ? "generated-file-without-ownership"
          : "source-map-entry-missing",
        [sourceMapPath, file.path],
        [file.path],
      );
  }

  for (const file of files) {
    const actualChecksum = checksum(await fs.read(inside(root, file.path)));
    const manifestChecksum = manifestByPath.get(file.path)!.checksum;
    const sourceMapChecksum = sourceMapByPath.get(file.path)!.checksum;
    if (
      actualChecksum === file.checksum &&
      sourceMapChecksum !== actualChecksum
    )
      return invalidPostWriteState(
        "generated-checksum-mismatch",
        [sourceMapPath, file.path],
        [file.path],
      );
    if (
      actualChecksum === file.checksum &&
      manifestChecksum !== sourceMapChecksum
    )
      return invalidPostWriteState(
        "manifest-source-map-checksum-mismatch",
        [lockPath, sourceMapPath, file.path],
        [file.path],
      );
    if (
      actualChecksum !== file.checksum &&
      manifestChecksum !== actualChecksum &&
      manifestChecksum === sourceMapChecksum
    )
      return invalidPostWriteState(
        "manifest-generated-checksum-mismatch",
        [lockPath, file.path],
        [file.path],
      );
    if (sourceMapChecksum !== actualChecksum)
      return invalidPostWriteState(
        "generated-checksum-mismatch",
        [sourceMapPath, file.path],
        [file.path],
      );
    if (manifestChecksum !== sourceMapChecksum)
      return invalidPostWriteState(
        "manifest-source-map-checksum-mismatch",
        [lockPath, sourceMapPath, file.path],
        [file.path],
      );
    if (manifestChecksum !== actualChecksum)
      return invalidPostWriteState(
        "manifest-generated-checksum-mismatch",
        [lockPath, file.path],
        [file.path],
      );
    if (actualChecksum !== file.checksum)
      return invalidPostWriteState(
        "committed-generated-bytes-mismatch",
        [file.path],
        [file.path],
      );
  }

  if (committedManifestBytes !== manifestBytes)
    return invalidPostWriteState("committed-manifest-bytes-mismatch", [
      lockPath,
    ]);
  if (committedSourceMapBytes !== sourceMapBytes)
    return invalidPostWriteState("committed-source-map-bytes-mismatch", [
      sourceMapPath,
    ]);

  return {
    status: "valid",
    checkedGeneratedFileCount: files.length,
    checkedManifestEntryCount: manifestRecords.length,
    checkedSourceMapEntryCount: sourceMapRecords.length,
    checksumsValidated: true,
    ownershipValidated: true,
    pathsValidated: true,
    versionsValidated: true,
    metadataBytesValidated: true,
  };
}

export async function synchronizeGeneratedFiles(
  root: string,
  files: readonly GeneratedFile[],
  fs: FileSystem,
  options: TransactionOptions = {},
  validatedMetadata?: TransactionMetadata,
): Promise<TransactionResult> {
  const collision = collisionPlan(files);
  if (collision)
    return {
      ...collision,
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      createdFiles: [],
      updatedFiles: [],
      unchangedFiles: [],
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  const normalized = files.map((file) => ({
    ...file,
    checksum: checksum(file.content),
  }));
  const { manifest, sourceMap } =
    validatedMetadata ?? buildTransactionMetadata(normalized);
  const transactionFiles: GeneratedFile[] = [
    ...normalized,
    {
      path: lockPath,
      content: manifest,
      sources: ["transaction:manifest"],
      checksum: checksum(manifest),
    },
    {
      path: sourceMapPath,
      content: sourceMap,
      sources: ["transaction:source-map"],
      checksum: checksum(sourceMap),
    },
  ];
  const changes: Change[] = [];
  const createdGeneratedPaths = new Set<string>();
  for (const file of transactionFiles) {
    const path = inside(root, file.path);
    if (!(await fs.exists(path))) {
      changes.push({
        path: file.path,
        kind: "create",
        reason: "missing",
        content: file.content,
      });
      if (file.path !== lockPath && file.path !== sourceMapPath)
        createdGeneratedPaths.add(file.path);
    } else if ((await fs.read(path)) !== file.content)
      changes.push({
        path: file.path,
        kind: "update",
        reason: "committed content differs",
        content: file.content,
      });
  }
  const proposal: Plan = { changes, diagnostics: [] };
  const summary = transactionSummary(normalized, changes);
  const backups = new Map<string, string>();
  const created: string[] = [];
  let stage: TransactionStage = "generated-stage";
  let postWriteValidation: PostWriteValidationResult | undefined;
  const inject = (candidate: TransactionStage) => {
    stage = candidate;
    if (options.failAt === candidate) throw new Error(`injected:${candidate}`);
  };
  try {
    for (const candidate of [
      "generated-stage",
      "manifest-stage",
      "source-map-stage",
    ] as const)
      inject(candidate);
    for (const file of transactionFiles) {
      inject(
        file.path === lockPath
          ? "manifest-finalize"
          : file.path === sourceMapPath
            ? "source-map-finalize"
            : "generated-commit",
      );
      const path = inside(root, file.path);
      await safeDestination(root, path, fs);
      if (await fs.exists(path)) backups.set(path, await fs.read(path));
      else created.push(path);
      await fs.mkdir(dirname(path));
      await fs.write(path, file.content);
    }
    inject("post-write-consistency");
    await options.corruptAfterFinalization?.({ root, fileSystem: fs });
    postWriteValidation = await validateCommittedOwnershipState({
      root,
      files: normalized,
      manifestBytes: manifest,
      sourceMapBytes: sourceMap,
      createdGeneratedPaths,
      fs,
    });
    if (postWriteValidation.status === "invalid")
      throw new PostWriteValidationFailure(postWriteValidation);
    inject("success-cleanup");
    return {
      ...proposal,
      status: "success",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      ...summary,
      consistencyValidated: true,
      cleanupCompleted: true,
      postWriteValidation,
    };
  } catch (error) {
    if (error instanceof PostWriteValidationFailure)
      postWriteValidation = error.validation;
    const rollbackFailures: string[] = [];
    const injectedRollbackFailures = new Set(options.rollbackFailPaths ?? []);
    for (const [path, content] of backups) {
      const projectPath = relative(root, path);
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure");
        await fs.write(path, content);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    for (const path of created) {
      const projectPath = relative(root, path);
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure");
        await fs.remove(path);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    const originalError =
      error instanceof Error ? error.message : String(error);
    return {
      ...proposal,
      status: "failed",
      failedStage: stage,
      diagnostics:
        rollbackFailures.length === 0
          ? [originalError]
          : [originalError, "transaction-rollback-incomplete"],
      rollbackAttempted: true,
      rollbackCompleted: rollbackFailures.length === 0,
      rollbackFailures: rollbackFailures.sort(),
      ...summary,
      consistencyValidated: postWriteValidation?.status === "valid",
      cleanupCompleted: false,
      ...(postWriteValidation === undefined ? {} : { postWriteValidation }),
    };
  }
}

async function safeDestination(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<void> {
  let rootResolved = resolve(root);
  try {
    rootResolved = await fs.realpath(rootResolved);
  } catch {
    /* a new project root has no link to resolve yet */
  }
  let current = path;
  while (true) {
    if (await fs.isSymbolicLink(current))
      throw new Error(`security-error: ${relative(root, path)}`);
    if (await fs.exists(current)) {
      const resolved = await fs.realpath(current);
      if (
        resolved !== rootResolved &&
        !resolved.startsWith(`${rootResolved}${sep}`)
      )
        throw new Error(`security-error: ${relative(root, path)}`);
    }
    if (current === resolve(root)) return;
    current = dirname(current);
  }
}

function config(profile: string, adapters: readonly AdapterName[]): string {
  return stringify({ schemaVersion: "1", profile, adapters });
}
function generated(
  adapterNames: readonly AdapterName[],
  catalog: Catalog,
): GeneratedFile[] {
  return adapterNames.flatMap(
    (adapter) => generateAdapter(adapter, catalog).files,
  );
}

async function desired(options: InitOptions): Promise<GeneratedFile[]> {
  if (options.validator && options.catalogRoot) {
    const skillRoot = resolve(options.catalogRoot, "skills");
    const directories = (await readdir(skillRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const documents = await Promise.all(
      directories.map(async (directory) => ({
        path: `skills/${directory}/SKILL.md`,
        content: await readFile(
          resolve(skillRoot, directory, "SKILL.md"),
          "utf8",
        ),
      })),
    );
    const skillValidation = validateSkillSet(options.validator, documents, {
      aifCatalogPolicy: true,
    });
    const invalid = skillValidation.results.filter(
      (result) => result.status === "invalid",
    );
    if (skillValidation.errors.length > 0)
      invalid.push({
        status: "invalid",
        artifactType: "agent-skill",
        schemaId: "urn:aif:schema:agent-skill:1",
        schemaVersion: "1",
        documentPath: documents[0]?.path ?? "skills/SKILL.md",
        structuralErrors: [],
        semanticErrors: skillValidation.errors,
        warnings: [],
      });
    if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
  }
  const catalog =
    options.catalog ??
    (options.catalogRoot
      ? await loadCatalog(options.catalogRoot)
      : emptyCatalog);
  const files = generated(options.adapters, catalog);
  const payload: GeneratedFile[] = [
    {
      path: configPath,
      content: config(options.profile, options.adapters),
      sources: ["project:config"],
      checksum: checksum(config(options.profile, options.adapters)),
    },
    {
      path: ".aif/local.example.yaml",
      content: "# Local AIF preferences only; never store secrets here.\n",
      sources: ["project:local-example"],
      checksum: checksum(
        "# Local AIF preferences only; never store secrets here.\n",
      ),
    },
    ...files,
  ];
  const canonicalSources = [
    ...new Set(
      payload
        .flatMap((file) => file.sources)
        .filter((source) =>
          /^(?:policies|skills|templates|workflows)\//u.test(source),
        ),
    ),
  ].sort();
  const sourceHashes = await Promise.all(
    canonicalSources.map(async (id) => {
      const pinnedChecksum = options.catalogRoot
        ? checksum(await readFile(resolve(options.catalogRoot, id), "utf8"))
        : options.canonicalSourceHashes?.[id];
      if (!pinnedChecksum || !/^[a-f0-9]{64}$/u.test(pinnedChecksum))
        throw new Error(`canonical source hash unavailable: ${id}`);
      return { id, checksum: pinnedChecksum };
    }),
  );
  const { manifest, sourceMap } = buildTransactionMetadata(payload, {
    profile: options.profile,
    adapters: options.adapters,
    sourceHashes,
  });
  if (options.validator) {
    const generatedDocuments = [
      options.validator.validate({
        artifactType: "aif-config",
        documentPath: configPath,
        format: "yaml",
        source: payload[0]!.content,
      }),
      options.validator.validate({
        artifactType: "manifest-lock",
        documentPath: lockPath,
        format: "json",
        source: manifest,
      }),
      options.validator.validate({
        artifactType: "source-map",
        documentPath: sourceMapPath,
        format: "json",
        source: sourceMap,
      }),
    ];
    const invalid = generatedDocuments.filter(
      (result) => result.status === "invalid",
    );
    if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
  }
  return [
    ...payload,
    // Metadata is committed last so ownership never advances ahead of files.
    {
      path: lockPath,
      content: manifest,
      sources: [],
      checksum: checksum(manifest),
    },
    {
      path: sourceMapPath,
      content: sourceMap,
      sources: [],
      checksum: checksum(sourceMap),
    },
  ];
}

export class ArtifactValidationFailure extends Error {
  constructor(readonly results: readonly ArtifactValidationResult[]) {
    super("project artifact validation failed");
  }
}

interface OwnershipRecord {
  readonly path: string;
  readonly checksum: string;
  readonly ownership: "aif-owned-generated";
}

async function ownership(
  root: string,
  fs: FileSystem,
): Promise<Map<string, OwnershipRecord> | null> {
  const path = inside(root, sourceMapPath);
  if (!(await fs.exists(path))) return new Map();
  try {
    const value = JSON.parse(await fs.read(path)) as {
      schemaVersion?: unknown;
      files?: unknown;
    };
    if (value.schemaVersion !== "1" || !Array.isArray(value.files)) return null;
    const records = new Map<string, OwnershipRecord>();
    for (const record of value.files) {
      if (typeof record !== "object" || record === null) return null;
      const item = record as Record<string, unknown>;
      if (
        typeof item.path !== "string" ||
        typeof item.checksum !== "string" ||
        item.ownership !== "aif-owned-generated"
      )
        return null;
      const normalized = normalizeOutputPath(item.path);
      if (normalized !== item.path || records.has(normalized)) return null;
      records.set(normalized, {
        path: normalized,
        checksum: item.checksum,
        ownership: "aif-owned-generated",
      });
    }
    return records;
  } catch {
    return null;
  }
}

async function plan(
  options: InitOptions,
  fs: FileSystem,
  sync = false,
): Promise<Plan> {
  const changes: Change[] = [];
  const desiredFiles = await desired(options);
  for (const metadataPath of [lockPath, sourceMapPath]) {
    try {
      await safeDestination(
        options.root,
        inside(options.root, metadataPath),
        fs,
      );
    } catch (error) {
      return {
        changes: [
          {
            path: metadataPath,
            kind: "security-error",
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
        diagnostics: ["security-error"],
      };
    }
  }
  const collision = collisionPlan(desiredFiles);
  if (collision) return collision;
  const owned = await ownership(options.root, fs);
  if (owned === null)
    return {
      changes: [
        {
          path: sourceMapPath,
          kind: "conflict",
          reason: "malformed source-map; refusing all writes",
        },
      ],
      diagnostics: ["invalid source-map"],
    };
  for (const file of desiredFiles) {
    const path = inside(options.root, normalizeOutputPath(file.path));
    try {
      await safeDestination(options.root, path, fs);
    } catch (error) {
      return {
        changes: [
          {
            path: file.path,
            kind: "security-error",
            reason: error instanceof Error ? error.message : String(error),
          },
        ],
        diagnostics: ["security-error"],
      };
    }
    if (!(await fs.exists(path)))
      changes.push({
        path: file.path,
        kind: sync && owned.has(file.path) ? "missing" : "create",
        reason:
          sync && owned.has(file.path)
            ? "AIF-owned generated file is missing"
            : "missing",
        content: file.content,
      });
    else if ((await fs.read(path)) === file.content) continue;
    else if (
      sync &&
      file.path !== sourceMapPath &&
      file.path !== lockPath &&
      file.path !== configPath
    ) {
      const record = owned.get(file.path);
      if (!record)
        changes.push({
          path: file.path,
          kind: "conflict",
          reason: "existing destination has no AIF ownership record",
        });
      else if (checksum(await fs.read(path)) !== record.checksum)
        changes.push({
          path: file.path,
          kind: "modified",
          reason: "AIF-owned generated file was manually modified",
        });
      else
        changes.push({
          path: file.path,
          kind: "update",
          reason: "verified AIF-owned generated output changed",
          content: file.content,
        });
    } else
      changes.push({
        path: file.path,
        kind: "conflict",
        reason: "existing file is not identical; explicit resolution required",
      });
  }
  return { changes, diagnostics: [] };
}

async function apply(
  root: string,
  fs: FileSystem,
  proposal: Plan,
): Promise<void> {
  const writes = proposal.changes.filter(
    (change) => change.kind === "create" || change.kind === "update",
  );
  const backups = new Map<string, string>();
  const created: string[] = [];
  try {
    for (const change of writes) {
      const path = inside(root, change.path);
      // Revalidate immediately before replacement to narrow symlink substitution races.
      await safeDestination(root, path, fs);
      if (await fs.exists(path)) backups.set(path, await fs.read(path));
      else created.push(path);
      await fs.mkdir(dirname(path));
      await fs.write(path, change.content!);
    }
  } catch (error) {
    for (const [path, content] of backups) await fs.write(path, content);
    for (const path of created) await fs.remove(path);
    throw error;
  }
}

export async function initProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  const proposal = await plan(options, fs);
  if (
    !options.dryRun &&
    !proposal.changes.some((change) => change.kind === "conflict")
  )
    await apply(options.root, fs, proposal);
  return proposal;
}
export async function syncProject(
  options: SyncOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions = {},
): Promise<SyncDryRunResult | TransactionResult> {
  const proposal = await plan(options, fs, true);
  const desiredFiles = await desired(options);
  const payload = desiredFiles.filter(
    (file) => file.path !== lockPath && file.path !== sourceMapPath,
  );
  const blockingChanges = proposal.changes.filter((change) =>
    ["conflict", "modified", "security-error"].includes(change.kind),
  );
  if (options.dryRun) {
    const summary = transactionSummary(payload, proposal.changes);
    return {
      ...proposal,
      dryRun: true,
      createdFiles: summary.createdFiles,
      updatedFiles: summary.updatedFiles,
      unchangedFiles: summary.unchangedFiles,
      conflictFiles: blockingChanges.map((change) => change.path).sort(),
    };
  }
  if (blockingChanges.length > 0 || proposal.diagnostics.length > 0)
    return {
      ...proposal,
      diagnostics:
        proposal.diagnostics.length > 0
          ? proposal.diagnostics
          : ["sync-conflict"],
      status: "failed",
      rollbackAttempted: false,
      rollbackCompleted: true,
      rollbackFailures: [],
      ...transactionSummary(payload, proposal.changes),
      manifestUpdated: false,
      sourceMapUpdated: false,
      consistencyValidated: false,
      cleanupCompleted: false,
    };
  return synchronizeGeneratedFiles(
    options.root,
    payload,
    fs,
    transactionOptions,
    {
      manifest: desiredFiles.find((file) => file.path === lockPath)!.content,
      sourceMap: desiredFiles.find((file) => file.path === sourceMapPath)!
        .content,
    },
  );
}
export async function diffProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  return plan(options, fs);
}
export async function doctorProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<DoctorPlan> {
  const proposal = await plan({ ...options, dryRun: true }, fs, true);
  const changes = proposal.changes.map(({ content: _content, ...change }) =>
    change.kind === "update"
      ? {
          ...change,
          kind: "stale" as const,
          reason: "generated state is stale",
        }
      : change,
  );
  const blockingChanges = changes.filter((change) =>
    ["conflict", "modified", "missing", "stale", "security-error"].includes(
      change.kind,
    ),
  );
  return {
    ...proposal,
    changes,
    diagnostics: blockingChanges.map(
      (change) => `${change.path}: ${change.reason}`,
    ),
    errors: blockingChanges.map((change) => ({
      code: `generated-file-${change.kind}`,
      message: change.reason,
      fieldPath: "/",
      phase: "semantic" as const,
      artifactType: "generated-state" as const,
      schemaId: "urn:aif:semantic:generated-state:1" as const,
      schemaVersion: "1" as const,
      documentPath: change.path,
      affectedPath: change.path,
    })),
  };
}
export async function adoptProject(
  options: InitOptions,
  fs: FileSystem,
): Promise<Plan> {
  const known = [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules",
    ".github/copilot-instructions.md",
    "README.md",
    "ROADMAP.md",
    "CHANGELOG.md",
  ];
  const found = await Promise.all(
    known.map(async (path) =>
      (await fs.exists(inside(options.root, path))) ? path : null,
    ),
  );
  const proposal = await plan({ ...options, dryRun: true }, fs);
  return {
    ...proposal,
    diagnostics: found
      .filter((path): path is string => path !== null)
      .map((path) => `project-owned existing artifact: ${path}`),
  };
}
export async function planFeature(
  taskId: string,
  validator?: ArtifactValidator,
): Promise<string> {
  if (!taskId) throw new Error("task identifier is required");
  const featureBrief = {
    schemaVersion: "1",
    id: taskId,
    title: taskId,
    status: "draft",
    priority: "medium",
    effort: "m",
    risk: "medium",
    impact: "To be assessed",
    ownerMode: "unassigned",
    problem: "To be defined",
    userValue: "To be defined",
    goal: "Create an approved bounded implementation brief",
    scope: [],
    outOfScope: [],
    acceptanceCriteria: [
      "Acceptance criteria must be completed before approval",
    ],
    architectureBoundaries: [],
    reuseCandidates: [],
    contextPack: `plans/${taskId}-context.json`,
    allowedFiles: [],
    forbiddenFiles: [],
    edgeCases: [],
    verification: ["Define proportionate verification before implementation"],
    liveVerification: false,
    technicalDebtDecision: "none",
    stopCondition: "Stop before implementation until the brief is approved",
  };
  const contextPack = {
    schemaVersion: "1",
    taskId,
    mustRead: [],
    readIfNeeded: [],
    excluded: [],
    forbiddenToChange: [],
    relevantSourceAreas: [],
    contextMode: "minimal",
    expansionReasons: [],
    fileBudget: 20,
  };
  if (validator) {
    const results = [
      validator.validate({
        artifactType: "feature-brief",
        documentPath: `plans/${taskId}.json`,
        format: "json",
        source: JSON.stringify(featureBrief),
      }),
      validator.validate({
        artifactType: "context-pack",
        documentPath: `plans/${taskId}-context.json`,
        format: "json",
        source: JSON.stringify(contextPack),
      }),
    ];
    const invalid = results.filter((result) => result.status === "invalid");
    if (invalid.length > 0) throw new ArtifactValidationFailure(invalid);
  }
  return JSON.stringify({ featureBrief, contextPack }, null, 2);
}

export function createMemoryFileSystem(
  initial: Record<string, string> = {},
  failAfterWrites?: number,
): FileSystem & { files: Map<string, string> } {
  const files = new Map(Object.entries(initial));
  let writes = 0;
  let failed = false;
  return {
    files,
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const content = files.get(path);
      if (content === undefined) throw new Error(`missing ${path}`);
      return content;
    },
    async write(path, content) {
      writes += 1;
      if (
        failAfterWrites !== undefined &&
        writes > failAfterWrites &&
        !failed
      ) {
        failed = true;
        throw new Error("injected write failure");
      }
      files.set(path, content);
    },
    async mkdir() {},
    async remove(path) {
      files.delete(path);
    },
    async list(path) {
      return [...files.keys()].filter((file) => file.startsWith(path));
    },
    async realpath(path) {
      return path;
    },
    async isSymbolicLink() {
      return false;
    },
  };
}
export const nodeFileSystem: FileSystem = {
  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },
  read: (path) => readFile(path, "utf8"),
  async write(path, content) {
    await writeFile(path, content, "utf8");
  },
  async mkdir(path) {
    await mkdir(path, { recursive: true });
  },
  async remove(path) {
    await rm(path, { recursive: true, force: true });
  },
  async list(path) {
    try {
      return await readdir(path, { recursive: true });
    } catch {
      return [];
    }
  },
  realpath: (path) => realpath(path),
  async isSymbolicLink(path) {
    try {
      return (await lstat(path)).isSymbolicLink();
    } catch {
      return false;
    }
  },
};
