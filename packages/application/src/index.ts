// Private project-operation layer. It must remain independent of CLI/process code.
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
import { dirname, relative, resolve, sep } from "node:path";
import {
  adapterVersion,
  generateAdapters,
  getAdapterContract,
} from "@intentloom/adapters";
import {
  INTENTLOOM_VERSION,
  checksum,
  loadCatalog,
  normalizeOutputPath,
  normalizeStoredPath,
  storedPathCollisionKey,
  type AdapterName,
  type Catalog,
  type GeneratedFile,
} from "@intentloom/core";
import {
  type ArtifactValidationResult,
  type ArtifactValidator,
  validateSkillSet,
} from "@intentloom/validator";
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
  readonly findings: readonly DoctorFinding[];
  readonly errors: readonly DoctorError[];
}

export type DoctorSeverity = "error" | "warning" | "info";
export type DoctorCategory =
  | "config"
  | "schema"
  | "ownership"
  | "generated-file"
  | "adapter"
  | "profile"
  | "documentation"
  | "migration"
  | "security"
  | "drift";

export interface DoctorFinding {
  readonly code: string;
  readonly severity: DoctorSeverity;
  readonly category: DoctorCategory;
  readonly path: string;
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
  readonly adapter: AdapterName | null;
  readonly profile: string | null;
}

export interface DoctorError extends DoctorFinding {
  readonly phase: "semantic";
  readonly artifactType: "generated-state";
  readonly schemaId: "urn:aif:semantic:generated-state:1";
  readonly schemaVersion: "1";
  readonly documentPath: string;
  readonly affectedPath: string;
  readonly fieldPath: "/";
}

export function doctorExitCode(report: DoctorPlan): 0 | 3 {
  return report.findings.some((finding) => finding.severity === "error")
    ? 3
    : 0;
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
  readonly existingValidationResults?: readonly ArtifactValidationResult[];
  readonly profileConfirmed?: boolean;
  readonly projectOwnedMappings?: readonly ProjectMapping[];
  readonly documentationMappings?: readonly ProjectMapping[];
}

export interface ProjectMapping {
  readonly source: string;
  readonly destination: string;
}

export type DetectedProfile =
  "generic" | "typescript" | "angular" | "rust" | "tauri" | "angular-tauri";

export interface ProfileCandidate {
  readonly profile: DetectedProfile;
  readonly evidenceFiles: readonly string[];
  readonly reason: string;
  readonly confidence: "exact" | "inferred" | "fallback";
}

export interface ProfileDetectionResult {
  readonly selectedProfile: DetectedProfile;
  readonly candidates: readonly ProfileCandidate[];
  readonly competingCandidates: readonly DetectedProfile[];
  readonly manualConfirmationRequired: boolean;
  readonly scannedPaths: readonly string[];
}

export type ProjectInspectionCapability = "project.files.read";
export type InspectionReadiness =
  "not-initialized" | "partial-metadata" | "ready";
export type InspectionFindingSeverity = "warning" | "error" | "info";

export interface ProjectInspectionFinding {
  readonly code:
    | "inspection-root-symlink"
    | "intentloom-not-initialized"
    | "intentloom-metadata-partial"
    | "inspection-ready";
  readonly severity: InspectionFindingSeverity;
  readonly path: "." | ".aif/";
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
}

export interface ProjectInspection {
  readonly operationVersion: 1;
  readonly capabilities: readonly [ProjectInspectionCapability];
  readonly readOnly: true;
  readonly profileDetection: Omit<ProfileDetectionResult, "scannedPaths">;
  readonly supportedAdapters: readonly AdapterName[];
  readonly detectedAdapters: readonly AdapterName[];
  readonly instructionPaths: readonly string[];
  readonly intentloomMetadata: readonly {
    readonly path:
      ".aif/config.yaml" | ".aif/manifest.lock.json" | ".aif/source-map.json";
    readonly present: boolean;
  }[];
  readonly readiness: InspectionReadiness;
  readonly exclusions: readonly string[];
  readonly findings: readonly ProjectInspectionFinding[];
}

export type AdoptionAction =
  | "create"
  | "map-existing-project-owned"
  | "map-existing-aif-compatible-document"
  | "generated-candidate"
  | "conflict"
  | "unsupported"
  | "skip"
  | "manual-decision-required";

export interface AdoptionProposalItem {
  readonly path: string;
  readonly action: AdoptionAction;
  readonly currentClassification:
    "absent" | "project-owned" | "aif-owned" | "aif-metadata";
  readonly proposedClassification:
    | "aif-generated"
    | "aif-metadata"
    | "project-owned"
    | "project-owned-documentation"
    | "unsupported";
  readonly reason: string;
  readonly canonicalSource: string | null;
  readonly adapter: AdapterName | null;
  readonly profile: string | null;
  readonly conflictDetails: readonly string[];
  readonly writeEligible: boolean;
  readonly manualDecisionRequired: boolean;
  readonly safeNextAction: string;
}

