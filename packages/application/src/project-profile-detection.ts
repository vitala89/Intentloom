import { relative, resolve } from "node:path";
import { collectStackEvidence } from "./project-profile-evidence.js";
import { projectRelativePaths } from "./project-scan-exclusions.js";

export type EngineeringProfile =
  "generic" | "typescript" | "angular" | "rust" | "tauri" | "angular-tauri";

export type DetectedProfile =
  EngineeringProfile | "nx" | "sqlite" | "security-sensitive";

export type WorkspaceTopology = "none" | "nx";

export interface ProfileCandidate {
  readonly profile: DetectedProfile;
  readonly evidenceFiles: readonly string[];
  readonly reason: string;
  readonly confidence: "exact" | "inferred" | "fallback";
}

export interface ProfileDetectionResult {
  readonly selectedProfile: EngineeringProfile;
  readonly workspaceTopology: WorkspaceTopology;
  readonly candidates: readonly ProfileCandidate[];
  readonly competingCandidates: readonly DetectedProfile[];
  readonly manualConfirmationRequired: boolean;
  readonly scannedPaths: readonly string[];
}

export const engineeringProfiles = new Set<EngineeringProfile>([
  "generic",
  "typescript",
  "angular",
  "rust",
  "tauri",
  "angular-tauri",
]);

export interface ProfileEvidenceFileSystem {
  list(root: string): Promise<string[]>;
  read(path: string): Promise<string>;
}

function packageDependencyNames(source: string): Set<string> {
  try {
    const document = JSON.parse(source) as Record<string, unknown>;
    return new Set(
      ["dependencies", "devDependencies", "peerDependencies"].flatMap(
        (field) =>
          typeof document[field] === "object" && document[field] !== null
            ? Object.keys(document[field] as Record<string, unknown>)
            : [],
      ),
    );
  } catch {
    return new Set();
  }
}

async function readEvidenceFile(
  root: string,
  path: string,
  paths: ReadonlySet<string>,
  fs: ProfileEvidenceFileSystem,
): Promise<string | null> {
  if (!paths.has(path)) return null;
  try {
    return await fs.read(resolve(root, path));
  } catch {
    return null;
  }
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

function candidate(
  profile: DetectedProfile,
  evidenceFiles: readonly string[],
  reason: string,
  confidence: ProfileCandidate["confidence"],
): ProfileCandidate {
  return {
    profile,
    evidenceFiles: [...new Set(evidenceFiles)].sort(),
    reason,
    confidence,
  };
}

function profileCandidates(
  evidence: ReturnType<typeof collectStackEvidence>,
): ProfileCandidate[] {
  const hasAngular = evidence.angular.length > 0;
  const hasTauri = evidence.tauri.length > 0;
  const definitions: ProfileCandidate[] = [];
  if (evidence.securitySensitive.length > 0)
    definitions.push(
      candidate(
        "security-sensitive",
        evidence.securitySensitive,
        "Sensitive security, stealth, credential, or career-data indicators are present",
        "exact",
      ),
    );
  if (hasAngular && hasTauri)
    definitions.push(
      candidate(
        "angular-tauri",
        [...evidence.angular, ...evidence.tauri, ...evidence.typescript],
        "Angular and Tauri configuration are both present",
        "exact",
      ),
    );
  if (evidence.nx.length > 0)
    definitions.push(
      candidate(
        "nx",
        evidence.nx,
        "Nx workspace topology evidence is present",
        "exact",
      ),
    );
  if (evidence.sqlite.length > 0)
    definitions.push(
      candidate(
        "sqlite",
        evidence.sqlite,
        "SQLite database or migration evidence is present",
        "inferred",
      ),
    );
  if (hasAngular)
    definitions.push(
      candidate(
        "angular",
        evidence.angular,
        "Angular package or workspace configuration is present",
        "exact",
      ),
    );
  if (hasTauri)
    definitions.push(
      candidate(
        "tauri",
        evidence.tauri,
        "Tauri configuration or package evidence is present",
        "exact",
      ),
    );
  if (evidence.typescript.length > 0 || hasAngular)
    definitions.push(
      candidate(
        "typescript",
        evidence.typescript,
        "TypeScript configuration or package evidence is present",
        "inferred",
      ),
    );
  if (evidence.rust.length > 0 || hasTauri)
    definitions.push(
      candidate(
        "rust",
        evidence.rust,
        "Cargo project evidence is present",
        "inferred",
      ),
    );
  definitions.push(
    candidate(
      "generic",
      [],
      "Generic is the deterministic fallback profile",
      "fallback",
    ),
  );
  return definitions;
}

export async function detectProjectProfiles(
  root: string,
  fs: ProfileEvidenceFileSystem,
): Promise<ProfileDetectionResult> {
  const scannedPaths = projectRelativePaths(
    root,
    await fs.list(root),
    resolve,
    relative,
  );
  const paths = new Set(scannedPaths);
  const packageSource = await readEvidenceFile(root, "package.json", paths, fs);
  const packageNames =
    packageSource === null
      ? new Set<string>()
      : packageDependencyNames(packageSource);
  const evidence = collectStackEvidence(paths, packageNames, secretLikePath);
  const definitions = profileCandidates(evidence);
  const hasWebProfile =
    evidence.angular.length > 0 || evidence.typescript.length > 0;
  const hasNativeProfile =
    evidence.tauri.length > 0 || evidence.rust.length > 0;
  const ambiguous =
    hasWebProfile &&
    hasNativeProfile &&
    !(evidence.angular.length > 0 && evidence.tauri.length > 0);
  const selectedProfile = ambiguous
    ? "generic"
    : (definitions.find((item) =>
        engineeringProfiles.has(item.profile as EngineeringProfile),
      )!.profile as EngineeringProfile);
  return {
    selectedProfile,
    workspaceTopology: evidence.nx.length > 0 ? "nx" : "none",
    candidates: definitions,
    competingCandidates: definitions
      .filter((item) => item.profile !== selectedProfile)
      .map((item) => item.profile),
    manualConfirmationRequired: ambiguous,
    scannedPaths,
  };
}
