import type {
  ExtensionCapabilities,
  ExtensionCapabilityDelta,
  ExtensionCompatibility,
  ExtensionCompatibilityReport,
  ExtensionInspectionReport,
  ExtensionLicense,
  ExtensionLicenseAudit,
  ExtensionLockfile,
  ExtensionManifest,
  ExtensionPublisher,
} from "@intentloom/protocol";
import type { ArtifactValidator } from "./index.js";
import { validateExtensionManifestDocument } from "./extension.js";
export * from "./extension-sandbox.js";

interface SemverTuple {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export function parseSemver(input: string): SemverTuple | null {
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?/i.exec(input.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? "0"),
  };
}

export function compareSemver(v1: SemverTuple, v2: SemverTuple): number {
  if (v1.major !== v2.major) return v1.major > v2.major ? 1 : -1;
  if (v1.minor !== v2.minor) return v1.minor > v2.minor ? 1 : -1;
  if (v1.patch !== v2.patch) return v1.patch > v2.patch ? 1 : -1;
  return 0;
}

export function satisfiesSingleClause(
  version: SemverTuple,
  clause: string,
): boolean {
  const trimmed = clause.trim();
  if (trimmed === "*" || trimmed === "") return true;

  if (trimmed.startsWith(">=")) {
    const target = parseSemver(trimmed.slice(2));
    return target ? compareSemver(version, target) >= 0 : false;
  }
  if (trimmed.startsWith(">")) {
    const target = parseSemver(trimmed.slice(1));
    return target ? compareSemver(version, target) > 0 : false;
  }
  if (trimmed.startsWith("<=")) {
    const target = parseSemver(trimmed.slice(2));
    return target ? compareSemver(version, target) <= 0 : false;
  }
  if (trimmed.startsWith("<")) {
    const target = parseSemver(trimmed.slice(1));
    return target ? compareSemver(version, target) < 0 : false;
  }
  if (trimmed.startsWith("^")) {
    const target = parseSemver(trimmed.slice(1));
    if (!target) return false;
    if (compareSemver(version, target) < 0) return false;
    if (target.major > 0) return version.major === target.major;
    if (target.minor > 0)
      return version.major === 0 && version.minor === target.minor;
    return (
      version.major === 0 &&
      version.minor === 0 &&
      version.patch === target.patch
    );
  }

  const target = parseSemver(trimmed.replace(/^=/u, ""));
  return target ? compareSemver(version, target) === 0 : false;
}

export function satisfiesSemverRange(
  versionStr: string,
  rangeStr: string,
): boolean {
  const parsed = parseSemver(versionStr);
  if (!parsed) return false;

  const branches = rangeStr.split("||");
  return branches.some((branch) => {
    const clauses = branch.trim().split(/\s+/u).filter(Boolean);
    return clauses.every((clause) => satisfiesSingleClause(parsed, clause));
  });
}

const PERMISSIVE_SPDX_IDS = new Set([
  "MIT",
  "Apache-2.0",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "ISC",
  "Unlicense",
  "CC0-1.0",
  "MPL-2.0",
]);

const RESTRICTIVE_SPDX_IDS = new Set([
  "GPL-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "AGPL-3.0",
  "AGPL-3.0-only",
  "AGPL-3.0-or-later",
  "SSPL-1.0",
]);

export interface InspectionEnvironment {
  readonly nodeVersion?: string;
  readonly os?: string;
  readonly arch?: string;
  readonly coreVersion?: string;
}

export function computeExtensionCapabilityDelta(
  requested: ExtensionCapabilities | undefined,
  existingLockCapabilities: ExtensionCapabilities | undefined,
): ExtensionCapabilityDelta {
  const reqRead = requested?.filesystem?.read ?? [];
  const reqWrite = requested?.filesystem?.write ?? [];
  const reqExec = requested?.process?.exec ?? [];
  const reqConnect = requested?.network?.connect ?? [];

  const existRead = existingLockCapabilities?.filesystem?.read ?? [];
  const existWrite = existingLockCapabilities?.filesystem?.write ?? [];
  const existExec = existingLockCapabilities?.process?.exec ?? [];
  const existConnect = existingLockCapabilities?.network?.connect ?? [];

  const filesystemReadAdded = reqRead.filter(
    (path) => !existRead.includes(path),
  );
  const filesystemWriteAdded = reqWrite.filter(
    (path) => !existWrite.includes(path),
  );
  const processExecAdded = reqExec.filter((cmd) => !existExec.includes(cmd));
  const networkConnectAdded = reqConnect.filter(
    (host) => !existConnect.includes(host),
  );

  const hasExpansions =
    filesystemReadAdded.length > 0 ||
    filesystemWriteAdded.length > 0 ||
    processExecAdded.length > 0 ||
    networkConnectAdded.length > 0;

  return {
    filesystemReadAdded,
    filesystemWriteAdded,
    processExecAdded,
    networkConnectAdded,
    hasExpansions,
  };
}

