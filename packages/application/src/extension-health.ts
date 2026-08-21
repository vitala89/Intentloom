import { parseDocument } from "yaml";
import type {
  ExtensionHealthEvidence,
  ExtensionHealthFinding,
  ExtensionHealthReport,
  ExtensionLockfile,
} from "@intentloom/protocol";
import type { FileSystem } from "./propose-and-apply-extension-adoption.js";
import { inspectExtensionHealthEntry } from "./extension-health-evaluator.js";
import { extensionLockRelativePath } from "./extension-lock-path.js";
import {
  inspectExternalSpecializedPackHealth,
  isExternalSpecializedPackCandidate,
  isSpecializedPackSecurityFinding,
} from "./engineering-quality/specialized-pack-external-health.js";

const defaultMaxAgeMs = 24 * 60 * 60 * 1000;

export interface CheckExtensionHealthOptions {
  readonly root: string;
  readonly lockfilePath?: string | undefined;
  readonly evidence?: readonly ExtensionHealthEvidence[] | undefined;
  readonly now?: string | undefined;
  readonly maxAgeMs?: number | undefined;
}

export interface ExtensionHealthDoctorFinding {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly category: "security" | "drift";
  readonly path: string;
  readonly message: string;
  readonly remediation: readonly string[];
  readonly readOnly: true;
  readonly adapter: null;
  readonly profile: string;
}

function malformedFinding(path: string): ExtensionHealthFinding {
  return {
    extensionId: "unknown",
    code: "extension-lock-malformed",
    severity: "error",
    path,
    message: "extension lockfile is malformed",
    remediation:
      "Repair or explicitly re-adopt the extension lockfile before use.",
  };
}

export async function checkExtensionHealth(
  options: CheckExtensionHealthOptions,
  fs: FileSystem,
): Promise<ExtensionHealthReport> {
  const lockfilePath =
    options.lockfilePath ?? `${options.root}/.aif/extension-lock.json`;
  if (!(await fs.exists(lockfilePath)))
    return {
      status: "healthy",
      checkedExtensionIds: [],
      findings: [],
      diagnostics: [],
    };

  let lockfile: ExtensionLockfile;
  try {
    lockfile = parseDocument(
      await fs.read(lockfilePath),
    ).toJS() as ExtensionLockfile;
    if (
      !lockfile ||
      typeof lockfile.extensions !== "object" ||
      lockfile.extensions === null ||
      Array.isArray(lockfile.extensions) ||
      Object.values(lockfile.extensions).some(
        (entry) =>
          !entry ||
          typeof entry !== "object" ||
          typeof entry.extensionId !== "string",
      )
    )
      throw new Error();
  } catch {
    const malformed = malformedFinding(lockfilePath);
    return {
      status: "failed",
      checkedExtensionIds: [],
      findings: [malformed],
      diagnostics: [malformed.message],
    };
  }

  const now = Date.parse(options.now ?? new Date().toISOString());
  const evidence = new Map(
    (options.evidence ?? []).map((item) => [item.extensionId, item]),
  );
  let relativeLockPath = ".aif/extension-lock.json";
  try {
    relativeLockPath = extensionLockRelativePath(options.root, lockfilePath);
  } catch {
    relativeLockPath = ".aif/extension-lock.json";
  }
  const findings = [
    ...Object.values(lockfile.extensions)
      .sort((left, right) => left.extensionId.localeCompare(right.extensionId))
      .filter((entry) => !isExternalSpecializedPackCandidate(entry))
      .flatMap((entry) =>
        inspectExtensionHealthEntry(
          entry,
          lockfilePath,
          evidence.get(entry.extensionId),
          Number.isFinite(now) ? now : Date.now(),
          options.maxAgeMs ?? defaultMaxAgeMs,
        ),
      ),
    ...(await inspectExternalSpecializedPackHealth(lockfile, {
      root: options.root,
      lockPath: relativeLockPath,
      fs,
    })),
  ];
  const status = findings.some((item) => item.severity === "error")
    ? "failed"
    : findings.some((item) => item.severity === "warning")
      ? "warning"
      : "healthy";
  return {
    status,
    checkedExtensionIds: Object.keys(lockfile.extensions).sort(),
    findings,
    diagnostics: findings
      .filter((item) => item.severity === "error")
      .map((item) => `${item.extensionId}: ${item.message}`),
  };
}

export async function collectExtensionHealthDoctorFindings(
  options: { readonly root: string; readonly profile: string },
  fs: FileSystem,
): Promise<readonly ExtensionHealthDoctorFinding[]> {
  const report = await checkExtensionHealth({ root: options.root }, fs);
  return report.findings.map((healthFinding) => {
    const securityFinding =
      healthFinding.code.includes("integrity") ||
      healthFinding.code.includes("source") ||
      healthFinding.code.includes("entrypoint") ||
      healthFinding.code.includes("health-check") ||
      healthFinding.code.includes("license") ||
      healthFinding.code.includes("notice") ||
      isSpecializedPackSecurityFinding(healthFinding.code);
    return {
      code: healthFinding.code,
      severity: healthFinding.severity,
      category: securityFinding ? "security" : "drift",
      path: healthFinding.path,
      message: `${healthFinding.extensionId}: ${healthFinding.message}`,
      remediation: [healthFinding.remediation],
      readOnly: true,
      adapter: null,
      profile: options.profile,
    };
  });
}
