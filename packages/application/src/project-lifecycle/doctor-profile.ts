import { getAdapterContract } from "@intentloom/adapters";
import type { AdapterName } from "@intentloom/core";
import type { FileSystem } from "../host-file-system.js";
import { instructionRootKey } from "../instruction-file-taxonomy.js";
import { detectProjectProfiles } from "../project-profile-detection.js";
import type { MetadataPresence } from "./doctor-metadata.js";
import {
  configPath,
  type DoctorFinding,
  type InitOptions,
} from "./project-lifecycle-contracts.js";

const supportedProfiles = new Set([
  "generic",
  "typescript",
  "angular",
  "rust",
  "tauri",
  "angular-tauri",
]);

export function unsupportedProfileFinding(
  options: InitOptions,
): DoctorFinding | null {
  if (supportedProfiles.has(options.profile)) return null;
  return {
    code: "adapter-profile-unsupported",
    severity: "error",
    category: "profile",
    path: configPath,
    message: "selected profile is not supported by the adapter matrix",
    remediation: ["Choose a documented profile before syncing adapters."],
    readOnly: true,
    adapter: null,
    profile: options.profile,
  };
}

export async function profileMismatchFinding(
  options: InitOptions,
  fs: FileSystem,
): Promise<DoctorFinding | null> {
  const profileDetection = await detectProjectProfiles(options.root, fs);
  if (
    profileDetection.manualConfirmationRequired ||
    profileDetection.selectedProfile === "generic" ||
    profileDetection.selectedProfile === options.profile
  )
    return null;
  return {
    code: "profile-mismatch",
    severity: "warning",
    category: "profile",
    path: configPath,
    message: `configured profile does not match detected ${profileDetection.selectedProfile} evidence`,
    remediation: [
      "Review profile evidence and confirm the intended profile manually.",
    ],
    readOnly: true,
    adapter: null,
    profile: options.profile,
  };
}

export function adapterCapabilityFindings(
  options: InitOptions,
  presence: readonly MetadataPresence[],
  selectedAdapters: readonly AdapterName[],
): DoctorFinding[] {
  if (!presence[0]?.present) return [];
  const findings: DoctorFinding[] = [];
  for (const adapter of selectedAdapters) {
    const contract = getAdapterContract(adapter);
    for (const capability of contract.experimentalCapabilities)
      findings.push(
        capabilityFinding(
          options,
          adapter,
          capability,
          "adapter-capability-experimental",
          "warning",
          "is experimental",
          "Review the compatibility matrix before relying on this capability.",
        ),
      );
    for (const capability of contract.unsupportedCapabilities)
      findings.push(
        capabilityFinding(
          options,
          adapter,
          capability,
          "adapter-capability-unsupported",
          "info",
          "is not generated",
          "Keep unsupported provider configuration project-owned.",
        ),
      );
  }
  return findings;
}

function capabilityFinding(
  options: InitOptions,
  adapter: AdapterName,
  capability: string,
  code: string,
  severity: "warning" | "info",
  status: string,
  remediation: string,
): DoctorFinding {
  return {
    code,
    severity,
    category: "adapter",
    path: configPath,
    message: `${adapter} capability ${capability} ${status}`,
    remediation: [remediation],
    readOnly: true,
    adapter,
    profile: options.profile,
  };
}

export function conflictingInstructionRootsFinding(
  scannedPaths: readonly string[],
  ownedPaths: ReadonlySet<string>,
  desiredPaths: ReadonlySet<string>,
  options: InitOptions,
): DoctorFinding | null {
  const instructionRoots = new Set(
    scannedPaths
      .filter((path) => !ownedPaths.has(path) || !desiredPaths.has(path))
      .flatMap((path) => {
        const key = instructionRootKey(path);
        return key ? [key] : [];
      }),
  );
  if (instructionRoots.size <= 1) return null;
  return {
    code: "instruction-files-conflicting",
    severity: "warning",
    category: "migration",
    path: ".",
    message:
      "multiple project-owned tool instruction roots require explicit mapping",
    remediation: ["Review each instruction root and keep ownership explicit."],
    readOnly: true,
    adapter: null,
    profile: options.profile,
  };
}

export function missingProductDocumentationFinding(
  scannedPaths: readonly string[],
  options: InitOptions,
): DoctorFinding | null {
  if (
    scannedPaths.some((path) =>
      /(?:^|\/)(?:readme|roadmap|product[-_ ]?(?:state|roadmap))\.md$/iu.test(
        path,
      ),
    )
  )
    return null;
  return {
    code: "product-documentation-missing",
    severity: "warning",
    category: "documentation",
    path: "docs/",
    message: "recommended product documentation was not detected",
    remediation: ["Map an existing product document or add one when useful."],
    readOnly: true,
    adapter: null,
    profile: options.profile,
  };
}