export function evaluateExtensionCompatibility(
  manifestCompat: ExtensionCompatibility,
  env: InspectionEnvironment = {},
): ExtensionCompatibilityReport {
  const diagnostics: string[] = [];

  const nodeVer = env.nodeVersion ?? process.version;
  const currentOs = env.os ?? process.platform;
  const currentArch = env.arch ?? process.arch;
  const coreVer = env.coreVersion ?? "1.0.2";

  let nodeCompatible = true;
  if (manifestCompat.node) {
    if (!satisfiesSemverRange(nodeVer, manifestCompat.node)) {
      nodeCompatible = false;
      diagnostics.push(
        `Node.js version "${nodeVer}" does not satisfy required range "${manifestCompat.node}"`,
      );
    }
  }

  let osCompatible = true;
  if (manifestCompat.os && manifestCompat.os.length > 0) {
    if (!manifestCompat.os.includes(currentOs)) {
      osCompatible = false;
      diagnostics.push(
        `Operating system "${currentOs}" is not in supported list: [${manifestCompat.os.join(", ")}]`,
      );
    }
  }

  let archCompatible = true;
  if (manifestCompat.arch && manifestCompat.arch.length > 0) {
    if (!manifestCompat.arch.includes(currentArch)) {
      archCompatible = false;
      diagnostics.push(
        `Architecture "${currentArch}" is not in supported list: [${manifestCompat.arch.join(", ")}]`,
      );
    }
  }

  let coreApiCompatible = true;
  if (manifestCompat.intentloomCore) {
    if (!satisfiesSemverRange(coreVer, manifestCompat.intentloomCore)) {
      coreApiCompatible = false;
      diagnostics.push(
        `Intentloom core version "${coreVer}" does not satisfy range "${manifestCompat.intentloomCore}"`,
      );
    }
  }

  const isCompatible =
    nodeCompatible && osCompatible && archCompatible && coreApiCompatible;

  return {
    isCompatible,
    nodeCompatible,
    osCompatible,
    archCompatible,
    coreApiCompatible,
    diagnostics,
  };
}

export function auditExtensionLicense(
  license: ExtensionLicense,
  publisher: ExtensionPublisher,
  previousPublisherName?: string,
): ExtensionLicenseAudit {
  const diagnostics: string[] = [];
  const spdxId = license.spdxId.trim();
  const noticeRequired = Boolean(license.noticeRequired);

  const isPermissive = PERMISSIVE_SPDX_IDS.has(spdxId);
  const hasRestrictiveTerms = RESTRICTIVE_SPDX_IDS.has(spdxId);

  if (!isPermissive && !hasRestrictiveTerms) {
    diagnostics.push(
      `Unrecognized or non-standard SPDX license identifier "${spdxId}"`,
    );
  }

  if (hasRestrictiveTerms) {
    diagnostics.push(
      `Restrictive or copyleft SPDX license detected: "${spdxId}"`,
    );
  }

  let publisherChanged = false;
  if (previousPublisherName && previousPublisherName !== publisher.name) {
    publisherChanged = true;
    diagnostics.push(
      `Extension publisher changed from "${previousPublisherName}" to "${publisher.name}"`,
    );
  }

  return {
    spdxId,
    noticeRequired,
    isPermissive,
    hasRestrictiveTerms,
    publisherChanged,
    diagnostics,
  };
}

export function inspectExtensionManifestDocument(
  validator: ArtifactValidator | undefined,
  manifestContent: string,
  lockfileContent?: string,
  env?: InspectionEnvironment,
): ExtensionInspectionReport {
  const diagnostics: string[] = [];

  if (validator && typeof validator.validate === "function") {
    const manifestValidation = validateExtensionManifestDocument(
      validator,
      "extension-manifest.json",
      manifestContent,
    );

    if (manifestValidation.status === "invalid") {
      const structMsgs = manifestValidation.structuralErrors.map(
        (e) => `${e.fieldPath}: ${e.message}`,
      );
      return {
        status: "rejected",
        extensionId: "unknown",
        name: "unknown",
        category: "skill",
        version: "0.0.0",
        publisher: { name: "unknown" },
        licenseAudit: {
          spdxId: "UNKNOWN",
          noticeRequired: false,
          isPermissive: false,
          hasRestrictiveTerms: false,
          publisherChanged: false,
          diagnostics: ["Manifest schema validation failed"],
        },
        capabilityDelta: {
          filesystemReadAdded: [],
          filesystemWriteAdded: [],
          processExecAdded: [],
          networkConnectAdded: [],
          hasExpansions: false,
        },
        compatibility: {
          isCompatible: false,
          nodeCompatible: false,
          osCompatible: false,
          archCompatible: false,
          coreApiCompatible: false,
          diagnostics: structMsgs,
        },
        diagnostics: ["manifest-schema-invalid", ...structMsgs],
      };
    }
  }

  const manifest = JSON.parse(manifestContent) as ExtensionManifest;

  let lockfile: ExtensionLockfile | undefined;
  if (lockfileContent) {
    try {
      lockfile = JSON.parse(lockfileContent) as ExtensionLockfile;
    } catch {
      diagnostics.push("extension-lockfile-unparseable");
    }
  }

  const existingLockEntry = lockfile?.extensions[manifest.extensionId];

  const capabilityDelta = computeExtensionCapabilityDelta(
    manifest.capabilities,
    existingLockEntry?.grantedCapabilities,
  );

  const compatibility = evaluateExtensionCompatibility(
    manifest.compatibility,
    env,
  );

  const licenseAudit = auditExtensionLicense(
    manifest.license,
    manifest.publisher,
    existingLockEntry ? manifest.publisher.name : undefined,
  );

  const allDiagnostics = [
    ...diagnostics,
    ...compatibility.diagnostics,
    ...licenseAudit.diagnostics,
  ];

  let status: "approved" | "warning" | "rejected" = "approved";

  if (!compatibility.isCompatible || licenseAudit.hasRestrictiveTerms) {
    status = "rejected";
  } else if (
    capabilityDelta.hasExpansions ||
    licenseAudit.publisherChanged ||
    !licenseAudit.isPermissive
  ) {
    status = "warning";
  }

  return {
    status,
    extensionId: manifest.extensionId,
    name: manifest.name,
    category: manifest.category,
    version: manifest.version,
    publisher: manifest.publisher,
    licenseAudit,
    capabilityDelta,
    compatibility,
    diagnostics: allDiagnostics,
  };
}
