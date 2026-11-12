import { resolve } from "node:path";
import type { AdapterName } from "@intentloom/core";
import {
  lockPath,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import type { FileSystem } from "../host-file-system.js";
import { instructionAdapters } from "../instruction-file-taxonomy.js";
import { detectProjectProfiles } from "../project-profile-detection.js";
import { inspectionExclusions } from "../project-scan-exclusions.js";
import { secretLikePath } from "../project-path.js";
import {
  configPath,
  type InspectionReadiness,
  type ProjectInspection,
  type ProjectInspectionFinding,
} from "./project-lifecycle-contracts.js";

const inspectionAdapterNames: readonly AdapterName[] = [
  "claude",
  "codex",
  "cursor",
  "copilot",
];
const inspectionMetadataPaths = [configPath, lockPath, sourceMapPath] as const;

export async function inspectProject(
  root: string,
  fs: FileSystem,
): Promise<ProjectInspection> {
  if (await fs.isSymbolicLink(resolve(root))) return symlinkRootInspection();
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
  const readiness = inspectionReadiness(
    metadataCount,
    intentloomMetadata.length,
  );
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
    findings: inspectionFindings(readiness),
  };
}

function symlinkRootInspection(): ProjectInspection {
  return {
    operationVersion: 1,
    capabilities: ["project.files.read"],
    readOnly: true,
    profileDetection: {
      selectedProfile: "generic",
      workspaceTopology: "none",
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
    },
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
}

function inspectionReadiness(
  metadataCount: number,
  metadataLength: number,
): InspectionReadiness {
  if (metadataCount === 0) return "not-initialized";
  if (metadataCount === metadataLength) return "ready";
  return "partial-metadata";
}

function inspectionFindings(
  readiness: InspectionReadiness,
): readonly ProjectInspectionFinding[] {
  if (readiness === "not-initialized")
    return [
      {
        code: "intentloom-not-initialized",
        severity: "info",
        path: ".aif/",
        message: "Intentloom metadata is not present",
        remediation: ["Run adoption dry-run and review the proposed changes."],
        readOnly: true,
      },
    ];
  if (readiness === "partial-metadata")
    return [
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
    ];
  return [
    {
      code: "inspection-ready",
      severity: "info",
      path: ".aif/",
      message: "Intentloom metadata is present",
      remediation: [],
      readOnly: true,
    },
  ];
}
