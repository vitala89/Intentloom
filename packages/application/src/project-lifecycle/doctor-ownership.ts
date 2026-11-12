import { INTENTLOOM_VERSION, normalizeStoredPath } from "@intentloom/core";
import {
  adapterOutputVersion,
  lockPath,
  metadataFormatVersion,
  sourceMapPath,
} from "../generated-file/transaction-metadata.js";
import type { FileSystem } from "../host-file-system.js";
import { inside } from "../project-path.js";
import type {
  DoctorFinding,
  InitOptions,
} from "./project-lifecycle-contracts.js";

type MetadataRecord = Record<string, unknown>;

export async function readMetadataObject(
  root: string,
  path: string,
  fs: FileSystem,
): Promise<MetadataRecord | null> {
  try {
    const value = JSON.parse(await fs.read(inside(root, path)));
    return typeof value === "object" && value !== null
      ? (value as MetadataRecord)
      : null;
  } catch {
    return null;
  }
}

export function manifestGeneratedRecords(
  manifest: MetadataRecord | null,
): MetadataRecord[] {
  if (!manifest || !Array.isArray(manifest.generated)) return [];
  return manifest.generated as MetadataRecord[];
}

export function sourceMapFileRecords(
  sourceMap: MetadataRecord | null,
): MetadataRecord[] {
  if (!sourceMap || !Array.isArray(sourceMap.files)) return [];
  return sourceMap.files as MetadataRecord[];
}

export function ownedSourcePaths(
  records: readonly MetadataRecord[],
): Set<string> {
  return new Set(
    records
      .map((record) => record.path)
      .filter((path): path is string => typeof path === "string"),
  );
}

export function storedPathFindings(
  metadataPath: typeof lockPath | typeof sourceMapPath,
  records: readonly MetadataRecord[],
  options: InitOptions,
): DoctorFinding[] {
  const incompatible = records.some((record) => {
    if (typeof record.path !== "string") return false;
    try {
      return normalizeStoredPath(record.path) !== record.path;
    } catch {
      return true;
    }
  });
  if (!incompatible) return [];
  return [
    {
      code: "stored-path-incompatible",
      severity: "error",
      category: "security",
      path: metadataPath,
      message: "metadata contains a non-portable stored path",
      remediation: [
        "Review and migrate stored paths to normalized project-relative form.",
      ],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    },
  ];
}

export function manifestVersionFindings(
  manifest: MetadataRecord | null,
  options: InitOptions,
): DoctorFinding[] {
  if (!manifest) return [];
  const findings: DoctorFinding[] = [];
  if (manifest.frameworkVersion !== INTENTLOOM_VERSION)
    findings.push(
      versionFinding(
        "framework-version-stale",
        "migration",
        "manifest framework version does not match this CLI",
        "Review the migration guide before regenerating metadata.",
        options,
      ),
    );
  if (manifest.adapterOutputVersion !== adapterOutputVersion)
    findings.push(
      versionFinding(
        "adapter-version-stale",
        "adapter",
        "manifest adapter output version is stale",
        "Review a sync dry-run with the current adapter version.",
        options,
      ),
    );
  if (manifest.schemaVersion !== metadataFormatVersion)
    findings.push(
      versionFinding(
        "schema-version-stale",
        "schema",
        "manifest schema version is not supported by this CLI",
        "Use an explicit supported schema migration.",
        options,
      ),
    );
  return findings;
}

function versionFinding(
  code: string,
  category: DoctorFinding["category"],
  message: string,
  remediation: string,
  options: InitOptions,
): DoctorFinding {
  return {
    code,
    severity: "error",
    category,
    path: lockPath,
    message,
    remediation: [remediation],
    readOnly: true,
    adapter: null,
    profile: options.profile,
  };
}

export function orphanedManifestFindings(
  records: readonly MetadataRecord[],
  desiredPaths: ReadonlySet<string>,
  options: InitOptions,
): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  for (const record of records)
    if (typeof record.path === "string" && !desiredPaths.has(record.path))
      findings.push({
        code: "manifest-entry-orphaned",
        severity: "error",
        category: "ownership",
        path: record.path,
        message: "manifest entry has no current generated destination",
        remediation: [
          "Review and remove the orphan through an explicit migration.",
        ],
        readOnly: true,
        adapter: null,
        profile: options.profile,
      });
  return findings;
}

export function adapterSelectionFindings(
  manifest: MetadataRecord | null,
  options: InitOptions,
): DoctorFinding[] {
  if (!manifest) return [];
  const pinnedAdapters = Array.isArray(manifest.adapters)
    ? (manifest.adapters as MetadataRecord[])
        .map((entry) => entry.id)
        .filter((id): id is string => typeof id === "string")
        .sort()
    : [];
  if (
    pinnedAdapters.length === 0 ||
    pinnedAdapters.join(",") === [...options.adapters].sort().join(",")
  )
    return [];
  return [
    {
      code: "adapter-selection-conflict",
      severity: "error",
      category: "adapter",
      path: lockPath,
      message: "manifest adapter selection differs from project configuration",
      remediation: [
        "Choose adapters explicitly and review adoption before syncing.",
      ],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    },
  ];
}

export function sourceMapOrphanFindings(
  records: readonly MetadataRecord[],
  desiredPaths: ReadonlySet<string>,
  options: InitOptions,
): DoctorFinding[] {
  const findings: DoctorFinding[] = [];
  for (const record of records) {
    if (typeof record.path !== "string" || desiredPaths.has(record.path))
      continue;
    findings.push({
      code: "source-map-record-orphaned",
      severity: "error",
      category: "ownership",
      path: record.path,
      message:
        "source-map ownership record has no current generated destination",
      remediation: [
        "Review and remove the orphan through an explicit migration.",
      ],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    });
  }
  return findings;
}