export interface AdoptionProposal extends Plan {
  readonly kind: "adoption-proposal";
  readonly items: readonly AdoptionProposalItem[];
  readonly profileDetection: ProfileDetectionResult;
  readonly applied: boolean;
  readonly applicationStatus:
    | "not-requested"
    | "blocked"
    | "applied"
    | "failed-restored"
    | "failed-incomplete";
  readonly transactionOutcome: AdoptionTransactionOutcome | null;
}
export interface AdoptionTransactionOutcome {
  readonly status: "success" | "failed";
  readonly failedStage: TransactionStage | null;
  readonly errorCode: string | null;
  readonly rollbackAttempted: boolean;
  readonly rollbackCompleted: boolean;
  readonly rollbackFailures: readonly string[];
  readonly diagnostics: readonly string[];
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
const ignoredScanSegments = new Set([
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
]);

function projectRelativePaths(
  root: string,
  entries: readonly string[],
): string[] {
  const normalizedRoot = resolve(root);
  return [
    ...new Set(
      entries.flatMap((entry) => {
        const normalizedEntry = entry.replaceAll("\\", "/");
        const absolute = normalizedEntry.startsWith("/")
          ? resolve(normalizedEntry)
          : resolve(normalizedRoot, normalizedEntry);
        const path = relative(normalizedRoot, absolute).replaceAll("\\", "/");
        if (
          path === "" ||
          path === ".." ||
          path.startsWith("../") ||
          path.split("/").some((segment) => ignoredScanSegments.has(segment))
        )
          return [];
        return [path];
      }),
    ),
  ].sort();
}

async function readEvidenceFile(
  root: string,
  path: string,
  paths: ReadonlySet<string>,
  fs: FileSystem,
): Promise<string | null> {
  if (!paths.has(path)) return null;
  try {
    return await fs.read(inside(root, path));
  } catch {
    return null;
  }
}

export async function detectProjectProfiles(
  root: string,
  fs: FileSystem,
): Promise<ProfileDetectionResult> {
  const scannedPaths = projectRelativePaths(root, await fs.list(root));
  const paths = new Set(scannedPaths);
  const packageSource = await readEvidenceFile(root, "package.json", paths, fs);
  let packageNames = new Set<string>();
  if (packageSource !== null)
    try {
      const document = JSON.parse(packageSource) as Record<string, unknown>;
      packageNames = new Set(
        ["dependencies", "devDependencies", "peerDependencies"].flatMap(
          (field) =>
            typeof document[field] === "object" && document[field] !== null
              ? Object.keys(document[field] as Record<string, unknown>)
              : [],
        ),
      );
    } catch {
      /* malformed package metadata is not stack evidence */
    }
  const typescriptEvidence = [
    ...(paths.has("package.json") && packageNames.has("typescript")
      ? ["package.json"]
      : []),
    ...(paths.has("tsconfig.json") ? ["tsconfig.json"] : []),
  ];
  const angularEvidence = [
    ...(paths.has("angular.json") ? ["angular.json"] : []),
    ...(paths.has("package.json") && packageNames.has("@angular/core")
      ? ["package.json"]
      : []),
  ];
  const rustEvidence = [
    ...(paths.has("Cargo.toml") ? ["Cargo.toml"] : []),
    ...(paths.has("src-tauri/Cargo.toml") ? ["src-tauri/Cargo.toml"] : []),
  ];
  const tauriEvidence = [
    ...(paths.has("src-tauri/Cargo.toml") ? ["src-tauri/Cargo.toml"] : []),
    ...["src-tauri/tauri.conf.json", "src-tauri/tauri.conf.json5"].filter(
      (path) => paths.has(path),
    ),
    ...(paths.has("package.json") &&
    [...packageNames].some((name) => name.startsWith("@tauri-apps/"))
      ? ["package.json"]
      : []),
  ];
  const hasAngular = angularEvidence.length > 0;
  const hasTauri = tauriEvidence.length > 0;
  const definitions: ProfileCandidate[] = [];
  if (hasAngular && hasTauri)
    definitions.push({
      profile: "angular-tauri",
      evidenceFiles: [
        ...new Set([
          ...angularEvidence,
          ...tauriEvidence,
          ...typescriptEvidence,
        ]),
      ].sort(),
      reason: "Angular and Tauri configuration are both present",
      confidence: "exact",
    });
  if (hasAngular)
    definitions.push({
      profile: "angular",
      evidenceFiles: [...new Set(angularEvidence)].sort(),
      reason: "Angular package or workspace configuration is present",
      confidence: "exact",
    });
  if (hasTauri)
    definitions.push({
      profile: "tauri",
      evidenceFiles: [...new Set(tauriEvidence)].sort(),
      reason: "Tauri configuration or package evidence is present",
      confidence: "exact",
    });
  if (typescriptEvidence.length > 0 || hasAngular)
    definitions.push({
      profile: "typescript",
      evidenceFiles: [...new Set(typescriptEvidence)].sort(),
      reason: "TypeScript configuration or package evidence is present",
      confidence: "inferred",
    });
  if (rustEvidence.length > 0 || hasTauri)
    definitions.push({
      profile: "rust",
      evidenceFiles: [...new Set(rustEvidence)].sort(),
      reason: "Cargo project evidence is present",
      confidence: "inferred",
    });
  definitions.push({
    profile: "generic",
    evidenceFiles: [],
    reason: "Generic is the deterministic fallback profile",
    confidence: "fallback",
  });
  const hasWebProfile = hasAngular || typescriptEvidence.length > 0;
  const hasNativeProfile = hasTauri || rustEvidence.length > 0;
  const ambiguous =
    hasWebProfile && hasNativeProfile && !(hasAngular && hasTauri);
  return {
    selectedProfile: ambiguous ? "generic" : definitions[0]!.profile,
    candidates: definitions,
    competingCandidates: definitions
      .filter(
        (candidate) =>
          candidate.profile !==
          (ambiguous ? "generic" : definitions[0]!.profile),
      )
      .map((candidate) => candidate.profile),
    manualConfirmationRequired: ambiguous,
    scannedPaths,
  };
}

const inspectionAdapterNames: readonly AdapterName[] = [
  "claude",
  "codex",
  "cursor",
  "copilot",
];
const inspectionMetadataPaths = [configPath, lockPath, sourceMapPath] as const;
const inspectionExclusions = [
  ".git",
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "vendor",
  "symbolic links",
  "secret-like paths",
] as const;

function instructionAdapters(path: string): AdapterName[] {
  const detected = new Set<AdapterName>();
  if (path === "AGENTS.md" || path.startsWith(".agents/")) {
    detected.add("codex");
    detected.add("cursor");
  }
  if (path === "CLAUDE.md" || path.startsWith(".claude/"))
    detected.add("claude");
  if (path.startsWith(".cursor/")) detected.add("cursor");
  if (path.startsWith(".github/")) detected.add("copilot");
  return inspectionAdapterNames.filter((adapter) => detected.has(adapter));
}

function secretLikePath(path: string): boolean {
  return path
    .split("/")
    .some(
      (segment) =>
        segment === ".env" ||
        segment.startsWith(".env.") ||
        /\.(?:key|pem|p12|pfx)$/iu.test(segment),
    );
}

export async function inspectProject(
  root: string,
  fs: FileSystem,
): Promise<ProjectInspection> {
  const emptyDetection: Omit<ProfileDetectionResult, "scannedPaths"> = {
    selectedProfile: "generic",
    candidates: [
      {
        profile: "generic",
        evidenceFiles: [],
        reason: "Inspection did not access a symbolic-link project root",
        confidence: "fallback",
      },
    ],
    competingCandidates: [],
    manualConfirmationRequired: false,
  };
  if (await fs.isSymbolicLink(resolve(root)))
    return {
      operationVersion: 1,
      capabilities: ["project.files.read"],
      readOnly: true,
      profileDetection: emptyDetection,
      supportedAdapters: inspectionAdapterNames,
      detectedAdapters: [],
      instructionPaths: [],
      intentloomMetadata: inspectionMetadataPaths.map((path) => ({
        path,
        present: false,
      })),
      readiness: "not-initialized",
      exclusions: inspectionExclusions,
      findings: [
        {
          code: "inspection-root-symlink",
          severity: "error",
          path: ".",
          message: "inspection requires a non-symbolic explicit project root",
          remediation: ["Select the canonical project directory and retry."],
          readOnly: true,
        },
      ],
    };
  const detection = await detectProjectProfiles(root, fs);
  const paths = detection.scannedPaths.filter((path) => !secretLikePath(path));
  const instructionPaths = paths.filter(
    (path) => instructionAdapters(path).length > 0,
  );
  const detectedAdapters = inspectionAdapterNames.filter((adapter) =>
    instructionPaths.some((path) =>
      instructionAdapters(path).includes(adapter),
    ),
  );
  const intentloomMetadata = inspectionMetadataPaths.map((path) => ({
    path,
    present: paths.includes(path),
  }));
  const metadataCount = intentloomMetadata.filter(
    (item) => item.present,
  ).length;
  const readiness: InspectionReadiness =
    metadataCount === 0
      ? "not-initialized"
      : metadataCount === intentloomMetadata.length
        ? "ready"
        : "partial-metadata";
  const findings: ProjectInspectionFinding[] =
    readiness === "not-initialized"
      ? [
          {
            code: "intentloom-not-initialized",
            severity: "info",
            path: ".aif/",
            message: "Intentloom metadata is not present",
            remediation: [
              "Run adoption dry-run and review the proposed changes.",
            ],
            readOnly: true,
          },
        ]
      : readiness === "partial-metadata"
        ? [
            {
              code: "intentloom-metadata-partial",
              severity: "warning",
              path: ".aif/",
              message: "Intentloom metadata is incomplete",
              remediation: [
                "Inspect the existing metadata and review adoption before changing files.",
              ],
              readOnly: true,
            },
          ]
        : [
            {
              code: "inspection-ready",
              severity: "info",
              path: ".aif/",
              message: "Intentloom metadata is present",
              remediation: [],
              readOnly: true,
            },
          ];
  const { scannedPaths: _scannedPaths, ...profileDetection } = detection;
  return {
    operationVersion: 1,
    capabilities: ["project.files.read"],
    readOnly: true,
    profileDetection,
    supportedAdapters: inspectionAdapterNames,
    detectedAdapters,
    instructionPaths,
    intentloomMetadata,
    readiness,
    exclusions: inspectionExclusions,
    findings,
  };
}

function inside(root: string, path: string): string {
  const target = resolve(root, path);
  if (target !== resolve(root) && !target.startsWith(`${resolve(root)}${sep}`))
    throw new Error(`path traversal: ${path}`);
  return target;
}

export function destinationCollisionKey(path: string): string {
  try {
    return storedPathCollisionKey(path);
  } catch {
    throw new Error("invalid or escaping destination");
  }
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

function noncanonicalPathPlan(files: readonly GeneratedFile[]): Plan | null {
  const invalidPaths = files
    .map((file) => file.path)
    .filter((path) => {
      try {
        return normalizeStoredPath(path) !== path;
      } catch {
        return true;
      }
    })
    .sort();
  if (invalidPaths.length === 0) return null;
  return {
    changes: invalidPaths.map((path) => ({
      path,
      kind: "security-error" as const,
      reason: "generated destination is not a canonical stored path",
    })),
    diagnostics: ["invalid-stored-path"],
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
    frameworkVersion: INTENTLOOM_VERSION,
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
      if (normalizeStoredPath(path) !== path)
        return invalidPostWriteState(escapeCode, [metadataPath], [identifier]);
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
    manifest.frameworkVersion !== INTENTLOOM_VERSION ||
    sourceMap.frameworkVersion !== INTENTLOOM_VERSION
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
  const invalidPath = noncanonicalPathPlan(files);
  if (invalidPath)
    return {
      ...invalidPath,
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
      const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
      try {
        if (injectedRollbackFailures.has(projectPath))
          throw new Error("injected rollback failure");
        await fs.write(path, content);
      } catch {
        rollbackFailures.push(projectPath);
      }
    }
    for (const path of created) {
      const projectPath = relative(resolve(root), path).replaceAll("\\", "/");
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
      throw new Error(
        `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
      );
    if (await fs.exists(current)) {
      const resolved = await fs.realpath(current);
      if (
        resolved !== rootResolved &&
        !resolved.startsWith(`${rootResolved}${sep}`)
      )
        throw new Error(
          `security-error: ${relative(resolve(root), path).replaceAll("\\", "/")}`,
        );
    }
    if (current === resolve(root)) return;
    current = dirname(current);
  }
}

function sortedMappings(mappings: readonly ProjectMapping[]): ProjectMapping[] {
  return [...mappings].sort((left, right) =>
    `${left.source}\0${left.destination}`.localeCompare(
      `${right.source}\0${right.destination}`,
    ),
  );
}

function config(
  profile: string,
  adapters: readonly AdapterName[],
  options: Pick<InitOptions, "projectOwnedMappings" | "documentationMappings">,
): string {
  const projectOwnedMappings = sortedMappings(
    options.projectOwnedMappings ?? [],
  );
  const documentationMappings = sortedMappings(
    options.documentationMappings ?? [],
  );
  return stringify({
    schemaVersion: "1",
    profile,
    adapters,
    ...(projectOwnedMappings.length === 0 ? {} : { projectOwnedMappings }),
    ...(documentationMappings.length === 0 ? {} : { documentationMappings }),
  });
}
function generated(
  adapterNames: readonly AdapterName[],
  catalog: Catalog,
  profile: string,
): GeneratedFile[] {
  return [...generateAdapters(adapterNames, catalog, { profile }).files];
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
  const selectedAdapters = [...new Set(options.adapters)].sort();
  const projectOwnedDestinations = new Set(
    (options.projectOwnedMappings ?? []).map((mapping) => mapping.source),
  );
  const files = generated(selectedAdapters, catalog, options.profile).filter(
    (file) => !projectOwnedDestinations.has(file.path),
  );
  const configContent = config(options.profile, selectedAdapters, options);
  const payload: GeneratedFile[] = [
    {
      path: configPath,
      content: configContent,
      sources: ["project:config"],
      checksum: checksum(configContent),
    },
    {
      path: ".aif/local.example.yaml",
      content:
        "# Local Intentloom preferences only; never store secrets here.\n",
      sources: ["project:local-example"],
      checksum: checksum(
        "# Local Intentloom preferences only; never store secrets here.\n",
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
            ? "Intentloom-owned generated file is missing"
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
          reason: "existing destination has no Intentloom ownership record",
        });
      else if (checksum(await fs.read(path)) !== record.checksum)
        changes.push({
          path: file.path,
          kind: "modified",
          reason: "Intentloom-owned generated file was manually modified",
        });
      else
        changes.push({
          path: file.path,
          kind: "update",
          reason: "verified Intentloom-owned generated output changed",
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
  validationResults: readonly ArtifactValidationResult[] = [],
): Promise<DoctorPlan> {
  const metadataPresence = await Promise.all(
    [configPath, lockPath, sourceMapPath].map(async (path) => ({
      path,
      present: await fs.exists(inside(options.root, path)),
    })),
  );
  const effectiveValidationResults = [...validationResults];
  if (options.validator) {
    const definitions = [
      {
        artifactType: "aif-config" as const,
        path: configPath,
        format: "yaml" as const,
      },
      {
        artifactType: "manifest-lock" as const,
        path: lockPath,
        format: "json" as const,
      },
      {
        artifactType: "source-map" as const,
        path: sourceMapPath,
        format: "json" as const,
      },
    ];
    for (const definition of definitions)
      if (
        (await fs.exists(inside(options.root, definition.path))) &&
        !effectiveValidationResults.some(
          (result) => result.documentPath === definition.path,
        )
      ) {
        const result = options.validator.validate({
          ...definition,
          documentPath: definition.path,
          source: await fs.read(inside(options.root, definition.path)),
        });
        if (result.status === "invalid")
          effectiveValidationResults.push(result);
      }
  }
  const findings: DoctorFinding[] = effectiveValidationResults.flatMap(
    (result) =>
      [...result.structuralErrors, ...result.semanticErrors].map((error) => ({
        code: error.code,
        severity: "error" as const,
        category: "schema" as const,
        path: result.documentPath,
        message: error.message,
        remediation: [
          `Repair ${result.artifactType} structure or semantics before applying changes.`,
        ],
        readOnly: true as const,
        adapter: null,
        profile: options.profile,
      })),
  );
  const selectedAdapters = [...new Set(options.adapters)].sort();
  const adapterForPath = (path: string): AdapterName | null => {
    if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
    if (path.startsWith(".agents/")) {
      const owners = selectedAdapters.filter(
        (adapter) => adapter === "codex" || adapter === "cursor",
      );
      return owners.length === 1 ? owners[0]! : null;
    }
    if (path.startsWith(".cursor/")) return "cursor";
    if (path.startsWith(".github/")) return "copilot";
    if (path === "AGENTS.md")
      return (
        selectedAdapters.find((adapter) => adapter !== "claude") ??
        selectedAdapters[0] ??
        null
      );
    return null;
  };
  if (!options.validator) {
    for (const definition of [
      { path: configPath, format: "yaml" as const },
      { path: lockPath, format: "json" as const },
      { path: sourceMapPath, format: "json" as const },
    ]) {
      if (!(await fs.exists(inside(options.root, definition.path)))) continue;
      if (
        effectiveValidationResults.some(
          (result) => result.documentPath === definition.path,
        )
      )
        continue;
      try {
        const source = await fs.read(inside(options.root, definition.path));
        if (definition.format === "json") JSON.parse(source);
        else parse(source);
      } catch {
        findings.push({
          code:
            definition.format === "json" ? "json-malformed" : "yaml-malformed",
          severity: "error",
          category: "schema",
          path: definition.path,
          message: `${definition.format.toUpperCase()} document is malformed`,
          remediation: [
            "Repair the malformed metadata before applying changes.",
          ],
          readOnly: true,
          adapter: null,
          profile: options.profile,
        });
      }
    }
  }
  findings.push(
    ...metadataPresence
      .filter((item) => !item.present)
      .map((item) => ({
        code:
          item.path === configPath
            ? "aif-config-missing"
            : item.path === lockPath
              ? "manifest-lock-missing"
              : "source-map-missing",
        severity: "error" as const,
        category:
          item.path === configPath
            ? ("config" as const)
            : ("ownership" as const),
        path: item.path,
        message: `required Intentloom metadata is missing: ${item.path}`,
        remediation: [
          "Run adoption dry-run and review the proposed metadata creation.",
        ],
        readOnly: true as const,
        adapter: null,
        profile: options.profile,
      })),
  );
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
  for (const change of blockingChanges) {
    if (
      !metadataPresence.every((item) => item.present) &&
      change.kind !== "security-error"
    )
      continue;
    if (
      [configPath, lockPath, sourceMapPath].includes(change.path) &&
      change.kind !== "security-error"
    )
      continue;
    const definition =
      change.kind === "modified"
        ? {
            code: "generated-checksum-drift",
            category: "drift" as const,
            remediation:
              "Restore the generated file or explicitly regenerate it after review.",
          }
        : change.kind === "missing"
          ? {
              code: "generated-file-missing",
              category: "generated-file" as const,
              remediation:
                "Review a sync dry-run and restore the missing generated output.",
            }
          : change.kind === "stale"
            ? {
                code: "adapter-output-stale",
                category: "drift" as const,
                remediation: "Review and apply a transactional sync.",
              }
            : change.kind === "security-error"
              ? {
                  code: "path-security-violation",
                  category: "security" as const,
                  remediation:
                    "Remove the unsafe path or symlink before retrying.",
                }
              : {
                  code: "unowned-generated-destination",
                  category: "ownership" as const,
                  remediation:
                    "Keep the file project-owned or resolve the destination manually.",
                };
    findings.push({
      code: definition.code,
      severity: "error",
      category: definition.category,
      path: change.path,
      message: change.reason,
      remediation: [definition.remediation],
      readOnly: true,
      adapter: adapterForPath(change.path),
      profile: options.profile,
    });
  }
  const scannedPaths = projectRelativePaths(
    options.root,
    await fs.list(options.root),
  );
  const scannedSet = new Set(scannedPaths);
  const desiredPaths = new Set(
    (await desired(options))
      .map((file) => file.path)
      .filter((path) => path !== lockPath && path !== sourceMapPath),
  );
  const addFinding = (finding: Omit<DoctorFinding, "readOnly">) =>
    findings.push({ ...finding, readOnly: true });
  const readJson = async (
    path: string,
  ): Promise<Record<string, unknown> | null> => {
    try {
      const value = JSON.parse(await fs.read(inside(options.root, path)));
      return typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };
  const manifest = await readJson(lockPath);
  const sourceMap = await readJson(sourceMapPath);
  const addStoredPathFinding = (
    metadataPath: typeof lockPath | typeof sourceMapPath,
    records: readonly Record<string, unknown>[],
  ) => {
    if (
      records.some((record) => {
        if (typeof record.path !== "string") return false;
        try {
          return normalizeStoredPath(record.path) !== record.path;
        } catch {
          return true;
        }
      })
    )
      addFinding({
        code: "stored-path-incompatible",
        severity: "error",
        category: "security",
        path: metadataPath,
        message: "metadata contains a non-portable stored path",
        remediation: [
          "Review and migrate stored paths to normalized project-relative form.",
        ],
        adapter: null,
        profile: options.profile,
      });
  };
  if (manifest) {
    if (manifest.frameworkVersion !== INTENTLOOM_VERSION)
      addFinding({
        code: "framework-version-stale",
        severity: "error",
        category: "migration",
        path: lockPath,
        message: "manifest framework version does not match this CLI",
        remediation: [
          "Review the migration guide before regenerating metadata.",
        ],
        adapter: null,
        profile: options.profile,
      });
    if (manifest.adapterOutputVersion !== adapterOutputVersion)
      addFinding({
        code: "adapter-version-stale",
        severity: "error",
        category: "adapter",
        path: lockPath,
        message: "manifest adapter output version is stale",
        remediation: [
          "Review a sync dry-run with the current adapter version.",
        ],
        adapter: null,
        profile: options.profile,
      });
    if (manifest.schemaVersion !== metadataFormatVersion)
      addFinding({
        code: "schema-version-stale",
        severity: "error",
        category: "schema",
        path: lockPath,
        message: "manifest schema version is not supported by this CLI",
        remediation: ["Use an explicit supported schema migration."],
        adapter: null,
        profile: options.profile,
      });
    const generated = Array.isArray(manifest.generated)
      ? (manifest.generated as Record<string, unknown>[])
      : [];
    addStoredPathFinding(lockPath, generated);
    for (const record of generated)
      if (typeof record.path === "string" && !desiredPaths.has(record.path))
        addFinding({
          code: "manifest-entry-orphaned",
          severity: "error",
          category: "ownership",
          path: record.path,
          message: "manifest entry has no current generated destination",
          remediation: [
            "Review and remove the orphan through an explicit migration.",
          ],
          adapter: null,
          profile: options.profile,
        });
    const pinnedAdapters = Array.isArray(manifest.adapters)
      ? (manifest.adapters as Record<string, unknown>[])
          .map((entry) => entry.id)
          .filter((id): id is string => typeof id === "string")
          .sort()
      : [];
    if (
      pinnedAdapters.length > 0 &&
      pinnedAdapters.join(",") !== [...options.adapters].sort().join(",")
    )
      addFinding({
        code: "adapter-selection-conflict",
        severity: "error",
        category: "adapter",
        path: lockPath,
        message:
          "manifest adapter selection differs from project configuration",
        remediation: [
          "Choose adapters explicitly and review adoption before syncing.",
        ],
        adapter: null,
        profile: options.profile,
      });
  }
  const sourceRecords =
    sourceMap && Array.isArray(sourceMap.files)
      ? (sourceMap.files as Record<string, unknown>[])
      : [];
  addStoredPathFinding(sourceMapPath, sourceRecords);
  const ownedPaths = new Set(
    sourceRecords
      .map((record) => record.path)
      .filter((path): path is string => typeof path === "string"),
  );
  for (const record of sourceRecords) {
    if (typeof record.path !== "string") continue;
    if (!desiredPaths.has(record.path))
      addFinding({
        code: "source-map-record-orphaned",
        severity: "error",
        category: "ownership",
        path: record.path,
        message:
          "source-map ownership record has no current generated destination",
        remediation: [
          "Review and remove the orphan through an explicit migration.",
        ],
        adapter: null,
        profile: options.profile,
      });
    if (
      scannedSet.has(record.path) &&
      /\.(?:md|mdc)$/iu.test(record.path) &&
      !(await fs.read(inside(options.root, record.path))).includes(
        "Generated by Intentloom",
      )
    )
      addFinding({
        code: "generated-header-missing",
        severity: "error",
        category: "generated-file",
        path: record.path,
        message:
          "owned generated text file lacks its supported Intentloom header",
        remediation: ["Restore or transactionally regenerate the owned file."],
        adapter: null,
        profile: options.profile,
      });
  }
  for (const path of desiredPaths)
    if (
      scannedSet.has(path) &&
      !ownedPaths.has(path) &&
      /\.(?:md|mdc)$/iu.test(path) &&
      (await fs.read(inside(options.root, path))).includes(
        "Generated by Intentloom",
      )
    )
      addFinding({
        code:
          path === "AGENTS.md" && selectedAdapters.length > 1
            ? "shared-file-conflict"
            : "generated-header-without-ownership",
        severity: "error",
        category: "ownership",
        path,
        message: "Intentloom-like header is not ownership proof",
        remediation: [
          "Keep the file project-owned or resolve adoption manually.",
        ],
        adapter: null,
        profile: options.profile,
      });
  for (const path of desiredPaths) {
    if (
      !scannedSet.has(path) ||
      !(
        /^\.cursor\/rules\/.*\.mdc$/u.test(path) ||
        /^\.github\/instructions\/.*\.instructions\.md$/u.test(path)
      )
    )
      continue;
    const source = await fs.read(inside(options.root, path));
    const key = path.startsWith(".cursor/") ? "globs" : "applyTo";
    const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/u)?.[1] ?? "";
    const value = frontmatter
      .match(new RegExp(`^${key}:\\s*(.+)$`, "mu"))?.[1]
      ?.trim()
      .replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/u, "$1$2");
    const globalCursorRule =
      path.startsWith(".cursor/") &&
      /^alwaysApply:\s*true$/mu.test(frontmatter);
    const portableGlob = (pattern: string) =>
      pattern.length > 0 &&
      !pattern.includes("\\") &&
      !pattern.includes("\0") &&
      !/^(?:[A-Za-z]:|\/)/u.test(pattern) &&
      !pattern.split("/").some((segment) => segment === ".." || segment === "");
    const valid =
      globalCursorRule ||
      (typeof value === "string" && value.split(",").every(portableGlob));
    if (!valid)
      addFinding({
        code: "path-scoped-rule-invalid",
        severity: "error",
        category: "adapter",
        path,
        message: "path-scoped adapter output has invalid frontmatter",
        remediation: ["Restore or transactionally regenerate the scoped rule."],
        adapter: adapterForPath(path),
        profile: options.profile,
      });
  }
  const supportedProfiles = new Set([
    "generic",
    "typescript",
    "angular",
    "rust",
    "tauri",
    "angular-tauri",
  ]);
  if (!supportedProfiles.has(options.profile))
    addFinding({
      code: "adapter-profile-unsupported",
      severity: "error",
      category: "profile",
      path: configPath,
      message: "selected profile is not supported by the adapter matrix",
      remediation: ["Choose a documented profile before syncing adapters."],
      adapter: null,
      profile: options.profile,
    });
  const profileDetection = await detectProjectProfiles(options.root, fs);
  if (
    !profileDetection.manualConfirmationRequired &&
    profileDetection.selectedProfile !== "generic" &&
    profileDetection.selectedProfile !== options.profile
  )
    addFinding({
      code: "profile-mismatch",
      severity: "warning",
      category: "profile",
      path: configPath,
      message: `configured profile does not match detected ${profileDetection.selectedProfile} evidence`,
      remediation: [
        "Review profile evidence and confirm the intended profile manually.",
      ],
      adapter: null,
      profile: options.profile,
    });
  for (const adapter of metadataPresence[0]?.present ? selectedAdapters : []) {
    const contract = getAdapterContract(adapter);
    for (const capability of contract.experimentalCapabilities)
      addFinding({
        code: "adapter-capability-experimental",
        severity: "warning",
        category: "adapter",
        path: configPath,
        message: `${adapter} capability ${capability} is experimental`,
        remediation: [
          "Review the compatibility matrix before relying on this capability.",
        ],
        adapter,
        profile: options.profile,
      });
    for (const capability of contract.unsupportedCapabilities)
      addFinding({
        code: "adapter-capability-unsupported",
        severity: "info",
        category: "adapter",
        path: configPath,
        message: `${adapter} capability ${capability} is not generated`,
        remediation: ["Keep unsupported provider configuration project-owned."],
        adapter,
        profile: options.profile,
      });
  }
  const instructionRoots = new Set(
    scannedPaths
      .filter((path) => !ownedPaths.has(path) || !desiredPaths.has(path))
      .flatMap((path) => {
        if (path === "AGENTS.md" || path.startsWith(".agents/"))
          return ["agents"];
        if (path === "CLAUDE.md" || path.startsWith(".claude/"))
          return ["claude"];
        if (path.startsWith(".cursor/")) return ["cursor"];
        if (path.startsWith(".github/")) return ["copilot"];
        return [];
      }),
  );
  if (instructionRoots.size > 1)
    addFinding({
      code: "instruction-files-conflicting",
      severity: "warning",
      category: "migration",
      path: ".",
      message:
        "multiple project-owned tool instruction roots require explicit mapping",
      remediation: [
        "Review each instruction root and keep ownership explicit.",
      ],
      adapter: null,
      profile: options.profile,
    });
  if (
    !scannedPaths.some((path) =>
      /(?:^|\/)(?:readme|roadmap|product[-_ ]?(?:state|roadmap))\.md$/iu.test(
        path,
      ),
    )
  )
    findings.push({
      code: "product-documentation-missing",
      severity: "warning",
      category: "documentation",
      path: "docs/",
      message: "recommended product documentation was not detected",
      remediation: ["Map an existing product document or add one when useful."],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    });
  if (!findings.some((finding) => finding.severity === "error"))
    findings.push({
      code: "installation-healthy",
      severity: "info",
      category: "config",
      path: ".aif/",
      message: "Intentloom required state is healthy",
      remediation: [],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    });
  findings.sort((left, right) =>
    `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`),
  );
  const errors: DoctorError[] = findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => ({
      ...finding,
      phase: "semantic",
      artifactType: "generated-state",
      schemaId: "urn:aif:semantic:generated-state:1",
      schemaVersion: "1",
      documentPath: finding.path,
      affectedPath: finding.path,
      fieldPath: "/",
    }));
  return {
    ...proposal,
    changes,
    diagnostics: errors.map((finding) => `${finding.path}: ${finding.message}`),
    findings,
    errors,
  };
}
export async function adoptProject(
  options: InitOptions,
  fs: FileSystem,
  transactionOptions: TransactionOptions = {},
): Promise<AdoptionProposal> {
  const profileDetection = await detectProjectProfiles(options.root, fs);
  const scannedPaths = profileDetection.scannedPaths;
  const scanned = new Set(scannedPaths);
  const desiredFiles = await desired(options);
  const desiredByPath = new Map(desiredFiles.map((file) => [file.path, file]));
  const ownershipState = await ownership(options.root, fs);
  const invalidOwnershipMetadata = ownershipState === null;
  const owned = ownershipState ?? new Map();
  const completeMetadata = await Promise.all(
    [configPath, lockPath, sourceMapPath].map((path) =>
      fs.exists(inside(options.root, path)),
    ),
  ).then((present) => present.every(Boolean) && owned.size > 0);
  const proposal = await plan({ ...options, dryRun: true }, fs);
  const changes = proposal.changes.map(
    ({ content: _content, ...change }) => change,
  );
  const changeByPath = new Map(changes.map((change) => [change.path, change]));
  const adapterForPath = (path: string): AdapterName | null => {
    if (path === "CLAUDE.md" || path.startsWith(".claude/")) return "claude";
    if (path.startsWith(".cursor/")) return "cursor";
    if (path.startsWith(".github/")) return "copilot";
    if (path.startsWith(".agents/")) return "codex";
    return null;
  };
  const instructionPath = (path: string) =>
    path === "AGENTS.md" ||
    path === "CLAUDE.md" ||
    path.startsWith(".claude/") ||
    path.startsWith(".agents/") ||
    path.startsWith(".cursor/") ||
    path === ".github/copilot-instructions.md" ||
    /^\.github\/instructions\/.+\.instructions\.md$/u.test(path);
  const unsupportedPath = (path: string) =>
    /^\.github\/agents\/.+\.agent\.md$/u.test(path);
  const documentConcept = (path: string): string | null => {
    const lower = path.toLowerCase();
    const name = lower.split("/").at(-1)!;
    if (name === "readme.md") return "public-readme";
    if (name === "changelog.md") return "change-history";
    if (
      name === "roadmap.md" ||
      /(?:product[-_ ]?(?:state|roadmap)|state[-_ ]?of[-_ ]?product)/u.test(
        name,
      )
    )
      return "product-state";
    if (/(?:architecture|architectural|adr)/u.test(name)) return "architecture";
    if (/(?:technical[-_ ]?debt|tech[-_ ]?debt)/u.test(name))
      return "technical-debt";
    return null;
  };
  const mappingDiagnostics: string[] = [];
  const normalizeMappingPath = (path: string): string | null => {
    try {
      const normalized = normalizeOutputPath(path);
      return normalized === path ? normalized : null;
    } catch {
      return null;
    }
  };
  for (const mapping of options.projectOwnedMappings ?? []) {
    const source = normalizeMappingPath(mapping.source);
    const destination = normalizeMappingPath(mapping.destination);
    if (
      source === null ||
      destination === null ||
      source !== destination ||
      !scanned.has(destination)
    )
      mappingDiagnostics.push(
        `project-owned mapping invalid: ${mapping.source}`,
      );
  }
  const documentationMappingsByConcept = new Map<string, string>();
  for (const mapping of options.documentationMappings ?? []) {
    const source = normalizeMappingPath(mapping.source);
    const destination = normalizeMappingPath(mapping.destination);
    const concept = source === null ? null : documentConcept(source);
    if (
      source === null ||
      destination === null ||
      source !== destination ||
      concept === null ||
      !scanned.has(source) ||
      documentationMappingsByConcept.has(concept)
    ) {
      mappingDiagnostics.push(
        `documentation mapping invalid: ${mapping.source}`,
      );
      continue;
    }
    documentationMappingsByConcept.set(concept, source);
  }
  const conceptCounts = new Map<string, number>();
  for (const path of scannedPaths) {
    const concept = documentConcept(path);
    if (concept)
      conceptCounts.set(concept, (conceptCounts.get(concept) ?? 0) + 1);
  }
  const items: AdoptionProposalItem[] = [];
  for (const file of desiredFiles) {
    const exists =
      scanned.has(file.path) ||
      (await fs.exists(inside(options.root, file.path)));
    const record = owned.get(file.path);
    const change = changeByPath.get(file.path);
    const metadata = file.path.startsWith(".aif/");
    const metadataConflict =
      file.path === sourceMapPath && invalidOwnershipMetadata;
    const aifOwned = record !== undefined;
    const recognizedMetadata = metadata && exists && completeMetadata;
    const projectOwned =
      exists && !aifOwned && !recognizedMetadata && !metadataConflict;
    items.push({
      path: file.path,
      action: metadataConflict
        ? "conflict"
        : projectOwned
          ? "map-existing-project-owned"
          : !exists
            ? metadata
              ? "create"
              : "generated-candidate"
            : change?.kind === "conflict" || change?.kind === "security-error"
              ? "conflict"
              : change
                ? "generated-candidate"
                : "skip",
      currentClassification: recognizedMetadata
        ? "aif-metadata"
        : aifOwned
          ? "aif-owned"
          : exists
            ? "project-owned"
            : "absent",
      proposedClassification: recognizedMetadata
        ? "aif-metadata"
        : projectOwned
          ? "project-owned"
          : "aif-generated",
      reason: metadataConflict
        ? "existing Intentloom ownership metadata is malformed or unsupported"
        : projectOwned
          ? "existing destination has no Intentloom ownership record"
          : !exists
            ? "safe generated destination is absent"
            : (change?.reason ??
              "existing Intentloom-owned output already matches"),
      canonicalSource: file.sources[0] ?? null,
      adapter: adapterForPath(file.path),
      profile: options.profile,
      conflictDetails: metadataConflict
        ? ["ownership cannot be established from .aif/source-map.json"]
        : projectOwned && change
          ? [change.reason]
          : [],
      writeEligible:
        !metadataConflict &&
        !projectOwned &&
        change?.kind !== "conflict" &&
        change?.kind !== "security-error" &&
        (!exists || aifOwned || recognizedMetadata),
      manualDecisionRequired: projectOwned || metadataConflict,
      safeNextAction: metadataConflict
        ? "Repair or explicitly replace the ownership metadata before applying changes."
        : projectOwned
          ? "Keep the file project-owned or explicitly resolve the generated destination conflict."
          : !exists
            ? "Apply the reviewed proposal to create this file transactionally."
            : "No action is required unless regeneration is requested.",
    });
  }
  for (const path of scannedPaths) {
    if (desiredByPath.has(path)) continue;
    const concept = documentConcept(path);
    const duplicate = concept !== null && (conceptCounts.get(concept) ?? 0) > 1;
    const mappedDocument =
      concept === null
        ? undefined
        : documentationMappingsByConcept.get(concept);
    const selectedDocument = mappedDocument === path;
    items.push({
      path,
      action: unsupportedPath(path)
        ? "unsupported"
        : duplicate && mappedDocument === undefined
          ? "manual-decision-required"
          : selectedDocument
            ? "map-existing-aif-compatible-document"
            : mappedDocument !== undefined
              ? "skip"
              : concept === "public-readme"
                ? "map-existing-project-owned"
                : instructionPath(path)
                  ? "map-existing-project-owned"
                  : concept
                    ? "map-existing-aif-compatible-document"
                    : "skip",
      currentClassification: "project-owned",
      proposedClassification: unsupportedPath(path)
        ? "unsupported"
        : concept
          ? "project-owned-documentation"
          : "project-owned",
      reason: unsupportedPath(path)
        ? "custom Copilot agents are not generated by the current adapter"
        : duplicate && mappedDocument === undefined
          ? `multiple project documents represent the ${concept} concept`
          : selectedDocument
            ? `explicit documentation mapping selects this ${concept} document`
            : mappedDocument !== undefined
              ? `explicit documentation mapping retains ${mappedDocument} for the ${concept} concept`
              : concept
                ? `existing project document maps to the ${concept} concept`
                : instructionPath(path)
                  ? "existing tool instruction remains project-owned"
                  : "project file is not an adoption artifact",
      canonicalSource: null,
      adapter: adapterForPath(path),
      profile: null,
      conflictDetails: duplicate
        ? mappedDocument === undefined
          ? [`ambiguous ${concept} document mapping`]
          : []
        : [],
      writeEligible: false,
      manualDecisionRequired: duplicate && mappedDocument === undefined,
      safeNextAction: unsupportedPath(path)
        ? "Keep the unsupported file project-owned and review adapter capabilities."
        : duplicate && mappedDocument === undefined
          ? "Choose the authoritative project document manually."
          : selectedDocument
            ? "Keep the explicitly mapped project document project-owned."
            : concept || instructionPath(path)
              ? "Keep the existing file project-owned and record the mapping only."
              : "Leave the unrelated project file unchanged.",
    });
  }
  items.sort((left, right) =>
    `${left.path}:${left.action}`.localeCompare(
      `${right.path}:${right.action}`,
    ),
  );
  const validationDiagnostics = (options.existingValidationResults ?? [])
    .flatMap((result) => [
      ...result.structuralErrors.map(
        (error) => `${result.documentPath}: ${error.code}`,
      ),
      ...result.semanticErrors.map(
        (error) => `${result.documentPath}: ${error.code}`,
      ),
    ])
    .sort();
  const profileConfirmationRequired =
    profileDetection.manualConfirmationRequired && !options.profileConfirmed;
  const blocked =
    profileConfirmationRequired ||
    mappingDiagnostics.length > 0 ||
    validationDiagnostics.length > 0 ||
    items.some(
      (item) => item.manualDecisionRequired || item.action === "conflict",
    );
  let applied = false;
  let transactionOutcome: AdoptionTransactionOutcome | null = null;
  let applicationStatus: AdoptionProposal["applicationStatus"] = options.dryRun
    ? "not-requested"
    : blocked
      ? "blocked"
      : "applied";
  if (!options.dryRun && !blocked) {
    const result = await syncProject(
      { ...options, dryRun: false },
      fs,
      transactionOptions,
    );
    if (!("dryRun" in result)) {
      const safeDiagnostics = [
        ...new Set(
          result.diagnostics.map((diagnostic) =>
            /^[a-z0-9][a-z0-9:-]*$/u.test(diagnostic)
              ? diagnostic
              : "transaction-failed",
          ),
        ),
      ].sort();
      const errorCode =
        result.status === "success"
          ? null
          : result.postWriteValidation?.status === "invalid"
            ? result.postWriteValidation.code
            : (safeDiagnostics.find(
                (diagnostic) =>
                  diagnostic !== "transaction-rollback-incomplete",
              ) ?? "transaction-failed");
      transactionOutcome = {
        status: result.status,
        failedStage: result.failedStage ?? null,
        errorCode,
        rollbackAttempted: result.rollbackAttempted,
        rollbackCompleted: result.rollbackCompleted,
        rollbackFailures: result.rollbackFailures
          .flatMap((path) => {
            try {
              return [normalizeOutputPath(path)];
            } catch {
              return [];
            }
          })
          .sort(),
        diagnostics: safeDiagnostics,
      };
      if (result.status === "success") applied = true;
      else
        applicationStatus = result.rollbackCompleted
          ? "failed-restored"
          : "failed-incomplete";
    }
  }
  return {
    kind: "adoption-proposal",
    changes,
    diagnostics: [
      ...(profileConfirmationRequired
        ? ["profile: explicit confirmation required"]
        : []),
      ...mappingDiagnostics,
      ...validationDiagnostics,
      ...items
        .filter((item) => item.manualDecisionRequired)
        .map((item) => `${item.path}: manual decision required`),
    ].sort(),
    items,
    profileDetection,
    applied,
    applicationStatus,
    transactionOutcome,
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
  const memoryPath = (path: string) =>
    path.replaceAll("\\", "/").replace(/^[A-Za-z]:/u, "");
  const files = new Map(
    Object.entries(initial).map(([path, content]) => [
      memoryPath(path),
      content,
    ]),
  );
  let writes = 0;
  let failed = false;
  return {
    files,
    async exists(path) {
      return files.has(memoryPath(path));
    },
    async read(path) {
      const content = files.get(memoryPath(path));
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
      files.set(memoryPath(path), content);
    },
    async mkdir() {},
    async remove(path) {
      files.delete(memoryPath(path));
    },
    async list(path) {
      const directory = memoryPath(path);
      return [...files.keys()].filter((file) => file.startsWith(directory));
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
      const files: string[] = [];
      const binaryExtensions =
        /\.(?:7z|bin|dll|dylib|exe|gif|gz|ico|jpe?g|pdf|png|so|tar|webp|zip)$/iu;
      const walk = async (
        directory: string,
        prefix: string,
        depth: number,
      ): Promise<void> => {
        if (depth > 32 || files.length >= 10_000) return;
        const entries = (
          await readdir(directory, { withFileTypes: true })
        ).sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
          if (files.length >= 10_000) return;
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (entry.isSymbolicLink()) continue;
          if (entry.isDirectory()) {
            if (ignoredScanSegments.has(entry.name)) continue;
            await walk(resolve(directory, entry.name), relativePath, depth + 1);
          } else if (entry.isFile() && !binaryExtensions.test(entry.name))
            files.push(relativePath);
        }
      };
      await walk(path, "", 0);
      return files.sort();
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
