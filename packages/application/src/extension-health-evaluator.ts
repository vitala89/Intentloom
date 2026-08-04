import type {
  ExtensionHealthEvidence,
  ExtensionHealthFinding,
  ExtensionLockEntry,
} from "@intentloom/protocol";
import { inspectRuntimeEvidence } from "./extension-health-runtime.js";

function finding(
  extensionId: string,
  code: string,
  severity: ExtensionHealthFinding["severity"],
  path: string,
  message: string,
  remediation: string,
): ExtensionHealthFinding {
  return { extensionId, code, severity, path, message, remediation };
}

function isExactVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(
    version,
  );
}

function inspectLockMetadata(
  entry: ExtensionLockEntry,
  path: string,
  now: number,
  maxAgeMs: number,
): ExtensionHealthFinding[] {
  const findings: ExtensionHealthFinding[] = [];
  if (
    entry.requestedVersion !== entry.resolvedVersion ||
    !isExactVersion(entry.requestedVersion) ||
    !isExactVersion(entry.resolvedVersion)
  )
    findings.push(
      finding(
        entry.extensionId,
        "extension-lock-unpinned",
        "error",
        path,
        "extension lock does not pin an exact requested and resolved version",
        "Resolve an exact version and review the resulting lockfile before use.",
      ),
    );

  const healthTimestamp = entry.lastHealthCheck
    ? Date.parse(entry.lastHealthCheck)
    : Number.NaN;
  if (!Number.isFinite(healthTimestamp) || now - healthTimestamp > maxAgeMs)
    findings.push(
      finding(
        entry.extensionId,
        "extension-health-stale",
        "warning",
        path,
        "extension health evidence is missing or older than the allowed age",
        "Run a read-only extension health check before granting new work.",
      ),
    );

  const needsIntegrity =
    entry.installationType !== "externally-installed" &&
    entry.installationType !== "referenced";
  if (needsIntegrity && !entry.integrity)
    findings.push(
      finding(
        entry.extensionId,
        "extension-integrity-missing",
        "error",
        path,
        "pinned extension has no artifact integrity digest",
        "Re-adopt the extension with a verified SHA-256 or SRI digest.",
      ),
    );
  if (!entry.license)
    findings.push(
      finding(
        entry.extensionId,
        "extension-license-metadata-missing",
        "error",
        path,
        "pinned extension has no license metadata",
        "Review the extension license before enabling it.",
      ),
    );
  else if (entry.license.noticeRequired && !entry.license.noticeFile)
    findings.push(
      finding(
        entry.extensionId,
        "extension-notice-metadata-missing",
        "error",
        path,
        "extension requires a notice snapshot but none is recorded",
        "Capture the required notice during adoption and review it.",
      ),
    );
  return findings;
}

export function inspectExtensionHealthEntry(
  entry: ExtensionLockEntry,
  path: string,
  evidence: ExtensionHealthEvidence | undefined,
  now: number,
  maxAgeMs: number,
): ExtensionHealthFinding[] {
  const findings = inspectLockMetadata(entry, path, now, maxAgeMs);
  if (evidence) findings.push(...inspectRuntimeEvidence(entry, path, evidence));
  return findings;
}
